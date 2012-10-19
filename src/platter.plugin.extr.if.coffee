# Attribute/block that makes the given object/value the context (current context becomes the parent).


# The version for plain templates is trivial, of course, since it just needs to run the sub-template straight away.
Platter.Internal.PlainCompiler::addExtractorPlugin 'if|unless', 60, 0, (ps, val, tmpl, n) ->
	ps.js.forceVar ps.jsPost
	val = /^\{\{(.*)\}\}$/.exec(val)[1]
	bits = {val, tmpl, n, else:ps.else}
	ret = ""
	c = 0
	vs = []
	hasemptyelse = false
	while bits
		if ret
			ret = "#{ret}\n\telse "
		v = if bits.n=='unless' then "!(#v#{c}#)" else "#v#{c}#"
		vs.push "{{#{bits.val}}}"
		jsTmpl = ps.js.addContext "#{ps.jsPre}_tmpl", bits.tmpl
		if bits.n
			ret = "#{ret}if (#{v}) "
		else
			if hasemptyelse then throw new Error("Can't have more than one conditionless {{#else}} in an {{##{n}}}")
			hasemptyelse = true
		ret = "#{ret}#{ps.jsPlatter}.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, #{jsTmpl}.run(#{ps.jsDatas.join ', '}, undo, false).docfrag)"
		++c
		bits = bits.else
	@doBase ps, null, vs, ret, "&&"

# The version for dynamic templates has to subscribe to relevant changes and rerun.
ifInner = (undo, datas, par, start, end) ->
	shown = false
	undoch = undo.child()
	(show) =>
		if shown==show
			return
		if (shown)
			@removeBetween start, end, par
			undoch.undo()
		shown = show
		if (show)
			Platter.InsertNode par, end, show.run(datas..., undoch, false).docfrag

Platter.Internal.DynamicCompiler::addExtractorPlugin 'if|unless', 60, 0, (ps, val, tmpl, n) ->
	inner = ps.js.addContext "#{ps.jsPre}_inner", ifInner
	ps.js.forceVar ps.jsPost
	jsChange = ps.js.addForcedVar "#{ps.jsPre}_ifchange", "#{inner}.call(this, undo, [#{ps.jsDatas.join ', '}], #{ps.parent.jsEl||'null'}, #{ps.jsPre}, #{ps.jsPost})"
	val = /^\{\{(.*)\}\}$/.exec(val)[1]
	bits = {val, tmpl, n, else:ps.else}
	ret = ""
	c = 0
	vs = []
	hasemptyelse = false
	while bits
		if ret
			ret = "#{ret}\n\telse "
		v = if bits.n=='unless' then "!(#v#{c}#)" else "#v#{c}#"
		vs.push "{{#{bits.val}}}"
		jsTmpl = ps.js.addContext "#{ps.jsPre}_tmpl", bits.tmpl
		if bits.n
			ret = "#{ret}if (#{v}) "
		else
			if hasemptyelse then throw new Error("Can't have more than one conditionless {{#else}} in an {{##{n}}}")
			hasemptyelse = true
		ret = "#{ret}#{jsChange}(#{jsTmpl})"
		++c
		bits = bits.else
	if !hasemptyelse
		ret = "#{ret}\n\t else #{jsChange}(null)"
	@doBase ps, null, vs, ret, "&&"

# The else plugin just has to set state for the 'if|unless' plugin to see
Platter.Internal.TemplateCompiler::addBlockExtractorPlugin 'else', 0, (ps, val, tmpl, n) ->
	if ps.matchedEnd
		throw new Error("{{/#{n}}} not allowed")
	# We should be in the root of a subtemplate that itself is within one of the relevant other types
	# Note that {{#if a}}A{{#elseif b}}B{{#else}}C{{/if}} has the elseif as a parent of the else.
	# TODO: That nesting is causing extra comment nodes - fix that, somewhere
	if ps.parent.type!='root' || !ps.parent.parent || ps.parent.parent.type not in ['extr.if', 'extr.unless', 'extr.else']
		return false
	val = /^\{\{(.*)\}\}$/.exec(val)[1]
	m = /^(if|unless)(.*)$/.exec(val)
	if val && !m then throw new Error("{{#else}} expression must start with 'if' or 'unless'")
	n = m && m[1] || null
	val = m && m[2] || ''
	ps.parent.parent.else = {val, tmpl, n, else:ps.else}
	true
