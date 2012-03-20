

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

htmlToFrag = (html) ->
	firsttag = /<(\w+)/.exec(html)[1].toLowerCase()
	wrap = nodeWraps[firsttag]||nodeWraps['#other']
	el = document.createElement "div"
	el.innerHTML = wrap[1]+html+wrap[2];
	depth = wrap[0]
	while depth--
		el = el.firstChild
	frag = document.createDocumentFragment()
	while el.firstChild
		frag.appendChild el.firstChild
	frag

# Below here, it's utility functions, which maybe should be moved.
tmplToFrag = (txt) ->
	txt = hideAttr commentEscapes trim txt
	# Clones to avoid any transient nodes.
	htmlToFrag(txt).cloneNode(true).cloneNode(true)

attrList = (node) ->
	if platter.browser.attributeIterationBreaksClone
		node = node.cloneNode false
	ret = {}
	for att in node.attributes when isPlatterAttr att.nodeName
		realn = unhideAttrName att.nodeName
		ret[realn] = 
			n: att.nodeName
			realn: realn
			v: uncommentEscapes unhideAttr att.nodeValue
	ret

pullNode = (node) ->
	pre = document.createComment ""
	post = document.createComment ""
	node.parentNode.insertBefore pre, node
	node.parentNode.insertBefore post, node
	frag = document.createDocumentFragment()
	frag.appendChild node
	[pre, post, frag]

# Find the end of a block, while ignoring sub-blocks
pullBlock = (endtext, node) ->
	end = node
	stack = [endtext]
	while true
		matched = false
		end = end.nextSibling
		if (!end) then break
		if (end.nodeType!=8) then continue
		m = /^\{\{([#\/])([^\s\}]*)(.*?)\}\}$/.exec end.nodeValue
		if !m then continue
		if (m[1]=='#')
			stack.push m[2]
			continue
		while stack.length && stack[stack.length-1]!=m[2]
			stack.pop()
		if stack.length && stack[stack.length-1]==m[2]
			matched = true
			stack.pop()
		if stack.length==0
			break
	# end now points just beyond the end (and hence might be null)
	frag = document.createDocumentFragment()
	while node.nextSibling!=end
		frag.appendChild node.nextSibling
	if matched
		end.parentNode.removeChild end
	pre = document.createComment ""
	post = document.createComment ""
	node.parentNode.insertBefore pre, node
	node.parentNode.insertBefore post, node
	node.parentNode.removeChild node
	[pre, post, frag]

isEventAttr = (name) -> !!/^on/.exec(name)

platter.helper.tmplToFrag = tmplToFrag
platter.helper.htmlToFrag = htmlToFrag
