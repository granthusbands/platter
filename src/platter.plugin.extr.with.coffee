# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Plain = Platter.Internal.PlainCompiler

plainName = Plain::addUniqueMethod 'with', (ps, val) ->
	val = Platter.EscapesNoStringParse val, null, ps.jsDatas, @plainGet(ps.js)
	ps.js.addExpr "#{ps.jsPost}.parentNode.insertBefore(this.#{ps.jsPre}.run(#{val}, #{ps.jsDatas.join ', '}, undo, false).docfrag, #{ps.jsPost})"

Plain::addExtractorPlugin 'with', 40, plainName, 1


# The version for dynamic templates has to subscribe to relevant changes and rerun.
Dynamic = Platter.Internal.DynamicCompiler
DynamicRun = Platter.Internal.DynamicRunner

dynRunName = DynamicRun::addUniqueMethod 'with', (undo, datas, tmpl, start, end) ->
	undoch = undo.child()
	(val) =>
		@removeBetween start, end
		undoch.undo()
		# In some transitions, we can end up removed from the page but wanting to process the event that caused that, so we need to cope with a lack of a parentNode.
		if (end.parentNode)
			end.parentNode.insertBefore tmpl.run(val, datas..., undoch, false).docfrag, end

dynName = Dynamic::addUniqueMethod 'with', (ps, val) ->
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_ifchange", "this.#{dynRunName}(undo, [#{ps.jsDatas.join ', '}], this.#{ps.jsPre}, #{ps.jsPre}, #{ps.jsPost})"
	@doBase ps, null, val, "#{jsChange}(#v#)", null

Dynamic::addExtractorPlugin 'with', 40, dynName, 1
