jQuery(function(){
	PlatterTest.Tests.Dynamic(
		'Backbone',
		function(){ return new Backbone.Model(); },
		function(){ return new Backbone.Collection(); },
		function(coll, arr){ coll.reset(arr); },
		function(coll, v){ coll.add(v); },
		function(o, n, v){PlatterTest.Set(o, n, v)}
	);
});
