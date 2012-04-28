jQuery(function(){
	Platter.Tests.Dynamic(
		'Batman',
		function(){return new Batman.Object()},
		function(){return new Batman.Set()},
		function(coll, arr){
			coll.clear();
			var old = coll.toArray();
			for (var i=0; i<arr.length; ++i)
				coll.add(arr[i]);
		}
	);
});
