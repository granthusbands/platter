# A shunting yard parser that mostly directly converts to JS.
# I'd use Pratt, but I think more people understand shunting yard.
# For safety, we fully parse the expression and then generate very similar JS.
# It may be quicker to munge to JS, but would that really be safe?

# Note that we don't even drop/recreate any brackets.

# A priority that normally stops unwinds
specpri = 101

# Priorities approximately match those from MDN (as of 2012-03-10)
preopdefs =
	0.99: "new"
	3: "++ --" # These are unsupported and get spotted later
	3.99: "! ~ - + typeof void"
preopdefs[specpri] = "("

# Transition from expecting-infix to expecting-expr
inopdefs = 
	1: '['
	2: '('
	3: '++ --' # These are unsupported and get spotted later
	5: '* / %'
	6: '+ -'
	7: '<< >> >>>'
	8: '< <= > >= in instanceof'
	9: '== != === !=='
	10: '&'
	11: '^'
	12: '|'
	13: '&&'
	14: '||'
	14.99: '?'
	#These are unsupported, but fail nicely without special attention
	#16: = += -= *= /= %= <<= >>= >>>= &= ^= |=
	17: ','
	100: ':'

# Transition from expecting-infix to expecting-infix
# NOTE: These are hardcoded down below.
expropdefs =
	100: ') ] ()'

# # Special characters that need escaping in regexes
# # ('-' and '/' don't necessarily need escaping, but it's simpler this way)
# regex = "\\^$*+?.()|{}[]-/"
# regexready = (txt) ->
# 	txt = txt.replace /./g, ($0) ->
# 		if regex.indexOf($0)!=-1
# 			"\\"+$0
# 		else
# 			$0
# 	# Also cheekily assume that anything that starts/ends with a word character wants a \b
# 	if /\w$/.exec(txt)
# 		txt = txt+"\\b"
# 	if /^\w/.exec(txt)
# 		txt = "\\b"+txt
# 	txt
# subtractchars = (a, b) ->
# 	a.replace /./g, ($0) ->
# 		if b.indexOf($0)!=-1
# 			""
# 		else
# 			$0

# # Regex-help structures
# preopnames = []
# preopspec = ""
# inopnames = []
# inopspec = ""
# expropnames = []
# expropspec = ""
# addspec = (txt, add) ->
# 	for i in [0...add.length]
# 		c = add.charAt(i)
# 		if txt.indexOf(c)==-1 && /[^\w]/.exec(add.charAt(i))
# 			txt += c
# 	txt

# # Convert the defs into regexy bits
# for pri, ops of inopdefs
# 	ops = ops.split /\ /g
# 	for op in ops
# 		inopnames.push op
# 		inopspec = addspec inopspec, op

# for pri, ops of expropdefs
# 	ops = ops.split /\ /g
# 	for op in ops
# 		expropnames.push op
# 		expropspec = addspec expropspec, op

# for pri, ops of preopdefs
# 	ops = ops.split /\ /g
# 	for op in ops
# 		preopnames.push op
# 		preopspec = addspec preopspec, op

# byrevlength = (a,b) ->
# 	a = a.length
# 	b = b.length
# 	return 1 if a<b
# 	return -1 if a>b
# 	return 0

# inopnames.sort byrevlength
# inopnames = (regexready n for n in inopnames).join '|'
# preopnames.sort byrevlength
# preopnames = (regexready n for n in preopnames).join '|'
# expropnames.sort byrevlength
# expropnames = (regexready n for n in expropnames).join '|'
# inonly = regexready subtractchars subtractchars(inopspec, expropspec), preopspec
# inopspec = regexready inopspec
# anyopspec = regexready addspec preopspec, addspec inopspec, expropspec

# # In an expression context, anything that isn't one of these is passed to the parser caller
# number = "\\d+\\.?\\d*(?:e[-+]?\\d+)?"
# strsing = "'(?:\\\\.|[^'])*'"
# strdoub = "\"(?:\\\\.|[^\"])*\""
# ident = "\\btrue\\b|\\bfalse\\b|\\bnull\\b"

