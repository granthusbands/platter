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


platter.backbone = platter.dynamic
