

runDOMEvent = (undo, el, ev, fn) ->
	# TODO: Polyfill oninput:
	# IE <=8: attachEvent onpropertychange, ev.propertyName=='value'
	# IE9: Misses some input (as does onpropertychange).
	#      Probably should also handle onkeydown+delay.
	# Safari: Fires ontextinput for textarea, instead.
	# All else: Use oninput
	el.addEventListener ev, fn
	undo.add ->
		el.removeEventListener ev, fn

runJQueryEvent = (undo, el, ev, fn) ->
	jQuery(el).on ev, fn
	undo.add ->
		jQuery(el).off ev, fn

defaultRunEvent = runDOMEvent
if window.jQuery
	defaultRunEvent = runJQueryEvent
# TODO: Maybe support ext, Prototype and other event libraries

specAttrs = []
specBlocks = {}

# Add a block that extracts its dom nodes
addBlockExtract = (n, fn) ->
	fn2 = (comp, ret, js, jsCur, jsDatas, val) ->
		[jsCur.v, post, frag] = pullBlock n, jsCur.v
		fn comp, frag, ret, js, jsCur, post, jsDatas, val
	specBlocks[n] = fn2

# Add a special attribute that extracts the node
addSpecialAttrExtract = (n, pri, fn) ->
	fn2 = (comp, ret, js, jsCur, jsDatas, val) ->
		[jsCur.v, post, frag] = pullNode jsCur.v
		fn comp, frag, ret, js, jsCur, post, jsDatas, val
	specAttrs.push pri: pri, n: n, fn: fn2
	specAttrs.sort (a,b) ->
		if (a.pri<b.pri) then 1 else if (a.pri>b.pri) then -1 else 0

# Add a block and special attribute that both extract the nodes of interest
addBlockAndAttrExtract = (n, pri, fn) ->
	addBlockExtract n, fn
	addSpecialAttrExtract n, pri, fn


class TemplateRunner
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


