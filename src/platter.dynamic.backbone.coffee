# Monkey-patch backbone models to have a hasKey method (ignoring backbone's broken null handling)
if !Backbone.Model.prototype.hasKey
	Backbone.Model.prototype.hasKey = (n) ->
		@attributes.hasOwnProperty(n)

class backboneRunner extends platter.internal.dynamicRunner
	runGet: (fn, data, ev) ->
		data.on ev, fn
		$undo.add ->
			data.off ev, fn
		fn()

	# It's actually more efficient for watchCollection to not undo the adds. The caller is expected to have their own undoer in the same context.
	watchCollection: (coll, add, rem) ->
		coll.on 'add', add
		coll.on 'remove', rem
		for i in [0..(coll.length-1)]
			add coll.at(i), coll, {index:i}
		$undo.add ->
			coll.off 'add', add
			coll.off 'remove', rem

	# Runtime: When people say {{blah}}, they might mean data.get(blah), data[blah] or data[blah]()
	# TODO: Use it? Removed because it might be unnecessary
	fetchVal: (data, ident) ->
		if data.hasKey ident
			data.get ident
		else
			ret = data[ident]
			if typeof(ret) == 'function'
				ret()
			else
				ret

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
