# A base class that provides plugin capabilities.
# There's a set of plugins per class and there's a capacity for adding helper methods with unique names.


# A globally-unique set of names for plugins
usedNames = []

# Walks a prototype chain (avoiding getPrototypeOf or __proto__ for consistency across browsers), returning a concatenation of all arrays under the given property name.
addArraysThroughProto = (ret, o, name) ->
	proto = o.constructor.__super__ || o.constructor._super || o.constructor.prototype
	if proto && proto!=o
		addArraysThroughProto ret, proto, name
	arr = o[name]
	if arr
		if arr.parent
			addArraysThroughProto ret, arr.parent, name
		for ent in arr
			ret.push ent
	ret

class Platter.Internal.PluginBase
	addPluginBase: (type, details) ->
		name = "plugins_#{type}"
		if !@hasOwnProperty(name) then @[name] = []
		@[name].push details
	getPlugins: (type) ->
		addArraysThroughProto [], @, "plugins_#{type}"
	@UniqueName: (name) ->
		name = "plugin_#{name}"
		num = ''
		if usedNames[name]
			while usedNames[name+num]
				num = (num||0) + 1
		usedNames[name+num] = 1
		name+num
	addUniqueMethod: (name, fn) ->
		name = Platter.Internal.PluginBase.UniqueName name
		@[name] = fn
		name
