# The code in this file is probably useful for all dynamically-updating interfaces

class dynamicRunner extends platter.internal.templateRunner
	# Runtime: A conditional section, automatically filled/removed as fn changes.
	runIf: (fn, data, extra, tmpl, start, end) ->
		shown = false
		undo = null
		$undo.add -> undo() if undo
		onchange = =>
			show = !!fn();
			if shown==show
				return
			shown = show
			if (show)
				$undo.start()
				end.parentNode.insertBefore tmpl.run(data, false), end
				undo = $undo.claim()
			else
				@removeBetween start, end
				undo()
				undo = null
		@runGet onchange, data, extra

	# Runtime: A collection of models, automatically expanded/collapsed as members get added/removed
	runForEach: (coll, tmpl, start, end) ->
		ends = [start, end]
		undo = []
		par = start.parentNode
		add = (model, coll, opts) =>
			at = opts.index
			newend = document.createComment ""
			ends.splice at+1, 0, newend
			par.insertBefore newend, ends[at].nextSibling
			$undo.start()
			par.insertBefore tmpl.run(model, false), newend
			undo.splice(at, 0, $undo.claim())
		rem = (model, coll, opts) =>
			at = opts.index
			@removeBetween ends[at], ends[at+1].nextSibling
			ends.splice(at+1,1)
			undo[at]()
			undo.splice(at, 1)
		@watchCollection coll, add, rem
		$undo.add ->
			for undoer in undo
				undoer()

class dynamicCompiler extends platter.internal.templateCompiler
	makeRet: (node) ->
		new dynamicRunner(node)

	# Compiler: Handle simple value-assignments with escapes.
	doSimple: (ret, js, jsCur, jsData, n, v, expr) ->
		esc = {}
		jsChange = js.addVar "#{jsCur}_change", "null"
		@escapesReplace v, (t) ->
			esc[t] = js.addVar "#{jsCur}_#{t}", "null", t
		expr = expr
			.replace("#el#", "#{jsCur}")
			.replace("#n#", "'#{n}'")
			.replace("#v#", 
				@escapesReplace v, (t) -> esc[t]
			)
		for escn, escvar of esc
			js.addExpr """
				this.runGetMulti(function(val){
					#{escvar} = val;
					if (#{jsChange}) #{jsChange}();
				}, #{jsData}, ['#{escn.split('.').join("','")}'])
			"""
		js.addExpr """
			#{jsChange} = function() {
				#{expr};
			}
		"""
		js.addExpr "#{jsChange}()"

	# Compiler: Conditional section
	doIf: (ret, js, jsPre, jsPost, jsData, val, inner) ->
		v = val
		val = @convertVal val, jsData
		js.addExpr "this.runIf(function(){return #{val};}, #{jsData}, #{@extraParam(v)}, this.#{jsPre}, #{jsPre}, #{jsPost})"

	# Compiler:
	doForEach: (ret, js, jsPre, jsPost, jsData, val, inner) ->
		v = val
		val = @convertColl val, jsData
		js.addExpr "this.runForEach(#{val}, this.#{jsPre}, #{jsPre}, #{jsPost})"
	
	convertColl: (txt, jsData) ->
		@escapesReplace txt, (t) -> "#{jsData}.#{t}"

platter.internal.dynamicRunner = dynamicRunner
platter.internal.dynamicCompiler = dynamicCompiler
