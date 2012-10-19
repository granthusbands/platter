

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
blockbits = /^\{\{([#\/])([^\s\}]*)(.*?)\}\}$/
class Platter.Internal.CompilerState
	constructor: (clone, @parent) ->
		if clone
			{@ret, @plugins, @js, @jsDatas, @el, @jsEl, @jsSelf, @jsPlatter} = clone
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
	optimiseAwayPre: ->
		# We only need a preceding comment if the previous node is non-constant
		if @prev && (@prev.jsPost || @prev.jsEl)
			@jsPre = @prev.jsPost || @prev.jsEl
			@jsPost = @jsEl
			Platter.RemoveNode @pre
			@pre = null
		else if !@prev && @parent && @parent.jsEl
			@jsPre = 'null'
			@jsPost = @jsEl
			Platter.RemoveNode @pre
			@pre = null
	optimiseAwayLastPost: ->
		# Since the current node is constant, we can remove the jsPost of the preceding node
		if !@prev || !@prev.post then return
		@js.replaceExpr @jsEl, @prev.jsPost
		@jsEl = @prev.jsPost
		Platter.RemoveNode @prev.post
		@prev.post = null
	optimiseAwayLastChildPost: ->
		# Since the current node is constant, the last child doesn't need a jsPost
		ch = @children[@children.length-1]
		if !ch || !ch.post then return
		@js.replaceExpr ch.jsPost, 'null'
		Platter.RemoveNode ch.post
		ch.post = null
	pulled: (@pre, @post, frag) ->
		@jsPre = @jsEl
		@jsPost = @js.addVar "#{@jsPre}_end", "#{@jsPre}.nextSibling", @post
		@optimiseAwayPre()
		@jsEl = null
		@setEl null
		frag
	pullEl: ->
		pre = document.createComment ""
		post = document.createComment ""
		@el.parentNode.insertBefore pre, @el
		@el.parentNode.insertBefore post, @el
		frag = document.createDocumentFragment()
		frag.appendChild @el
		@pulled pre, post, frag
	# Find the end of a block, while ignoring sub-blocks
	pullBlock: ->
		end = @el
		stack = [blockbits.exec(@el.nodeValue)[2]]
		while true
			matched = false
			end = end.nextSibling
			if (!end) then break
			if (end.nodeType!=8) then continue
			m = blockbits.exec end.nodeValue
			if !m then continue
			if (m[1]=='#')
				stack.push m[2]
				continue
			while stack.length && stack[stack.length-1]!=m[2]
				stack.pop()
			if stack.length && stack[stack.length-1]==m[2]
				matched = true
				stack.pop()
			if stack.length==0
				break
		# end now points just beyond the end (and hence might be null)
		frag = document.createDocumentFragment()
		while @el.nextSibling!=end
			frag.appendChild @el.nextSibling
		if matched
			end.parentNode.removeChild end
		pre = document.createComment ""
		post = document.createComment ""
		@el.parentNode.insertBefore pre, @el
		@el.parentNode.insertBefore post, @el
		@el.parentNode.removeChild @el
		@pulled pre, post, frag
	pullMark: ->
		pre = document.createComment ""
		post = document.createComment ""
		@el.parentNode.insertBefore pre, @el
		@el.parentNode.insertBefore post, @el
		@el.parentNode.removeChild @el
		@pulled pre, post, @el


class Platter.Internal.TemplateRunner extends Platter.Internal.PluginBase
	constructor: (node) ->
		@node = node

	# Remove all the nodes between startel and endel, which must be unique
	removeBetween: (startel, endel, par) ->
		par ||= startel.parentNode || endel.parentNode
		return if !par
		if (!startel&&!endel)
			while last=par.lastChild
				par.removeChild last
		else if endel
			while (prev=endel.previousSibling)!=startel
				par.removeChild prev
		else if startel
			while (next=startel.nextSibling)!=endel
				par.removeChild next
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
		ps.parent = parent

		ps.js = (new Platter.Internal.FunctionGenContext).child()
		ps.ret = new @runner

		ps.plugins = {}
		@extractPlugins ps.plugins, 'block', ''
		@extractPlugins ps.plugins, 'el', 'img'

		# Parameters for the generated function
		ps.jsDatas = []
		for i in [0...ctxCnt]
			ps.jsDatas.push ps.js.addParam 'data'+i
		ps.js.addParam 'undo'
		jsAutoRemove = ps.js.addParam 'autoRemove'

		ps.jsSelf = ps.js.addForcedVar "self", "this"
		ps.jsPlatter = ps.js.addContext 'Platter', Platter
		ps.js.addExpr "undo = undo ? undo.child() : new #{ps.jsPlatter}.Undo()"
		jsCloneNode = ps.js.addContext 'node', frag
		jsRoot = ps.js.addVar 'el', "#{jsCloneNode}.cloneNode(true)"
		@compileChildren ps, frag, jsRoot
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
		ps.ret.run = ps.js.compile()
		ps.ret

	# Does the basic replacements all expressions need
	doBase: (ps, n, v, expr, sep) ->
		if sep==true
			op = Platter.Internal.ParseString v
		else
			op = Platter.Internal.ParseNonString v, sep

		ctx = datas: ps.jsDatas, js:ps.js.child(), jsPlatter:ps.jsPlatter
		ctx.js.addParam 'undo'

		expr = expr
			.replace(/#el#/g, "#{ps.jsEl}")
			.replace(/#n#/g, ps.js.toSrc n)
			.replace(/#v#/g, @printer.go(op, ctx))

		@doExpr ps, expr

	doExpr: (ps, expr) ->
		ps.js.addExpr expr

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
			m = thisn.match(plug.reg)
			if m
				ps.isHandled = plug.fn @, ps, param, thisn, m
				if ps.isHandled then return
		null

	compileChildren: (ps, el, jsEl) ->
		baseName = "#{jsEl}"
		ch = el.firstChild
		jsCh = ps.js.addForcedVar "#{(ps.jsEl||ps.jsPre)?.n||'el'}_ch", "#{jsEl}.firstChild"
		while (ch)
			ps2 = ps.child()
			ps2.setEl ch
			ps2.jsEl = jsCh
			@compileElement ps2
			jsCh = ps2.js.addVar "#{baseName}_ch", "#{ps2.jsPost||ps2.jsEl}.nextSibling"
			ch = (ps2.post||ps2.el).nextSibling
		if (ps.el)
			ps.optimiseAwayLastChildPost()

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
						@doBase ps, realn, v, "#el#.setAttribute(#n#, #v#)", true
				if ps.el.tagName.toLowerCase()!='textarea'
					@compileChildren ps, ps.el, ps.jsEl
					ps.optimiseAwayLastPost()
					ps.optimiseAwayLastChildPost()
				ps.runAfters()
		else if ps.el.nodeType==8  # Comment
			ct = ps.el.nodeValue
			ct = Platter.UnhideAttr ct
			# We know our comment nodes can only contain one {{#...}}
			if m=/^\{\{([#\/])([^\s\}]+)\s*(.*?)\}\}$/.exec(ct)
				if m[1]=='/'
					throw new Error("Unmatched end-block "+ct);
				else if m[1]=='#'
					if m[2].match(ps.plugins.blockReg)
						@doPlugins(ps.plugins.block, (->m[2]), ps, m[3])
				if !ps.isHandled
					throw new Error("Unhandled block "+ct);
			else if m=/^\{\{>(.*?)\}\}$/.exec(ct)
				@doRedo ps, null, "{{#{m[1]}}}", "if (#v#) #{ps.jsPlatter}.InsertNode(#{ps.parent.jsEl||'null'}, #{ps.jsPost}, (#v#).run(#{ps.jsDatas[0]}, undo).docfrag)", null
			else
				ps.optimiseAwayLastPost()
		else if ps.el.nodeType==3 || ps.el.nodeType==4  # Text/CData
			ps.el.nodeValue = Platter.UnhideAttr ps.el.nodeValue
			if ps.el.nodeValue.indexOf('{{')!=-1
				@doBase ps, 'text', ps.el.nodeValue, "#el#.nodeValue = #v#", true
			ps.optimiseAwayLastPost()

	addExtractorPlugin: (n, pri, extradepth, fn) ->
		@addBlockExtractorPlugin n, extradepth, fn
		@addAttrExtractorPlugin n, pri, extradepth, fn

	addBlockExtractorPlugin: (n, extradepth, fn) ->
		regTxt = "^(?:#{n})$" #TODO: Escaping
		fn2 = (comp, ps, val, n) ->
			ps.extraScopes = extradepth
			frag = ps.pullBlock()
			tmpl = comp.compileFrag frag, ps.jsDatas.length+extradepth, ps
			fn.call comp, ps, "{{#{val}}}", tmpl, n
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

	addMarkPlugin: (n, fn) ->
		regTxt = "^(?:#{n})$" #TODO: Escaping
		fn2 = (comp, ps, val, n) ->
			fn.call comp, ps, "{{#{val}}}", ps.pullMark()
		@addPluginBase 'block',
			fn: fn2
			regTxt: regTxt
			reg: new RegExp(regTxt)
			pri: 0

	addAttrAssigner: (n, pri, str, sep) ->
		fn = (comp, ps) ->
			v = ps.getAttr n
			if Platter.HasEscape v
				ps.setAttr n, (ps, n) ->
					comp.doBase ps, n, v, str, sep
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

	addAttrExtractorPlugin: (n, pri, extradepth, fn) ->
		@addAttrPlugin n, pri, (comp, ps, ignore, ignore2, ns) ->
			ret = false
			for n in ns
				val = ps.getAttr(n)
				if !Platter.HasEscape(val) then continue
				ps.el.removeAttribute ps.getAttrName(n)
				ps.extraScopes = extradepth
				frag = ps.pullEl()
				tmpl = comp.compileFrag frag, ps.jsDatas.length+extradepth, ps
				ret ||= fn.call(comp, ps, val, tmpl, n)
			ret
