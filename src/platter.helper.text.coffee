

# People don't want the whitespace that accidentally surrounds their template.
# Whitespace nodes _within_ the template are maintained.
trim = (txt) ->
	txt = txt.replace /^\s+/, ""
	txt = txt.replace /\s+$/, ""

# For Firefox to not do crazy things (and, to be fair, maybe other 
# browsers), we need to disguise some attributes.
# However, IE doesn't like type being messed with.
hideAttr = (txt) ->
	txt = txt.replace /([a-z][-a-z0-9_]*=)/ig, "data-platter-$1"
	txt = txt.replace /data-platter-type=/g, "type="
unhideAttr = (txt) ->
	txt = txt.replace /data-platter-(?!type=)([a-z][-a-z0-9_]*=)/g, "$1"
unhideAttrName = (txt) ->
	txt = txt.replace /data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/g, "$1"

# For the browser to parse our HTML, we need to make sure there's no strange text in odd places. Browsers love them some comments, though.
commentEscapes = (txt) ->
	txt = txt.replace /\{\{([#\/].*?)\}\}/g, "<!--{{$1}}-->"
uncommentEscapes = (txt) ->
	txt = txt.replace /<!--\{\{([#\/].*?)\}\}-->/g, "{{$1}}"

hasEscape = (txt) ->
	!!/\{\{/.exec txt

# Old versions of IE like to introduce arbitrary extra attributes; we avoid them.
isPlatterAttr = (txt) ->
	txt=='type'||!!/data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/.exec(txt)

str = (o) ->
	if o? then ''+o else ''

# Given some text like "a{{b}}c{{d}}", call tfn('a'), efn('b'), tfn('c'), efn('d') and put the non-null results into an array, returning that.
escapesHandle = (txt, tfn, efn) ->
	# I would put this outside, but JS regexps alter propeties of the regexp object and so aren't reentrant.
	escape = /\{\{(.*?)\}\}/g;
	m = undefined
	last = 0
	ret = []
	while m = escape.exec(txt)
		if m.index>last
			v = tfn txt.substring(last, m.index)
			if v? then ret.push v
		v = efn m[1]
		if v? then ret.push v
		last = m.index+m[0].length
	if (last<txt.length)
		v = tfn txt.substring(last, txt.length)
		if v? then ret.push v
	ret

# Turns an escapey string into "a"+Platter.Str(...)+"c"+Platter.Str(...), where ... comes from fn('b') and fn('d')
# Intended to be used in string contexts, of course, where it's appropriate to turn everything into strings.
escapesString = (txt, fn) ->
	ret = escapesHandle txt, Platter.Internal.ToSrc, (bit) ->
		"Platter.Str(#{fn(bit)})"
	ret.join '+'

# Turns an escapey string into whatever fn returns, joined with join. Between escapes, only whitespace is allowed.
escapesNoString = (txt, join, fn) ->
	ret = escapesHandle(
		txt
		(txt) ->
			if (/\S/.exec(txt)) then throw new Error(txt+" not allowed here")
		fn
	)
	if ret.length>1 && !join
		throw new Error("Only one escape allowed here")
	ret.join join

escapesStringParse = (txt, jsDatas, fn) ->
	escapesString txt, jsParser(jsDatas, fn)

escapesNoStringParse = (txt, join, jsDatas, fn) ->
	escapesNoString txt, join, jsParser(jsDatas, fn)

chooseData = (txt, jsDatas) ->
	m=/^(\.+)(.*?)$/.exec(txt)
	if (!m) then return [jsDatas[0], txt]
	dots = m[1].length
	if (dots>jsDatas.length)
		throw new Error("#{ex} has too many dots")
	[jsDatas[dots-1], m[2]||'.']

jsParser = (jsDatas, fn) ->
	(v) ->
		op = Platter.Internal.JSLikeParse v, (ex) ->
			[jsData, ex2] = chooseData ex, jsDatas
			""+fn(ex, ex2, jsData)
		Platter.Internal.JSLikeUnparse op

Platter.Str = str
