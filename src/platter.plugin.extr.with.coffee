# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Plain = Platter.Internal.PlainCompiler

plainName = Plain::addUniqueMethod 'with', (ps, val, tmplname) ->
	ps.js.forceVar ps.jsPost
	@doBase ps, null, val, "Platter.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, this.#{tmplname}.run(#v#, #{ps.jsDatas.join ', '}, undo, false).docfrag)", null

Plain::addExtractorPlugin 'with', 40, plainName, 1


# The version for dynamic templates has to subscribe to relevant changes and rerun.
Dynamic = Platter.Internal.DynamicCompiler
DynamicRun = Platter.Internal.DynamicRunner

dynRunName = DynamicRun::addUniqueMethod 'with', (undo, datas, tmpl, par, start, end) ->
	undoch = undo.child()
	(val) =>
		@removeBetween start, end, par
		undoch.undo()
		Platter.InsertNode par, end, tmpl.run(val, datas..., undoch, false).docfrag

dynName = Dynamic::addUniqueMethod 'with', (ps, val, tmplname) ->
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_withchange", "this.#{dynRunName}(undo, [#{ps.jsDatas.join ', '}], this.#{tmplname}, #{ps.parent.jsEl||'null'}, #{ps.jsPre}, #{ps.jsPost})"
	@doBase ps, null, val, "#{jsChange}(#v#)", null

Dynamic::addExtractorPlugin 'with', 40, dynName, 1
