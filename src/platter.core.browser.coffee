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
	
	# Not all browsers support oninput. Detection is tricky.
	# According to http://danielfriesen.name/blog/2010/02/16/html5-browser-maze-oninput-support/, we fail to detect properly in FF2-FF3.5. I don't think the extra code would be worth it. FF5 works with the test below, at least.
	txt = document.createElement 'input'
	if !("oninput" of txt)
		txt.setAttribute("oninput", "return;");
		if typeof txt.oninput != "function"
			Platter.Browser.LacksInputEvent = true
	if "onpropertychange" of txt
		Platter.Browser.SupportsPropertyChangeEvent = true

	# IE9 input events don't fire for user-initiated text removal, but we can't easily feature-detect that.
	if navigator.userAgent.indexOf('MSIE 9') != -1
		Platter.Browser.NoInputEventForDeletion = true
