# A code generator, with only mild, broken optimisation.
# Two main mechanisms:
#   If a variable is used only once, move its initialisation value to the usage location (ignoring all intermediate code)
#   If a variable is not used at all, remove it altogether (even if the initialisation has side effects).
# The optimisations make codegen easier elsewhere, as we generate a large number of variables that only actually exist if used more than once.
clean = (n) ->
	n = n.replace /#/g, ""
	if !/^[a-z]/i.exec(n)
		n = 'v'+n
	n = n.replace /[^a-z0-9\$]+/ig, "_"
	if (jskeywords[n])
		n = "#{n}_"
	n

exprvar = /#(\w+)#/g
jskeywords = {'break':1, 'else':1, 'new':1, 'var':1, 'case':1, 'finally':1, 'return':1, 'void':1, 'catch':1, 'for':1, 'switch':1, 'while':1, 'continue':1, 'function':1, 'this':1, 'with':1, 'default':1, 'if':1, 'throw':1, 'delete':1, 'in':1, 'try':1, 'do':1, 'instanceof':1, 'typeof':1, 'abstract':1, 'enum':1, 'int':1, 'short':1, 'boolean':1, 'export':1, 'interface':1, 'static':1, 'byte':1, 'extends':1, 'long':1, 'super':1, 'char':1, 'final':1, 'native':1, 'synchronized':1, 'class':1, 'float':1, 'package':1, 'throws':1, 'const':1, 'goto':1, 'private':1, 'transient':1, 'debugger':1, 'implements':1, 'protected':1, 'volatile':1, 'double':1, 'import':1, 'public':1, 'null':1, 'true':1, 'false':1}

class codegen
	constructor: () ->
		@_code = []
		@_vars = {}

	# Since the codegen doesn't understand functions (it really should), we use existingVar for parameters.
	existingVar: (name) ->
		name = clean name
		@_vars[name] = {_name: name, _count:1000}
		@getVar name

	# Claim a variable is used 1000 times, so that it won't get optimised away. Used somewhere to optimise a loop.
	forceVar: (name) ->
		@_vars[name.n||name]._count = 1000

	addForcedVar: (name, expr, compVal) ->
		ret = @addVar name, expr, compVal
		@forceVar ret
		ret

	addVar: (name, expr, compVal) ->
		name = clean name
		name = @_uniqName name
		@_vars[name] = {_name: name, _count: -1, _expr: expr, _compVal:compVal}
		@addOp {_expr:"var ##{name}# = #{expr}", _type:'var', _src:expr, _name:name}
		@getVar name

	getVar: (name) ->
		v = @_vars[name]
		{
			n: name
			v: v._compVal
			toString: ->"##{@n}#"
		}
	
	addExpr: (expr) ->
		@addOp {_expr:expr}

	addOp: (op) ->
		op._expr.replace exprvar, ($0, $1) =>
			@_vars[$1]._count++
		@_code.push op
	
	# Though this does brain-dead optimisations, it's non-mutating.
	toString: () ->
		s = ""
		varsub = {}
		varreps = {}
		# Remove the effects of a now-unused expr
		sub = (expr) ->
			expr.replace exprvar, ($0, $1) ->
				varsub[$1] = (varsub[$1]||0)+1;
		# Turn variable placeholders into variable uses or expressions
		rep = (expr) ->
			expr.replace exprvar, ($0, $1) ->
				varreps[$1]||$1
		# Remove unreferenced variables (moving backwards so only one pass is needed)
		code = @_code.slice(0)
		for i in [code.length-1..0] by -1
			op = code[i]
			if op._type=='var' && @_vars[op._name]._count-(varsub[op._name]||0)==0
				code[i] = undefined;
				sub op._src
		for op in code when op
			if op._type=='var' && @_vars[op._name]._count-(varsub[op._name]||0)==1
				# Single-use variables can instead be replaced with the expression
				varreps[op._name] = rep op._src
			else
				s+=rep(op._expr)+";\n";
		s

	_uniqName: (name) ->
		if @_vars[name]
			c = (@_vars[name]._lastNum||1)+1
			++c while @_vars[name+c];
			@_vars[name]._lastNum = c
			name = name + c
		name

	# JSON library not guaranteed, and this is easy enough. Limited to types generated in the library.
	toSrc: (o) ->
		if typeof o == 'string'
			return "'#{o.replace /([\\'])/g, "\\$1"}'"
		if typeof o == 'number' || !o
			return o+''
		if o instanceof Array
			return "[#{(@toSrc(a) for a in o).join ','}]"
		throw "Kaboom!"

	index: (arr, entry) ->
		if (!/^[a-z$_][a-z0-9$_]*$/.exec(entry)||jskeywords[entry])
			return "#{arr}[#{@toSrc(entry)}]"
		else
			return "#{arr}.#{entry}"

platter.internal.codegen = codegen
