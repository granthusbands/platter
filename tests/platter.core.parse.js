jQuery(function(){
	module("Parse");

	var visit = PlatterTest.Internal.JSPrinter();
	visit.get = function(op){ return "#"+op.ident+"#"; };

	function trim(s) {
		s = s.replace(/^\s+/g, "");
		s = s.replace(/\s+$/g, "");
		return s;
	}
	function space(s) {
		if (s==",")
			return ", ";
		else
			return " "+s+" "
	}
	function copyByPattern(o,pattern) {
		if (!o) return o;
		if (pattern instanceof Array) {
			var ret = [];
			for (var i=0; i<pattern.length; ++i)
				ret[i] = copyByPattern[o[i]];
			return ret;
		}
		if (pattern && typeof pattern=='object') {
			var ret = {};
			for (var i in pattern)
				if (pattern.hasOwnProperty(i))
					ret[i] = copyByPattern(o[i], pattern[i]);
			return ret;
		}
		return o;
	}
	function parseSimple(txt) {
		return PlatterTest.Internal.ParseJS(txt);
	}
	function parseMatch(txt, patt) {
		var parsed = parseSimple(txt);
		var match = copyByPattern(parsed, patt);
		if (JSON.stringify(match)!=JSON.stringify(patt))
			equal(JSON.stringify(parsed), JSON.stringify(patt), txt);
		else
			equal(JSON.stringify(match), JSON.stringify(patt), txt);
	}
	function roundTrip(txt1, txt2) {
		var parsed = parseSimple(txt1);
		var unparsed = visit.go(parsed);
		equal(unparsed, txt2, txt1);
	}
	function expectKaboom(txt, err) {
		try {
			var parsed = parseSimple(txt);
			equal(parsed, '[exception]', "Kaboom for "+txt)
		}
		catch (e) {
			equal(e.message, err, "Kaboom for "+txt);
		}
	}

	test("Simple values", function(){
		roundTrip("1", "1");
		roundTrip("1.000", "1");
		roundTrip("'a'", '"a"');
		roundTrip('"a"', '"a"');
		roundTrip("1e1", "10");
		roundTrip("false", "false");
		roundTrip("true", "true");
		roundTrip("null", "null");
		roundTrip("flase", "#flase#");
		roundTrip("falsey", "#falsey#");
		roundTrip("a", "#a#");
		roundTrip('"\\"a\\""', '"\\"a\\""');
		roundTrip("'\"a\"'", '"\\"a\\""');
	});
	test("Prefix ops", function(){
		roundTrip("!a", "! #a#");
		roundTrip("~a", "~ #a#");
		roundTrip("-a", "- #a#");
		roundTrip("+a", "+ #a#");
		roundTrip("typeof a", "typeof #a#");
		roundTrip("void a", "void #a#");
		roundTrip("new a", "new #a#");
	})
	test("Random ops", function(){
		roundTrip("a?b:c", "#a# ? #b# : #c#");
		roundTrip("a?b:c?d:e", "#a# ? #b# : #c# ? #d# : #e#");
		roundTrip("a[b]", "#a#[#b#]");
		roundTrip("a()", "#a#()");
		roundTrip("a(b)", "#a#(#b#)");
		roundTrip("a(b,c)", "#a#(#b#, #c#)");
		roundTrip("a(b,c,d)", "#a#(#b#, #c#, #d#)");
		roundTrip("a['b']", "#a#.b");
		roundTrip("a.b", "#a#.b");
		roundTrip("a['b c']", "#a#['b c']")
	});
	test("Bad ops", function(){
		expectKaboom("--a", "-- operator not supported");
		expectKaboom("++a", "++ operator not supported");
		knownbad = ['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '^=', '|=']
		for (var i=0; i<knownbad.length; ++i)
			expectKaboom("a"+knownbad[i]+"b", knownbad[i]+" operator not supported");
		expectKaboom("a&^b", "&^ operator not supported");
		expectKaboom("1)", "Unmatched ')'");
		expectKaboom("(1", "Unmatched '('");
		expectKaboom("1[1", "Unmatched '['");
		expectKaboom("1]", "Unmatched ']'");
		expectKaboom("1:", "Unmatched ':'");
		expectKaboom("(a[1)", "Unmatched ')'");
		expectKaboom("a[(1]", "Unmatched ']'");
	});
	test("Binop Precedence", function(){
		module("Parser");
		aish = {txt:'get', ident:'a'};
		bish = {txt:'get', ident:'b'};
		cish = {txt:'get', ident:'c'};
		parseMatch("a", aish);

		binops = ['*', '/', '%', null, '+', '-', null, '<<', '>>', '>>>', null, '<', '<=', '>', '>=', ' in ', ' instanceof ', null, '==', '!=', '===', '!==', null, '&', null, '^', null, '|', null, '&&', null, '||', null, ','];
		preops = ['new ', null, '!', '~', '-', '+', 'typeof ', 'void '];
		for (var i=0, ipri=0; i<binops.length; ++i) {
			if (!binops[i]) {
				++ipri;
				continue;
			}
			var trimi = trim(binops[i]);
			var spacei = space(trimi);
			parseMatch("a"+binops[i]+"b", {left:aish, txt:trimi, right:bish});
			roundTrip("a"+binops[i]+"b", "#a#"+spacei+"#b#");
			for (var j=0, jpri=0; j<binops.length; ++j) {
				if (!binops[j]) {
					++jpri;
					continue;
				}
				var trimj = trim(binops[j]);
				var spacej = space(trimj);

				var leftop = {left:aish, txt:trimi, right:bish};
				var leftfirst = {left:leftop, txt:trimj, right:cish};
				var leftbracket = {left:{txt:'(', inner:leftop}, txt:trimj, right:cish};
				var rightop = {left:bish, txt:trimj, right:cish};
				var rightfirst = {left:aish, txt:trimi, right:rightop};
				var rightbracket = {left:aish, txt:trimi, right:{txt:'(', inner:rightop}};
				if (jpri>=ipri)
					parseMatch("a"+binops[i]+"b"+binops[j]+"c", leftfirst);
				else
					parseMatch("a"+binops[i]+"b"+binops[j]+"c", rightfirst);
				roundTrip("a"+binops[i]+"b"+binops[j]+"c", "#a#"+spacei+"#b#"+spacej+"#c#");
				parseMatch("(a"+binops[i]+"b)"+binops[j]+"c", leftbracket);
				roundTrip("(a"+binops[i]+"b)"+binops[j]+"c", "(#a#"+spacei+"#b#)"+spacej+"#c#");
				parseMatch("a"+binops[i]+"(b"+binops[j]+"c)", rightbracket);
				roundTrip("a"+binops[i]+"(b"+binops[j]+"c)", "#a#"+spacei+"(#b#"+spacej+"#c#)");
			}
		}
	});
});