# Detects browser features that can adversely affect tests or runtime.

browser = {}

do ->
	div = document.createElement('div')
	div.innerHTML = "<div> <span>a</span></div>"
	if div.firstChild.firstChild==div.firstChild.lastChild
		browser.brokenWhitespace = true  # IE8 and earlier, so far

	div.innerHTML = "a"
	div.appendChild document.createTextNode "b"
	div = div.cloneNode(true)
	if div.firstChild==div.lastChild
		browser.combinesTextNodes = true  # IE8 and earlier, so far

	div.innerHTML = '<div></div>'
	div2 = div.firstChild
	1 for att in div2.attributes
	div2 = div2.cloneNode true
	div2.setAttribute 'id', 'b'
	if div2.getAttributeNode('id') && div2.getAttributeNode('id').nodeValue != 'b'
		browser.attributeIterationBreaksClone = true  # Only IE7 affected, so far.

platter.browser = browser
