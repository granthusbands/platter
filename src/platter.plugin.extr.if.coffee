# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Plain = Platter.Internal.PlainCompiler

plainName = Plain::addUniqueMethod 'if', (ps, val, tmplname, n) ->
	ps.js.forceVar ps.jsPost
	if n!='if' && n!='unless' then debugger
	v = if n=='unless' then '!(#v#)' else '#v#'
	@doBase ps, null, val, "if (#{v}) Platter.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, this.#{tmplname}.run(#{ps.jsDatas.join ', '}, undo, false).docfrag)", "&&"

Plain::addExtractorPlugin 'if|unless', 60, plainName, 0

# The version for dynamic templates has to subscribe to relevant changes and rerun.
Dynamic = Platter.Internal.DynamicCompiler
DynamicRun = Platter.Internal.DynamicRunner

dynRunName = DynamicRun::addUniqueMethod 'if', (undo, datas, tmpl, par, start, end) ->
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

dynName = Dynamic::addUniqueMethod 'if', (ps, val, tmplname, n) ->
	if n!='if' && n!='unless' then debugger
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_ifchange", "this.#{dynRunName}(undo, [#{ps.jsDatas.join ', '}], this.#{tmplname}, #{ps.parent.jsEl||'null'}, #{ps.jsPre}, #{ps.jsPost})"
	v = if n=='unless' then '!(#v#)' else '#v#'
	@doBase ps, null, val, "#{jsChange}(#{v})", "&&"

Dynamic::addExtractorPlugin 'if|unless', 60, dynName, 0
