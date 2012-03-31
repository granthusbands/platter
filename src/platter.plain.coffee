plainGet = (js) ->
	(id, t, jsData) -> 
		if t=='.'
			return "#{jsData}"
		t = t.split '.'
		if (t.length==1)
			"(#{jsData} ? #{jsData}[#{js.toSrc t[0]}] : #{jsData})"
		else
			"this.runGetMulti(#{jsData}, #{js.toSrc t})"

class PlainRunner extends Platter.Internal.TemplateRunner
	doModify: (data, n, fn) ->
		data[n] = fn data[n]
	doSet: (data, n, v) ->
		data[n] = v

	runGetMulti: (data, bits) ->
		for bit in bits
			if !data
				return data
			data = data[bit]
		data


# TODO: This code is probably slowed down by not passing jsEl through (causing #{jsPost}.parentNode). Maybe bring it back?
class PlainCompiler extends Platter.Internal.TemplateCompiler
	makeRet: (node) ->
		new PlainRunner(node)

	doBase: (ret, js, jsCur, jsDatas, n, v, expr, sep) ->
		if (sep==true)
			parse = escapesStringParse
		else
			parse = (txt, jsDatas, fn) -> escapesNoStringParse txt, sep, jsDatas, fn
		js.addExpr expr
			.replace(/#el#/g, "#{jsCur}")
			.replace(/#n#/g, js.toSrc n)
			.replace(/#v#/g, 
				parse v, jsDatas, plainGet(js)
			)

	doSimple: (ret, js, jsCur, jsDatas, n, v, expr) ->
		@doBase ret, js, jsCur, jsDatas, n, v, expr, true
	
	doIf: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = escapesNoStringParse val, "&&", jsDatas, plainGet(js)
		js.addExpr "if (#{val}) #{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsDatas.join ', '}, undo, false).docfrag, #{jsPost})"

	doUnless: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = escapesNoStringParse val, "&&", jsDatas, plainGet(js)
		js.addExpr "if (!(#{val})) #{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsDatas.join ', '}, undo, false).docfrag, #{jsPost})"

	doForEach: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = escapesNoStringParse val, null, jsDatas, plainGet(js)
		jsFor = js.addVar "#{jsCur}_for", val
		js.forceVar jsPost
		js.addExpr """
			if (#{jsFor})
				for (var i=0;i<#{jsFor}.length; ++i)
					#{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{jsFor}[i], #{jsDatas.join ','}, undo, false).docfrag, #{jsPost})
		"""

	doWith: (ret, js, jsCur, jsPost, jsDatas, val, inner) ->
		val = escapesNoStringParse val, null, jsDatas, plainGet(js)
		js.addExpr "#{jsPost}.parentNode.insertBefore(this.#{jsCur}.run(#{val}, #{jsDatas.join ', '}, undo, false).docfrag, #{jsPost})"


Platter.Internal.PlainRunner = PlainRunner
Platter.Internal.PlainCompiler = PlainCompiler
Platter.Plain = new PlainCompiler
