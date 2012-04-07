# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Plain = Platter.Internal.PlainCompiler

plainName = Plain::addUniqueMethod 'if', (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
	val = Platter.EscapesNoStringParse val, "&&", jsDatas, @plainGet(js)
	js.addExpr "if (#{val}) #{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsDatas.join ', '}, undo, false).docfrag, #{jsPost})"

Plain::addExtractorPlugin 'if', 60, plainName, 0

plainName = Plain::addUniqueMethod 'unless', (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
	val = Platter.EscapesNoStringParse val, "&&", jsDatas, @plainGet(js)
	js.addExpr "if (!(#{val})) #{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsDatas.join ', '}, undo, false).docfrag, #{jsPost})"

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

dynName = Dynamic::addUniqueMethod 'if', (ret, js, jsPre, jsPost, jsDatas, val, inner) ->
	jsChange = js.addForcedVar "#{jsPre}_ifchange", "this.#{dynRunName}(undo, [#{jsDatas.join ', '}], this.#{jsPre}, #{jsPre}, #{jsPost})"
	@doBase ret, js, jsPre, jsDatas, null, val, "#{jsChange}(#v#)", "&&"

Dynamic::addExtractorPlugin 'if', 60, dynName, 0

dynName = Dynamic::addUniqueMethod 'if', (ret, js, jsPre, jsPost, jsDatas, val, inner) ->
	jsChange = js.addForcedVar "#{jsPre}_ifchange", "this.#{dynRunName}(undo, [#{jsDatas.join ', '}], this.#{jsPre}, #{jsPre}, #{jsPost})"
	@doBase ret, js, jsPre, jsDatas, null, val, "#{jsChange}(!(#v#))", "&&"

Dynamic::addExtractorPlugin 'unless', 60, dynName, 0
