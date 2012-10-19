jQuery(function(){
	PlatterTest.Tests.Dynamic(
		'Knockout',
		function(){ return {}; },
		function(){ return ko.observableArray(); },
		function(coll, arr){
			coll.removeAll();
			for (var i=0; i<arr.length; ++i)
				coll.push(arr[i]);
		},
		function(coll, v) { coll.push(v); },
		function(o, n, v) {
			if (o[n] && ko.isSubscribable(o[n]))
				o[n](v)
			else
				o[n] = ko.observable(v);
		}
	);
});
