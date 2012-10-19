

Platter.Internal.PlainCompiler::addExtractorPlugin 'foreach', 100, 1, (ps, val, tmpl) ->
	jsFor = ps.js.addVar "#{ps.jsPre}_for"
	ps.js.forceVar ps.jsPost
	jsTmpl = ps.js.addContext "#{ps.jsPre}_tmpl", tmpl
	@doBase ps, null, val, """
		#{jsFor} = #v#;
		if (#{jsFor})
			for (var i=0; i<#{jsFor}.length; ++i)
				#{ps.jsPlatter}.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, #{jsTmpl}.run(#{jsFor}[i], #{ps.jsDatas.join ','}, undo, false).docfrag)
	""", null


# The version for dynamic templates has to subscribe to relevant changes and rerun.
DynamicRun = Platter.Internal.DynamicRunner


forEachInner = (undo, tmpl, datas, par, start, end) ->
	undoch = undo.child()
	hasRun = false;
	ret = (coll) =>
		if hasRun
			undoch.undo()
			@removeBetween start, end, par
		else
			hasRun = true
		forEachInnerInner.call @, undoch, coll, tmpl, datas, par, start, end, ret

forEachInnerInner = (undo, coll, tmpl, datas, par, start, end, replaceMe) ->
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
	watchCollection.call @, undo, coll, add, rem, replaceMe

# Runtime: Call add/rem appropriately for the collection (with change-watching, if possible)
# It's actually more efficient for watchCollection to not undo the adds. The caller is expected to have their own undoer in the same context.
watchCollection = (undo, coll, add, rem, replaceMe) ->
	if coll instanceof Array 
		for o,i in coll
			add o, coll, {index:i}
		return
	if coll && coll.platter_watchcoll
		coll.platter_watchcoll undo, add, rem, replaceMe



Platter.Internal.DynamicCompiler::addExtractorPlugin 'foreach', 100, 1, (ps, val, tmpl) ->
	inner = ps.js.addContext "#{ps.jsPre}_inner", forEachInner
	jsTmpl = ps.js.addContext "#{ps.jsPre}_tmpl", tmpl
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_forchange", "#{inner}.call(this, undo, #{jsTmpl}, [#{ps.jsDatas.join ', '}], #{ps.parent.jsEl||null}, #{ps.jsPre}, #{ps.jsPost})"
	@doBase ps, null, val, "#{jsChange}(#v#)", null
