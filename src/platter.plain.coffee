# Plain templates only support a vanilla JS object as the root and don't automatically update.

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


class Platter.Internal.PlainCompiler extends Platter.Internal.TemplateCompiler
	runner: Platter.Internal.PlainRunner
	printer: printer
	@::doRedo = @::doBase


Platter.Plain = new Platter.Internal.PlainCompiler
