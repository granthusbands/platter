runDOMEvent = (el, ev, fn) ->
	# TODO: Polyfill oninput:
	# IE <=8: attachEvent onpropertychange, ev.propertyName=='value'
	# IE9: Misses some input (as does onpropertychange).
	#      Probably should also handle onkeydown+delay.
	# Safari: Fires ontextinput for textarea, instead.
	# All else: Use oninput
	el.addEventListener ev, fn
	$undo.add ->
		el.removeEventListener ev, fn

runJQueryEvent = (el, ev, fn) ->
	jQuery(el).on ev, fn
	$undo.add ->
		jQuery(el).off ev, fn

defaultRunEvent = runDOMEvent
if window.jQuery
	defaultRunEvent = runJQueryEvent
# TODO: Maybe support ext, Prototype and other event libraries

class templateRunner
	constructor: (node) ->
		@node = node
	removeBetween: (startel, endel) ->
		par = startel.parentNode
		return if !par
		prev = undefined
		while (prev=endel.previousSibling)!=startel
			par.removeChild prev
		undefined
	runEvent: defaultRunEvent
	removeAll: (startel, endel) ->
		par = startel.parentNode
		return if !par
		if startel==endel
			par.removeChild startel
			return
		if startel.nextSibling!=endel
			@removeBetween startel, endel
		par.removeChild endel
		par.removeChild startel


