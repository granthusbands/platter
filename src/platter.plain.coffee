

printer = Platter.Internal.JSPrinter()
printer['dataGet'] = (op, ctx) ->
	data = ctx.datas[(op.dots||1)-1]
	if op.ident
		Platter.Internal.Index data, op.ident
	else
		data
printer['.'] = (op, ctx) ->
	"Platter.Get(#{@go(op.left, ctx)}, #{Platter.Internal.ToSrc(op.ident)})"
printer['['] = (op, ctx) ->
	"Platter.Get(#{@go(op.left, ctx)}, #{@go(op.inner, ctx)})"
printer['a()'] = (op, ctx) ->
	lop = op.left
	if lop.txt=='get' && lop.dots
		t = ctx.js.addVar 't'
		fn = "Platter.Get(#{t}=#{@go({txt: 'get', dots: lop.dots, ident: ''}, ctx)}, #{@go({txt: 'val', val: lop.ident}, ctx)})"
	else if lop.txt=='.'
		t = ctx.js.addVar 't'
		fn = "Platter.Get(#{t}=#{@go(lop.left, ctx)}, #{@go({txt: 'val', val: lop.ident}, ctx)})"
	else if lop.txt=='['
		t = ctx.js.addVar 't'
		fn = "Platter.Get(#{t}=#{@go(lop.left, ctx)}, #{@go(lop.inner, ctx)})"
	else
		t = ctx.datas[0]
		fn = "(#{@go(lop, ctx)})"
	if op.inner
		"#{fn}.call(#{t}, #{@go(op.inner, ctx)})"
	else
		"#{fn}.call(#{t})"
printer['a(b)'] = printer['a()']


class Platter.Internal.PlainRunner extends Platter.Internal.TemplateRunner


# TODO: This code is probably slowed down by not passing jsEl through (causing #{jsPost}.parentNode). Maybe bring it back?
class Platter.Internal.PlainCompiler extends Platter.Internal.TemplateCompiler
	runner: Platter.Internal.PlainRunner

	doBase: (ps, n, v, expr, sep) ->
		if sep==true
			op = Platter.Internal.ParseString v
		else
			op = Platter.Internal.ParseNonString v, sep

		ctx = datas: ps.jsDatas, js:ps.js.child()
		ctx.js.existingVar 'undo'

		expr = expr
			.replace(/#el#/g, "#{ps.jsEl}")
			.replace(/#n#/g, ps.js.toSrc n)
			.replace(/#v#/g, printer.go(op, ctx))

		ps.js.addExpr expr

	@::doRedo = @::doBase

	doSimple: (ps, n, v, expr) ->
		@doBase ps, n, v, expr, true


Platter.Plain = new Platter.Internal.PlainCompiler
