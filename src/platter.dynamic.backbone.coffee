# Monkey-patch backbone models to have a hasKey method (ignoring backbone's broken null handling)
if !Backbone.Model.prototype.hasKey
	Backbone.Model.prototype.hasKey = (n) ->
		@attributes.hasOwnProperty(n)

never_equal_to_anything = {}

class backboneRunner extends platter.internal.dynamicRunner
	runGet: (fn, data, ev) ->
		data.on ev, fn
		$undo.add ->
			data.off ev, fn
		fn()

	runGetMulti: (fn, data, [bit1, bits...]) ->
		val = never_equal_to_anything
		undo = null;
		$undo.add ->
			undo() if undo
		fn2 = =>
			oval = val
			val = @fetchVal data, bit1
			if oval==val
				return 
			if bits.length==0
				fn(val)
			else
				undo() if undo
				$undo.start()
				@runGetMulti fn, val, bits
				undo = $undo.claim()
		if data instanceof Backbone.Model
			data.on "change:#{bit1}", fn2
			$undo.add ->
				data.off "change:#{bit1}", fn2
		fn2()

	doSet: (data, n, v) ->
		data.set n, v

	# It's actually more efficient for watchCollection to not undo the adds. The caller is expected to have their own undoer in the same context.
	watchCollection: (coll, add, rem) ->
		coll.on 'add', add
		coll.on 'remove', rem
		for i in [0..(coll.length-1)]
			add coll.at(i), coll, {index:i}
		$undo.add ->
			coll.off 'add', add
			coll.off 'remove', rem

	# Runtime: When people say {{blah}}, they might mean data.get(blah) or data[blah]
	# TODO: Maybe they mean data[blah]()?
	fetchVal: (data, ident) ->
		if !data
			return undefined
		if data.hasKey && data.hasKey ident
			data.get ident
		else
			data[ident]

class backboneCompiler extends platter.internal.dynamicCompiler
	makeRet: (node) ->
		new backboneRunner(node)

	convertVal: (txt, jsData) ->
		@escapesReplace txt, (t) -> "#{jsData}.get('#{t}')"

	# Compiler: Turn "{{a}}blah{{b}}" into event names, so "change:a change:b"
	extraParam: (txt) ->
		seen = {}
		ev = []
		@escapesReplace txt, (t) ->
			if !seen[t]
				seen[t] = 1
				ev.push "change:#{t}"
		"'#{ev.join(" ")}'"


platter.internal.backboneRunner = backboneRunner
platter.internal.backboneCompiler = backboneCompiler
platter.backbone = new backboneCompiler

platter.backbone.bigDebug = ->
	platter.subcount = platter.subcount || 0
	Backbone.Model.prototype.on1 = Backbone.Model.prototype.on
	Backbone.Model.prototype.off1 = Backbone.Model.prototype.off
	Backbone.Model.prototype.on = (a,b,c) ->
		document.title = "Subs=" + ++platter.subcount
		this.on1 a, b, c
	Backbone.Model.prototype.off = (a,b,c) ->
		document.title = "Subs=" + --platter.subcount
		this.off1 a, b, c
