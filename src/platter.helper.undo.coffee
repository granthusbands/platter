class undoer
	cur:
		push: ->
			# By default, we just discard undoers, since nobody's collecting them.
	constructor: ->
		@stack = []
	add: (fn) ->
		@cur.push fn
	start: () ->
		@stack.push @cur
		@cur = []
	claim: () ->
		cur = @cur
		@cur = @stack.pop()
		return () ->
			for fn in cur
				fn()
			cur = []
	undoToStart: () ->
		@claim()()

this.$undo = new undoer
