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
		jsData = js.existingVar 'data'
		jsEl = js.addVar 'el', 'this.node.cloneNode(true)', frag
		ret = @makeRet(frag)
		@compileInner ret, js, jsEl, jsData
		js.addExpr "return #{jsEl}"
		#alert js
		ret.run = new Function('data', ""+js)
		ret
	
	compileInner: (ret, js, jsEl, jsData) ->
		jsCur = js.addVar jsEl+"_ch", "#{jsEl}.firstChild", jsEl.v.firstChild
		while (jsCur.v)
			if jsCur.v.nodeType==1  # Element
				isSpecial = false
				[attrs...] = jsCur.v.attributes
				for att in attrs
					n = att.nodeName
					realn = unhideAttrName n
					if (realn&&this["special_#{realn}"])
						isSpecial = true
						v = uncommentEscapes unhideAttr att.nodeValue
						jsCur.v.removeAttribute n
						jsCur = this["special_#{realn}"](ret, js, jsCur, jsData, v)
						break
				if !isSpecial
					for att in attrs
						v = uncommentEscapes unhideAttr att.nodeValue
						n = att.nodeName
						realn = unhideAttrName n
						if (realn!=n)
							jsCur.v.removeAttribute n
						if !(hasEscape v)
							jsCur.v.setAttribute realn, v
						else
							if (realn[0]=='o'&&realn[1]=='n')
								# Event handler!
								ev = realn.substr(2)
								@escapesReplace v, (t) ->
									js.addExpr "this.runEvent(#{jsCur}, '#{ev}', function(ev){ return data.#{t}(ev, '#{ev}', #{jsCur}); })"
							else
								n2 = if @assigners[realn] then realn else '#default'
								@doSimple ret, js, jsCur, realn, v, @assigners[n2]
					@compileInner ret, js, jsCur, jsData
			else if jsCur.v.nodeType==8  # Comment
				ct = jsCur.v.nodeValue
				ct = unhideAttr ct
				# We know comment nodes can only contain one {{...}}
				if /^\{\{.*\}\}$/.exec(ct)
					# We actually need a text node rather than a comment node
					txt = document.createTextNode ""
					jsCur.v.parentNode.insertBefore txt, jsCur.v
					jsCur.v.parentNode.removeChild jsCur.v
					jsCur.v = txt
					@doSimple ret, js, jsCur, 'text', ct, @assigners['#text']
			else if jsCur.v.nodeType==3 || jsCur.v.nodeType==4  # Text/CData
				jsCur.v.nodeValue = unhideAttr jsCur.v.nodeValue
			jsCur = js.addVar "#{jsEl}_ch", "#{jsCur}.nextSibling", jsCur.v.nextSibling;


	# TODO: Put these special things somewhere better
	special_if: (ret, js, jsCur, jsData, val) ->
		[jsCur.v, post, frag] = pullNode jsCur.v
		inner = @compileFrag frag
		jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
		@doIf ret, js, jsCur, jsPost, jsData, val, inner
		jsPost

	special_foreach: (ret, js, jsCur, jsData, val) ->
		[jsCur.v, post, frag] = pullNode jsCur.v
		inner = @compileFrag frag
		jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
		@doForEach ret, js, jsCur, jsPost, jsData, val, inner
		jsPost

	# Below here, it's utility functions, which maybe should be moved.
	tmplToFrag: (txt) ->
		txt = hideAttr commentEscapes trim txt
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
		#TODO: style in Firefox -> .style.cssText
		#TODO: type in IE -> recreate the node, somehow


# People don't want the whitespace that accidentally surrounds their template.
# Whitespace nodes _within_ the template are maintained.
trim = (txt) ->
	txt = txt.replace /^\s+/, ""
	txt = txt.replace /\s+$/, ""

# For Firefox to not do crazy things (and, to be fair, maybe other 
# browsers), we need to disguise some attributes.
# However, IE doesn't like type being messed with.
hideAttr = (txt) ->
	txt = txt.replace /([a-z][-a-z0-9_]*=)/ig, "data-platter-$1"
	txt = txt.replace /data-platter-type=/g, "type="
unhideAttr = (txt) ->
	txt = txt.replace /data-platter-([a-z][-a-z0-9_]*=)/g, "$1"
unhideAttrName = (txt) ->
	txt = txt.replace /data-platter-([a-z][-a-z0-9_]*)/g, "$1"

# For the browser to parse our HTML, we need to make sure there's no strange text in odd places. Browsers love them some comments, though.
commentEscapes = (txt) ->
	txt = txt.replace /\{\{/g, "<!--{{"
	txt = txt.replace /\}\}/g, "}}-->"
uncommentEscapes = (txt) ->
	txt = txt.replace /<!--\{\{/g, "{{"
	txt = txt.replace /\}\}-->/g, "}}"

hasEscape = (txt) ->
	!!/\{\{/.exec txt

pullNode = (node) ->
	pre = document.createComment ""
	post = document.createComment ""
	node.parentNode.insertBefore pre, node
	node.parentNode.insertBefore post, node
	frag = document.createDocumentFragment()
	frag.appendChild node
	[pre, post, frag]


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
