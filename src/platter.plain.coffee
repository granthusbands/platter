plainGet = (js) ->
	(id, t, jsData) -> 
		if t=='.'
			return "#{jsData}"
		t = t.split '.'
		if (t.length==1)
			"(#{jsData} ? #{jsData}[#{js.toSrc t[0]}] : #{jsData})"
		else
			"this.runGetMulti(#{jsData}, #{js.toSrc t})"

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
				escapesStringParse v, jsDatas, plainGet(js)
			)
	
	doIf: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = escapesNoStringParse val, "&&", jsDatas, plainGet(js)
		js.addExpr "if (#{val}) #{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsDatas.join ', '}, false), #{jsPost})"

	doUnless: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = escapesNoStringParse val, "&&", jsDatas, plainGet(js)
		js.addExpr "if (!(#{val})) #{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsDatas.join ', '}, false), #{jsPost})"

	doForEach: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = escapesNoStringParse val, null, jsDatas, plainGet(js)
		jsFor = js.addVar "#{jsCur}_for", val
		js.forceVar jsPost
		js.addExpr """
			if (#{jsFor})
				for (var i=0;i<#{jsFor}.length; ++i)
					#{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsFor}[i], #{jsDatas.join ','}, false), #{jsPost})
		"""

	doWith: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = escapesNoStringParse val, null, jsDatas, plainGet(js)
		js.addExpr "#{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{val}, #{jsDatas.join ', '}, false), #{jsPost})"


platter.internal.plainRunner = plainRunner
platter.internal.plainCompiler = plainCompiler
platter.plain = new plainCompiler
