# Currently used by the tests to ensure that everything that should be undone is undone.
# Keeps a list of all object monkey-patched by platter, so that they can be made to count.
# All debug code is expected to gather here, and this code will likely not be in later release builds.

stackTrace = ->
	try
		throw new Error
	catch e
		e.stack

bigDebugRan = false
bigDebug = ->
	return if bigDebugRan
	bigDebugRan = true
	for o in platter.internal.debuglist
		do (o) ->
			if o.platter_watch
				id = Math.random()
				orig = o.platter_watch.platter_watch
				o.platter_watch.platter_watch = (n, fn) ->
					platter.internal.subscount++
					platter.internal.subs[id] = stackTrace()
					$undo.add ->
						platter.internal.subscount--
						delete platter.internal.subs[id]
					orig.call @, n, fn
			if o.platter_watchcoll
				id2 = Math.random()
				orig2 = o.platter_watchcoll.platter_watchcoll
				o.platter_watchcoll.platter_watchcoll = (add, remove, replaceMe) ->
					platter.internal.subscount++
					platter.internal.subs[id2] = stackTrace()
					$undo.add ->
						platter.internal.subscount--
						delete platter.internal.subs[id2]
					orig2.call @, add, remove, replaceMe


platter.internal.debuglist = []
platter.internal.bigDebug = bigDebug
