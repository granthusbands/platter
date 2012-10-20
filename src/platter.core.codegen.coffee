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

# JSON library not guaranteed, and this is easy enough. Limited to types generated in the library.
singrep = 
	"'": "\\'"
	"\\": "\\\\"
	"\r": "\\r"
	"\n": "\\n"
Platter.Internal.ToSrc = toSrc = (o) ->
	if typeof o == 'string'
		return "'#{o.replace /[\\'\r\n]/g, (t)->singrep[t]}'"
	if typeof o == 'number' || !o
		return o+''
	if o instanceof Array
		return "[#{(toSrc(a) for a in o).join ','}]"
	throw "Kaboom!"

Platter.Internal.Index = index = (arr, entry) ->
	if (!/^[a-z$_][a-z0-9$_]*$/i.exec(entry)||jskeywords[entry])
		return "#{arr}[#{toSrc(entry)}]"
	else
		return "#{arr}.#{entry}"

exprvar = /#(\w+)#/g
jskeywords = {'break':1, 'else':1, 'new':1, 'var':1, 'case':1, 'finally':1, 'return':1, 'void':1, 'catch':1, 'for':1, 'switch':1, 'while':1, 'continue':1, 'function':1, 'this':1, 'with':1, 'default':1, 'if':1, 'throw':1, 'delete':1, 'in':1, 'try':1, 'do':1, 'instanceof':1, 'typeof':1, 'abstract':1, 'enum':1, 'int':1, 'short':1, 'boolean':1, 'export':1, 'interface':1, 'static':1, 'byte':1, 'extends':1, 'long':1, 'super':1, 'char':1, 'final':1, 'native':1, 'synchronized':1, 'class':1, 'float':1, 'package':1, 'throws':1, 'const':1, 'goto':1, 'private':1, 'transient':1, 'debugger':1, 'implements':1, 'protected':1, 'volatile':1, 'double':1, 'import':1, 'public':1, 'null':1, 'true':1, 'false':1}



# This is for making state available to a generated function, by wrapping the function in an outer function that receives the context values and then returns the inner function (which hence has those values in scope).
class Platter.Internal.FunctionGenContext
	constructor: () ->
		@_values = {}
		@_usedNames = {}

	child: -> new Platter.Internal.FunctionGen @

	addContext: (name, value) ->
		name = clean(name)
		name = @_uniqName(name)
		@_addContext name, value
		{
			n: name
			v: value
			toString: ->"##{@n}#"
		}

	compile: (child) ->
		vals = []
		for own n,v of @_values
			vals.push "#{n} = #{index('values', n)}"
		txt = if vals.length then "var #{vals.join(', ')};\n" else ""
		txt = "#{txt}return function(#{child._params.join(', ')}) {\n#{child._toString()}};"
		run = new Function('values', txt)
		run(@_values)

	_addContext: (name, value) ->
		@_values[name] = value
		@_usedNames[name] = 1

	_varExists: (name) ->
		@_usedNames[name]

	_uniqName: (name) ->
		if @_varExists(name)
			c = (@_usedNames[name]||1)+1
			++c while @_varExists(name+c);
			@_usedNames[name] = c
			name = name + c
		else
			@_usedNames[name] = 1
		name


class Platter.Internal.FunctionGen
	constructor: (@parent) ->
		@_params = []
		@_code = []
		@_vars = {}

	child: -> new Platter.Internal.FunctionGen @

	# Add a parameter for the generated function
	addParam: (name) ->
		name = clean name
		name = @_uniqName name
		@_vars[name] = {_name: name, _existing:true}
		@_params.push name
		@getVar name

	# Add a value for the function to use directly
	addContext: (name, value) ->
		name = clean(name)
		name = @_uniqName(name)
		@_addContext name, value

	_addContext: (name, value) ->
		@_vars[name] = {_name:name, _compVal: value, _existing:true}
		if @parent then @parent._addContext name, value
		@getVar name

	# Add a variable/value. Might appear as a 'var blah = blah' statement or may be folded into singular use-site.
	addVar: (name, expr = 'null', compVal = null) ->
		name = clean name
		name = @_uniqName name
		@_vars[name] = {_name: name, _expr: expr, _compVal:compVal}
		@_code.push {_expr:expr, _type:'var', _name:name}
		@getVar name

	# Ensure a variable won't get folded into use-sites.
	# Can be used to optimise loops or just for variables that don't want moving.
	# If the variable is unused, it will still get removed.
	forceVar: (name) ->
		@_vars[name.n||name]._forced = true

	addForcedVar: (name, expr, compVal) ->
		ret = @addVar name, expr, compVal
		@forceVar ret
		ret

	getVar: (name) ->
		v = @_vars[name]
		{
			n: name
			v: v._compVal
			toString: ->"##{@n}#"
		}
	
	addExpr: (expr) ->
		@_code.push {_expr:expr}

	compile: () ->
		if (@parent instanceof Platter.Internal.FunctionGenContext)
			return @parent.compile(@)
		try
			new Function(@_params.join(', '), @_toString())
		catch e
			throw new Error("Internal error: Function compilation failed: #{e.message}\n\n#{ps.js}")
	
	# Though this does brain-dead optimisations, it's non-mutating.
	_toString: () ->
		s = ""
		varcnt = {}
		varreps = {}

		# Count the variable uses from an expr
		add = (expr) ->
			expr.replace exprvar, ($0, $1) ->
				++varcnt[$1];
		# Remove the variable uses of a now-unused expr
		sub = (expr) ->
			expr.replace exprvar, ($0, $1) ->
				--varcnt[$1];
		# Turn variable placeholders into variable uses or expressions
		rep = (expr) ->
			expr.replace exprvar, ($0, $1) ->
				varreps[$1]||$1

		for op in @_code
			if op._type=='var'
				vr = @_vars[op._name]
				varcnt[op._name] = if vr._existing then 1000 else if vr._forced then 1 else 0
			add op._expr
		# Remove unreferenced variables (moving backwards so only one pass is needed)
		code = @_code.slice(0)
		for i in [code.length-1..0] by -1
			op = code[i]
			if op._type=='var' && (varcnt[op._name]||0)==0
				code[i] = undefined;
				sub op._expr
		for op in code when op
			if op._type=='var'
				# Single-use variables can instead be replaced with the expression
				if (varcnt[op._name]||0)==1
					varreps[op._name] = rep op._expr
				else
					s+=rep("var ##{op._name}# = #{op._expr};\n");
			else
				s+=rep(op._expr)+";\n";
		s

	_uniqName: (name) ->
		@parent._uniqName(name)

	_varExists: (name) ->
		@_vars[name] || @parent?._varExists(name)

	toSrc: toSrc

	index: index

	replaceExpr: (from, to) ->
		for op in @_code
			op._expr = op._expr.split(from).join(to)
