

# For innerHTML to work properly, it has to be in the right context; this table lists them. #other wraps in so much because otherwise IE will lose whitespace/link nodes.
# Note: Callers will need to be careful with scripts. They'll still be there.
nodeWraps =
	'#other': [4, '<table><tbody><tr><td>', '</td></tr></tbody></table>']
	td: [ 3, '<table><tbody><tr>', '</tr></tbody></table>']
	tr: [ 2, '<table><tbody>', '</tbody></table>']
	tbody: [1, '<table>', '</table>']
	tfoot: [1, '<table>', '</table>']
	thead: [1, '<table>', '</table>']
	option: [1, '<select multiple="multiple">', '</select>']
	optgroup: [1, '<select multiple="multiple">', '</select>']
	li: [1, '<ul>', '</ul>']
	legend: [1, '<fieldset>', '</fieldset>']

Platter.Helper.HtmlToFrag = (html) ->
	firsttag = /<(\w+)/.exec(html)[1].toLowerCase()
	wrap = nodeWraps[firsttag]||nodeWraps['#other']
	el = document.createElement "div"
	el.innerHTML = "a"+wrap[1]+html+wrap[2];
	depth = wrap[0]
	while depth--
		el = el.lastChild
	frag = document.createDocumentFragment()
	while el.firstChild
		frag.appendChild el.firstChild
	frag

# Below here, it's utility functions, which maybe should be moved.
Platter.Helper.TmplToFrag = (txt) ->
	txt = Platter.HideAttr Platter.CommentEscapes Platter.Trim txt
	# Clones to avoid any transient nodes.
	Platter.Helper.HtmlToFrag(txt).cloneNode(true).cloneNode(true)

Platter.AttrList = (node) ->
	if Platter.Browser.AttributeIterationBreaksClone
		node = node.cloneNode false
	ret = {}
	for att in node.attributes when Platter.IsPlatterAttr att.nodeName
		realn = Platter.UnhideAttrName att.nodeName
		ret[realn] = 
			n: att.nodeName
			realn: realn
			v: Platter.UncommentEscapes Platter.UnhideAttr att.nodeValue
	ret

Platter.AttrNames = (attrList) ->
	(n for own n, v of attrList).join('\n')

Platter.RemoveNode = (node) ->
	node.parentNode.removeChild node

Platter.InsertNode = (par, before, node) ->
	if !par then par = before.parentNode
	if !par then return
	if !before
		par.appendChild node
	else
		par.insertBefore node, before
