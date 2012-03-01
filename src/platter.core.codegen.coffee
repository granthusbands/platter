# A code generator, with only mild, broken optimisation.
# Two main mechanisms:
#   If a variable is used only once, move its initialisation value to the usage location (ignoring all intermediate code)
#   If a variable is not used at all, remove it altogether (even if the initialisation has side effects).
# The optimisations make codegen easier elsewhere, as we generate a large number of variables that only actually exist if used more than once.
clean = (n) ->
	n.replace /#/g, ""

exprvar = /#(\w+)#/g
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

platter.internal.codegen = codegen
