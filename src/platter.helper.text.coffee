

# People don't want the whitespace that accidentally surrounds their template.
# Whitespace nodes _within_ the template are maintained.
Platter.Trim = (txt) ->
	txt = txt.replace /^\s+/, ""
	txt = txt.replace /\s+$/, ""

# For Firefox to not do crazy things (and, to be fair, maybe other 
# browsers), we need to disguise some attributes.
# However, IE doesn't like type being messed with.
Platter.HideAttr = (txt) ->
	txt = txt.replace /([a-z][-a-z0-9_]*=)/ig, "data-platter-$1"
	txt = txt.replace /data-platter-type=/g, "type="
Platter.UnhideAttr = (txt) ->
	txt = txt.replace /data-platter-(?!type=)([a-z][-a-z0-9_]*=)/g, "$1"
Platter.UnhideAttrName = (txt) ->
	txt = txt.replace /data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/g, "$1"

# For the browser to parse our HTML, we need to make sure there's no strange text in odd places. Browsers love them some comments, though.
Platter.CommentEscapes = (txt) ->
	txt = txt.replace /\{\{([#\/>].*?)\}\}/g, "<!--{{$1}}-->"
Platter.UncommentEscapes = (txt) ->
	txt = txt.replace /<!--\{\{([#\/>].*?)\}\}-->/g, "{{$1}}"

Platter.HasEscape = (txt) ->
	!!/\{\{/.exec txt

# Old versions of IE like to introduce arbitrary extra attributes; we avoid them.
Platter.IsPlatterAttr = (txt) ->
	txt=='type'||!!/data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/.exec(txt)

Platter.Str = (o) ->
	if o? then ''+o else ''

# Given some text like "a{{b}}c{{d}}", call tfn('a'), efn('b'), tfn('c'), efn('d') and put the non-null results into an array, returning that.
# Due to apparent illegalaccess bugs around regexps in v8 (spanning the last couple of years), this code avoids using the g modifier on the regexp and instead repeatedly culls the string. We shouldn't hit strings with enough escapes for this to cause a performance issue.
Platter.EscapesHandle = (txt, tfn, efn) ->
	# I would put this outside, but JS regexps alter propeties of the regexp object and so aren't reentrant.
	escape = /\{\{(.*?)\}\}/
	m = undefined
	ret = []
	while m = escape.exec(txt)
		if m.index>0
			v = tfn txt.substring(0, m.index)
			if v? then ret.push v
		v = efn m[1]
		if v? then ret.push v
		txt = txt.substring(m.index+m[0].length)
	if (txt.length)
		v = tfn txt
		if v? then ret.push v
	ret

# Turns an escapey string into whatever fn returns, joined with join. Between escapes, only whitespace is allowed.
Platter.EscapesNoString = (txt, join, fn) ->
	ret = Platter.EscapesHandle(
		txt
		(txt) ->
			if (/\S/.exec(txt)) then throw new Error(txt+" not allowed here")
		fn
	)
	if ret.length>1 && !join
		throw new Error("Only one escape allowed here")
	ret.join join

Platter.EscapesNoStringParse = (txt, join, jsDatas, fn) ->
	Platter.EscapesNoString txt, join, jsParser(jsDatas, fn)

chooseData = (txt, jsDatas) ->
	m=/^(\.+)(.*?)$/.exec(txt)
	if (!m) then return [jsDatas[0], txt]
	dots = m[1].length
	if (dots>jsDatas.length)
		throw new Error("#{ex} has too many dots")
	[jsDatas[dots-1], m[2]||'.']

jsParser = (jsDatas, fn) ->
	(v) ->
		op = Platter.Internal.ParseJS v, (ex) ->
			[jsData, ex2] = chooseData ex, jsDatas
			""+fn(ex, ex2, jsData)
		Platter.Internal.UnparseJS op
