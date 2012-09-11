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
	# According to http://danielfriesen.name/blog/2010/02/16/html5-browser-maze-oninput-support/, we fail to detect properly in FF2-FF3.5. I don't think the extra code would be worth it.
	txt = document.createElement 'input'
	if !("oninput" of txt)
		txt.setAttribute("oninput", "return;");
		if typeof txt.oninput != "function"
			Platter.Browser.LacksInputEvent = true
	if "onpropertychange" of txt
		Platter.Browser.SupportsPropertyChangeEvent = true

	# oninput events are broken in some browsers. There's no easy feature-detection.
	#   IE9: Text removal doesn't trigger it
	#   Safari before 5: Textareas don't trigger it
	#   Opera before 11: cut, paste, undo and drop don't trigger it
	# TODO: Maybe just always implement the fallbacks, rather than detecting.
	if !Platter.Browser.LacksInputEvent
		ua = navigator.userAgent
		# Correctly detects:
		#	"Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_2; nb-no) AppleWebKit/533.16 (KHTML, like Gecko) Version/4.1 Safari/533.16"
		#	"Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_8; it-it) AppleWebKit/533.16 (KHTML, like Gecko) Version/5.0 Safari/533.16"
		#	"Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; fr) Opera 11.00"
		#	"Opera/9.80 (Windows NT 6.1; U; zh-cn) Presto/2.6.37 Version/11.00"
		#   "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; en) Opera 10.62"
		#	"Opera/9.80 (Windows NT 5.2; U; zh-cn) Presto/2.6.30 Version/10.63"
		#   "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E)"
		ver = /Version\/(\d+)/.exec ua
		opera = /Opera (\d+)/.exec ua
		isOpera = /Opera\//.exec ua
		isSafari = /Safari\//.exec ua
		isIE9 = /MSIE 9/.exec ua
		if isIE9 || isSafari && ver && ver[1]<5 || isOpera && ver && ver[1]<11 || opera && opera[1]<11
			Platter.Browser.BrokenInputEvent = true
