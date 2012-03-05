# The code in this file is probably useful for all dynamically-updating interfaces

never_equal_to_anything = {}

class dynamicRunner extends platter.internal.templateRunner
	# Runtime: Fetches data.bit1.bit2.bit3..., calls fn with the result. Calls it again when the result changes.
	runGetMulti: (fn, data, [bit1, bits...]) ->
		val = never_equal_to_anything
		undo = null;
		$undo.add ->
			undo() if undo
		fn2 = =>
			oval = val
			val = @fetchVal data, bit1
			if oval==val
				return 
			if bits.length==0
				fn(val)
			else
				undo() if undo
				$undo.start()
				@runGetMulti fn, val, bits
				undo = $undo.claim()
		if data && data.platter_watch
			data.platter_watch bit1, fn2
		fn2()

	# Runtime: Sets a value, first using things that cause events
	doSet: (data, n, v) ->
		if data.platter_set
			data.platter_set n, v
		else
			data[n] = v

	# Runtime: Call add/rem appropriately for the collection (with change-watching, if possible)
	# It's actually more efficient for watchCollection to not undo the adds. The caller is expected to have their own undoer in the same context.
	watchCollection: (coll, add, rem, replaceMe) ->
		if coll instanceof Array 
			for o,i in coll
				add o, coll, {index:i}
			return
		if !coll || !coll.on
			return
		if coll.platter_watch
			coll.platter_watch add, rem, replaceMe

	# Runtime: When people say {{blah}}, they might mean data.get(blah) or data[blah]
	# TODO: Maybe they mean data[blah]()?
	fetchVal: (data, ident) ->
		if !data
			return undefined
		if data.platter_get
			data.platter_get ident
		else
			data[ident]

	# Runtime: A conditional section, automatically filled/removed as fn changes.
	runIf: (data, tmpl, start, end) ->
		shown = false
		undo = null
		$undo.add -> undo() if undo
		(show) =>
			show = !!show;
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

	# Runtime: Provide a callback for doing foreach
	runForEach: (tmpl, start, end) ->
		undo = null
		ret = (coll) =>
			if undo
				undo()
				@removeBetween start, end
			$undo.start()
			@runForEachInner coll, tmpl, start, end, ret
			undo = $undo.claim()

	# Runtime: A collection of models, automatically expanded/collapsed as members get added/removed
	runForEachInner: (coll, tmpl, start, end, replaceMe) ->
		ends = [start, end]
		undo = []
		add = (model, coll, opts) =>
			at = opts.index
			newend = document.createComment ""
			ends.splice at+1, 0, newend
			par = start.parentNode
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
		@watchCollection coll, add, rem, replaceMe
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
			if t!='.'
				esc[t] = js.addForcedVar "#{jsCur}_#{t}", "null", t
		expr = expr
			.replace("#el#", "#{jsCur}")
			.replace("#n#", js.toSrc n)
			.replace("#v#", 
				@escapesReplace v, (t) -> if t=='.' then jsData else esc[t]
			)
		for escn, escvar of esc
			js.addExpr """
				this.runGetMulti(function(val){
					#{escvar} = val;
					if (#{jsChange}) #{jsChange}();
				}, #{jsData}, #{js.toSrc escn.split '.'})
			"""
		js.addExpr """
			#{jsChange} = function() {
				#{expr};
			}
		"""
		js.addExpr "#{jsChange}()"

	# Compiler: Conditional section
	doIf: (ret, js, jsPre, jsPost, jsData, val, inner) ->
		jsChange = js.addForcedVar "#{jsPre}_ifchange", "this.runIf(#{jsData}, this.#{jsPre}, #{jsPre}, #{jsPost})"
		@doSimple ret, js, jsPre, jsData, null, val, "#{jsChange}(#v#)"

	# Compiler:
	doForEach: (ret, js, jsPre, jsPost, jsData, val, inner) ->
		jsChange = js.addForcedVar "#{jsPre}_forchange", "this.runForEach(this.#{jsPre}, #{jsPre}, #{jsPost})"
		@doSimple ret, js, jsPre, jsData, null, val, "#{jsChange}(#v#)"

platter.internal.dynamicRunner = dynamicRunner
platter.internal.dynamicCompiler = dynamicCompiler
platter.dynamic = new dynamicCompiler
