jQuery(function(){
	PlatterTest.Tests.Dynamic(
		'Ember',
		function(){ return Ember.Object.create(); },
		function(){ return Ember.Set.create(); },
		function(coll, arr){
			coll.clear();
			for (var i=0; i<arr.length; ++i)
				coll.add(arr[i]);
		},
		function(coll, v){ coll.add(v); },
		function(o, n, v){ PlatterTest.Set(o, n, v); }
	);
});
