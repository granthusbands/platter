# Element plugin to map textarea value correctly.

Platter.Internal.TemplateCompiler::addElPlugin 'textarea', 300, (comp, ret, js, jsCur, jsDatas, attrs, attrNames, updateAttrNames) ->
	if Platter.HasEscape jsCur.v.value
		attrs.value =
			n: 'value'
			realn: 'value'
			v: Platter.UncommentEscapes Platter.UnhideAttr jsCur.v.value
		updateAttrNames Platter.AttrNames attrs
	null