# alert """
# 	# These three regexes were generated by the commented-out code
# 	# Find an infix operator. A set of known things or a sequence of characters that looks like them.
# 	# (1)=op, (2)=rest
# 	inopre = /^\\s*(#{expropnames}|(?:#{inopnames})(?=[^#{inonly}]|$)|[#{anyopspec}]+|$)(.*)/
# 	# Find a prefix operator. A set of known things or a sequence of op-like characters
# 	# (1)=preop, (2)=rest, 
# 	preopre = /^\\s*(?:(#{preopnames})(?=[^#{inonly}])|[#{inopspec}]+)(.*)/
# 	# Find an expression value. Basically, anything that comes before an operator
# 	# (1)=ident, (2)=number, (3)=strsing, (4)=strdoub, (5)=other (6)=rest
# 	valre = /^(?:(#{ident})|(#{number})|(#{strsing})|(#{strdoub})|(.*?))\\s*((#{expropnames}|(?:#{inopnames})(?=[^#{inonly}]|$)|[#{anyopspec}]+|$).*)/
# """

# These three regexes were generated by the commented-out code
# Find an infix operator. A set of known things or a sequence of characters that looks like them.
# (1)=op, (2)=rest
inopre = /^\s*(\(\)|\)|\]|(?:\binstanceof\b|>>>|===|!==|\bin\b|>=|<=|\+\+|\-\-|==|!=|<<|>>|&&|\|\||\(|\+|\-|\[|\*|\/|<|&|\^|\||%|>|,|:|\?)(?=[^\[\*\/%<>=&\^\|,:\?]|$)|[\+\-\(!~\\\[\*\/%<>=&\^\|,:\?\)\]]+|$)(.*)/
# Find a prefix operator. A set of known things or a sequence of op-like characters
# (1)=preop, (2)=rest, 
preopre = /^\s*(?:(\btypeof\b|\bvoid\b|\bnew\b|\+\+|\-\-|\(|!|~|\-|\+)(?=[^\[\*\/%<>=&\^\|,:\?])|[\[\(\+\-\*\/%<>=!&\^\|,:\?]+)(.*)/
# Find an expression value. Basically, anything that comes before an operator
# (1)=ident, (2)=number, (3)=strsing, (4)=strdoub, (5)=other (6)=rest
valre = /^(?:(\btrue\b|\bfalse\b|\bnull\b)|(\d+\.?\d*(?:e[-+]?\d+)?)|('(?:\\.|[^'])*')|("(?:\\.|[^"])*")|(.*?))\s*((\(\)|\)|\]|(?:\binstanceof\b|>>>|===|!==|\bin\b|>=|<=|\+\+|\-\-|==|!=|<<|>>|&&|\|\||\(|\+|\-|\[|\*|\/|<|&|\^|\||%|>|,|:|\?)(?=[^\[\*\/%<>=&\^\|,:\?]|$)|[\+\-\(!~\\\[\*\/%<>=&\^\|,:\?\)\]]+|$).*)/


# Structures for the parser
inops = {}
preops = {}

# Helpers for building later structures
unsupported = {alter:(op) -> throw new Error(op.txt+" operator not supported")}

# Populate the parser structures
populate = (opdefs, opout) ->
	for pri, ops of opdefs
		ops = ops.split /\ /g
		for op in ops
			opout[op] = {pri:+pri, upri:Math.round(pri)}

populate expropdefs, inops
e.isSpecial=true for n,e of inops
populate inopdefs, inops
populate preopdefs, preops


# When we reach the end, unwind everything
inops[''] = {upri:1000, isend:true}
# These can't be unwound until a matching operator comes along
inops['?'].pri = specpri
inops[':'].match = '?'
inops[':'].newpri = 15
inops['('].pri = specpri
inops[')'].match = '('
inops['['].pri = specpri
inops[']'].match = '['
# An aforementioned matching operator
inops[':'].isSpecial = true
# Making -- and ++ unsupported. These need special handling because otherise 1++2 would parse as 1 + +2 and --2 would parse as - -2.
preops['--'] = unsupported
preops['++'] = unsupported
delete inops['--']
delete inops['++']


# Since JS lacks \G in regexes, we're going to cheekily keep reducing the JS string, on the assumption that it'll never be very long.
jslikeparse = (txt, fnexpr) ->
	origtxt = txt
	opstack = []
	lastval = null
	while true
		# Expecting expression: Skip whitespace and stack prefix operators
		while true
			if m=/^\s+(.*)/.exec txt
				txt = m[1]
			if !(m=preopre.exec txt)
				break;
			txt = m[2]
			opdef = preops[m[1]]||unsupported
			op = {upri: opdef.upri, pri:opdef.pri, txt:m[1]}
			if opdef.alter
				op = opdef.alter op
			opstack.push op
			#alert "Expr:#{m[1]}\n#{JSON.stringify lastval}\n#{JSON.stringify opstack}"
		# Expecting a value
		m = valre.exec txt
		if m[1]||m[2]||m[4] #ident,number,strdoub
			lastval = JSON.stringify JSON.parse m[1]||m[2]||m[4]
		else if m[3] # strsing: Convert to strdoub
			lastval = m[3].slice(1, m[3].length-1)
				.replace /(?:(\\.)|(")|(.))/g, ($0, $1, $2, $3) ->
					$1||$3||"\\#{$2}"
			lastval = JSON.stringify JSON.parse "\"#{lastval}\""
		else
			lastval = fnexpr m[5]
		#alert "Val:#{lastval}\n#{JSON.stringify lastval}\n#{JSON.stringify opstack}"
		txt = m[6]
		# Expecting infix operator (I wish coffeescript had do-while)
		while true
			op = null
			m = inopre.exec txt
			if !m
				throw new Error("Unrecognised input")
			txt = m[2]
			optxt = m[1]||''
			#alert "Maybe:#{optxt}\n#{JSON.stringify lastval}\n#{JSON.stringify opstack}"
			opdef = inops[optxt]
			if !opdef
				throw new Error("#{optxt} operator not supported")
			while (top = opstack.length && opstack[opstack.length-1]).pri<=opdef.upri
				top.right = lastval
				lastval = top
				if (lastval.pri == specpri)
					throw new Error("Unmatched '#{lastval.txt}'");
				opstack.pop()
			# Special things are those that aren't simply binary operators or open-brackets. Like close-brackets and :.
			if opdef.isSpecial
				if optxt=="()"
					lastval = {left:lastval, pri:2, txt:"()"};
					continue # Stay in infix mode
				if opdef.match && opdef.match!=top.txt
					throw new Error("Unmatched '#{optxt}'")
				top.inner = lastval
				opstack.pop()
				op = top # Unused if we 'continue'
				lastval = top #Unusued if we 'break'
				if (!opdef.newpri)
					continue # We want another operator, keep on infixing
				# We got a new priority (currently used for ':') so we move on
				top.pri = opdef.newpri
			break
		if opdef.isend
			return lastval
		op = op||{left:lastval, upri:opdef.upri, pri:opdef.pri, txt:optxt}
		opstack.push op
		lastval = null
		#alert "Op:#{optxt}\n#{JSON.stringify lastval}\n#{JSON.stringify opstack}"

# TODO: Handle priorities correctly. For now, we don't need to, because we don't 
# eliminate brackets from the parse tree and have the same precedence as JS.
jslikeunparse = (op) ->
	if typeof op == 'string'
		return op

	left = jslikeunparse op.left if op.left
	right = jslikeunparse op.right if op.right
	inner = jslikeunparse op.inner if op.inner
	if op.txt=='(' && op.left
		"#{left}(#{inner})"
	else if op.txt=='('
		"(#{inner})"
	else if op.txt=='[' #TODO: Dynamic lookup, for this, in platter.
		"#{left}[#{inner}]"
	else if op.txt=='()'
		"#{left}()"
	else if op.txt=='a(b)'
		"#{left}(#{inner})"
	else if op.txt=='?'
		"#{left} ? #{inner} : #{right}"
	else if !op.left
		"#{op.txt} #{right}"
	else if op.txt==',' #Just for better spacing...
		"#{left}, #{right}"
	else
		"#{left} #{op.txt} #{right}"


Platter.Internal.JSLikeParse = jslikeparse
Platter.Internal.JSLikeUnparse = jslikeunparse
Platter.Internal.JSMunge = (txt, valfn) ->
	op = jslikeparse txt, valfn
	jslikeunparse op
