jQuery(function(){
	module("Core");

	var testdiv = document.getElementById('plattertest');

	test("DOM Helpers", function(){
		equal(testdiv.innerHTML, "", "Test div empty");

		var tmpl = Platter.Plain.compile("<div></div>");
		fiveparts="test<b>test2</b>test3<b>test4</b>test5";
		testdiv.innerHTML = fiveparts;
		tmpl.removeBetween(testdiv.firstChild, testdiv.lastChild);
		equal(testdiv.innerHTML, "testtest5", "removeBetween");
		equal(testdiv.firstChild.nextSibling, testdiv.lastChild, "removeBetween");

		testdiv.innerHTML = fiveparts;
		tmpl.removeAll(testdiv.firstChild.nextSibling, testdiv.lastChild);
		equal(testdiv.innerHTML, "test", "removeAll");
		equal(testdiv.firstChild, testdiv.lastChild, "removeAll");

		// IE8 doesn't have whitespace textnodes in its DOM
		if (!Platter.Browser.BrokenWhitespace) {
			var frag = Platter.Helper.HtmlToFrag(" <div>blah</div> ");
			equal(frag.firstChild.nodeValue, " ", "htmlToFrag whitespace");
			equal(frag.lastChild.nodeValue, " ", "htmlToFrag whitespace");
			equal(frag.firstChild.nextSibling.innerHTML, "blah", "htmltoFrag div");
		}

		var frag = Platter.Helper.TmplToFrag(" <div>blah</div> ");
		equal(frag.firstChild.innerHTML, "blah", "tmpltoFrag trimmed pre");
		equal(frag.lastChild.innerHTML, "blah", "tmpltoFrag trimmed post");

		var frag = Platter.Helper.HtmlToFrag("<link rel='stylesheet' href='/missing.css' type='text/css' />");
		equal(frag.firstChild.type, "text/css", "htmlToFrag link");

		var frag = Platter.Helper.HtmlToFrag("<script type='text/javascript'>ok(false, 'script should not run')</script>");
		equal(frag.firstChild.type, "text/javascript", "htmlToFrag script");
		// TODO: Test whether script insertion into the doc runs the script.

		testdiv.innerHTML = "";
	});

	test("Array Transformer", function(){
		// A couple of simple direct tests
		var a = [1], b = [1,2];
		Platter.Transformer(a, b, function(i,o){
			equal(i, 1, a+"->"+b+" index");
			equal(o, 2, a+"->"+b+" value");
		},function(i){
			ok(false, a+"->"+b+" should not delete");
		})

		var a = [2], b = [1,2];
		Platter.Transformer(a, b, function(i,o){
			equal(i, 0, a+"->"+b+" index");
			equal(o, 1, a+"->"+b+" value");
		},function(i){
			ok(false, a+"->"+b+" should not delete");
		})

		a = [1,2]; b = [1];
		Platter.Transformer(a, b, function(i,o){
			ok(false, a+"->"+b+" should not delete")
		},function(i){
			equal(i, 1, a+"->"+b+" index");
		})

		a = [1,2]; b = [2];
		Platter.Transformer(a, b, function(i,o){
			ok(false, a+"->"+b+" should not delete")
		},function(i){
			equal(i, 0, a+"->"+b+" index");
		})


		// TODO: Test to make sure the transform aren't too wasteful?
		// For all possible arrays containing subsequences of 1..8, confirm that Platter.Transformer can turn one into the other.
		var testlen = 8;
		var arrs = [[]];
		for (var i=1; i<=testlen; ++i)
			for (var j=0, len=arrs.length; j<len; ++j) {
				var arr = arrs[j].slice()
				arr.push(i)
				arrs.push(arr)
			}

		function runalltransforms(arrs) {
			var passed = 0;
			for (var i=0; i<arrs.length; ++i) {
				var a = arrs[i];
				for (var j=0; j<arrs.length; ++j) {
					var b = arrs[j];
					var a2 = a.slice();
					add = function(i, o) { a2.splice(i, 0, o); };
					rem = function(i) { a2.splice(i,1); };
					Platter.Transformer(a, b, add, rem);
					if (""+a2 != ""+b)
						equal(a2, b, "Transform of "+a+" to "+b);
					else
						passed++;
				}
			}
			ok(passed, passed+" transforms worked");
		}

		runalltransforms(arrs);

		// For all possible arrangements of 1..5, check each transforms into the other
		var testlen = 5;
		var arrs = [[]];
		for (var i=1; i<=testlen; ++i) {
			var arrs2 = [];
			for (var j=0, len=arrs.length; j<len; ++j)
				for (var k=0; k<=arrs[j].length; ++k)
					arrs2.push([].concat(arrs[j].slice(0,k), i, arrs[j].slice(k)));
			arrs = arrs2;
		}

		runalltransforms(arrs);


	});

	// TODO: Test that jQuery events are used when jQuery is/was present
});