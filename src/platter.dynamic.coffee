# The code in this file is probably useful for all dynamically-updating interfaces

never_equal_to_anything = {}

class Platter.Internal.DynamicRunner extends Platter.Internal.TemplateRunner
	# Runtime: Fetches data.bit1.bit2.bit3..., calls fn with the result. Calls it again when the result changes.
	runGetMulti: (undo, fn, data, [bit1, bits...]) ->
		val = never_equal_to_anything
		undoch = undo.child()
		fn2 = =>
			oval = val
			val = @fetchVal data, bit1
			if oval==val
				return 
			undoch.undo()
			if bits.length==0
				fn(val)
			else
				@runGetMulti undo, fn, val, bits
		if data && data.platter_watch
			data.platter_watch undo, bit1, fn2
		fn2()

	# Runtime: When people say {{blah}}, they might mean data.get(blah) or data[blah]
	# TODO: Maybe they mean data[blah]()?
	fetchVal: (data, ident) ->
		if !data
			return undefined
		if data.platter_get
			data.platter_get ident
		else
			data[ident]


class Platter.Internal.DynamicCompiler extends Platter.Internal.TemplateCompiler
	runner: Platter.Internal.DynamicRunner

	# Compiler: Handle simple value-assignments with escapes.
	doBase: (ret, js, jsCur, jsDatas, n, v, expr, sep) ->
		if (sep==true)
			parse = Platter.EscapesStringParse
		else
			parse = (txt, jsDatas, fn) -> Platter.EscapesNoStringParse txt, sep, jsDatas, fn
		esc = {}
		jsChange = js.addVar "#{jsCur}_change", "null"
		parse v, jsDatas, (id, t, jsData) ->
			if t!='.'
				esc[id] = js.addForcedVar "#{jsCur}_#{t}", "null", [t, jsData]
		expr = expr
			.replace(/#el#/g, "#{jsCur}")
			.replace(/#n#/g, js.toSrc n)
			.replace(/#v#/g, 
				parse v, jsDatas, (id, t, jsData) -> if t!='.' then esc[id] else jsData
			)
		for escn, escvar of esc
			js.addExpr """
				this.runGetMulti(undo, function(val){
					#{escvar} = val;
					if (#{jsChange}) #{jsChange}();
				}, #{escvar.v[1]}, #{js.toSrc escvar.v[0].split '.'})
			"""
		js.addExpr """
			#{jsChange} = function() {
				#{expr};
			}
		"""
		js.addExpr "#{jsChange}()"

	doSimple: (ret, js, jsCur, jsDatas, n, v, expr) ->
		@doBase ret, js, jsCur, jsDatas, n, v, expr, true

Platter.Dynamic = new Platter.Internal.DynamicCompiler
