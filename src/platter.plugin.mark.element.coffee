# {{#element blah}} assumes blah is a HTMLNode and inserts it.


# The version for plain templates is trivial, of course, since it just needs to insert the element straight away.
Platter.Internal.PlainCompiler::addMarkPlugin 'element', (ps, val) ->
	ps.js.forceVar ps.jsPost
	@doBase ps, null, val, "if (#v#) #{ps.jsPlatter}.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, #v#)", null

# The version for dynamic templates has to subscribe to relevant changes and rerun.
insertElement = (undo, datas, par, start, end) ->
	lastel = null
	(el) =>
		if el==lastel
			return
		if lastel
			@removeBetween start, end, par
		lastel = el
		if el
			Platter.InsertNode par, end, el

Platter.Internal.DynamicCompiler::addMarkPlugin 'element', (ps, val) ->
	insEl = ps.js.addContext '#{ps.jsPre}_inner', insertElement
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_elchange", "#{insEl}.call(this, undo, [#{ps.jsDatas.join ', '}], #{ps.parent.jsEl||'null'}, #{ps.jsPre}, #{ps.jsPost})"
	@doBase ps, null, val, "#{jsChange}(#v#)", null
