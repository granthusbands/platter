# The code in this file is probably useful for all dynamically-updating interfaces

printer = Platter.Internal.JSPrinter()
printer['dataGet'] = (op, ctx) ->
	data = ctx.datas[(op.dots||1)-1]
	if (op.ident)
		"Platter.GetR(undo, #{data}, #{Platter.Internal.ToSrc(op.ident)})"
	else
		data
printer['.'] = (op, ctx) ->
	"Platter.GetR(undo, #{@go(op.left, ctx)}, #{Platter.Internal.ToSrc(op.ident)})"
printer['['] = (op, ctx) ->
	"Platter.GetR(undo, #{@go(op.left, ctx)}, #{@go(op.inner, ctx)})"
printer['a()'] = (op, ctx) ->
	lop = op.left
	if lop.txt=='get' && lop.dots
		t = ctx.js.addVar 't'
		fn = "Platter.GetR(undo, #{t}=#{@go({txt: 'get', dots: lop.dots, ident: ''}, ctx)}, #{@go({txt: 'val', val: lop.ident}, ctx)})"
	else if lop.txt=='.'
		t = ctx.js.addVar 't'
		fn = "Platter.GetR(undo, #{t}=#{@go(lop.left, ctx)}, #{@go({txt: 'val', val: lop.ident}, ctx)})"
	else if lop.txt=='['
		t = ctx.js.addVar 't'
		fn = "Platter.GetR(undo, #{t}=#{@go(lop.left, ctx)}, #{@go(lop.inner, ctx)})"
	else
		t = ctx.datas[0]
		fn = "(#{@go(lop, ctx)})"
	if op.inner
		"#{fn}.call(#{t}, #{@go(op.inner, ctx)})"
	else
		"#{fn}.call(#{t})"
printer['a(b)'] = printer['a()']


class Platter.Internal.DynamicRunner extends Platter.Internal.TemplateRunner


class Platter.Internal.DynamicCompiler extends Platter.Internal.TemplateCompiler
	runner: Platter.Internal.DynamicRunner
	printer: printer

	doExpr: (ps, expr) ->
		ps.js.addExpr """
			undo.repeater(function(undo){
				#{expr}
			})
		"""

	doRedo: (ps, n, v, expr, sep) ->
		jsUndo2 = ps.js.addForcedVar "#{ps.jsPre}_undo", "undo.child()"
		jsChange = ps.js.addForcedVar "#{ps.jsPre}_change", """
			function(val) {
				#{jsUndo2}.undo();
				#{expr.replace(/#v#/g, 'val').replace(/#el#/g, ps.jsEl)};
			}
		"""
		@doBase ps, n, v, "#{jsChange}(#v#)", sep

Platter.Dynamic = new Platter.Internal.DynamicCompiler
