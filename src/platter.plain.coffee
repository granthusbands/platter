

class Platter.Internal.PlainRunner extends Platter.Internal.TemplateRunner
	runGetMulti: (data, bits) ->
		for bit in bits
			if !data
				return data
			data = data[bit]
		data


# TODO: This code is probably slowed down by not passing jsEl through (causing #{jsPost}.parentNode). Maybe bring it back?
class Platter.Internal.PlainCompiler extends Platter.Internal.TemplateCompiler
	runner: Platter.Internal.PlainRunner

	plainGet: (js) ->
		(id, t, jsData) -> 
			if t=='.'
				return "#{jsData}"
			t = t.split '.'
			if (t.length==1)
				"(#{jsData} ? #{jsData}[#{js.toSrc t[0]}] : void 0)"
			else
				"this.runGetMulti(#{jsData}, #{js.toSrc t})"

	doBase: (ps, n, v, expr, sep) ->
		if (sep==true)
			parse = Platter.EscapesStringParse
		else
			parse = (txt, jsDatas, fn) -> Platter.EscapesNoStringParse txt, sep, jsDatas, fn
		ps.js.addExpr expr
			.replace(/#el#/g, "#{ps.jsCur}")
			.replace(/#n#/g, ps.js.toSrc n)
			.replace(/#v#/g, 
				parse v, ps.jsDatas, @plainGet(ps.js)
			)

	doSimple: (ps, n, v, expr) ->
		@doBase ps, n, v, expr, true


Platter.Plain = new Platter.Internal.PlainCompiler
