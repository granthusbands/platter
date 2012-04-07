# Given value="{{>blah}}" or checked="{{>blah}}", generates value="{{blah}}"/checked="{{blah}}" and oninput="{{>blah}}"

Compiler = Platter.Internal.TemplateCompiler
Compiler::addAttrPlugin 'value|checked', 200, (comp, ps) ->
	for n in ['value', 'checked']
		v = ps.getAttr(n)
		if !v then continue
		m = /^\{\{>(.*?)\}\}/.exec(v)
		if !m then continue
		if m[0].length!=v.length
			throw new Error("{{>thing}} cannot be in the same value attribute as anything else")
		type = ps.getAttr('type')
		if Platter.HasEscape(type||'')
			throw new Error("{{>thing}} cannot be the value of an element with dynamic type")
		ev = 
			if type && (type=='checkbox' || type=='radio')
				'onchange'
			else
				'oninput'
		ps.setAttr ev, v + (ps.getAttr(ev)||'')
		ps.setAttr n, "{{#{m[1]}}}"
	null
