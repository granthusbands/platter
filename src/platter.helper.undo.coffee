class Platter.Undo
	constructor: (@repeat) ->
		@undos = []
	add: (fn) ->
		@undos.push fn
	child: ->
		ret = new Undo @repeat
		@add -> ret.undo()
		ret
	undo: ->
		while @undos.length>0
			@undos.pop()()
	# Runs fn now and every time something it depends on changes
	repeater: (fn) ->
		undo = @child()
		alldone = false
		@add -> alldone = true
		ret = () ->
			undo.undo()
			if !alldone
				fn(undo)
		undo.repeat = ret
		ret()
		ret
