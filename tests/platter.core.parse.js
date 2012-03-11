jQuery(function(){
	module("Parse");

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
		return platter.internal.jslikeparse(txt, function(txt){return("#"+txt+"#");});
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
		var unparsed = platter.internal.jslikeunparse(parsed);
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
		expectKaboom("--a", "-- operator not supported");
		expectKaboom("++a", "++ operator not supported");
		expectKaboom("a--", "-- operator not supported");
		expectKaboom("a++", "++ operator not supported");
		// TODO: Test other unsupported ops, like +=, ^&^&^ and so on.
	});
	test("Binop Precedence", function(){
		module("Parser");
		parseMatch("a", "#a#");

		binops = ['*', '/', '%', null, '+', '-', null, '<<', '>>', '>>>', null, '<', '<=', '>', '>=', ' in ', ' instanceof ', null, '==', '!=', '===', '!==', null, '&', null, '^', null, '|', null, '&&', null, '||', null, ','];
		preops = ['new ', null, '!', '~', '-', '+', 'typeof ', 'void '];
		for (var i=0, ipri=0; i<binops.length; ++i) {
			if (!binops[i]) {
				++ipri;
				continue;
			}
			var trimi = trim(binops[i]);
			var spacei = space(trimi);
			parseMatch("a"+binops[i]+"b", {left:"#a#", txt:trimi, right:"#b#"});
			roundTrip("a"+binops[i]+"b", "#a#"+spacei+"#b#");
			for (var j=0, jpri=0; j<binops.length; ++j) {
				if (!binops[j]) {
					++jpri;
					continue;
				}
				var trimj = trim(binops[j]);
				var spacej = space(trimj);

				var leftop = {left:"#a#", txt:trimi, right:"#b#"};
				var leftfirst = {left:leftop, txt:trimj, right:"#c#"};
				var leftbracket = {left:{txt:'(', inner:leftop}, txt:trimj, right:"#c#"};
				var rightop = {left:"#b#", txt:trimj, right:"#c#"};
				var rightfirst = {left:"#a#", txt:trimi, right:rightop};
				var rightbracket = {left:"#a#", txt:trimi, right:{txt:'(', inner:rightop}};
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