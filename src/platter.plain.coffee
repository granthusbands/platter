plainGet = (js) ->
	(id, t, jsData) -> 
		if t=='.'
			"#{jsData}"
		else
			"this.runGetMulti(#{jsData}, #{js.toSrc t.split '.'})"

class plainRunner extends platter.internal.templateRunner
	doSet: (data, n, v) ->
		data[n] = v

	runGetMulti: (data, bits) ->
		for bit in bits
			if !data
				return data
			data = data[bit]
		data


# TODO: This code is probably slowed down by not passing jsEl through (causing #{jsPost}.parentNode). Maybe bring it back?
class plainCompiler extends platter.internal.templateCompiler
	makeRet: (node) ->
		new plainRunner(node)

	doSimple: (ret, js, jsCur, jsDatas, n, v, expr) ->
		js.addExpr expr
			.replace(/#el#/g, "#{jsCur}")
			.replace(/#n#/g, js.toSrc n)
			.replace(/#v#/g, 
				@escapesParse v, jsDatas, plainGet(js)
			)
	
	doIf: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = @escapesParse val, jsDatas, plainGet(js)
		js.addExpr "if (#{val}) #{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsDatas.join ', '}, false), #{jsPost})"

	doUnless: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = @escapesParse val, jsDatas, plainGet(js)
		js.addExpr "if (!(#{val})) #{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsDatas.join ', '}, false), #{jsPost})"

	doForEach: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = @escapesParse val, jsDatas, plainGet(js)
		jsFor = js.addVar "#{jsCur}_for", val
		js.forceVar jsPost
		js.addExpr """
			for (var i=0;i<#{jsFor}.length; ++i)
				#{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsFor}[i], #{jsDatas.join ','}, false), #{jsPost})
		"""

platter.internal.plainRunner = plainRunner
platter.internal.plainCompiler = plainCompiler
platter.plain = new plainCompiler
