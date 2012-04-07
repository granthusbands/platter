# Given value="{{>blah}}" or checked="{{>blah}}", generates value="{{blah}}"/checked="{{blah}}" and oninput="{{>blah}}"

Compiler = Platter.Internal.TemplateCompiler
Compiler::addAttrPlugin 'value|checked', 200, (comp, ret, js, jsCur, jsDatas, attrs, attrNames, updateAttrNames) ->
	for n in ['value', 'checked']
		if !attrs[n] then continue
		m = /^\{\{>(.*?)\}\}/.exec(attrs[n].v)
		if !m then continue
		if m[0].length!=attrs[n].v.length
			throw new Error("{{>thing}} cannot be in the same value attribute as anything else")
		if attrs.type && /\{\{/.exec(attrs.type.v)
			throw new Error("{{>thing}} cannot be the value of an element with dynamic type")
		ev = 
			if attrs.type && (attrs.type.v=='checkbox' || attrs.type.v=='radio')
				'onchange'
			else
				'oninput'
		attrs[ev] =
			n: attrs[ev]?.n || ev
			realn: ev
			v: attrs[n].v + (attrs[ev]?.v || '')
		attrs[n].v = "{{#{m[1]}}}"
	updateAttrNames Platter.AttrNames attrs
	null
