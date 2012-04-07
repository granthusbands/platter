class Platter.Undo
	constructor: ->
		@undos = []
	add: (fn) ->
		@undos.push fn
	child: ->
		ret = new Undo
		@add -> ret.undo()
		ret
	undo: ->
		while @undos.length>0
			@undos.pop()()