class templateCompiler
	makeRet: (node) ->
		new templateRunner(node)

	# Below here, I doubt anyone will override anything
	compile: (txt) ->
		@compileFrag @tmplToFrag txt
	
	compileFrag: (frag) ->
		js = new platter.internal.codegen
		# TODO: Confirm that we can change this variable name without issue
		jsData = js.existingVar 'data'
		# TODO: Confirm that we can change this variable name without issue
		jsAutoRemove = js.existingVar 'autoRemove'
		jsEl = js.addVar 'el', 'this.node.cloneNode(true)', frag
		ret = @makeRet(frag)
		@compileInner ret, js, jsEl, jsData
		jsFirstChild = js.addForcedVar "firstChild", "#{jsEl}.firstChild"
		jsLastChild = js.addForcedVar "lastChild", "#{jsEl}.lastChild"
		jsSelf = js.addForcedVar "self", "this"
		js.addExpr """
			if (#{jsAutoRemove}===true||#{jsAutoRemove}==null)
				$undo.add(function(){
					#{jsSelf}.removeAll(#{jsFirstChild}, #{jsLastChild});
				});
			"""
		if jsEl.v.firstChild==jsEl.v.lastChild
			js.addExpr "return #{jsFirstChild}"
		else
			js.addExpr "return #{jsEl}"
		#alert js
		ret.run = new Function('data', 'autoRemove', ""+js)
		ret
	
	compileInner: (ret, js, jsEl, jsData) ->
		jsCur = js.addVar jsEl+"_ch", "#{jsEl}.firstChild", jsEl.v.firstChild
		js.forceVar jsCur
		while (jsCur.v)
			if jsCur.v.nodeType==1  # Element
				isSpecial = false
				attrs = ({
				  n: att.nodeName
				  realn: unhideAttrName att.nodeName
				  v: uncommentEscapes unhideAttr att.nodeValue
				  } for att in jsCur.v.attributes)
				if jsCur.v.tagName.toLowerCase()=='textarea' && hasEscape jsCur.v.value
					attrs.push
						n: 'value'
						realn: 'value'
						v: uncommentEscapes unhideAttr jsCur.v.value
				for {n, realn, v} in attrs
					if (realn && this["special_#{realn}"] && hasEscape v)
						isSpecial = true
						jsCur.v.removeAttribute n
						jsCur = this["special_#{realn}"](ret, js, jsCur, jsData, v)
						break
				if !isSpecial
					for {n, realn, v} in attrs
						if (realn!=n)
							jsCur.v.removeAttribute n
						if !(hasEscape v)
							jsCur.v.setAttribute realn, v
						else
							if isEvent realn
								@doEvent ret, js, jsCur, jsData, realn, v
							else
								n2 = if @assigners[realn] then realn else '#default'
								@doSimple ret, js, jsCur, jsData, realn, v, @assigners[n2]
					@compileInner ret, js, jsCur, jsData
			else if jsCur.v.nodeType==8  # Comment
				ct = jsCur.v.nodeValue
				ct = unhideAttr ct
				# We know comment nodes can only contain one {{...}}
				if /^\{\{.*\}\}$/.exec(ct)
					# We actually need a text node rather than a comment node
					txt = document.createTextNode "."
					jsCur.v.parentNode.insertBefore txt, jsCur.v
					jsCur.v.parentNode.removeChild jsCur.v
					jsCur.v = txt
					@doSimple ret, js, jsCur, jsData, 'text', ct, @assigners['#text']
			else if jsCur.v.nodeType==3 || jsCur.v.nodeType==4  # Text/CData
				jsCur.v.nodeValue = unhideAttr jsCur.v.nodeValue
			jsCur = js.addVar "#{jsEl}_ch", "#{jsCur}.nextSibling", jsCur.v.nextSibling;

	doEvent: (ret, js, jsCur, jsData, realn, v) ->
		ev = realn.substr(2)
		@escapesReplace v, (t) ->
			if (t[0]=='>')
				t = t.substr 1
				jsThis = js.addVar "#{jsCur}_this", "this"
				js.forceVar jsThis
				if (jsCur.v.type=='checkbox')
					prop = 'checked'
				else
					prop = 'value'
				# TODO: Support radio buttons, select-boxes and maybe others
				js.addExpr "this.runEvent(#{jsCur}, #{js.toSrc ev}, function(ev){ #{jsThis}.doSet(#{jsData}, #{js.toSrc t}, #{js.index jsCur, prop}); })"
			else
				js.addExpr "this.runEvent(#{jsCur}, #{js.toSrc ev}, function(ev){ return #{js.index jsData, t}(ev, #{js.toSrc ev}, #{jsCur}); })"

	# TODO: Put these special things somewhere better
	special_if: (ret, js, jsCur, jsData, val) ->
		[jsCur.v, post, frag] = pullNode jsCur.v
		inner = @compileFrag frag
		ret[jsCur.n] = inner
		jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
		@doIf ret, js, jsCur, jsPost, jsData, val, inner
		jsPost

	special_unless: (ret, js, jsCur, jsData, val) ->
		[jsCur.v, post, frag] = pullNode jsCur.v
		inner = @compileFrag frag
		ret[jsCur.n] = inner
		jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
		@doUnless ret, js, jsCur, jsPost, jsData, val, inner
		jsPost

	special_foreach: (ret, js, jsCur, jsData, val) ->
		[jsCur.v, post, frag] = pullNode jsCur.v
		inner = @compileFrag frag
		ret[jsCur.n] = inner
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
			s += '+platter.str(' + fn(m[1]) + ')'
			last = m.index+m[0].length
		if (last<txt.length)
			s += '+"' + txt.substring(last, txt.length).replace(/[\\\"]/g, "\\$1") + '"'
		s.slice(1)
	
	assigners:
		'#text': "#el#.nodeValue = #v#"
		'#default': "#el#.setAttribute(#n#, #v#)"
		'class': "#el#.className = #v#"
		'checked': "#el#.checked = !!(#v#)"
		'value': "#el#.value = #v#"
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
	txt = txt.replace /data-platter-(?!type=)([a-z][-a-z0-9_]*=)/g, "$1"
unhideAttrName = (txt) ->
	txt = txt.replace /data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/g, "$1"

# For the browser to parse our HTML, we need to make sure there's no strange text in odd places. Browsers love them some comments, though.
commentEscapes = (txt) ->
	txt = txt.replace /\{\{/g, "<!--{{"
	txt = txt.replace /\}\}/g, "}}-->"
uncommentEscapes = (txt) ->
	txt = txt.replace /<!--\{\{/g, "{{"
	txt = txt.replace /\}\}-->/g, "}}"

hasEscape = (txt) ->
	!!/\{\{/.exec txt

str = (o) ->
	o ? ''

pullNode = (node) ->
	pre = document.createComment ""
	post = document.createComment ""
	node.parentNode.insertBefore pre, node
	node.parentNode.insertBefore post, node
	frag = document.createDocumentFragment()
	frag.appendChild node
	[pre, post, frag]

isEvent = (name) ->
	name[0]=='o' && name[1]=='n'

stackTrace = ->
	try
		throw new Error
	catch e
		e.stack

bigDebugRan = false
bigDebug = ->
	return if bigDebugRan
	bigDebugRan = true
	for o in platter.internal.debuglist
		do (o) ->
			if o.platter_watch
				id = Math.random()
				orig = o.platter_watch.platter_watch
				o.platter_watch.platter_watch = (n, fn) ->
					platter.internal.subscount++
					platter.internal.subs[id] = stackTrace()
					$undo.add ->
						platter.internal.subscount--
						delete platter.internal.subs[id]
					orig.call @, n, fn
			if o.platter_watchcoll
				id2 = Math.random()
				orig2 = o.platter_watchcoll.platter_watchcoll
				o.platter_watchcoll.platter_watchcoll = (add, remove, replaceMe) ->
					platter.internal.subscount++
					platter.internal.subs[id2] = stackTrace()
					$undo.add ->
						platter.internal.subscount--
						delete platter.internal.subs[id2]
					orig2.call @, add, remove, replaceMe

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
	undoToStart: () ->
		@claim()()

this.$undo = new undoer
this.platter =
	str: str
	internal:
		templateCompiler: templateCompiler
		templateRunner: templateRunner
		debuglist: []
		subscount: 0
		subs: {}
		bigDebug: bigDebug
