

Plain = Platter.Internal.PlainCompiler

plainName = Plain::addUniqueMethod 'foreach', (ps, val) ->
	val = Platter.EscapesNoStringParse val, null, ps.jsDatas, @plainGet(ps.js)
	jsFor = ps.js.addVar "#{ps.jsPre}_for", val
	ps.js.forceVar ps.jsPost
	ps.js.addExpr """
		if (#{jsFor})
			for (var i=0;i<#{jsFor}.length; ++i)
				#{ps.jsPost}.parentNode.insertBefore(this.#{ps.jsPre}.run(#{jsFor}[i], #{ps.jsDatas.join ','}, undo, false).docfrag, #{ps.jsPost})
	"""

Plain::addExtractorPlugin 'foreach', 100, plainName, 1


# The version for dynamic templates has to subscribe to relevant changes and rerun.
Dynamic = Platter.Internal.DynamicCompiler
DynamicRun = Platter.Internal.DynamicRunner


runForEach = DynamicRun::addUniqueMethod 'foreach', (undo, tmpl, datas, start, end) ->
	undoch = undo.child()
	hasRun = false;
	ret = (coll) =>
		if hasRun
			undoch.undo()
			@removeBetween start, end
		else
			hasRun = true
		@[runForEachInner] undo, coll, tmpl, datas, start, end, ret

runForEachInner = DynamicRun::addUniqueMethod 'foreach_inner', (undo, coll, tmpl, datas, start, end, replaceMe) ->
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
	@[watchCollection] undo, coll, add, rem, replaceMe



# Runtime: Call add/rem appropriately for the collection (with change-watching, if possible)
# It's actually more efficient for watchCollection to not undo the adds. The caller is expected to have their own undoer in the same context.
watchCollection = DynamicRun::addUniqueMethod 'foreach_watch', (undo, coll, add, rem, replaceMe) ->
	if coll instanceof Array 
		for o,i in coll
			add o, coll, {index:i}
		return
	if coll && coll.platter_watchcoll
		coll.platter_watchcoll undo, add, rem, replaceMe



doForEach = Dynamic::addUniqueMethod 'foreach', (ps, val) ->
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_forchange", "this.#{runForEach}(undo, this.#{ps.jsPre}, [#{ps.jsDatas.join ', '}], #{ps.jsPre}, #{ps.jsPost})"
	@doBase ps, null, val, "#{jsChange}(#v#)", null


Dynamic::addExtractorPlugin 'foreach', 100, doForEach, 1
