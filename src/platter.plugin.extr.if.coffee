# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Platter.Internal.PlainCompiler::addExtractorPlugin 'if|unless', 60, 0, (ps, val, tmplname, n) ->
	ps.js.forceVar ps.jsPost
	v = if n=='unless' then '!(#v#)' else '#v#'
	@doBase ps, null, val, "if (#{v}) Platter.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, this.#{tmplname}.run(#{ps.jsDatas.join ', '}, undo, false).docfrag)", "&&"

# The version for dynamic templates has to subscribe to relevant changes and rerun.
dynRunName = Platter.Internal.DynamicRunner::addUniqueMethod 'if', (undo, datas, tmpl, par, start, end) ->
	shown = false
	undoch = undo.child()
	(show) =>
		show = !!show;
		if shown==show
			return
		shown = show
		if (show)
			Platter.InsertNode par, end, tmpl.run(datas..., undoch, false).docfrag
		else
			@removeBetween start, end, par
			undoch.undo()

Platter.Internal.DynamicCompiler::addExtractorPlugin 'if|unless', 60, 0, (ps, val, tmplname, n) ->
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_ifchange", "this.#{dynRunName}(undo, [#{ps.jsDatas.join ', '}], this.#{tmplname}, #{ps.parent.jsEl||'null'}, #{ps.jsPre}, #{ps.jsPost})"
	v = if n=='unless' then '!(#v#)' else '#v#'
	@doBase ps, null, val, "#{jsChange}(#{v})", "&&"
