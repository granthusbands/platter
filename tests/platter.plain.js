jQuery(function(){
	module("Plain templates");

	var testdiv = document.getElementById('plattertest');

	var data = {
		one: 'First',
		two: {too: 'Second'},
		three: {tree: {tee: 'Third'}},
		nums: [2, 3, 5, 7],
		objs: [{txt:'A'}, {txt:'C'}, {txt:'E'}],
		deep: {derp: {nums: [2, 3, 5, 7]}},
		'no': false,
		'yes': true,
		zero: 0,
		empty: []
	};

	if (!platter.tests) platter.tests = {};
	platter.tests.trivial = function(comp, has, hasNot, hasJQ, hasNotJQ, hasValue, textIs){

		test("No tokens", function(){
			equal(testdiv.innerHTML, "", "Test div empty");
			has("<h1>Hello</h1>", data, "Hello", "Element text unchanged");
			hasNot("<h1>Hello</h1>", data, "Evil", "No evil introduced");
			ok(comp.compile('<h1></h1>').run({}).firstChild==null, "Single-element template returns that element");
			ok(comp.compile('<h1></h1><h1></h1>').run({}).firstChild!=null, "Multi-element template returns surrounding thing");
		});

		test("Template hacks", function(){
			has("<h1 data-platter-test='hey'>Hi</h1>", data, " data-platter-test=", "data-platter-test attr untouched");
			has("<h1 data-platter-type='hey'>Hi</h1>", data, " data-platter-type=", "data-platter-type attr untouched");
			has("<h1 test='hey'>Hi</h1>", data, " test=", "test attr untouched");
			has("<h1 type='hey'>Hi</h1>", data, " type=", "type attr untouched");
			has("<h1>data-platter-test=Hi</h1>", data, ">data-platter-test=", "data-platter-test text untouched");
			has("<h1>data-platter-type=Hi</h1>", data, ">data-platter-type=", "data-platter-type text untouched");
			has("<h1>test=Hi</h1>", data, ">test=", "test text untouched");
			has("<h1>type=Hi</h1>", data, ">type=", "type text untouched");
			has("<h1>{{#if 0}}<!-- blah -->{{/if}}</h1>", data, "", "Comments in blocks don't explode");
		});

		test("Text tokens", function(){
			textIs("<h1>{{one}}</h1>", data, "First", "One-level text insertion");
			textIs("<h1>{{two.too}}</h1>", data, "Second", "Two-level text insertion");
			textIs("<h1>{{three.tree.tee}}</h1>", data, "Third", "Three-level text insertion");
			textIs("<h1>{{one}} {{two.too}} {{three.tree.tee}}</h1>", data, "First Second Third", "All-level text insertion");
			textIs("<h1>{{bo}}</h1>", data, "", "Missing value");
			textIs("<h1>{{two.bo}}</h1>", data, "", "Missing econd-level value");
			textIs("<h1>{{zero}}</h1>", data, "0", "Zero");
			// TODO: What should {{no}} insert? "false" or ""?
			textIs("<h1>{{yes}}</h1>", data, "true", "True");
			textIs("<h1>{{1+2}}</h1>", data, "3", "1+2==3");
			textIs("<h1>{{one+two.too}}</h1>", data, "FirstSecond", "String addition");
		});

		// TODO: Test tokens inside comments

		/* TODO: These tests will only work in an XML document, probably.
		test("CDATA tokens", function(){
			has("<h1><![CDATA[{{one}}]]></h1>", data, "First", "One-level text insertion");
			has("<h1><![CDATA[{{two.too}}]]></h1>", data, "Second", "Two-level text insertion");
			has("<h1><![CDATA[{{three.tree.tee}}]]></h1>", data, "Third", "Three-level text insertion");
			has("<h1><![CDATA[{{one}} {{two.too}} {{three.tree.tee}}]]></h1>", data, "First Second Third", "All-level text insertion");
			has("<h1><![CDATA[{{bo}}]]></h1>", data, "<h1></h1>", "Missing value");
			has("<h1><![CDATA[{{two.bo}}]]></h1>", data, "<h1></h1>", "Missing econd-level value");
			hasNot("<h1><![CDATA[{{two.bo}}]]></h1>", data, "0", "No zero");
			has("<h1><![CDATA[{{zero}}]]></h1>", data, "0", "Zero");
			// TODO: What should {{no}} insert? "false" or ""?
			has("<h1><![CDATA[{{yes}}]]></h1>", data, "true", "True");
		});*/

		test("Attribute: class", function(){
			hasNotJQ("<h1 class='Huh'></h1>", data, ".First", "Prep");
			hasJQ("<h1 class='{{one}}'></h1>", data, ".First", "Class replacement");
			hasJQ('<h1 class="{{two.too}}"></h1>', data, ".Second", "Class replacement 2");
			hasJQ('<h1 class="{{three.tree.tee}}"></h1>', data, ".Third", "Class replacement 3");
			hasJQ('<h1 class="{{one}} {{two.too}} {{three.tree.tee}}"></h1>', data, ".First.Second.Third", "Class replacement all three");
		});

		test("Attribute: checked", function(){
			hasNotJQ('<input type="checkbox"/>', data, ":checked", "Prep");
			hasNotJQ('<input type="checkbox" checked="{{bo}}"/>', data, ":checked", "Unknown value means not checked");
			hasNotJQ('<input type="checkbox" checked="{{two.bo}}"/>', data, ":checked", "Unknown value means not checked");
			hasNotJQ('<input type="checkbox" checked="{{bo}}{{two.bo}}"/>', data, ":checked", "Unknown values means not checked");
			hasJQ('<input type="checkbox" checked="{{one}}"/>', data, ":checked", "Non-empty string means checked");
			hasJQ('<input type="checkbox" checked="{{two.too}}"/>', data, ":checked", "Non-empty string means checked 2");
			hasJQ('<input type="checkbox" checked="{{three.tree.tee}}"/>', data, ":checked", "Non-empty string means checked 3");
			hasJQ('<input type="checkbox" checked="{{one}}{{two.too}}{{three.tree.tee}}"/>', data, ":checked", "Non-empty string means checked all");
		});

		test("Attribute: value", function(){
			hasValue('<input type="text" />', data, "", "Prep");
			hasValue('<input type="text" value="test"/>', data, "test", "Prep");
			hasValue('<input type="text" value="{{one}}"/>', data, "First", "One-level value");
			hasValue('<input type="text" value="{{two.too}}"/>', data, "Second", "Two-level value");
			hasValue('<input type="text" value="{{three.tree.tee}}"/>', data, "Third", "Three-level value");
			hasValue('<input type="text" value="{{one}}{{two.too}} {{three.tree.tee}}"/>', data, "FirstSecond Third", "All-level value");
		});

		test("Attribute: textarea value", function(){
			hasValue('<textarea></textarea>', data, "", "Prep");
			hasValue('<textarea>test</textarea>', data, "test", "Prep");
			hasValue('<textarea>{{one}}</textarea>', data, "First", "One-level value");
			hasValue('<textarea>{{two.too}}</textarea>', data, "Second", "Two-level value");
			hasValue('<textarea>{{three.tree.tee}}</textarea>', data, "Third", "Three-level value");
			hasValue('<textarea>{{one}}{{two.too}} {{three.tree.tee}}</textarea>', data, "FirstSecond Third", "All-level value");
		});

		test("Attribute: others", function(){
			hasJQ('<h1 id="tt1">Hey</h1>', data, "#tt1", "Prep");
			hasJQ('<h1 id="{{one}}">Hey</h1>', data, "#First", "One-level random attribute");
			hasJQ('<h1 id="{{two.too}}">Hey</h1>', data, "#Second", "Two-level random attribute");
			hasJQ('<h1 id="{{three.tree.tee}}">Hey</h1>', data, "#Third", "Three-level random attribute");
			hasJQ('<h1 id="{{one}}{{two.too}}{{three.tree.tee}}">Hey</h1>', data, "#FirstSecondThird", "All-level random attribute");
		});

		test("Attribute: if", function(){
			hasJQ('<h1 if="bogus">Hey</h1>', data, "h1[if]", "Non-special attribute ignored");
			hasNotJQ("<h1 if='{{bo}}'>Hey</h1>", data, "h1", "Missing value");
			hasNotJQ("<h1 if='{{two.bo}}'>Hey</h1>", data, "h1", "Missing second-level value");
			hasJQ("<h1 if='{{one}}'>Hey</h1>", data, "h1", "One-level value");
			hasJQ("<h1 if='{{two.too}}'>Hey</h1>", data, "h1", "Two-level value");
			hasJQ("<h1 if='{{three.tree.tee}}'>Hey</h1>", data, "h1", "Three-level value");
			hasJQ("<h1 if='{{one}} {{two.too}} {{three.tree.tee}}'>Hey</h1>", data, "h1", "All-level value");
			hasJQ("<h1 if='{{yes}}'>Hey</h1>", data, "h1", "Boolean true");
			hasNotJQ("<h1 if='{{no}}'>Hey</h1>", data, "h1", "Boolean false");
			hasNotJQ("<h1 if='{{zero}}'>Hey</h1>", data, "h1", "Zero");
			// TODO: Maybe empty arrays should be false. Probably not, though.
			hasJQ("<h1 if='{{empty}}'>Hey</h1>", data, "h1", "Empty array");
			// TODO: Maybe decide on and test what if="{{a}} {{b}}" should do
			hasJQ("<h1 if='{{one<\"ZZZ\"}}'>Hey</h1>", data, "h1", "Comparison true");
			hasNotJQ("<h1 if='{{one>=\"ZZZ\"}}'>Hey</h1>", data, "h1", "Comparison false");
		});

		test("Attribute: unless", function(){
			hasJQ('<h1 unless="bogus">Hey</h1>', data, "h1[unless]", "Non-special attribute ignored");
			hasJQ("<h1 unless='{{bo}}'>Hey</h1>", data, "h1", "Missing value");
			hasJQ("<h1 unless='{{two.bo}}'>Hey</h1>", data, "h1", "Missing second-level value");
			hasNotJQ("<h1 unless='{{one}}'>Hey</h1>", data, "h1", "One-level value");
			hasNotJQ("<h1 unless='{{two.too}}'>Hey</h1>", data, "h1", "Two-level value");
			hasNotJQ("<h1 unless='{{three.tree.tee}}'>Hey</h1>", data, "h1", "Three-level value");
			hasNotJQ("<h1 unless='{{one}} {{two.too}} {{three.tree.tee}}'>Hey</h1>", data, "h1", "All-level value");
			hasNotJQ("<h1 unless='{{yes}}'>Hey</h1>", data, "h1", "Boolean true");
			hasJQ("<h1 unless='{{no}}'>Hey</h1>", data, "h1", "Boolean false");
			hasJQ("<h1 unless='{{zero}}'>Hey</h1>", data, "h1", "Zero");
			// TODO: Maybe empty arrays should be false. Probably not, though.
			hasNotJQ("<h1 unless='{{empty}}'>Hey</h1>", data, "h1", "Empty array");
			// TODO: Maybe decide on and test what unless="{{a}} {{b}}" should do
		});

		test("Attribute: foreach", function(){
			hasJQ('<h1 foreach="bogus">Hey</h1>', data, "h1", "Non-special attribute ignored");
			hasNotJQ("<h1 foreach='{{bo}}'>Hey</h1>", data, "h1", "Missing value");
			hasNotJQ("<h1 foreach='{{two.bo}}'>Hey</h1>", data, "h1", "Missing second-level value");
			hasNotJQ("<h1 foreach='{{empty}}'>Hey</h1>", data, "h1", "Empty array");
			hasJQ("<h1 foreach='{{nums}}'>{{.}}</h1>", data, "h1", "Nums");
			has("<h1 foreach='{{nums}}'>{{.}}</h1>", data, "5", "Nums has 5");
			hasNot("<h1 foreach='{{nums}}'>{{.}}</h1>", data, "6", "Nums lacks 6");
			has("<h1 foreach='{{nums}}'>{{.}}</h1>", data, "7", "Nums has 7");
			hasJQ("<h1 foreach='{{objs}}'>{{.}}</h1>", data, "h1", "Objs");
			has("<h1 foreach='{{objs}}'>{{txt}}</h1>", data, "C", "Objs has C");
			hasNot("<h1 foreach='{{objs}}'>{{txt}}</h1>", data, "D", "Objs lacks D");
			has("<h1 foreach='{{objs}}'>{{txt}}</h1>", data, "E", "Objs has E");
			hasJQ("<h1 foreach='{{deep.derp.nums}}'>{{.}}</h1>", data, "h1", "Deep Nums");
			has("<h1 foreach='{{deep.derp.nums}}'>{{.}}</h1>", data, "5", "Deep Nums has 5");
			hasNot("<h1 foreach='{{deep.derp.nums}}'>{{.}}</h1>", data, "6", "Deep Nums lacks 6");
			has("<h1 foreach='{{deep.derp.nums}}'>{{.}}</h1>", data, "7", "Deep Nums has 7");

			// TODO: Maybe decide on and test what foreach="{{a}} {{b}}" should do
		});
		test("Attribute: with", function(){
			hasJQ('<h1 with="bogus">Hey</h1>', data, "h1[with]", "Non-special attribute ignored");
			hasJQ("<h1 with='{{bo}}'>Hey</h1>", data, "h1", "Missing value");
			hasJQ("<h1 with='{{two.bo}}'>Hey</h1>", data, "h1", "Missing second-level value");
			has("<h1 with='{{one}}'>{{.}}</h1>", data, "First", "Simple value");
			has("<h1 with='{{two}}'>{{too}}</h1>", data, "Second", "Two-level value");
			has("<h1 with='{{three.tree}}'>{{tee}}</h1>", data, "Third", "Three-level value");
			has("<h1 with='{{three}}'><span with='{{tree}}'>{{tee}}</span></h1>", data, "Third", "All-level value");
		});
		test("Block: if", function(){
			hasNotJQ("{{#if bo}}<h1>Hey</h1>{{/if}}", data, "h1", "Missing value");
			hasNotJQ("{{#if two.bo}}<h1>Hey</h1>{{/if}}", data, "h1", "Missing second-level value");
			hasJQ("{{#if one}}<h1>Hey</h1>{{/if}}", data, "h1", "One-level value");
			hasJQ("{{#if two.too}}<h1>Hey</h1>{{/if}}", data, "h1", "Two-level value");
			hasJQ("{{#if three.tree.tee}}<h1>Hey</h1>{{/if}}", data, "h1", "Three-level value");
			hasJQ("{{#if yes}}<h1>Hey</h1>{{/if}}", data, "h1", "Boolean true");
			hasNotJQ("{{#if no}}<h1>Hey</h1>{{/if}}", data, "h1", "Boolean false");
			hasNotJQ("{{#if zero}}<h1>Hey</h1>{{/if}}", data, "h1", "Zero");
			// TODO: Maybe empty arrays should be false. Probably not, though.
			hasJQ("{{#if empty}}<h1>Hey</h1>{{/if}}", data, "h1", "Empty array");
			// TODO: Maybe decide on and test what if="{{a}} {{b}}" should do
			hasJQ("{{#if one<\"ZZZ\"}}<h1>Hey</h1>{{/if}}", data, "h1", "Comparison true");
			hasNotJQ("{{#if one>=\"ZZZ\"}}<h1>Hey</h1>{{/if}}", data, "h1", "Comparison false");
		});
		test("Block: foreach", function(){
			hasNotJQ("{{#foreach bo}}<h1>Hey</h1>{{/foreach}}", data, "h1", "Missing value");
			hasNotJQ("{{#foreach two.bo}}<h1>Hey</h1>{{/foreach}}", data, "h1", "Missing second-level value");
			hasNotJQ("{{#foreach empty}}<h1>Hey</h1>{{/foreach}}", data, "h1", "Empty array");
			hasJQ("{{#foreach nums}}<h1>{{.}}</h1>{{/foreach}}", data, "h1", "Nums");
			has("{{#foreach nums}}<h1>{{.}}</h1>{{/foreach}}", data, "5", "Nums has 5");
			hasNot("{{#foreach nums}}<h1>{{.}}</h1>{{/foreach}}", data, "6", "Nums lacks 6");
			has("{{#foreach nums}}<h1>{{.}}</h1>{{/foreach}}", data, "7", "Nums has 7");
			hasJQ("{{#foreach objs}}<h1>{{.}}</h1>{{/foreach}}", data, "h1", "Objs");
			has("{{#foreach objs}}<h1>{{txt}}</h1>{{/foreach}}", data, "C", "Objs has C");
			hasNot("{{#foreach objs}}<h1>{{txt}}</h1>{{/foreach}}", data, "D", "Objs lacks D");
			has("{{#foreach objs}}<h1>{{txt}}</h1>{{/foreach}}", data, "E", "Objs has E");
			hasJQ("{{#foreach deep.derp.nums}}<h1>{{.}}</h1>{{/foreach}}", data, "h1", "Deep Nums");
			has("{{#foreach deep.derp.nums}}<h1>{{.}}</h1>{{/foreach}}", data, "5", "Deep Nums has 5");
			hasNot("{{#foreach deep.derp.nums}}<h1>{{.}}</h1>{{/foreach}}", data, "6", "Deep Nums lacks 6");
			has("{{#foreach deep.derp.nums}}<h1>{{.}}</h1>{{/foreach}}", data, "7", "Deep Nums has 7");

			// TODO: Maybe decide on and test what foreach="{{a}} {{b}}" should do
		});

		test("Contexts", function(){
			var tpl = 
				'<ul>'+
					'<li foreach="{{objs}}">'+
						'<ul>'+
							'<li foreach="{{..objs}}">'+
								'[{{...one}}{{..txt}}{{.txt}}]'+
							'</li>'+
						'</ul>'+
					'</li>'+
				'</ul>';
			has(tpl, data, "[FirstAA]", "Contexts nest well");
			has(tpl, data, "[FirstAC]", "Contexts nest well");
			has(tpl, data, "[FirstAE]", "Contexts nest well");
			has(tpl, data, "[FirstCA]", "Contexts nest well");
			has(tpl, data, "[FirstCC]", "Contexts nest well");
			has(tpl, data, "[FirstCE]", "Contexts nest well");
			has(tpl, data, "[FirstEA]", "Contexts nest well");
			has(tpl, data, "[FirstEC]", "Contexts nest well");
			has(tpl, data, "[FirstEE]", "Contexts nest well");
		});

		test("Combined attributes", function(){
			var tpl = '<div foreach="{{objs}}" if="{{txt!=\'C\'}}">{{txt}}</div>';
			textIs(tpl, data, "AE", "foreach and if combine in right order");
		});

		// TODO: Events (add/remove/count/parameters)
		// TODO: oninput="{{>blah}}"
		// TODO: value="{{>blah}}"
	};
});

