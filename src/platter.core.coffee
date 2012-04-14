

#TODO: Plugin: 'name': "#el#.name = #v#" #IE7 doesn't let you setAttribute name  TODO: Check and implement
#TODO: Plugin: style in Firefox -> .style.cssText
#TODO: Plugin: type in IE -> recreate the node, somehow

platterData = {}
platterDataID = 0

# Sort helper - return a comparator for a particular property
sby = (name) ->
	(a,b) ->
		if (a[name]<b[name]) then 1 else if (a[name]>b[name]) then -1 else 0


# A compilation context - contains all of the things that are commonly passed around, and helps plugins follow the unwritten rules.
class Platter.Internal.CompilerState
	constructor: (clone, @parent) ->
		if clone
			{@ret, @plugins, @js, @jsDatas, @el, @jsEl, @jsSelf} = clone
			@parent ||= clone
		@afters = []
		@children = []
	child: -> 
		ret = new Platter.Internal.CompilerState(@)
		if @children.length
			prev = @children[@children.length-1]
			prev.next = ret
			ret.prev = prev
		@children.push(ret)
		ret
	# The attributes of the current node, potentially modified by plugins
	setEl: (@el) ->
		@_attrs = undefined
		@_attrNames = undefined
	attrs: ->
		if @_attrs then return @_attrs
		@_attrs = Platter.AttrList @el
	attrNames: ->
		if @_attrNames then return @_attrNames
		@_attrNames = Platter.AttrNames @attrs()
	getAttr: (n) ->
		@attrs()[n]?.v
	getAttrName: (n) ->
		@attrs()[n]?.n
	setAttr: (n, v) ->
		@attrs()
		if !@_attrs[n]
			@_attrNames = undefined
			@_attrs[n] = {n, v, realn:n}
		else
			@_attrs[n].v = v
	remAttr: (n) ->
		@attrs()
		if @_attrs[n]
			delete @_attrs[n]
			@_attrNames = undefined
	getJSElData: ->
		@jsElData ||= @js.addForcedVar "#{@jsEl}_data", "this.createPlatterData(undo, #{@jsEl})"
	doAfter: (fn) ->
		@afters.push fn
	runAfters: ->
		while @afters.length
			@afters.pop()()


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

	# Creates platter data for a node, avoiding memory leaks. Returns existing data, if it exists. Removes the data once all creations are undone.
	createPlatterData: (undo, el) ->
		id = el.getAttribute 'data-platter'
		if !id
			id = ++platterDataID
			el.setAttribute 'data-platter', id
			data = platterData[id] = {createCount: 1}
		else
			data = platterData[id]
			++data.createCount
		undo.add ->
			if !--data.refCount
				el.removeAttribute 'data-platter'
				delete platterData[id]
		data

	# Gets the platter data for a node
	getPlatterData: (el) ->
		id = el.getAttribute 'data-platter'
		if id
			platterData[id]
		else
			undefined


neverMatch = /^a\bb/

