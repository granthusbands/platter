

# Sort helper - return a comparator for a particular property
sby = (name) ->
	(a,b) ->
		if (a[name]<b[name]) then 1 else if (a[name]>b[name]) then -1 else 0


# A compilation context - contains all of the things that are commonly passed around, and helps plugins follow the unwritten rules.
window.cslist = []
class Platter.Internal.CompilerState
	constructor: (clone) ->
		if clone
			{@ret, @plugins, @js, @jsDatas, @cur, @jsCur} = clone
			@parent = clone
		@id = cslist.length
		cslist.push @
	clone: -> new Platter.Internal.CompilerState(@)
	# The attributes of the current node, potentially modified by plugins
	setCur: (@cur) ->
		@_attrs = undefined
		@_attrNames = undefined
	attrs: ->
		if @_attrs then return @_attrs
		@_attrs = Platter.AttrList @cur
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
		ps = new Platter.Internal.CompilerState

		ps.js = new Platter.Internal.CodeGen
		ps.ret = new @runner
		ps.ret.node = frag

		ps.plugins = {}
		@extractPlugins ps.plugins, 'attr', 'mg'
		@extractPlugins ps.plugins, 'block', ''
		@extractPlugins ps.plugins, 'el', 'i'

		# Parameters for the generated function
		ps.jsDatas = []
		for i in [0...ctxCnt]
			ps.jsDatas.push ps.js.existingVar 'data'+i
		ps.js.existingVar 'undo'
		jsAutoRemove = ps.js.existingVar 'autoRemove'

		ps.js.addExpr 'undo = undo ? undo.child() : new Platter.Undo()'
		jsRoot = ps.jsCur = ps.js.addVar 'el', 'this.node.cloneNode(true)'
		ps.cur = frag
		@compileInner ps
		jsFirstChild = ps.js.addForcedVar "firstChild", "#{jsRoot}.firstChild"
		jsLastChild = ps.js.addForcedVar "lastChild", "#{jsRoot}.lastChild"
		jsSelf = ps.js.addForcedVar "self", "this"
		ps.js.addExpr """
			if (#{jsAutoRemove}===true||#{jsAutoRemove}==null)
				undo.add(function(){
					#{jsSelf}.removeAll(#{jsFirstChild}, #{jsLastChild});
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
			thisn = n()
			if thisn.match(plug.reg)
				z = plug.fn @, ps, param, thisn
				if z
					ps.jsCur = z
					ps.setCur z.v
					ps.isHandled = true
					return
		null
	
	compileInner: (ps) ->
		baseName = "#{ps.jsCur}"
		ps.setCur ps.cur.firstChild
		ps.jsCur = ps.js.addVar ps.jsCur+"_ch", "#{ps.jsCur}.firstChild"
		ps.js.forceVar ps.jsCur
		while (ps.cur)
			ps.isHandled = false
			if ps.cur.nodeType==1  # Element
				if ps.cur.tagName.match(ps.plugins.elReg)
					@doPlugins(ps.plugins.el, (->ps.cur.tagName), ps)
				if !ps.isHandled && ps.attrNames().match(ps.plugins.attrReg)
					@doPlugins(ps.plugins.attr, (->ps.attrNames()), ps)
				if !ps.isHandled
					for own realn, {n, realn, v} of ps.attrs()
						if (realn!=n)
							ps.cur.removeAttribute n
						if typeof v == 'function'
							v()
						else if !(Platter.HasEscape v)
							if realn!=n
								ps.cur.setAttribute realn, v
						else
							n2 = if @assigners[realn] then realn else '#default'
							@doSimple ps, realn, v, @assigners[n2]
					if ps.cur.tagName.toLowerCase()!='textarea'
						@compileInner ps.clone()
			else if ps.cur.nodeType==8  # Comment
				ct = ps.cur.nodeValue
				ct = Platter.UnhideAttr ct
				# We know our comment nodes can only contain one {{#...}}
				if m=/^\{\{([#\/])([^\s\}]+)\s*(.*?)\}\}$/.exec(ct)
					if m[1]=='/'
						throw new Error("Unmatched end-block "+ct);
					if m[2].match(ps.plugins.blockReg)
						@doPlugins(ps.plugins.block, (->m[2]), ps, m[3])
					if !ps.isHandled
						throw new Error("Unhandled block "+ct);
			else if ps.cur.nodeType==3 || ps.cur.nodeType==4  # Text/CData
				ps.cur.nodeValue = Platter.UnhideAttr ps.cur.nodeValue
				if ps.cur.nodeValue.indexOf('{{')!=-1
					@doSimple ps, 'text', ps.cur.nodeValue, @assigners['#text']
			ps.jsCur = ps.js.addVar "#{baseName}_ch", "#{ps.jsCur}.nextSibling"
			ps.setCur ps.cur.nextSibling

	assigners:
		'#text': "#el#.nodeValue = #v#"
		'#default': "#el#.setAttribute(#n#, #v#)"
		'class': "#el#.className = #v#"
		'checked': "#el#.defaultChecked = #el#.checked = !!(#v#)"
		'value': "#el#.value = #v#"
		#'name': "#el#.name = #v#" #IE7 doesn't let you setAttribute name  TODO: Check and implement
		#TODO: style in Firefox -> .style.cssText
		#TODO: type in IE -> recreate the node, somehow

	addExtractorPlugin: (n, pri, method, extradepth) ->
		fn = (comp, frag, ps, post, val) ->
			ps.ret[ps.jsCur.n] = comp.compileFrag frag, ps.jsDatas.length+extradepth
			jsPost = ps.js.addVar "#{ps.jsCur}_end", "#{ps.jsCur}.nextSibling", post
			comp[method] ps, jsPost, val
			jsPost
		@addBlockExtractorPlugin n, fn
		@addAttrExtractorPlugin n, pri, fn

	addBlockExtractorPlugin: (n, fn) ->
		regTxt = "^(?:#{n})$" #TODO: Escaping
		fn2 = (comp, ps, val, n) ->
			[newcur, post, frag] = Platter.PullBlock n, ps.cur
			ps.setCur newcur
			fn comp, frag, ps, post, "{{#{val}}}"
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
		@addAttrPlugin n, pri, (comp, ps) ->
			val = ps.getAttr(n)
			if !Platter.HasEscape(val) then return
			ps.cur.removeAttribute ps.getAttrName(n)
			[newcur, post, frag] = Platter.PullNode ps.cur
			ps.setCur newcur
			fn comp, frag, ps, post, val
