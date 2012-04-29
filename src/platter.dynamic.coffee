# The code in this file is probably useful for all dynamically-updating interfaces

never_equal_to_anything = {}

class Platter.Internal.DynamicRunner extends Platter.Internal.TemplateRunner
	# Runtime: Fetches data.bit1.bit2.bit3..., calls fn with the result. Calls it again when the result changes.
	runGetMulti: (undo, fn, data, [bit1, bits...]) ->
		val = never_equal_to_anything
		undoch = undo.child()
		fn2 = =>
			oval = val
			val = Platter.Get data, bit1
			if oval==val
				return 
			undoch.undo()
			if bits.length==0
				fn(val)
			else
				@runGetMulti undo, fn, val, bits
		Platter.Watch undo, data, bit1, fn2
		fn2()


class Platter.Internal.DynamicCompiler extends Platter.Internal.TemplateCompiler
	runner: Platter.Internal.DynamicRunner

	# Compiler: Handle simple value-assignments with escapes.
	# TODO: Rewrite this beastly method.
	doBase: (ps, n, v, expr, sep) ->
		if (sep==true)
			parse = Platter.EscapesStringParse
		else
			parse = (txt, jsDatas, fn) -> Platter.EscapesNoStringParse txt, sep, jsDatas, fn
		esc = {}
		escCount = 0
		last = null
		parse v, ps.jsDatas, (id, t, jsData) ->
			if t=='.'||esc[id] then return
			++escCount
			last = id
			esc[id] = ps.js.addForcedVar "#{ps.jsEl||ps.jsPre}_#{t}", "null", [t, jsData]
		expr = expr
			.replace(/#el#/g, "#{ps.jsEl}")
			.replace(/#n#/g, ps.js.toSrc n)
			.replace(/#v#/g, 
				parse v, ps.jsDatas, (id, t, jsData) -> if t!='.' then esc[id] else jsData
			)
		jsChange = ps.js.addForcedVar "#{ps.jsEl||ps.jsPre}_change", if escCount>1 then "null" else """
			function() {
				#{expr};
			}
		"""
		for escn, escvar of esc
			if escCount>1 && escn==last
				ps.js.addExpr """
					#{jsChange} = function() {
						#{expr};
					}
				"""
			ps.js.addExpr """
				this.runGetMulti(undo, function(val){
					#{escvar} = val;
					#{if escn!=last then "if (#{jsChange}) " else ""}#{jsChange}();
				}, #{escvar.v[1]}, #{ps.js.toSrc escvar.v[0].split '.'})
			"""
		if escCount==0
			ps.js.addExpr "#{jsChange}()"

	doSimple: (ps, n, v, expr) ->
		@doBase ps, n, v, expr, true

	doRedo: (ps, n, v, expr, sep) ->
		jsUndo2 = ps.js.addForcedVar "#{ps.jsPre}_undo", "undo.child()"
		jsChange = ps.js.addForcedVar "#{ps.jsPre}_change", """
			function(val) {
				#{jsUndo2}.undo();
				#{expr.replace(/#v#/g, 'val').replace(/#el#/g, ps.jsEl)};
			}
		"""
		@doBase ps, n, v, "#{jsChange}(#v#)", sep

Platter.Dynamic = new Platter.Internal.DynamicCompiler
