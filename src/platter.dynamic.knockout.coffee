# KnockoutJS does not use standard JS prototype/inheritance techniques, so we have to instrument core Platter functions, instead. We only do it if Knockout is around.

# TODO: We're supporting knockout subscribables _everywhere_. Maybe we should only support them as plain properties of objects.

isNat = (n) -> !!/^[0-9]+$/.exec(n)

if window.ko

	Platter.WatchPreKO = Platter.Watch
	Platter.Watch = (undo, o, n, fn) ->
		v = @GetPreKO o, n
		if v && ko.isSubscribable(v) && !v.platter_watchcoll
			sub = v.subscribe fn
			undo.add -> sub.dispose()
		@WatchPreKO undo, o, n, fn

	Platter.GetPreKO = Platter.Get
	Platter.Get = (o, n) ->
		v = @GetPreKO o, n
		if ko.isObservable(v) && !v.platter_watchcoll
			v()
		else
			v

	Platter.GetRPreKO = Platter.GetR
	Platter.GetR = (undo, o, n) ->
		v = @GetRPreKO undo, o, n
		if ko.isObservable(v) && !v.platter_watchcoll
			sub = v.subscribe undo.repeat
			undo.add -> sub.dispose()
			v()
		else
			v

	Platter.SetPreKO = Platter.Set
	Platter.Set = (o, n, v) ->
		oldv = @GetPreKO o, n
		if ko.isObservable oldv
			oldv(v)
		else
			@SetPreKO o, n, v

	Platter.ModifyPreKO = Platter.Modify
	Platter.Modify = (o, n, fn) ->
		oldv = @GetPreKO o, n
		if ko.isObservable oldv
			oldv(fn oldv())
		else
			@ModifyPreKO o, n, fn



	collprot = ko.observableArray.fn

	collprot.platter_watch = (undo, n, fn) ->
		sub = @subscribe fn
		undo.add -> sub.dispose()

	collprot.platter_get = (n) ->
		@()[n]

	collprot.platter_set = (n, v) ->
		# Correctly handled numbers and 'length', at least.
		@()[n] = v
		@valueHasMutated()

	collprot.platter_modify = (n, fn) ->
		@()[n] = fn @()[n]
		@valueHasMutated()

	collprot.platter_watchcoll = (undo, add, remove, replaceMe) ->
		arr = @().slice()
		doRep = () =>
			arr2 = @()
			Platter.Transformer arr, arr2, (i, o) ->
				arr.splice i, 0, o
				add o, @, {index:i}
			, (i) ->
				remove arr[i], @, {index:i}
				arr.splice i, 1
		for i in [0...arr.length] by 1
			add arr[i], @, {index:i}
		# Batman has 'on' but doesn't have 'off', so we'll use symmetrical stuff.
		sub = @subscribe doRep
		undo.add ->
			sub.dispose()

	# TODO: Monitor the Platter.Get/Set/Watch/Modify, above, during debug/test.
	Platter.Internal.DebugList.push
		platter_haskey: collprot
		platter_watch: collprot
		platter_get: collprot
		platter_set: collprot
		platter_watchcoll: collprot