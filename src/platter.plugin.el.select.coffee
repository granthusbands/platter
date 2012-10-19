# Some magic for intuitive <select> and <option> usage.
#
# Adds support for this:
#   <select value="{{someval}}" oninput="{{<>someval}}">
#     <option>None</option>
#     <option foreach="{{somelist}}">{{name}}</option>
#     <option value="{{somethingelse}}">Other</option>
#   </select>
#
# The first option, labelled None, has a value of undefined.
# The looped options have a value of the corresponding loop entry.
# The last option has the given value (not necessarily a string).
# someval always contains the value for the selected option.
# The special behaviour only happens for <select>s with a special value attribute.
# This has the side-effect that the value of <option> elements inside of one of these selects do not behave as the normally would.


getOptVal = (tpl, opt) ->
	data = tpl.getPlatterData opt
	if data && data.hasOwnProperty('value')
		data.value
	else
		opt.value

# TODO: Support multi-select. Note the trickiness around the output array being useful to library users.
getSelVal = (tpl, el) ->
	for opt in el.options
		if opt.selected
			return getOptVal(tpl, opt)
	null

setSelVal = (tpl, el, val) ->
	for opt in el.options
		if val == getOptVal(tpl, opt)
			opt.selected = true

Platter.Internal.TemplateCompiler::addElPlugin 'select', 1, (comp, ps) ->
	if !Platter.HasEscape ps.getAttr 'value' then return
	ps.magicSelect = true

	jsGetSelVal = ps.js.addContext "#{ps.jsEl}_getSelVal", getSelVal
	jsSetSelVal = ps.js.addContext "#{ps.jsEl}_setSelVal", setSelVal

	v = ps.getAttr 'value'
	ps.remAttr 'value'
	ps.valGetter = "#{jsGetSelVal}(#{ps.jsSelf}, #el#)"

	ps.doAfter ->
		comp.doBase ps, 'value', v, "#{jsSetSelVal}(#{ps.jsSelf}, #el#, #v#)", null

	false

Platter.Internal.TemplateCompiler::addElPlugin 'option', 1, (comp, ps) ->
	# We're only interested in options inside magical selects
	pps = ps
	extraScopes = false
	while pps && !pps.magicSelect
		extraScopes ||= pps.extraScopes
		pps = pps.parent
	if !pps then return

	# A default value
	if !ps.getAttr 'value'
		ps.setAttr 'value', if extraScopes then '{{.}}' else '{{undefined}}'

	# Values are expected to be and are treated as opaque data
	if !Platter.HasEscape ps.getAttr 'value' then return
	jsOptData = ps.getJSElData()
	v = ps.getAttr 'value'
	ps.setAttr 'value', (ps, n) ->
		comp.doBase ps, n, v, "#{jsOptData}.value = #v#", null
	#TODO: When .value updates and the option is selected, we need to run the onchange/oninput for the select-box
	false
