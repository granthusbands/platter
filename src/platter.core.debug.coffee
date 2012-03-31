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
	for o in Platter.Internal.DebugList
		do (o) ->
			if o.platter_watch
				id = Math.random()
				orig = o.platter_watch.platter_watch
				o.platter_watch.platter_watch = (undo, n, fn) ->
					Platter.Internal.SubsCount++
					Platter.Internal.Subs[id] = stackTrace()
					undo.add ->
						Platter.Internal.SubsCount--
						delete Platter.Internal.Subs[id]
					orig.call @, undo, n, fn
			if o.platter_watchcoll
				id2 = Math.random()
				orig2 = o.platter_watchcoll.platter_watchcoll
				o.platter_watchcoll.platter_watchcoll = (undo, add, remove, replaceMe) ->
					Platter.Internal.SubsCount++
					Platter.Internal.Subs[id2] = stackTrace()
					undo.add ->
						Platter.Internal.SubsCount--
						delete Platter.Internal.Subs[id2]
					orig2.call @, undo, add, remove, replaceMe


Platter.Internal.DebugList = []
Platter.Internal.BigDebug = bigDebug
