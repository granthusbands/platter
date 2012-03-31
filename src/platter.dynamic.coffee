# The code in this file is probably useful for all dynamically-updating interfaces

never_equal_to_anything = {}

class DynamicRunner extends Platter.Internal.TemplateRunner
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

	doModify: (data, n, fn) ->
		if (data.platter_modify)
			data.platter_modify n, fn
		else
			data[n] = fn data[n]

	# Runtime: Sets a value, first using things that cause events
	doSet: (data, n, v) ->
		if data.platter_set
			data.platter_set n, v
		else
			data[n] = v

	# Runtime: Call add/rem appropriately for the collection (with change-watching, if possible)
	# It's actually more efficient for watchCollection to not undo the adds. The caller is expected to have their own undoer in the same context.
	watchCollection: (undo, coll, add, rem, replaceMe) ->
		if coll instanceof Array 
			for o,i in coll
				add o, coll, {index:i}
			return
		if coll && coll.platter_watchcoll
			coll.platter_watchcoll undo, add, rem, replaceMe

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
	runIf: (undo, datas, tmpl, start, end) ->
		shown = false
		undoch = undo.child()
		(show) =>
			show = !!show;
			if shown==show
				return
			shown = show
			if (show)
				end.parentNode.insertBefore tmpl.run(datas..., undoch, false).docfrag, end
			else
				@removeBetween start, end
				undoch.undo()

	# Runtime: Provide a callback for doing foreach
	runForEach: (undo, tmpl, datas, start, end) ->
		undoch = undo.child()
		hasRun = false;
		ret = (coll) =>
			if hasRun
				undoch.undo()
				@removeBetween start, end
			else
				hasRun = true
			@runForEachInner undo, coll, tmpl, datas, start, end, ret

	# Runtime: A collection of models, automatically expanded/collapsed as members get added/removed
	runForEachInner: (undo, coll, tmpl, datas, start, end, replaceMe) ->
		ends = [start, end]
		undos = []
		spareUndos = [] # If we don't reuse them, the parent undoer will end up with many.
		add = (model, coll, opts) =>
			at = opts.index
			newend = document.createComment ""
			ends.splice at+1, 0, newend
			par = start.parentNode
			par.insertBefore newend, ends[at].nextSibling
			undoch = spareUndos.pop() || undo.child()
			par.insertBefore tmpl.run(model, datas..., undoch, false).docfrag, newend
			undos.splice(at, 0, undoch)
		rem = (model, coll, opts) =>
			at = opts.index
			@removeBetween ends[at], ends[at+1].nextSibling
			ends.splice(at+1,1)
			undos[at].undo()
			spareUndos.push undos.splice(at, 1)[0]
		@watchCollection undo, coll, add, rem, replaceMe

	runWith: (undo, datas, tmpl, start, end) ->
		undoch = undo.child()
		(val) =>
			@removeBetween start, end
			undoch.undo()
			# In some transitions, we can end up removed from the page but wanting to process the event that caused that, so we need to cope with a lack of a parentNode.
			if (end.parentNode)
				end.parentNode.insertBefore tmpl.run(val, datas..., undoch, false).docfrag, end

class DynamicCompiler extends Platter.Internal.TemplateCompiler
	makeRet: (node) ->
		new DynamicRunner(node)

	# Compiler: Handle simple value-assignments with escapes.
	doBase: (ret, js, jsCur, jsDatas, n, v, expr, sep) ->
		if (sep==true)
			parse = escapesStringParse
		else
			parse = (txt, jsDatas, fn) -> escapesNoStringParse txt, sep, jsDatas, fn
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

	# Compiler: Conditional section
	doIf: (ret, js, jsPre, jsPost, jsDatas, val, inner) ->
		jsChange = js.addForcedVar "#{jsPre}_ifchange", "this.runIf(undo, [#{jsDatas.join ', '}], this.#{jsPre}, #{jsPre}, #{jsPost})"
		@doBase ret, js, jsPre, jsDatas, null, val, "#{jsChange}(#v#)", "&&"

	# Compiler: Conditional section
	doUnless: (ret, js, jsPre, jsPost, jsDatas, val, inner) ->
		jsChange = js.addForcedVar "#{jsPre}_ifchange", "this.runIf(undo, [#{jsDatas.join ', '}], this.#{jsPre}, #{jsPre}, #{jsPost})"
		@doBase ret, js, jsPre, jsDatas, null, val, "#{jsChange}(!(#v#))", "&&"

	# Compiler:
	doForEach: (ret, js, jsPre, jsPost, jsDatas, val, inner) ->
		jsChange = js.addForcedVar "#{jsPre}_forchange", "this.runForEach(undo, this.#{jsPre}, [#{jsDatas.join ', '}], #{jsPre}, #{jsPost})"
		@doBase ret, js, jsPre, jsDatas, null, val, "#{jsChange}(#v#)", null

	# Compiler: Conditional section
	doWith: (ret, js, jsPre, jsPost, jsDatas, val, inner) ->
		jsChange = js.addForcedVar "#{jsPre}_ifchange", "this.runWith(undo, [#{jsDatas.join ', '}], this.#{jsPre}, #{jsPre}, #{jsPost})"
		@doBase ret, js, jsPre, jsDatas, null, val, "#{jsChange}(#v#)", null

Platter.Internal.DynamicRunner = DynamicRunner
Platter.Internal.DynamicCompiler = DynamicCompiler
Platter.Dynamic = new DynamicCompiler