class Platter.Internal.TemplateCompiler extends Platter.Internal.PluginBase
	runner: Platter.Internal.TemplateRunner

	# Below here, I doubt anyone will override anything
	compile: (txt) ->
		@compileFrag Platter.Helper.TmplToFrag(txt), 1
	
	compileFrag: (frag, ctxCnt, parent) ->
		ps = new Platter.Internal.CompilerState
		if parent
			ps.parent = parent

		ps.js = new Platter.Internal.CodeGen
		ps.ret = new @runner
		ps.ret.node = frag

		ps.plugins = {}
		@extractPlugins ps.plugins, 'block', ''
		@extractPlugins ps.plugins, 'el', 'img'

		# Parameters for the generated function
		ps.jsDatas = []
		for i in [0...ctxCnt]
			ps.jsDatas.push ps.js.existingVar 'data'+i
		ps.js.existingVar 'undo'
		jsAutoRemove = ps.js.existingVar 'autoRemove'

		ps.jsSelf = ps.js.addForcedVar "self", "this"
		ps.js.addExpr 'undo = undo ? undo.child() : new Platter.Undo()'
		jsRoot = ps.jsEl = ps.js.addVar 'el', 'this.node.cloneNode(true)'
		@compileChildren ps, frag
		jsFirstChild = ps.js.addForcedVar "firstChild", "#{jsRoot}.firstChild"
		jsLastChild = ps.js.addForcedVar "lastChild", "#{jsRoot}.lastChild"
		ps.js.addExpr """
			if (#{jsAutoRemove}===true||#{jsAutoRemove}==null)
				undo.add(function(){
					#{ps.jsSelf}.removeAll(#{jsFirstChild}, #{jsLastChild});
				});
			"""
		if frag.firstChild==frag.lastChild
			ps.js.addExpr "return {el: #{jsFirstChild}, docfrag: #{jsRoot}, undo: function(){undo.undo()}};"
		else
			ps.js.addExpr "return {docfrag: #{jsRoot}, undo: function(){undo.undo()}};"
		#alert "function(#{(d.n for d in jsDatas).join ', '}, autoRemove) {\n#{js}\n}"
		try
			ps.ret.run = new Function((d.n for d in ps.jsDatas).join(', '), 'undo', 'autoRemove', ""+ps.js)
		catch e
			throw new Error("Internal error: Function compilation failed: #{e.message}\n\n#{ps.js}")
		ps.ret

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

	doPlugins: (plugs, n, ps, param) ->
		for plug in plugs
			thisn = (n[plug.type]||n)()
			if thisn.match(plug.reg)
				ps.isHandled = plug.fn @, ps, param, thisn
				if ps.isHandled then return
		null

	compileChildren: (ps, el) ->
		baseName = "#{ps.jsEl}"
		ch = el.firstChild
		jsCh = ps.js.addVar ps.jsEl+"_ch", "#{ps.jsEl}.firstChild"
		while (ch)
			ps2 = ps.child()
			ps2.setEl ch
			ps2.jsEl = jsCh
			ps2.js.forceVar jsCh
			@compileElement ps2
			jsCh = ps2.js.addVar "#{baseName}_ch", "#{ps2.jsPost||ps2.jsEl}.nextSibling"
			ch = (ps2.post||ps2.el).nextSibling

	compileElement: (ps) ->
		ps.isHandled = false
		if ps.el.nodeType==1  # Element
			if ps.el.tagName.match(ps.plugins.elReg) || ps.attrNames().match(ps.plugins.elReg)
				@doPlugins(ps.plugins.el, {el: (->ps.el.tagName), attr: (->ps.attrNames())}, ps)
			if !ps.isHandled
				for own realn, {n, realn, v} of ps.attrs()
					if (realn!=n)
						ps.el.removeAttribute n
					if typeof v == 'function'
						v ps, realn
					else if !(Platter.HasEscape v)
						if realn!=n
							ps.el.setAttribute realn, v
					else
						@doSimple ps, realn, v, "#el#.setAttribute(#n#, #v#)"
				if ps.el.tagName.toLowerCase()!='textarea'
					@compileChildren ps, ps.el
				ps.runAfters()
		else if ps.el.nodeType==8  # Comment
			ct = ps.el.nodeValue
			ct = Platter.UnhideAttr ct
			# We know our comment nodes can only contain one {{#...}}
			if m=/^\{\{([#\/])([^\s\}]+)\s*(.*?)\}\}$/.exec(ct)
				if m[1]=='/'
					throw new Error("Unmatched end-block "+ct);
				if m[2].match(ps.plugins.blockReg)
					@doPlugins(ps.plugins.block, (->m[2]), ps, m[3])
				if !ps.isHandled
					throw new Error("Unhandled block "+ct);
		else if ps.el.nodeType==3 || ps.el.nodeType==4  # Text/CData
			ps.el.nodeValue = Platter.UnhideAttr ps.el.nodeValue
			if ps.el.nodeValue.indexOf('{{')!=-1
				@doSimple ps, 'text', ps.el.nodeValue, "#el#.nodeValue = #v#"
	
	addExtractorPlugin: (n, pri, method, extradepth) ->
		fn = (comp, ps, val, bits) ->
			[ps.pre, ps.post, frag] = bits
			ps.extraScopes = extradepth
			ps.jsPre = ps.jsEl
			ps.jsPost = ps.js.addVar "#{ps.jsPre}_end", "#{ps.jsPre}.nextSibling", ps.post
			ps.jsEl = null
			ps.setEl null
			ps.ret[ps.jsPre.n] = comp.compileFrag frag, ps.jsDatas.length+extradepth, ps
			comp[method] ps, val
			true
		@addBlockExtractorPlugin n, fn
		@addAttrExtractorPlugin n, pri, fn

	addBlockExtractorPlugin: (n, fn) ->
		regTxt = "^(?:#{n})$" #TODO: Escaping
		fn2 = (comp, ps, val, n) ->
			fn comp, ps, "{{#{val}}}", Platter.PullBlock ps.el
		@addPluginBase 'block',
			fn: fn2
			regTxt: regTxt
			reg: new RegExp(regTxt)
			pri: 0

	addElPlugin: (n, pri, fn) ->
		regTxt = "^(?:#{n})$" #TODO: Escaping
		@addPluginBase 'el'
			type: 'el'
			fn: fn
			regTxt: regTxt,
			reg: new RegExp(regTxt, "i")
			pri: pri

	addAttrAssigner: (n, pri, str) ->
		fn = (comp, ps) ->
			v = ps.getAttr n
			if Platter.HasEscape v
				ps.setAttr n, (ps, n) ->
					comp.doSimple ps, n, v, str
			false
		@addAttrPlugin n, pri, fn

	addAttrPlugin: (n, pri, fn) ->
		regTxt = "^(?:#{n})$" #TODO: Escaping
		@addPluginBase 'el'
			type: 'attr'
			fn: fn
			regTxt: regTxt,
			reg: new RegExp(regTxt, "mg")
			pri: pri

	addAttrExtractorPlugin: (n, pri, fn) ->
		@addAttrPlugin n, pri, (comp, ps) ->
			val = ps.getAttr(n)
			if !Platter.HasEscape(val) then return
			ps.el.removeAttribute ps.getAttrName(n)
			fn comp, ps, val, Platter.PullNode ps.el
