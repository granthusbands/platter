jQuery(function(){
	Platter.Tests.Dynamic(
		'Batman',
		function(){ return new Batman.Object(); },
		function(){ return new Batman.Set(); },
		function(coll, arr){
			coll.clear();
			for (var i=0; i<arr.length; ++i)
				coll.add(arr[i]);
		},
		function(coll, v){ coll.add(v); },
		function(o, n, v){ Platter.Set(o, n, v); }
	);
});