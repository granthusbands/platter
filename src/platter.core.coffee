

# Sort helper - return a comparator for a particular property
sby = (name) ->
	(a,b) ->
		if (a[name]<b[name]) then 1 else if (a[name]>b[name]) then -1 else 0


class Platter.Internal.TemplateRunner extends Platter.Internal.PluginBase
	constructor: (node) ->
		@node = node

	# Remove all the nodes between startel and endel, which must be unique
	removeBetween: (startel, endel) ->
		par = startel.parentNode
		return if !par
		prev = undefined
		while (prev=endel.previousSibling)!=startel
			par.removeChild prev
		undefined

	# Remove startel and endel and everything between them. startel can be endel.
	removeAll: (startel, endel) ->
		par = startel.parentNode
		return if !par
		if startel==endel
			par.removeChild startel
			return
		if startel.nextSibling!=endel
			@removeBetween startel, endel
		par.removeChild endel
		par.removeChild startel


neverMatch = /^a\bb/

class Platter.Internal.TemplateCompiler extends Platter.Internal.PluginBase
	runner: Platter.Internal.TemplateRunner

	# Below here, I doubt anyone will override anything
	compile: (txt) ->
		@compileFrag Platter.Helper.TmplToFrag(txt), 1
	
	compileFrag: (frag, ctxCnt) ->
		js = new Platter.Internal.CodeGen
		ret = new @runner
		ret.node = frag

		plugins = {}
		@extractPlugins plugins, 'attr', 'mg'
		@extractPlugins plugins, 'block', ''
		@extractPlugins plugins, 'el', 'i'

		# Parameters for the generated function
		jsDatas = []
		for i in [0...ctxCnt]
			jsDatas.push js.existingVar 'data'+i
		js.existingVar 'undo'
		jsAutoRemove = js.existingVar 'autoRemove'

		js.addExpr 'undo = undo ? undo.child() : new Platter.Undo()'
		jsEl = js.addVar 'el', 'this.node.cloneNode(true)', frag
		@compileInner ret, plugins, js, jsEl, jsDatas
		jsFirstChild = js.addForcedVar "firstChild", "#{jsEl}.firstChild"
		jsLastChild = js.addForcedVar "lastChild", "#{jsEl}.lastChild"
		jsSelf = js.addForcedVar "self", "this"
		js.addExpr """
			if (#{jsAutoRemove}===true||#{jsAutoRemove}==null)
				undo.add(function(){
					#{jsSelf}.removeAll(#{jsFirstChild}, #{jsLastChild});
				});
			"""
		if jsEl.v.firstChild==jsEl.v.lastChild
			js.addExpr "return {el: #{jsFirstChild}, docfrag: #{jsEl}, undo: function(){undo.undo()}};"
		else
			js.addExpr "return {docfrag: #{jsEl}, undo: function(){undo.undo()}};"
		#alert "function(#{(d.n for d in jsDatas).join ', '}, autoRemove) {\n#{js}\n}"
		try
			ret.run = new Function((d.n for d in jsDatas).join(', '), 'undo', 'autoRemove', ""+js)
		catch e
			throw new Error("Internal error: Function compilation failed: #{e.message}\n\n#{js}")
		ret

	# We need to pull the plugins together from all prototypes, but order them by priority.
	extractPlugins: (ret, name, regflags) ->
		plugs = @getPlugins name
		plugs.sort sby 'pri'
		if plugs.length==0
			reg = neverMatch
		else
			reg = new RegExp((x.regTxt for x in plugs).join("|"), regflags)
		ret[name] = plugs
		ret["#{name}Reg"] = reg

	doPlugins: (plugs, ret, js, jsCur, jsDatas, param, n) ->
		for plug in plugs
			if n.match(plug.reg)
				z = plug.fn @, ret, js, jsCur, jsDatas, param, n, (newn)->n=newn
				if z then return [z, true]
		[jsCur, false]
	
	compileInner: (ret, plugins, js, jsEl, jsDatas) ->
		jsCur = js.addVar jsEl+"_ch", "#{jsEl}.firstChild", jsEl.v.firstChild
		js.forceVar jsCur
		while (jsCur.v)
			isHandled = false
			if jsCur.v.nodeType==1  # Element
				attrs = Platter.AttrList jsCur.v
				if jsCur.v.tagName.match(plugins.elReg)
					[jsCur, isHandled] = @doPlugins(plugins.el, ret, js, jsCur, jsDatas, attrs, jsCur.v.tagName)
				attrNames = Platter.AttrNames attrs
				if !isHandled && attrNames.match(plugins.attrReg)
					[jsCur, isHandled] = @doPlugins(plugins.attr, ret, js, jsCur, jsDatas, attrs, attrNames)
				if !isHandled
					for own realn, {n, realn, v} of attrs
						if (realn!=n)
							jsCur.v.removeAttribute n
						if typeof v == 'function'
							v()
						else if !(Platter.HasEscape v)
							if realn!=n
								jsCur.v.setAttribute realn, v
						else
							n2 = if @assigners[realn] then realn else '#default'
							@doSimple ret, js, jsCur, jsDatas, realn, v, @assigners[n2]
					if jsCur.v.tagName.toLowerCase()!='textarea'
						@compileInner ret, plugins, js, jsCur, jsDatas
			else if jsCur.v.nodeType==8  # Comment
				ct = jsCur.v.nodeValue
				ct = Platter.UnhideAttr ct
				# We know our comment nodes can only contain one {{#...}}
				if m=/^\{\{([#\/])([^\s\}]+)\s*(.*?)\}\}$/.exec(ct)
					if m[1]=='/'
						throw new Error("Unmatched end-block "+ct);
					if m[2].match(plugins.blockReg)
						[jsCur, isHandled] = @doPlugins(plugins.block, ret, js, jsCur, jsDatas, m[3], m[2])
					if !isHandled
						throw new Error("Unhandled block "+ct);
			else if jsCur.v.nodeType==3 || jsCur.v.nodeType==4  # Text/CData
				jsCur.v.nodeValue = Platter.UnhideAttr jsCur.v.nodeValue
				if jsCur.v.nodeValue.indexOf('{{')!=-1
					@doSimple ret, js, jsCur, jsDatas, 'text', jsCur.v.nodeValue, @assigners['#text']
			jsCur = js.addVar "#{jsEl}_ch", "#{jsCur}.nextSibling", jsCur.v.nextSibling

	assigners:
		'#text': "#el#.nodeValue = #v#"
		'#default': "#el#.setAttribute(#n#, #v#)"
		'class': "#el#.className = #v#"
		'checked': "#el#.defaultChecked = #el#.checked = !!(#v#)"
		'value': "#el#.value = #v#"
		#'name': "#el#.name = #v#" #IE7 doesn't let you setAttribute name  TODO: Check and implement
		#TODO: style in Firefox -> .style.cssText
		#TODO: type in IE -> recreate the node, somehow

	withExtract = (name) ->
		(comp, frag, ret, js, jsCur, post, jsDatas, val) ->
			inner = comp.compileFrag frag, jsDatas.length+1
			ret[jsCur.n] = inner
			jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
			comp[name] ret, js, jsCur, jsPost, jsDatas, val, inner
			jsPost

	addExtractorPlugin: (n, pri, method, extradepth) ->
		fn = (comp, frag, ret, js, jsCur, post, jsDatas, val) ->
			inner = comp.compileFrag frag, jsDatas.length+extradepth
			ret[jsCur.n] = inner
			jsPost = js.addVar "#{jsCur}_end", "#{jsCur}.nextSibling", post
			comp[method] ret, js, jsCur, jsPost, jsDatas, val, inner
			jsPost
		@addBlockExtractorPlugin n, fn
		@addAttrExtractorPlugin n, pri, fn

	addBlockExtractorPlugin: (n, fn) ->
		regTxt = "^(?:#{n})$" #TODO: Escaping
		fn2 = (comp, ret, js, jsCur, jsDatas, val, n) ->
			[jsCur.v, post, frag] = Platter.PullBlock n, jsCur.v
			fn comp, frag, ret, js, jsCur, post, jsDatas, "{{#{val}}}"
		@addPluginBase 'block',
			fn: fn2
			regTxt: regTxt
			reg: new RegExp(regTxt)
			pri: 0

	addElPlugin: (n, pri, fn) ->
		regTxt = "^(?:#{n})$" #TODO: Escaping
		@addPluginBase 'el'
			fn: fn
			regTxt: regTxt,
			reg: new RegExp(regTxt, "i")
			pri: pri

	addAttrPlugin: (n, pri, fn) ->
		regTxt = "^(?:#{n})$" #TODO: Escaping
		@addPluginBase 'attr'
			fn: fn
			regTxt: regTxt,
			reg: new RegExp(regTxt, "mg")
			pri: pri

	addAttrExtractorPlugin: (n, pri, fn) ->
		@addAttrPlugin n, pri, (comp, ret, js, jsCur, jsDatas, attrs) ->
			val = attrs[n].v
			if !Platter.HasEscape(val) then return
			jsCur.v.removeAttribute attrs[n].n
			[jsCur.v, post, frag] = Platter.PullNode jsCur.v
			fn comp, frag, ret, js, jsCur, post, jsDatas, val
