class plainCompiler extends platter.internal.templateCompiler
	doSimple: (ret, js, jsCur, n, v, expr) ->
		js.addExpr expr
			.replace("#el#", "##{jsCur}#")
			.replace("#n#", "'#{n}'")
			.replace("#v#", 
				@escapesReplace v, (t) -> if t=='.' then "data" else "data.#{t}"  #TODO: data -> ##{jsData}#
			)
	
	doIf: (ret, js, pre, jsCur, post, jsPost, jsEl, jsData, val, inner) ->
		ret[jsCur] = inner
		val = @escapesReplace val, (t) => "##{jsData}#."+t
		js.addExpr "if (#{val}) ##{jsEl}#.insertBefore(this.#{jsCur}.run(##{jsData}#), ##{jsPost}#)"

	doForEach: (ret, js, pre, jsCur, post, jsPost, jsEl, jsData, val, inner) ->
		ret[jsCur] = inner
		val = @escapesReplace val, (t) => "data."+t
		jsFor = js.addVar "#{jsCur}_for", val
		js.forceVar jsPost
		js.addExpr """
			for (var i=0;i<##{jsFor}#.length; ++i)
				##{jsEl}#.insertBefore(this.#{jsCur}.run(##{jsFor}#[i]), ##{jsPost}#)
		"""

platter.internal.plainCompiler = plainCompiler
platter.plain = new plainCompiler
