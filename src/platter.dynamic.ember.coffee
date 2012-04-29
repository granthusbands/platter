# Adds adapters to Ember core objects that make Platter.Dynamic work trivially with them.

isNat = (n) -> !!/^[0-9]+$/.exec(n)
unique = {}

if window.Ember
	
	
	# Extend models with our specially-named methods
	modprot = Ember.Object.prototype

	modprot.platter_watch = (undo, n, fn) ->
		@addObserver n, fn
		undo.add =>
			@removeObserver n, fn

	modprot.platter_get = (n) ->
		@getWithDefault n, @[n]

	modprot.platter_set = (n, v) ->
		@set n, v

	modprot.platter_modify = (n, fn) ->
		v = @getWithDefault n, unique
		if v!=unique
			@set n, fn v
		else
			@[n] = fn @[n]


	Platter.Internal.DebugList.push
		platter_watch: modprot
		platter_get: modprot
		platter_set: modprot
		platter_modify: modprot


	# Ember uses a complicated system of mixins that does not use the usual JS prototype chain, so we need to patch a number of objects. We patch the mixins and the classes that have used them.
	# We don't patch MutableEnumerable, Array or MuteableArray, because the patch the the Enumerable mixin should have the desired effect.
	# We don't patch ArrayController, because it has an ArrayProxy prototype.
	# TODO: Ember.CollectionView should probably be patched to defer to its .content
	collprots = [
		Ember.Enumerable.mixins[0].properties
		Ember.ArrayProxy.prototype
		Ember.Set.prototype
	]

	for collprot in collprots

		collprot.platter_watchcoll = (undo, add, remove, replaceMe) ->
			# TODO: The didchange event passes coll, removed, added, but seems not to spply indexes. Maybe there's a way of getting those?
			arr = []
			doRep = () =>
				arr2 = @toArray()
				Platter.Transformer arr, arr2, (i, o) ->
					arr.splice i, 0, o
					add o, @, {index:i}
				, (i) ->
					remove arr[i], @, {index:i}
					arr.splice i, 1
			doRep()
			obs =
				enumerableWillChange: ()->
				enumerableDidChange: doRep
			@addEnumerableObserver obs
			undo.add => @removeEnumerableObserver obs

		collprot.platter_watch = (undo, n, fn) ->
			# TODO: Ember appears not to expose events for length, at least.
			obs =
				enumerableWillChange: ()->
				enumerableDidChange: fn
			@addEnumerableObserver obs
			undo.add => @removeEnumerableObserver obs

		collprot.platter_get = (n) ->
			@toArray()[n]

		collprot.platter_set = (n, v) ->
			if n=='length' && isNat v
				while @length>n && @length>0
					@pop()
				while @length<n
					@push undefined
			else
				# TODO: Assignment by index
				@[n] = v

		Platter.Internal.DebugList.push
			platter_watch: collprot
			platter_get: collprot
			platter_set: collprot
			platter_watchcoll: collprot
