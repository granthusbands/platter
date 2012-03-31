# Detects browser features that can adversely affect tests or runtime.

Browser = {}

do ->
	div = document.createElement('div')
	div.innerHTML = "<div> <span>a</span></div>"
	if div.firstChild.firstChild==div.firstChild.lastChild
		Browser.BrokenWhitespace = true  # IE8 and earlier, so far

	div.innerHTML = "a"
	div.appendChild document.createTextNode "b"
	div = div.cloneNode(true)
	if div.firstChild==div.lastChild
		Browser.CombinesTextNodes = true  # IE8 and earlier, so far

	div.innerHTML = '<div></div>'
	div2 = div.firstChild
	1 for att in div2.attributes
	div2 = div2.cloneNode true
	div2.setAttribute 'id', 'b'
	if div2.getAttributeNode('id') && div2.getAttributeNode('id').nodeValue != 'b'
		Browser.AttributeIterationBreaksClone = true  # Only IE7 affected, so far.

Platter.Browser = Browser
