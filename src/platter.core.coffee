class templateRunner
	constructor: (node) ->
		@node = node
	removeBetween: (startel, endel) ->
		par = startel.parentNode
		prev = undefined
		while (prev=endel.previousSibling)!=startel
			par.removeChild prev
		undefined
	runEvent: (el, ev, fn) ->
		el.addEventListener ev, fn
		$undo.add ->
			el.removeEventListener ev, fn


class templateCompiler
	makeRet: (node) ->
		new templateRunner(node)

	# Below here, I doubt anyone will override anything
	compile: (txt) ->
		@compileFrag @tmplToFrag txt
	
	compileFrag: (frag) ->
		js = new platter.internal.codegen
		jsData = 'data'
		js.existingVar jsData
		jsEl = js.addVar 'el', 'this.node.cloneNode(true)'
		ret = @makeRet(frag)
		@compileInner ret, frag, js, jsEl, jsData
		js.addExpr "return ##{jsEl}#"
		#alert js
		ret.run = new Function('data', ""+js)
		ret
	
	compileInner: (ret, cur, js, jsEl, jsData) ->
		jsCur = js.addVar jsEl+"_ch", "##{jsEl}#.firstChild"
		cur = cur.firstChild
		while (cur)
			if cur.nodeType==1  # ELEMENT_NODE
				isSpecial = false
				for att in cur.attributes
					n = att.nodeName
					if (this["special_#{n}"])
						isSpecial = true
						v = att.nodeValue
						v = v.replace /<!--\{\{/g, "{{"
						v = v.replace /\}\}-->/g, "}}"
						cur.removeAttribute n
						[cur, jsCur] = this["special_#{n}"](ret, js, cur, jsCur, jsEl, jsData, v)
						break
				if !isSpecial
					for att in cur.attributes
						if /<!--\{\{/.exec(att.nodeValue)
							n = att.nodeName
							v = att.nodeValue
							v = v.replace /<!--\{\{/g, "{{"
							v = v.replace /\}\}-->/g, "}}"
							if (n[0]=='o'&&n[1]=='n')
								# Event handler!
								ev = n.substr(2)
								@escapesReplace v, (t) ->
									js.addExpr "this.runEvent(##{jsCur}#, '#{ev}', function(ev){ return data.#{t}(ev, '#{ev}', ##{jsCur}#); })"
							else
								n2 = if @assigners[n] then n else '#default'
								@doSimple ret, js, jsCur, n, v, @assigners[n2]
					@compileInner ret, cur, js, jsCur
			else if cur.nodeType==8  # COMMENT_NODE
				ct = cur.nodeValue
				# We know comment nodes can only contain one {{...}}
				if /^\{\{.*\}\}$/.exec(ct)
					# We actually need a text node rather than a comment node
					txt = document.createTextNode()
					cur.parentNode.insertBefore txt, cur
					cur.parentNode.removeChild cur
					cur = txt
					@doSimple ret, js, jsCur, 'text', ct, @assigners['#text']
			jsCur = js.addVar "#{jsEl}_ch", "##{jsCur}#.nextSibling";
			cur = cur.nextSibling

	# TODO: Put these special things somewhere better
	special_if: (ret, js, cur, jsCur, jsEl, jsData, val) ->
		pre = document.createComment ""
		post = document.createComment ""
		cur.parentNode.insertBefore pre, cur
		cur.parentNode.insertBefore post, cur
		frag = document.createDocumentFragment()
		frag.appendChild cur
		inner = @compileFrag frag
		jsPost = js.addVar "#{jsCur}_end", "##{jsCur}#.nextSibling"
		@doIf ret, js, pre, jsCur, post, jsPost, jsEl, jsData, val, inner
		return [post, jsPost]

	special_foreach: (ret, js, cur, jsCur, jsEl, jsData, val) ->
		pre = document.createComment ""
		post = document.createComment ""
		cur.parentNode.insertBefore pre, cur
		cur.parentNode.insertBefore post, cur
		frag = document.createDocumentFragment()
		frag.appendChild cur
		inner = @compileFrag frag
		jsPost = js.addVar "#{jsCur}_end", "##{jsCur}#.nextSibling"
		@doForEach ret, js, pre, jsCur, post, jsPost, jsEl, jsData, val, inner
		return [post, jsPost]

	# Below here, it's utility functions, which maybe should be moved.
	tmplToFrag: (txt) ->
		# For the browser to parse the HTML, we need to make sure there's no strange text in odd places. Browsers love them some comments, though.
		txt = txt.replace /\{\{/g, "<!--{{"
		txt = txt.replace /\}\}/g, "}}-->"
		# Clones to avoid any transient nodes.
		@htmlToFrag(txt).cloneNode(true).cloneNode(true)
	
	htmlToFrag: (html) ->
		firsttag = /<(\w+)/.exec(html)[1].toLowerCase()
		wrap = @nodeWraps[firsttag]||@nodeWraps['#other']
		el = document.createElement "div"
		el.innerHTML = wrap[1]+html+wrap[2];
		depth = wrap[0]
		while depth--
			el = el.firstChild
		frag = document.createDocumentFragment()
		while el.firstChild
			frag.appendChild el.firstChild
		frag

	# For innerHTML to work properly, it has to be in the right context; this table lists them. #other wraps in so much because otherwise IE will lose whitespace/link nodes.
	# Note: Callers will need to be careful with scripts. They'll still be there.
	nodeWraps:
		'#other': [4, '<table><tbody><tr><td>', '</td></tr></tbody></table>']
		td: [ 3, '<table><tbody><tr>', '</tr></tbody></table>']
		tr: [ 2, '<table><tbody>', '</tbody></table>']
		tbody: [1, '<table>', '</table>']
		tfoot: [1, '<table>', '</table>']
		thead: [1, '<table>', '</table>']
		option: [1, '<select multiple="multiple">', '</select>']
		optgroup: [1, '<select multiple="multiple">', '</select>']
		li: [1, '<ul>', '</ul>']
		legend: [1, '<fieldset>', '</fieldset>']

	escapesReplace: (txt, fn) ->
		# I would put this outside, but JS regexps alter propeties of the regexp object and so aren't reentrant.
		escape = /\{\{(.*?)\}\}/g;
		m = undefined
		last = 0
		s = ""
		while m = escape.exec(txt)
			if m.index>last
				s += '+"' + txt.substring(last, m.index).replace(/[\\\"]/g, "\\$1") + '"'
			s += '+' + fn(m[1])
			last = m.index+m[0].length
		if (last<txt.length)
			s += '+"' + txt.substring(last, txt.length).replace(/[\\\"]/g, "\\$1") + '"'
		s.slice(1)
	
	assigners:
		'#text': "#el#.nodeValue = #v#"
		'#default': "#el#.setAttribute(#n#, #v#)"
		'class': "#el#.className = #v#"

class undoer
	cur:
		push: ->
			# By default, we just discard undoers, since nobody's collecting them.
	constructor: ->
		@stack = []
	add: (fn) ->
		@cur.push fn
	start: () ->
		@stack.push @cur
		@cur = []
	claim: () ->
		cur = @cur
		@cur = @stack.pop()
		return () ->
			for fn in cur
				fn()
			cur = []

this.$undo = new undoer
this.platter =
	internal:
		templateCompiler: templateCompiler
		templateRunner: templateRunner
