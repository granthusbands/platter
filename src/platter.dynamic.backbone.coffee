# Adds adapters to Backbone core objects that make Platter.Dynamic work trivially with them.


isNat = (n) -> !!/^[0-9]+$/.exec(n)

if window.Backbone
	
	
	# Extend models with our specially-named methods
	modprot = Backbone.Model.prototype

	modprot.platter_hasKey = 
		modprot.hasKey || (n) ->
			@attributes.hasOwnProperty(n)

	modprot.platter_watch = (undo, n, fn) ->
		ev = "change:"+n
		@on ev, fn
		undo.add =>
			@off ev, fn

	modprot.platter_get = (n) ->
		if @platter_hasKey n
			@get n
		else
			@[n]

	modprot.platter_set = (n, v) ->
		@set n, v

	modprot.platter_modify = (n, fn) ->
		if @platter_hasKey n
			@set n, fn @get n
		else 
			@[n] = fn @[n]

	# Extend collections, too.
	collprot = Backbone.Collection.prototype
	# Used by foreach and similar
	collprot.platter_watchcoll = (undo, add, remove, replaceMe) ->
		doRep = -> replaceMe @
		@on 'add', add
		@on 'remove', remove
		@on 'reset', doRep
		for i in [0...@length] by 1
			add @at(i), @, {index:i}
		undo.add =>
			@off 'add', add
			@off 'remove', remove
			@off 'reset', doRep

	# Backbone does not have observable length or individual entries on collections - we'll emulate those.
	# There's no cost outside of their use.
	collprot.platter_hasKey = (n) ->
		n == 'length' || isNat n

	collprot.platter_watch = (undo, n, fn) ->
		if n=='length'
			@on 'add remove reset', fn
			undo.add =>
				@off 'add remove reset', fn
		else if isNat n
			add = (el, coll, opts) -> if opts.index<=n then fn()
			rem = (el, coll, opts) -> if opts.index<=n then fn()
			@on 'add', add
			@on 'remove', rem
			@on 'reset', fn
			undo.add =>
				@off 'add', add
				@off 'remove', rem
				@off 'reset', fn

	collprot.platter_get = (n) ->
		if isNat n
			@at n
		else
			@[n]

	collprot.platter_set = (n, v) ->
		if isNat n
			@remove @at n
			@add v, index: n
		else if n=='length' && isNat v
			while @length>n && @length>0
				@remove @at @length-1
		else
			@[n] = v


	Platter.Internal.DebugList.push
		platter_haskey: modprot
		platter_watch: modprot
		platter_get: modprot
		platter_set: modprot

	Platter.Internal.DebugList.push
		platter_haskey: collprot
		platter_watch: collprot
		platter_get: collprot
		platter_set: collprot
		platter_watchcoll: collprot
