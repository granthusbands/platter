# Detects browser features that can adversely affect tests or runtime.

Platter.Browser = {}

do ->
	div = document.createElement('div')
	div.innerHTML = "<div> <span>a</span></div>"
	if div.firstChild.firstChild==div.firstChild.lastChild
		Platter.Browser.BrokenWhitespace = true  # IE8, IE7, IE6.

	div.innerHTML = "a"
	div.appendChild document.createTextNode "b"
	div = div.cloneNode(true)
	if div.firstChild==div.lastChild
		Platter.Browser.CombinesTextNodes = true  # IE8, IE7, IE6.

	div.innerHTML = '<div></div>'
	div2 = div.firstChild
	1 for att in div2.attributes
	div2 = div2.cloneNode true
	div2.setAttribute 'id', 'b'
	if div2.getAttributeNode('id') && div2.getAttributeNode('id').nodeValue != 'b'
		Platter.Browser.AttributeIterationBreaksClone = true  # Only IE7 (not IE6)
