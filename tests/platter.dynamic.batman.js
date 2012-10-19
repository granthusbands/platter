jQuery(function(){
	PlatterTest.Tests.Dynamic(
		'Batman',
		function(){ return new Batman.Object(); },
		function(){ return new Batman.Set(); },
		function(coll, arr){
			coll.clear();
			for (var i=0; i<arr.length; ++i)
				coll.add(arr[i]);
		},
		function(coll, v){ coll.add(v); },
		function(o, n, v){ PlatterTest.Set(o, n, v); }
	);
});
