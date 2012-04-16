

Plain = Platter.Internal.PlainCompiler

plainName = Plain::addUniqueMethod 'foreach', (ps, val, tmplname) ->
	val = Platter.EscapesNoStringParse val, null, ps.jsDatas, @plainGet(ps.js)
	jsFor = ps.js.addVar "#{ps.jsPre}_for", val
	ps.js.forceVar ps.jsPost
	ps.js.addExpr """
		if (#{jsFor})
			for (var i=0;i<#{jsFor}.length; ++i)
				Platter.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, this.#{tmplname}.run(#{jsFor}[i], #{ps.jsDatas.join ','}, undo, false).docfrag)
	"""

Plain::addExtractorPlugin 'foreach', 100, plainName, 1


# The version for dynamic templates has to subscribe to relevant changes and rerun.
Dynamic = Platter.Internal.DynamicCompiler
DynamicRun = Platter.Internal.DynamicRunner


runForEach = DynamicRun::addUniqueMethod 'foreach', (undo, tmpl, datas, par, start, end) ->
	undoch = undo.child()
	hasRun = false;
	ret = (coll) =>
		if hasRun
			undoch.undo()
			@removeBetween start, end, par
		else
			hasRun = true
		@[runForEachInner] undo, coll, tmpl, datas, par, start, end, ret

runForEachInner = DynamicRun::addUniqueMethod 'foreach_inner', (undo, coll, tmpl, datas, par, start, end, replaceMe) ->
	pres = [start]
	posts = [end]
	undos = []
	spareUndos = [] # If we don't reuse them, the parent undoer will end up with many.
	add = (model, coll, opts) =>
		at = opts.index
		newend = document.createComment ""
		undoch = spareUndos.pop() || undo.child()
		frag = tmpl.run(model, datas..., undoch, false).docfrag
		fragfirst = frag.firstChild
		fraglast = frag.lastChild
		Platter.InsertNode par, posts[at], frag
		undos.splice(at, 0, undoch)
		pres.splice(at+1, 0, fraglast)
		posts.splice(at, 0, fragfirst)
	rem = (model, coll, opts) =>
		at = opts.index
		@removeBetween pres[at], posts[at+1], par
		pres.splice(at+1, 1)
		posts.splice(at,1)
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



doForEach = Dynamic::addUniqueMethod 'foreach', (ps, val, tmplname) ->
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_forchange", "this.#{runForEach}(undo, this.#{tmplname}, [#{ps.jsDatas.join ', '}], #{ps.parent.jsEl||null}, #{ps.jsPre}, #{ps.jsPost})"
	@doBase ps, null, val, "#{jsChange}(#v#)", null


Dynamic::addExtractorPlugin 'foreach', 100, doForEach, 1
