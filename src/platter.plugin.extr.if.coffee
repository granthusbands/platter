# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Plain = Platter.Internal.PlainCompiler

plainName = Plain::addUniqueMethod 'if', (ps, val) ->
	val = Platter.EscapesNoStringParse val, "&&", ps.jsDatas, @plainGet(ps.js)
	ps.js.addExpr "if (#{val}) #{ps.jsPost}.parentNode.insertBefore(this.#{ps.jsPre}.run(#{ps.jsDatas.join ', '}, undo, false).docfrag, #{ps.jsPost})"

Plain::addExtractorPlugin 'if', 60, plainName, 0

plainName = Plain::addUniqueMethod 'unless', (ps, val) ->
	val = Platter.EscapesNoStringParse val, "&&", ps.jsDatas, @plainGet(ps.js)
	ps.js.addExpr "if (!(#{val})) #{ps.jsPost}.parentNode.insertBefore(this.#{ps.jsPre}.run(#{ps.jsDatas.join ', '}, undo, false).docfrag, #{ps.jsPost})"

Plain::addExtractorPlugin 'unless', 60, plainName, 0

# The version for dynamic templates has to subscribe to relevant changes and rerun.
Dynamic = Platter.Internal.DynamicCompiler
DynamicRun = Platter.Internal.DynamicRunner

dynRunName = DynamicRun::addUniqueMethod 'if', (undo, datas, tmpl, start, end) ->
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

dynName = Dynamic::addUniqueMethod 'if', (ps, val) ->
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_ifchange", "this.#{dynRunName}(undo, [#{ps.jsDatas.join ', '}], this.#{ps.jsPre}, #{ps.jsPre}, #{ps.jsPost})"
	@doBase ps, null, val, "#{jsChange}(#v#)", "&&"

Dynamic::addExtractorPlugin 'if', 60, dynName, 0

dynName = Dynamic::addUniqueMethod 'unless', (ps, val) ->
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_ifchange", "this.#{dynRunName}(undo, [#{ps.jsDatas.join ', '}], this.#{ps.jsPre}, #{ps.jsPre}, #{ps.jsPost})"
	@doBase ps, null, val, "#{jsChange}(!(#v#))", "&&"

Dynamic::addExtractorPlugin 'unless', 60, dynName, 0