class TemplateCompiler
	makeRet: (node) ->
		new TemplateRunner(node)

	# Below here, I doubt anyone will override anything
	compile: (txt) ->
		@compileFrag tmplToFrag(txt), 1
	
	compileFrag: (frag, ctxCnt) ->
		js = new Platter.Internal.CodeGen
		# TODO: Confirm that we can change this variable name without issue
		jsDatas = []
		for i in [0...ctxCnt]
			jsDatas.push js.existingVar 'data'+i
		js.existingVar 'undo'
		# TODO: Confirm that we can change this variable name without issue
		jsAutoRemove = js.existingVar 'autoRemove'
		js.addExpr 'undo = undo ? undo.child() : new Platter.Undo()'
		jsEl = js.addVar 'el', 'this.node.cloneNode(true)', frag
		ret = @makeRet(frag)
		@compileInner ret, js, jsEl, jsDatas
		jsFirstChild = js.addForcedVar "firstChild", "#{jsEl}.firstChild"
		jsLastChild = js.addForcedVar "lastChild", "#{jsEl}.lastChild"
		jsSelf = js.addForcedVar "self", "this"
		js.addExpr """
			if (#{jsAutoRemove}===true||#{jsAutoRemove}==null)
				undo.add(function(){
					#{jsSelf}.removeAll(#{jsFirstChild}, #{jsLastChild});
				});
			"""
		if jsEl.v.firstChild==jsEl.v.lastChild
			js.addExpr "return {el: #{jsFirstChild}, docfrag: #{jsEl}, undo: function(){undo.undo()}};"
		else
			js.addExpr "return {docfrag: #{jsEl}, undo: function(){undo.undo()}};"
		#alert "function(#{(d.n for d in jsDatas).join ', '}, autoRemove) {\n#{js}\n}"
		try
			ret.run = new Function((d.n for d in jsDatas).join(', '), 'undo', 'autoRemove', ""+js)
		catch e
			throw new Error("Internal error: Function compilation failed: #{e.message}\n\n#{js}")
		ret
	
	compileInner: (ret, js, jsEl, jsDatas) ->
		jsCur = js.addVar jsEl+"_ch", "#{jsEl}.firstChild", jsEl.v.firstChild
		js.forceVar jsCur
		while (jsCur.v)
			if jsCur.v.nodeType==1  # Element
				isSpecial = false
				attrs = attrList jsCur.v
				if jsCur.v.tagName.toLowerCase()=='textarea' && hasEscape jsCur.v.value
					attrs.value =
						n: 'value'
						realn: 'value'
						v: uncommentEscapes unhideAttr jsCur.v.value
				for {n, fn} in specAttrs
					if attrs.hasOwnProperty(n) && hasEscape(attrs[n].v)
						isSpecial = true
						jsCur.v.removeAttribute attrs[n].n
						jsCur = fn @, ret, js, jsCur, jsDatas, attrs[n].v
						break
				if !isSpecial
					for realn, {n, realn, v} of attrs
						if (realn!=n)
							jsCur.v.removeAttribute n
						if !(hasEscape v)
							if realn!=n
								jsCur.v.setAttribute realn, v
						else
							if isEventAttr realn
								@doEvent ret, js, jsCur, jsDatas, realn, v
							else
								n2 = if @assigners[realn] then realn else '#default'
								@doSimple ret, js, jsCur, jsDatas, realn, v, @assigners[n2]
					if jsCur.v.tagName.toLowerCase()!='textarea'
						@compileInner ret, js, jsCur, jsDatas
			else if jsCur.v.nodeType==8  # Comment
				ct = jsCur.v.nodeValue
				ct = unhideAttr ct
				# We know our comment nodes can only contain one {{#...}}
				if m=/^\{\{([#\/])([^\s\}]+)\s*(.*?)\}\}$/.exec(ct)
					if m[1]=='/'
						throw new Error("Unmatched end-block "+ct);
					if !specBlocks.hasOwnProperty m[2]
						throw new Error("Unrecognised block "+ct);
					jsCur = specBlocks[m[2]] @, ret, js, jsCur, jsDatas, "{{#{m[3]}}}"
			else if jsCur.v.nodeType==3 || jsCur.v.nodeType==4  # Text/CData
				jsCur.v.nodeValue = unhideAttr jsCur.v.nodeValue
				if jsCur.v.nodeValue.indexOf('{{')!=-1
					@doSimple ret, js, jsCur, jsDatas, 'text', jsCur.v.nodeValue, @assigners['#text']
			jsCur = js.addVar "#{jsEl}_ch", "#{jsCur}.nextSibling", jsCur.v.nextSibling

	doEvent: (ret, js, jsCur, jsDatas, realn, v) ->
		ev = realn.substr(2)
		escapesNoString v, "", (t) =>
			orig = t
			# TODO: Perhaps generalise this to arbitrary JS expressions. We'd need a parse-tree walker, which might be a bit code-heavy.
			m = /^(>|\+\+|--)?(.*?)(\+\+|--)?$/.exec t
			if !m || m[1] && m[3] && m[1]!=m[3]
				throw new Error("{{#{orig}}} is bad; only event handlers of the forms a.b, >a.b, ++a.b, --a.b, a.b++ and a.b-- are currently supported")
			t = m[2]
			op = m[1]||m[3]
			#[jsData, t] = chooseData t, jsDatas
			jsThis = js.addForcedVar "#{jsCur}_this", "this"
			# If there is a dot in the expression, we need to fetch the left-hand-side of that into a variable
			# (For setters/getters we need to know what to call them on. For functions, we need a 'this'.)
			m = /^\s*(\.*)([^.\s].*)\.(.*)$/.exec t
			if m
				jsTarget = js.addForcedVar "#{jsCur}_target", "null"
				@doBase ret, js, jsCur, jsDatas, 'text', "{{#{m[1]}#{m[2]}}}", "#{jsTarget} = #v#", null
				post = m[3]
			else
				m = /^\s*(\.*)([^.\s].*)$/.exec t
				if (m)
					jsTarget = jsDatas[(m[1].length||1)-1]
					post = m[2]
				else if op
					throw new Error("Sorry, {{#{orig}}} is not supported, because I can't replace the current data item");
				else
					m = /^\s*(\.+)$/.exec t
					jsTarget = jsDatas[(m[1].length||1)-1]
			if op=='++' || op=='--'
				js.addExpr "this.runEvent(undo, #{jsCur}, #{js.toSrc ev}, function(ev){ #{jsThis}.doModify(#{jsTarget}, #{js.toSrc post}, function(v){return #{op}v})})";
			else if op=='>'
				if (jsCur.v.type=='checkbox') # TODO: Support radio buttons, select-boxes and maybe others
					prop = 'checked'
				else
					prop = 'value'
				js.addExpr "this.runEvent(undo, #{jsCur}, #{js.toSrc ev}, function(ev){ #{jsThis}.doSet(#{jsTarget}, #{js.toSrc post}, #{js.index jsCur, prop}); })"
			else
				if (post)
					jsFn = js.addForcedVar "#{jsCur}_fn", "null"
					@doBase ret, js, jsCur, jsDatas, 'text', "{{#{t}}}", "#{jsFn} = #v#", null
				else
					jsFn = jsTarget
				js.addExpr "this.runEvent(undo, #{jsCur}, #{js.toSrc ev}, function(ev){ #{jsFn}.call(#{jsTarget}, ev, #{js.toSrc ev}, #{jsCur}); })"

	assigners:
		'#text': "#el#.nodeValue = #v#"
		'#default': "#el#.setAttribute(#n#, #v#)"
		'class': "#el#.className = #v#"
		'checked': "#el#.defaultChecked = #el#.checked = !!(#v#)"
		'value': "#el#.value = #v#"
		#'name': "#el#.name = #v#" #IE7 doesn't let you setAttribute name  TODO: Check and implement
		#TODO: style in Firefox -> .style.cssText
		#TODO: type in IE -> recreate the node, somehow


this.Platter =
	Internal:
		TemplateCompiler: TemplateCompiler
		TemplateRunner: TemplateRunner
		SubsCount: 0
		Subs: {}
	Helper: {}


# TODO: Move these into a separate file
addBlockAndAttrExtract 'foreach', 100, (comp, frag, ret, js, jsCur, post, jsDatas, val) ->
	inner = comp.compileFrag frag, jsDatas.length+1
	ret[jsCur.n] = inner
	jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
	comp.doForEach ret, js, jsCur, jsPost, jsDatas, val, inner
	jsPost

addBlockAndAttrExtract 'if', 60, (comp, frag, ret, js, jsCur, post, jsDatas, val) ->
	inner = comp.compileFrag frag, jsDatas.length
	ret[jsCur.n] = inner
	jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
	comp.doIf ret, js, jsCur, jsPost, jsDatas, val, inner
	jsPost

addBlockAndAttrExtract 'unless', 60, (comp, frag, ret, js, jsCur, post, jsDatas, val) ->
	inner = comp.compileFrag frag, jsDatas.length
	ret[jsCur.n] = inner
	jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
	comp.doUnless ret, js, jsCur, jsPost, jsDatas, val, inner
	jsPost

addBlockAndAttrExtract 'with', 40, (comp, frag, ret, js, jsCur, post, jsDatas, val) ->
	inner = comp.compileFrag frag, jsDatas.length+1
	ret[jsCur.n] = inner
	jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
	comp.doWith ret, js, jsCur, jsPost, jsDatas, val, inner
	jsPost
