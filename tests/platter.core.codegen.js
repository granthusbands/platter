jQuery(function(){
	module("Core Codegen");

	function contains(a,b,msg) {
		if (a.indexOf(b)==-1)
			equal(a, "[...]"+b+"[...]", msg);
		else
			ok(true, msg);
	}

	function notContains(a,b,msg) {
		if (a.indexOf(b)!=-1)
			equal(a, "[Anything but] "+b, msg);
		else
			ok(true, msg);
	}

	test("Variable Names", function(){
		var js = new platter.internal.codegen();
		var vbreak = js.addVar('break');
		notEqual(vbreak.n, "break", "Keyword variable name avoided");
		var vbark = js.addVar('bark');
		equal(vbark.n, "bark", "Non-keyword variable name used");
		var vbark2 = js.addVar('bark');
		notEqual(vbark2.n, "bark", "Duplicate variable name avoided");
		var v1a = js.addVar('1a');
		notEqual(v1a.n, "1a", "Variable name cannot start with a number");
		var vbad = js.addVar('a-b');
		notEqual(vbad.n, "a-b", "Dashes not allowed in variable names");
	});

	test("Variable removal", function(){
		var js = new platter.internal.codegen();
		var v1 = js.addVar("v1", "1");
		var v2 = js.addVar("v2", ""+v1);
		var v3 = js.addVar("v3", "2");
		js.addExpr("alert("+v1+"+"+v3+")");
		var jsstr = ""+js;
		notContains(jsstr, 'var v1', "Indirectly used-once variable was not kept");
		notContains(jsstr, 'var v2', "Directly used-once variable was not kept");
		notContains(jsstr, 'var v3', "Directly used-once variable was not kept");
		contains(jsstr, '1+2', "Values were folded into use");
		js.addExpr(v3+"="+v3);
		var jsstr = ""+js;
		contains(jsstr, 'var v3', "Now multi-used variable is now kept");
		contains(jsstr, '1+v3', "Now multi-used variable is now used");
		js.forceVar(v1);
		var jsstr = ""+js;
		contains(jsstr, 'var v1', "Forced variable is now kept");
		contains(jsstr, 'v1+v3', "Forced variable is now used (v2 still missing)");

		var js = new platter.internal.codegen();
		var v1 = js.addVar("v1", "1");
		var v2 = js.addVar("v2", v1+"+"+v1);
		var v3 = js.addVar("v3", "2");
		var v4 = js.addVar("v4", v3+"+"+v3);
		js.addExpr("alert("+v4+"+"+v4+")");
		var jsstr = ""+js;
		notContains(jsstr, 'var v1', "Indirectly unused variable was not kept");
		notContains(jsstr, 'var v2', "Directly unused variable was not kept");
		contains(jsstr, 'var v3', "Indirectly used variable was kept");
		contains(jsstr, 'var v4', "Directly used variable was kept");
		js.addExpr("alert("+v2+")");
		var jsstr = ""+js;
		contains(jsstr, 'var v1', "Indirectly used variable now kept");
		notContains(jsstr, 'var v2', "Directly used-once variable was not kept");
		contains(jsstr, 'v1+v1', "Addition shows up");
	});

	test("Sanitisation", function(){
		var js = new platter.internal.codegen();
		equal(js.toSrc(undefined), 'undefined', 'undefined');
		equal(js.toSrc(null), 'null', 'null');
		equal(js.toSrc(1), 1, "1");

		if (js.toSrc('1')=="'1'")
			equal(js.toSrc('1'), "'1'", "'1'");
		else
			equal(js.toSrc('1'), '"1"', "'1'");

		if (js.toSrc('"\\"')=="'\"\\\\\"'")
			equal(js.toSrc('"\\"'), "'\"\\\\\"'", "'\"\"\"'");
		else
			equal(js.toSrc('"\\"'), '"\\"\\\\\\""', "'\"\"\"'");

		if (js.toSrc("'\\'")=='"\'\\\'"')
			equal(js.toSrc("'\\'"), '"\'\\\\\'"', '"\'\\\\\'"');
		else
			equal(js.toSrc("'\\'"), "'\\'\\\\\\''", '"\'\\\\\'"');

		if (js.toSrc('\n')=='"\\n"')
			equal(js.toSrc('\n'), '"\\n"', '"\\n"')
		else
			equal(js.toSrc('\n'), "'\\n'", "'\\n'")

		if (js.toSrc('\r')=='"\\r"')
			equal(js.toSrc('\r'), '"\\r"', '"\\r"')
		else
			equal(js.toSrc('\r'), "'\\r'", "'\\r'")
	})

	// TODO: Test HTML->document fragment

});