// Separated to avoid namespace sharing
jQuery(function(){
	var testdiv = document.getElementById('plattertest');

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

	function runPlainDiv(tmpl, data) {
		if (typeof tmpl == 'string')
			tmpl = platter.plain.compile(tmpl);
		testdiv.appendChild(tmpl.run(data));
		return testdiv;
	}

	function testwrap(fn) {
		return function(tmpl, data, txt, msg){
			testdiv.innerHTML = "";
			$undo.start();
			var div = runPlainDiv(tmpl, data);
			fn(tmpl, data, txt, msg, div);
			$undo.undoToStart();
			if (testdiv.innerHTML)
				ok(false, "testdiv empty, afterwards");
		};
	}

	var has = testwrap(function(tmpl, data, txt, msg, div) {
		contains(div.innerHTML, txt, msg);
	});

	var hasNot = testwrap(function(tmpl, data, txt, msg, div) {
		notContains(div.innerHTML, txt, msg);
	});

	var hasJQ = testwrap(function(tmpl, data, txt, msg, div) {
		ok(jQuery(txt, div).length>0, msg);
	});

	var hasNotJQ = testwrap(function(tmpl, data, txt, msg, div) {
		ok(jQuery(txt, div).length==0, msg);
	});

	var hasValue = testwrap(function(tmpl, data, txt, msg, div) {
		equal(jQuery(':input', div).val(), txt, msg);
	});

	var textIs = testwrap(function(tmpl, data, txt, msg, div) {
		equal(jQuery(div).text(), txt, msg);
	});

	platter.tests.trivial(platter.plain, has, hasNot, hasJQ, hasNotJQ, hasValue, textIs);
});