jQuery(function(){
	module("Core");

	var testdiv = document.getElementById('plattertest');

	test("DOM Helpers", function(){
		equal(testdiv.innerHTML, "", "Test div empty");

		var tmpl = platter.plain.compile("<div></div>");
		fiveparts="test<b>test2</b>test3<b>test4</b>test5";
		testdiv.innerHTML = fiveparts;
		tmpl.removeBetween(testdiv.firstChild, testdiv.lastChild);
		equal(testdiv.innerHTML, "testtest5", "removeBetween");
		equal(testdiv.firstChild.nextSibling, testdiv.lastChild, "removeBetween");

		testdiv.innerHTML = fiveparts;
		tmpl.removeAll(testdiv.firstChild.nextSibling, testdiv.lastChild);
		equal(testdiv.innerHTML, "test", "removeAll");
		equal(testdiv.firstChild, testdiv.lastChild, "removeAll");

		var frag = platter.plain.htmlToFrag(" <div>blah</div> ");
		equal(frag.firstChild.nodeValue, " ", "htmlToFrag whitespace");
		equal(frag.lastChild.nodeValue, " ", "htmlToFrag whitespace");
		equal(frag.firstChild.nextSibling.innerHTML, "blah", "htmltoFrag div");

		var frag = platter.plain.tmplToFrag(" <div>blah</div> ");
		equal(frag.firstChild.innerHTML, "blah", "tmpltoFrag trimmed pre");
		equal(frag.lastChild.innerHTML, "blah", "tmpltoFrag trimmed post");

		var frag = platter.plain.htmlToFrag("<link rel='stylesheet' href='/missing.css' type='text/css' />");
		equal(frag.firstChild.type, "text/css", "htmlToFrag link");

		var frag = platter.plain.htmlToFrag("<script type='text/javascript'>ok(false, 'script should not run')</script>");
		equal(frag.firstChild.type, "text/javascript", "htmlToFrag script");
		// TODO: Test whether script insertion into the doc runs the script.

		testdiv.innerHTML = "";
	});

	// TODO: Test that jQuery events are used when jQuery is/was present
});