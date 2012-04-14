# Element plugin to map textarea value correctly.

Platter.Internal.TemplateCompiler::addElPlugin 'textarea', 300, (comp, ps) ->
	if Platter.HasEscape ps.el.value
		ps.setAttr 'value', Platter.UncommentEscapes Platter.UnhideAttr ps.el.value
	false
