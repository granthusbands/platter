# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Platter.Internal.PlainCompiler::addExtractorPlugin 'with', 40, 1, (ps, val, tmplname) ->
	ps.js.forceVar ps.jsPost
	@doBase ps, null, val, "Platter.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, this.#{tmplname}.run(#v#, #{ps.jsDatas.join ', '}, undo, false).docfrag)", null


# The version for dynamic templates has to subscribe to relevant changes and rerun.
dynRunName = Platter.Internal.DynamicRunner::addUniqueMethod 'with', (undo, datas, tmpl, par, start, end) ->
	undoch = undo.child()
	(val) =>
		@removeBetween start, end, par
		undoch.undo()
		Platter.InsertNode par, end, tmpl.run(val, datas..., undoch, false).docfrag

Platter.Internal.DynamicCompiler::addExtractorPlugin 'with', 40, 1, (ps, val, tmplname) ->
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_withchange", "this.#{dynRunName}(undo, [#{ps.jsDatas.join ', '}], this.#{tmplname}, #{ps.parent.jsEl||'null'}, #{ps.jsPre}, #{ps.jsPost})"
	@doBase ps, null, val, "#{jsChange}(#v#)", null
