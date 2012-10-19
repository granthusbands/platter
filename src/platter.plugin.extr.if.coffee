# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Platter.Internal.PlainCompiler::addExtractorPlugin 'if|unless', 60, 0, (ps, val, tmpl, n) ->
	ps.js.forceVar ps.jsPost
	jsTmpl = ps.js.addContext "#{ps.jsPre}_tmpl", tmpl
	v = if n=='unless' then '!(#v#)' else '#v#'
	@doBase ps, null, val, "if (#{v}) Platter.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, #{jsTmpl}.run(#{ps.jsDatas.join ', '}, undo, false).docfrag)", "&&"

# The version for dynamic templates has to subscribe to relevant changes and rerun.
ifInner = (undo, datas, tmpl, par, start, end) ->
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

Platter.Internal.DynamicCompiler::addExtractorPlugin 'if|unless', 60, 0, (ps, val, tmpl, n) ->
	inner = ps.js.addContext "#{ps.jsPre}_inner", ifInner
	jsTmpl = ps.js.addContext "#{ps.jsPre}_tmpl", tmpl
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_ifchange", "#{inner}.call(this, undo, [#{ps.jsDatas.join ', '}], #{jsTmpl}, #{ps.parent.jsEl||'null'}, #{ps.jsPre}, #{ps.jsPost})"
	v = if n=='unless' then '!(#v#)' else '#v#'
	@doBase ps, null, val, "#{jsChange}(#{v})", "&&"
