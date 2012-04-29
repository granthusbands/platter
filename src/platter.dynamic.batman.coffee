# Adds adapters to Batman core objects that make Platter.Dynamic work trivially with them.


isNat = (n) -> !!/^[0-9]+$/.exec(n)

if window.Batman
	
	
	# Extend models with our specially-named methods
	objprot = Batman.Object.prototype

	objprot.platter_watch = (undo, n, fn) ->
		@observe n, fn
		undo.add =>
			@forget n, fn

	objprot.platter_get = (n) ->
		if @hasProperty n
			@get n
		else
			@[n]

	objprot.platter_set = (n, v) ->
		@set n, v

	objprot.platter_modify = (n, fn) ->
		if @hasProperty n
			@set n, fn @get n
		else 
			@[n] = fn @[n]

	objprot.platter_watchcoll = (undo, add, remove, replaceMe) ->
		arr = @toArray()
		doRep = () =>
			arr2 = @toArray()
			Platter.Transformer arr, arr2, (i, o) ->
				arr.splice i, 0, o
				add o, @, {index:i}
			, (i) ->
				remove arr[i], @, {index:i}
				arr.splice i, 1
		for i in [0...arr.length] by 1
			add arr[i], @, {index:i}
		# Batman has 'on' but doesn't have 'off', so we'll use symmetrical stuff.
		@event('change').addHandler doRep
		undo.add =>
			@event('change').removeHandler doRep


	# Add numeric indexing for arrays. Batman doesn't really have them, but (potentially sorted) Sets mostly act like them.
	setprot = Batman.Set.prototype
	setprot.platter_get = (n) ->
		if isNat n
			@toArray()[n]
		else if @hasProperty n
			@get n
		else
			@[n]

	setprot.platter_watch = (undo, n, fn) ->
		if isNat n
			# TODO: Make this efficient, if Batman supports watching an indivdual entry
			@event('change').addHandler fn
			undo.add =>
				@event('change').removeHandler fn
		else
			@observe n, fn
			undo.add =>
				@forget n, fn

	# TODO: setprot.platter_set - Batman appears not to support updating a particular entry
	# TODO: setprot.platter_modify - Batman appears not to support updating a particular entry



	Platter.Internal.DebugList.push
		platter_watch: objprot
		platter_get: objprot
		platter_set: objprot
		platter_watchcoll: objprot

	Platter.Internal.DebugList.push
		platter_get: setprot
		platter_watch: setprot
