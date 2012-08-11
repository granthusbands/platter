# Data-object handling, supporting all frameworks. Also serves as a suitable set of functions to override; the Knockout adapter does so.

Platter.Watch = (undo, o, n, fn) ->
	if !o?
		return
	if o.platter_watch
		o.platter_watch undo, n, fn

Platter.Get = (o, n) ->
	if !o?
		undefined
	else if o.platter_get
		o.platter_get n
	else
		o[n]

Platter.GetR = (undo, o, n) ->
	if !o?
		undefined
	else if o.platter_get
		o.platter_watch undo, n, undo.repeat
		o.platter_get n
	else
		o[n]

Platter.Set = (o, n, v) ->
	if !o?
		return
	if o.platter_set
		o.platter_set n, v
	else
		o[n] = v

Platter.Modify = (o, n, fn) ->
	if !o?
		return
	if (o.platter_modify)
		o.platter_modify n, fn
	else
		Platter.Set o, n, fn Platter.Get(o, n)
