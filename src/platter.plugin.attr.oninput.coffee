# Not all browsers support oninput, and jQuery doesn't polyfill it, so we'll replace it with lots of other things
# TODO: Maybe make the onpropertychange more selective - it should only react to things that change the control's value

if Platter.Browser.LacksInputEvent || Platter.Browser.BrokenInputEvent
	Platter.Internal.TemplateCompiler::addAttrPlugin 'oninput', 199, (comp, ps) ->
		v = ps.getAttr 'oninput'
		# TODO: Should this only affect attributes with escapes?
		if Platter.Browser.LacksInputEvent
			ps.remAttr 'oninput'
		if Platter.Browser.SupportsPropertyChangeEvent
			ps.setAttr 'onpropertychange', v
		# So many events can change the value
		for ev in ['onafterdrop', 'onafterkeydown', 'onafterpaste', 'onaftercut', 'onaftertextInput', 'onafterdragend']
			ps.setAttr ev, v + (ps.getAttr(ev)||'')
		false
