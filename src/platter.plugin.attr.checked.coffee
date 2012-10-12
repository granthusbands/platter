# Some browsers need defaultChecked to hold the desired value, when the checkbox is added to the page
Platter.Internal.TemplateCompiler::addAttrAssigner 'checked', 0, "#el#.defaultChecked = #el#.checked = !!(#v#)", '&&'
