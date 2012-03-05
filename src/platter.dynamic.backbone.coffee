modprot = Backbone.Model.prototype
collprot = Backbone.Collection.prototype

modprot.platter_hasKey = 
	modprot.hasKey || (n) ->
		@attributes.hasOwnProperty(n)

modprot.platter_watch = (n, fn) ->
	ev = "change:"+n
	@on ev, fn
	$undo.add =>
		@off ev, fn

modprot.platter_get = (n) ->
	if @platter_hasKey n
		@get n
	else
		@[n]

modprot.platter_set = (n, v) ->
	@set n, v

collprot.platter_watchcoll = (add, remove, replaceMe) ->
	doRep = -> replaceMe @
	@on 'add', add
	@on 'remove', remove
	@on 'reset', doRep
	for i in [0...@length]
		add @at(i), @, {index:i}
	$undo.add =>
		@off 'add', add
		@off 'remove', remove
		@off 'reset', doRep

platter.internal.debuglist.push
	platter_haskey: modprot
	platter_watch: modprot
	platter_get: modprot
	platter_set: modprot
	platter_watchcoll: collprot

platter.backbone = platter.dynamic
