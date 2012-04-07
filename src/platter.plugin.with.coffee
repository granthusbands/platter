# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Plain = Platter.Internal.PlainCompiler

plainName = Plain::addUniqueMethod 'with', (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
	val = Platter.EscapesNoStringParse val, null, jsDatas, @plainGet(js)
	js.addExpr "#{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{val}, #{jsDatas.join ', '}, undo, false).docfrag, #{jsPost})"

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

dynName = Dynamic::addUniqueMethod 'with', (ret, js, jsPre, jsPost, jsDatas, val, inner) ->
	jsChange = js.addForcedVar "#{jsPre}_ifchange", "this.#{dynRunName}(undo, [#{jsDatas.join ', '}], this.#{jsPre}, #{jsPre}, #{jsPost})"
	@doBase ret, js, jsPre, jsDatas, null, val, "#{jsChange}(#v#)", null

Dynamic::addExtractorPlugin 'with', 40, dynName, 1
