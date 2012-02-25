# TODO: This code is probably slowed down by not passing jsEl through (causing #{jsPost}.parentNode). Maybe bring it back?
class plainCompiler extends platter.internal.templateCompiler
	doSimple: (ret, js, jsCur, jsData, n, v, expr) ->
		js.addExpr expr
			.replace("#el#", "#{jsCur}")
			.replace("#n#", "'#{n}'")
			.replace("#v#", 
				@escapesReplace v, (t) -> if t=='.' then "#{jsData}" else "#{jsData}.#{t}"
			)
	
	doIf: (ret, js, jsCur, jsPost, jsData, val, inner) ->
		ret[jsCur.n] = inner
		val = @escapesReplace val, (t) => "#{jsData}."+t
		js.addExpr "if (#{val}) #{jsPost}.parentNode.insertBefore(this.#{jsCur.n}.run(#{jsData}), #{jsPost})"

	doForEach: (ret, js, jsCur, jsPost, jsData, val, inner) ->
		ret[jsCur.n] = inner
		val = @escapesReplace val, (t) => "#{jsData}."+t
		jsFor = js.addVar "#{jsCur}_for", val
		js.forceVar jsPost
		js.addExpr """
			for (var i=0;i<#{jsFor}.length; ++i)
				#{jsPost}.parentNode.insertBefore(this.#{jsCur.n}.run(#{jsFor}[i]), #{jsPost})
		"""

platter.internal.plainCompiler = plainCompiler
platter.plain = new plainCompiler
