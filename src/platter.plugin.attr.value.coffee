# Given value="{{<>blah}}" or checked="{{<>blah}}", generates value="{{blah}}"/checked="{{blah}}" and oninput="{{<>blah}}"

# Property-change events don't fire for the first user-initiated value change after an assignment, so we'll reduce the number of unnecessary assignments.
# Also, now, apparently, Chrome sometimes moves the cursor to the end if one assigns the current value of an email field into the email field.
Platter.Internal.TemplateCompiler::addAttrAssigner 'value', 0, "if (#el#.value !== #v#) #el#.value = #v#", true

Platter.Internal.TemplateCompiler::addAttrPlugin 'value|checked', 200, (comp, ps) ->
	for n in ['value', 'checked']
		v = ps.getAttr(n)
		if !v then continue
		m = /^\{\{<>(.*?)\}\}/.exec(v)
		if !m then continue
		if m[0].length!=v.length
			throw new Error("{{<>thing}} cannot be in the same value attribute as anything else")
		type = ps.getAttr 'type'
		if Platter.HasEscape(type||'')
			throw new Error("{{<>thing}} cannot be the value of an element with dynamic type")
		ev = 
			if type && (type=='checkbox' || type=='radio') || ps.el.nodeName.toLowerCase()=='select'
				'onchange'
			else
				'oninput'
		ps.setAttr ev, v + (ps.getAttr(ev)||'')
		ps.setAttr n, "{{#{m[1]}}}"
	false

