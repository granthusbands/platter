jQuery(function(){
	Platter.Tests.Dynamic(
		'Backbone',
		function(){return new Backbone.Model()},
		function(){return new Backbone.Collection()},
		function(coll, arr){coll.reset(arr)}
	);
});
