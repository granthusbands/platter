class plainRunner extends platter.internal.templateRunner
	doSet: (data, n, v) ->
		data[n] = v

# TODO: This code is probably slowed down by not passing jsEl through (causing #{jsPost}.parentNode). Maybe bring it back?
class plainCompiler extends platter.internal.templateCompiler
	makeRet: (node) ->
		new plainRunner(node)

	doSimple: (ret, js, jsCur, jsData, n, v, expr) ->
		js.addExpr expr
			.replace("#el#", "#{jsCur}")
			.replace("#n#", js.toSrc n)
			.replace("#v#", 
				@escapesReplace v, (t) -> if t=='.' then "#{jsData}" else js.index(jsData, t)
			)
	
	doIf: (ret, js, jsCur, jsPost, jsData, val, inner) ->
		val = @escapesReplace val, (t) => js.index jsData, t
		js.addExpr "if (#{val}) #{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsData}, false), #{jsPost})"

	doForEach: (ret, js, jsCur, jsPost, jsData, val, inner) ->
		val = @escapesReplace val, (t) => js.index jsData, t
		jsFor = js.addVar "#{jsCur}_for", val
		js.forceVar jsPost
		js.addExpr """
			for (var i=0;i<#{jsFor}.length; ++i)
				#{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsFor}[i], false), #{jsPost})
		"""

platter.internal.plainRunner = plainRunner
platter.internal.plainCompiler = plainCompiler
platter.plain = new plainCompiler
