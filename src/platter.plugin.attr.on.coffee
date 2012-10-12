# Support for things like this:
#   onclick="{{myfn}}" - runs myfn when the user clicks
#   onafterkeydown="{{myfn}}" - runs myfn after the processing of the keydown event is finished (so you can see the resultant value)
#   onclick="{{++mynum}}" - increments mynum when the user clicks
#   onclick="{{<>myval}}" - Sets myval to be the field-value, when the user clicks
# There are no particular limits on event names. onafter should work for all events.
# (oninput has special handling in a separate plugin)

Runner = Platter.Internal.TemplateRunner
Compiler = Platter.Internal.TemplateCompiler


isEventAttr = (name) -> !!/^on/.exec(name)

runDOMEvent = (undo, el, ev, fn) ->
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


runEvent = Runner::addUniqueMethod 'runEvent', defaultRunEvent

doEvent = Compiler::addUniqueMethod 'doEvent', (ps, realn, v) ->
	m = /^on(after)?(.*)$/.exec(realn)
	isAfter = m[1]
	ev = m[2]
	Platter.EscapesNoString v, "", (t) =>
		orig = t
		# TODO: Perhaps generalise this to arbitrary JS expressions. We'd need a parse-tree walker, which might be a bit code-heavy.
		m = /^(<>|\+\+|--)?(.*?)(\+\+|--)?$/.exec t
		if !m || m[1] && m[3] && m[1]!=m[3]
			throw new Error("{{#{orig}}} is bad; only event handlers of the forms a.b, <>a.b, ++a.b, --a.b, a.b++ and a.b-- are currently supported")
		t = m[2]
		op = m[1]||m[3]
		jsThis = ps.js.addForcedVar "#{ps.jsEl}_this", "this"
		# If there is a dot in the expression, we need to fetch the left-hand-side of that into a variable
		# (For setters/getters we need to know what to call them on. For functions, we need a 'this'.)
		m = /^\s*(\.*)([^.\s].*)\.(.*)$/.exec t
		if m
			jsTarget = ps.js.addForcedVar "#{ps.jsEl}_target", "null"
			@doBase ps, 'text', "{{#{m[1]}#{m[2]}}}", "#{jsTarget} = #v#", null
			post = m[3]
		else
			m = /^\s*(\.*)([^.\s].*)$/.exec t
			if (m)
				jsTarget = ps.jsDatas[(m[1].length||1)-1]
				post = m[2]
			else if op
				throw new Error("Sorry, {{#{orig}}} is not supported, because I can't replace the current data item");
			else
				m = /^\s*(\.+)$/.exec t
				jsTarget = ps.jsDatas[(m[1].length||1)-1]
		if op=='++' || op=='--'
			handler = "Platter.Modify(#{jsTarget}, #{ps.js.toSrc post}, function(v){return #{op}v})"
		else if op=='<>'
			# TODO: Support radio buttons, select-boxes and maybe others
			valGetter =
				if ps.valGetter
					ps.valGetter.replace("#el#", "#{ps.jsEl}")
				else
					ps.js.index ps.jsEl, if (ps.el.type=='checkbox') then 'checked' else 'value'
			handler = "Platter.Set(#{jsTarget}, #{ps.js.toSrc post}, #{valGetter})"
		else
			if (post)
				jsFn = ps.js.addForcedVar "#{ps.jsEl}_fn", "null"
				@doBase ps, 'text', "{{#{t}}}", "#{jsFn} = #v#", null
			else
				jsFn = jsTarget
			handler = "#{jsFn}.call(#{jsTarget}, ev, #{ps.js.toSrc ev}, #{ps.jsEl})"

		if isAfter
			ps.js.addExpr "this.#{runEvent}(undo, #{ps.jsEl}, #{ps.js.toSrc ev}, function(ev) {setTimeout(function(){ #{handler} }, 1)})"
		else
			ps.js.addExpr "this.#{runEvent}(undo, #{ps.jsEl}, #{ps.js.toSrc ev}, function(ev){ #{handler} })"


Compiler::addAttrPlugin 'on.*', 0, (comp, ps) ->
	for own realn, {n, realn, v} of ps.attrs()
		if isEventAttr realn
			if (realn!=n)
				ps.el.removeAttribute n
			comp[doEvent] ps, realn, v
			ps.remAttr(realn)
	false
