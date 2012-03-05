Backbone.Model.prototype.platter_hasKey = 
	Backbone.Model.prototype.hasKey || (n) ->
		@attributes.hasOwnProperty(n)

Backbone.Model.prototype.platter_watch = (n, fn) ->
	ev = "change:"+n
	@on ev, fn
	$undo.add =>
		@off ev, fn

Backbone.Model.prototype.platter_get = (n) ->
	if @platter_hasKey n
		@get n
	else
		@[n]

Backbone.Model.prototype.platter_set = (n, v) ->
	@set n, v

Backbone.Collection.prototype.platter_watch = (add, remove, replaceMe) ->
	doRep = -> replaceMe @
	@on 'add', add
	@on 'remove', remove
	@on 'reset', replaceMe
	for i in [0...@length]
		add @at(i), @, {index:i}
	$undo.add =>
		@off 'add', add
		@off 'remove', remove
		@off 'reset', doRep

never_equal_to_anything = {}

class backboneRunner extends platter.internal.dynamicRunner
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
		if data && data.platter_watch
			data.platter_watch bit1, fn2
		fn2()

	doSet: (data, n, v) ->
		if data.platter_set
			data.platter_set n, v

	# It's actually more efficient for watchCollection to not undo the adds. The caller is expected to have their own undoer in the same context.
	watchCollection: (coll, add, rem, replaceMe) ->
		if coll instanceof Array 
			for o,i in coll
				add o, coll, {index:i}
			return
		if !coll || !coll.on
			return
		if coll.platter_watch
			coll.platter_watch add, rem, replaceMe

	# Runtime: When people say {{blah}}, they might mean data.get(blah) or data[blah]
	# TODO: Maybe they mean data[blah]()?
	fetchVal: (data, ident) ->
		if !data
			return undefined
		if data.platter_get
			data.platter_get ident
		else
			data[ident]

class backboneCompiler extends platter.internal.dynamicCompiler
	makeRet: (node) ->
		new backboneRunner(node)


platter.internal.backboneRunner = backboneRunner
platter.internal.backboneCompiler = backboneCompiler
platter.backbone = new backboneCompiler

platter.backbone.bigDebug = ->
	platter.subcount = platter.subcount || 0
	Backbone.Model.prototype.on1 = Backbone.Model.prototype.on
	Backbone.Model.prototype.off1 = Backbone.Model.prototype.off
	Backbone.Collection.prototype.on1 = Backbone.Model.prototype.on
	Backbone.Collection.prototype.off1 = Backbone.Model.prototype.off
	Backbone.Model.prototype.on = (a,b,c) ->
		document.title = "Subs=" + ++platter.subcount
		this.on1 a, b, c
	Backbone.Model.prototype.off = (a,b,c) ->
		document.title = "Subs=" + --platter.subcount
		this.off1 a, b, c
