// Slows things down, but monitors subscriptions, so we can test for cleanup.
PlatterTest.Internal.BigDebug();

if (!PlatterTest.Tests) PlatterTest.Tests = {};
PlatterTest.Tests.Dynamic = function(name, newObj, newColl, collReset, collAdd, doSet){
	// First, we rerun the plain-template tests against the dynamic compiler, since the dynamic compiler should support all of the plain results.
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

	function runDynamicDiv(undo, tmpl, data) {
		if (typeof tmpl == 'string')
			tmpl = PlatterTest.Dynamic.compile(tmpl);
		testdiv.appendChild(tmpl.run(data, undo).docfrag);
		return testdiv;
	}

	function testwrap(fn) {
		return function(tmpl, data, txt, msg){
			testdiv.innerHTML = "";
			var undo = new PlatterTest.Undo();
			var div = runDynamicDiv(undo, tmpl, data);
			fn(tmpl, data, txt, msg, div);
			undo.undo();
			if (testdiv.innerHTML)
				ok(false, "testdiv empty, afterwards");
		};
	}

	var quickHas = testwrap(function(tmpl, data, txt, msg, div) {
		contains(div.innerHTML, txt, msg);
	});

	var quickHasNot = testwrap(function(tmpl, data, txt, msg, div) {
		notContains(div.innerHTML, txt, msg);
	});

	var quickHasJQ = testwrap(function(tmpl, data, txt, msg, div) {
		ok(jQuery(txt, div).length>0, msg);
	});

	var quickHasNotJQ = testwrap(function(tmpl, data, txt, msg, div) {
		ok(jQuery(txt, div).length==0, msg);
	});

	var quickHasValue = testwrap(function(tmpl, data, txt, msg, div) {
		equal(jQuery(':input', div).val(), txt, msg);
	});

	var quickTextIs = testwrap(function(tmpl, data, txt, msg, div) {
		equal(jQuery(div).text(), txt, msg);
	});

	module(name+'+plain templates');
	PlatterTest.Tests.Trivial(PlatterTest.Dynamic, quickHas, quickHasNot, quickHasJQ, quickHasNotJQ, quickHasValue, quickTextIs);
	module(name+' dynamic');



	// The next section is a sequence of automatically handled tests.
	// Each test-set has a base set of tests, each of which has a positive and a negative version, and a set expectation as to which tests should be negative/positive.
	// In every cycle:
	//   1. The model is updated for the next step
	//   2. The template is run once more against the current model
	//   3. The test expectations are updated for the given change
	//   4. The tests are run for every single template run so far.
	// This results in approximately M*N^2 tests, with M being the number of base tests and N being the number of steps in the test-set.


	function copyFrom(a,b) {
		var ret = {};
		if (a)
			for (var i in a)
				if (a.hasOwnProperty(i))
					ret[i] = a[i];
		if (b)
			for (var i in b)
				if (b.hasOwnProperty(i))
					ret[i] = b[i];
		return ret;
	}

	// Rules have the positive version first and the negative version second
	function neg(rule) {
		return [rule[1], rule[0]];
	}

	// The text of the given node is txt or txt2 (or just not txt, if txt2 is not given)
	function ruleElText(el, txt, txt2) {
		return [
			function(div, n){equal(jQuery(el, div).text(), txt, n+" "+el+" text is "+txt);},
			txt2==null
				? function(div, n){notEqual(jQuery(el, div).text(), txt, n+" "+el+" text is not "+txt);}
				: function(div, n){equal(jQuery(el, div).text(), txt2, n+" "+el+" text is "+txt2);}
		];
	}

	// The value of the given node is txt or txt2 (or just not txt, if txt2 is not given)
	function ruleElValue(el, txt, txt2) {
		return [
			function(div, n){equal(jQuery(el, div).val(), txt, n+" "+el+" text is "+txt);},
			txt2==null
				? function(div, n){notEqual(jQuery(el, div).val(), txt, n+" "+el+" text is not "+txt);}
				: function(div, n){equal(jQuery(el, div).val(), txt2, n+" "+el+" text is "+txt2);}
		];
	}

	// The given elements has the given count1 or count2 (or just not count1, if count2 is not given)
	function ruleElCount(el, cnt1, cnt2) {
		return [
			function(div, n){equal(jQuery(el, div).length, cnt1, n+" "+el+" has count "+cnt1);},
			cnt2==null
				? function(div, n){notEqual(jQuery(el, div).length, cnt1, n+" "+el+" does not have count "+cnt1);}
				: function(div, n){equal(jQuery(el, div).length, cnt2, n+" "+el+" has count "+cnt2);},
		];
	}

	// The given element exists or doesn't
	function ruleElExists(el) {
		return neg(ruleElCount(el,0));
	}

	onetwothreeinit = function() {
		var o = newObj();
		doSet(o, 'one', undefined);
		doSet(o, 'two', undefined);
		doSet(o, 'three', undefined);
		doSet(o, 'zero', undefined);
		doSet(o, 'yes', undefined);
		doSet(o, 'no', undefined);
		doSet(o, 'objs', undefined);
		doSet(o, 'nums', undefined);
		return o;
	};

	// A reused test sequence that eventually builds up {one:'First', two:{too:'Second'}, three:{tree:{tee:'Third'}}} in various formats. t1, t2 and t3 are the tests to enable as each entry is successfully completed.
	function onetwothreetests(t1, t2, t3) {
		return [
			{
				name: "Set one to First",
				go: function(data){ doSet(data, 'one', "First"); },
				tests: t1
			},
			{
				name: "Set two to an object",
				go: function(data){ doSet(data, 'two', {}); },
				tests: {}
			},
			{
				name: "Set two to a model",
				go: function(data){ doSet(data, 'two', newObj())},
				tests: {}
			},
			{
				name: "Set two to a correct object",
				go: function(data){ doSet(data, 'two', {too:'Second'})},
				tests: t2
			},
			{
				name: "Set two to a model, then correct it",
				go: function(data) {
					var two = newObj();
					doSet(two, 'too', undefined);
					doSet(data, 'two', two);
					doSet(two, 'too', "Second");
				},
				tests: {}
			},
			{
				name: "Set two to a correct model",
				go: function(data) {
					var two = newObj();
					doSet(two, 'too', "Second");
					doSet(data, 'two', two);
				},
				tests: {}
			},
			{
				name: "Set three to an object",
				go: function(data){ doSet(data, 'three', {}); },
				tests: {}
			},
			{
				name: "Set three to an object",
				go: function(data){ doSet(data, 'three', {tree:{}}); },
				tests: {}
			},
			{
				name: "Set three to a model",
				go: function(data){
					var three = newObj();
					doSet(data, 'three', three);
					doSet(three, 'tree', {});
				},
				tests: {}
			},
			{
				name: "Set three to a model",
				go: function(data){
					var three = newObj();
					doSet(data, 'three', three);
					doSet(three, 'tree', newObj());
				},
				tests: {}
			},
			{
				name: "Set three to a correct object",
				go: function(data){ doSet(data, 'three', {tree:{tee:'Third'}}); },
				tests: t3
			},
			{
				name: "Set three to a model, then correct it",
				go: function(data){
					var three = newObj();
					doSet(three, 'tree', undefined);
					doSet(data, 'three', three);
					doSet(three, 'tree', {tee:'Third'});
				},
				tests: {}
			},
			{
				name: "Set three to a correct model",
				go: function(data){
					var three = newObj();
					doSet(three, 'tree', {tee:'Third'});
					doSet(data, 'three', three);
				},
				tests: {}
			},
			{
				name: "Set three to a model, order 1",
				go: function(data){
					var three = newObj();
					doSet(three, 'tree', undefined);
					var tree = newObj();
					doSet(tree, 'tee', undefined);
					doSet(data, 'three', three);
					doSet(three, 'tree', tree);
					doSet(tree, 'tee', 'Third');
				},
				tests: {}
			},
			{
				name: "Set three to a model, order 2",
				go: function(data){
					var three = newObj();
					doSet(three, 'tree', undefined);
					var tree = newObj();
					doSet(tree, 'tee', undefined);
					doSet(data, 'three', three);
					doSet(tree, 'tee', 'Third');
					doSet(three, 'tree', tree);
				},
				tests: {}
			},
			{
				name: "Set three to a model, order 3",
				go: function(data){
					var three = newObj();
					doSet(three, 'tree', undefined);
					var tree = newObj();
					doSet(tree, 'tee', undefined);
					doSet(three, 'tree', tree);
					doSet(data, 'three', three);
					doSet(tree, 'tee', 'Third');
				},
				tests: {}
			},
			{
				name: "Set three to a model, order 4",
				go: function(data){
					var three = newObj();
					doSet(three, 'tree', undefined);
					var tree = newObj();
					doSet(tree, 'tee', undefined);
					doSet(three, 'tree', tree);
					doSet(tree, 'tee', 'Third');
					doSet(data, 'three', three);
				},
				tests: {}
			},
			{
				name: "Set three to a model, order 5",
				go: function(data){
					var three = newObj();
					doSet(three, 'tree', undefined);
					var tree = newObj();
					doSet(tree, 'tee', undefined);
					doSet(tree, 'tee', 'Third');
					doSet(data, 'three', three);
					doSet(three, 'tree', tree);
				},
				tests: {}
			},
			{
				name: "Set three to a model, order 6",
				go: function(data){
					var three = newObj();
					doSet(three, 'tree', undefined);
					var tree = newObj();
					doSet(tree, 'tee', undefined);
					doSet(tree, 'tee', 'Third');
					doSet(three, 'tree', tree);
					doSet(data, 'three', three);
				},
				tests: {}
			}
		];
	}

	// TODO: Test tokens inside comments
	// TODO: Maybe test CDATA tokens, if you can find cdata elements in a HTML5 doc.
	module(name+" N^2");
	bbtests = [
		{
			name:"Text tokens",
			tests: {
				h1: ruleElText('h1', 'First', ''),
				h2: ruleElText('h2', 'Second', ''),
				h3: ruleElText('h3', 'Third', ''),
				h41: ruleElText('h4', 'First '),
				h42: ruleElText('h4', 'First Second'),
				h43: ruleElText('h4', "First SecondThird"),
				h5: ruleElText('h5', '0', ''),
				h6: ruleElText('h6', 'true', '')
			},
			testsstart: {},
			init: onetwothreeinit,
			template:
				"<h1>{{one}}</h1>"+
				"<h2>{{two.too}}</h2>"+
				"<h3>{{three.tree.tee}}</h3>"+
				"<h4>{{one}} {{two.too}}{{three.tree.tee}}</h4>"+
				"<h5>{{zero}}</h5>"+
				"<h6>{{yes}}</h6>", // TODO: What should {{no}} insert? "false" or ""?
			actions: 
				onetwothreetests({h1:1, h41:1}, {h2:1, h41:0, h42:1}, {h3:1, h42:0, h43:1}).concat([
					{
						name: "Set zero to 0",
						go: function(data){ doSet(data, 'zero', 0); },
						tests: {h5:1}
					},
					{
						name: "Set yes to true",
						go: function(data){ doSet(data, 'yes', true); },
						tests: {h6:1}
					}
				])
		},

		{
			name:"Scopes",
			tests: {
				h1: ruleElText('h1', '1'),
				h2: ruleElText('h2', '1'),
				h31: ruleElText('h3', '1'),
				h37: ruleElText('h3', '7'),
				h4: ruleElText('h4', '2'),
				h52: ruleElText('h5', '2'),
				h58: ruleElText('h5', '8'),
				h6: ruleElText('h6', '2'),
				p2: ruleElText('p', '2'),
				p8: ruleElText('p', '8')
			},
			testsstart: {h1:1, h2:1, h31:1, h4:1, h52:1, h6:1, p2:1},
			init: function() {
				var o = newObj();
				doSet(o, 'a', 1);
				o.aa = 1;
				doSet(o, 'b', function(){return this.aa});
				doSet(o, 'c', function(){return this.aa+6});
				doSet(o, 'N', 'b');
				var o2 = newObj();
				doSet(o2, 'a', 2);
				o2.aa = 2;
				doSet(o2, 'b', function(){return this.aa});
				doSet(o2, 'c', function(){return this.aa+6});
				doSet(o2, 'N', 'b');
				doSet(o, 'inner', o2);
				o.o2 = o2;
				return o;
			},
			template:
				"<h1>{{a}}</h1>"+
				"<h2>{{b()}}</h2>"+
				"<h3>{{.[N]()}}</h3>"+
				"<h4>{{inner.b()}}</h4>"+
				"<h5>{{inner[N]()}}</h5>"+
				"<h6 with='{{inner}}'>{{b()}}</h6>"+
				"<p with='{{inner}}'>{{.[N]()}}",
			actions: [
				{
					name: "Set N to c",
					go: function(data){ doSet(data, 'N', 'c'); },
					tests: {h31:0, h37:1, h52:0, h58:1}
				},
				{
					name: "Set inner.N to c",
					go: function(data){ doSet(data.o2, 'N', 'c'); },
					tests: {p2:0, p8:1}
				},
				{
					name: "Set N to b",
					go: function(data){ doSet(data, 'N', 'b'); },
					tests: {h31:1, h37:0, h52:1, h58:0}
				},
				{
					name: "Set inner.N to b",
					go: function(data){ doSet(data.o2, 'N', 'b'); },
					tests: {p2:1, p8:0}
				}
			]
		},

		{
			name:"Attribute: class",
			tests: {
				h1: ruleElText('h1', 'A', ''),
				h2: ruleElText('h2.First', 'B', ''),
				h3: ruleElText('h3.Second', 'C', ''),
				h4: ruleElText('h4.Third', 'D', ''),
				h51: ruleElText('h5.First', 'E'),
				h52: ruleElText('h5.First.Second', 'E'),
				h53: ruleElText('h5.First.Second.Third', "E")
			},
			testsstart: {h1:1},
			init: onetwothreeinit,
			template:
				"<h1 class='Huh'>A</h1>"+
				"<h2 class='{{one}}'>B</h1>"+
				"<h3 class='{{two.too}}'>C</h1>"+
				"<h4 class='{{three.tree.tee}}'>D</h1>"+
				"<h5 class='{{one}} {{two.too}} {{three.tree.tee}}'>E</h1>",
			actions: onetwothreetests({h2:1, h51:1}, {h3:1, h52:1}, {h4:1, h53:1})
		},


		{
			name:"Attribute: checked",
			tests: {
				h1: neg(ruleElExists('h1 :checked')),
				h2: ruleElExists('h2 :checked'),
				h3: ruleElExists('h3 :checked'),
				h4: ruleElExists('h4 :checked'),
				h5: ruleElExists('h5 :checked'),
				h6: ruleElExists('h6 :checked')
			},
			testsstart: {'h1':1, 'h2':1},
			init: onetwothreeinit,
			template:
				"<h1><input type='checkbox'/></h1>"+
				"<h2><input type='checkbox' checked/></h2>"+
				"<h3><input type='checkbox' checked='{{one}}'/></h3>"+
				"<h4><input type='checkbox' checked='{{two.too}}'/></h4>"+
				"<h5><input type='checkbox' checked='{{three.tree.tee}}'/></h5>"+
				"<h6><input type='checkbox' checked='{{one}}{{two.too}}{{three.tree.tee}}'/></h6>",
			actions: onetwothreetests({h3:1}, {h4:1}, {h5:1, h6:1})
		},


		{
			name:"Attribute: value",
			tests: {
				h1: ruleElValue('h1 :input', ''),
				h2: ruleElValue('h2 :input', 'hey'),
				h3: ruleElValue('h3 :input', 'First', ''),
				h4: ruleElValue('h4 :input', 'Second', ''),
				h5: ruleElValue('h5 :input', 'Third', ''),
				h61: ruleElValue('h6 :input', 'First '),
				h62: ruleElValue('h6 :input', 'First Second'),
				h63: ruleElValue('h6 :input', 'First SecondThird')
			},
			testsstart: {'h1':1, 'h2':1},
			init: onetwothreeinit,
			template:
				"<h1><input type='text'/></h1>"+
				"<h2><input type='text' value='hey' /></h2>"+
				"<h3><input type='text' value='{{one}}'/></h3>"+
				"<h4><input type='text' value='{{two.too}}'/></h4>"+
				"<h5><input type='text' value='{{three.tree.tee}}'/></h5>"+
				"<h6><input type='text' value='{{one}} {{two.too}}{{three.tree.tee}}'/></h6>",
			actions: onetwothreetests({h3:1, h61:1}, {h4:1, h61:0, h62:1}, {h5:1, h62:0, h63:1})
		},


		{
			name:"Attribute: textarea value",
			tests: {
				h1: ruleElValue('h1 :input', ''),
				h2: ruleElValue('h2 :input', 'hey'),
				h3: ruleElValue('h3 :input', 'First', ''),
				h4: ruleElValue('h4 :input', 'Second', ''),
				h5: ruleElValue('h5 :input', 'Third', ''),
				h61: ruleElValue('h6 :input', 'First '),
				h62: ruleElValue('h6 :input', 'First Second'),
				h63: ruleElValue('h6 :input', 'First SecondThird')
			},
			testsstart: {'h1':1, 'h2':1},
			init: onetwothreeinit,
			template:
				"<h1><textarea></textarea></h1>"+
				"<h2><textarea>hey</textarea></h2>"+
				"<h3><textarea>{{one}}</textarea></h3>"+
				"<h4><textarea>{{two.too}}</textarea></h4>"+
				"<h5><textarea>{{three.tree.tee}}</textarea></h5>"+
				"<h6><textarea>{{one}} {{two.too}}{{three.tree.tee}}</textarea></h6>",
			actions: onetwothreetests({h3:1, h61:1}, {h4:1, h61:0, h62:1}, {h5:1, h62:0, h63:1})
		},


		{
			name:"Attribute: others",
			tests: {
				h1: ruleElExists('h1:not([id])'),
				h2: ruleElExists('h2#hey'),
				h3: ruleElExists('h3#First'),
				h4: ruleElExists('h4#Second'),
				h5: ruleElExists('h5#Third'),
				h61: ruleElExists('h6#First'),
				h62: ruleElExists('h6#FirstSecond'),
				h63: ruleElExists('h6#FirstSecondThird')
			},
			testsstart: {'h1':1, 'h2':1},
			init: onetwothreeinit,
			template:
				"<h1></h1>"+
				"<h2 id='hey'></h2>"+
				"<h3 id='{{one}}'></h3>"+
				"<h4 id='{{two.too}}'></h4>"+
				"<h5 id='{{three.tree.tee}}'></h5>"+
				"<h6 id='{{one}}{{two.too}}{{three.tree.tee}}'></h6>",
			actions: onetwothreetests({h3:1, h61:1}, {h4:1, h61:0, h62:1}, {h5:1, h62:0, h63:1})
		},


		{
			name:"Attribute: if",
			tests: { // TODO: Should empty array be false and tested? Probably not.
				h1: ruleElExists('h1[if]'),
				h2: ruleElExists('h2'),
				h3: ruleElExists('h3'),
				h4: ruleElExists('h4'),
				h5: ruleElExists('h5'),
				h6: ruleElExists('h6'),
				p: ruleElExists('p'),
				div: ruleElExists('div')
			},
			testsstart: {h1:1},
			init: onetwothreeinit,
			template:
				"<h1 if='bogus'>a</h1>"+
				"<h2 if='{{one}}'>b</h2>"+
				"<h3 if='{{two.too}}'>c</h3>"+
				"<h4 if='{{three.tree.tee}}'>d</h4>"+
				"<h5 if='{{yes}}'>e</h5>"+
				"<h6 if='{{no}}'>f</h6>"+
				"<p if='{{zero}}'></p>"+
				"<div if='{{one==\"First\"}}'>h</div>",
			actions: onetwothreetests({h2:1, div:1}, {h3:1}, {h4:1}).concat([
				{
					name: "Set zero to 0",
					go: function(data){ doSet(data, 'zero', 0); },
					tests: {}
				},
				{
					name: "Set yes to true",
					go: function(data){ doSet(data, 'yes', true); },
					tests: {h5:1}
				},
				{
					name: "Set no to false",
					go: function(data){ doSet(data, 'no', false); },
					tests: {}
				}
			])
		},


		{
			name:"Block: else",
			tests: { // TODO: Should empty array be false and tested? Probably not.
				h11: ruleElText('h1', 1),
				h12: ruleElText('h1', 2),
				h13: ruleElText('h1', 3),
				h21: ruleElText('h2', 1),
				h22: ruleElText('h2', 2),
				h23: ruleElText('h2', 3),
				h31: ruleElText('h3', 1),
				h32: ruleElText('h3', 2),
				h33: ruleElText('h3', 3),
				h41: ruleElText('h4', 1),
				h42: ruleElText('h4', 2),
				h43: ruleElText('h4', 3)
			},
			testsstart: {h13:1, h23:1, h33:1, h43:1},
			init: function() {
				var o = newObj();
				doSet(o, 'bool1', undefined);
				doSet(o, 'bool2', undefined);
				return o;
			},
			template:
				"<h1>{{#if bool1}}1{{#else if bool2}}2{{#else}}3{{/if}}</h1>"+
				"<h2>{{#if bool1}}1{{#else unless !bool2}}2{{#else}}3{{/if}}</h2>"+
				"<h3>{{#unless !bool1}}1{{#else if bool2}}2{{#else}}3{{/unless}}</h3>"+
				"<h4>{{#unless !bool1}}1{{#else unless !bool2}}2{{#else}}3{{/unless}}</h4>",
			actions: [
				{
					name: "Set bool2 to false",
					go: function(data){ doSet(data, 'bool2', false); },
					tests: {}
				},
				{
					name: "Set bool2 to true",
					go: function(data){ doSet(data, 'bool2', true); },
					tests: {h12:1, h22:1, h32:1, h42:1, h13:0, h23:0, h33:0, h43:0}
				},
				{
					name: "Set bool1 to false",
					go: function(data){ doSet(data, 'bool1', false); },
					tests: {}
				},
				{
					name: "Set bool1 to true",
					go: function(data){ doSet(data, 'bool1', true); },
					tests: {h11:1, h21:1, h31:1, h41:1, h12:0, h22:0, h32:0, h42:0}
				},
				{
					name: "Set bool1 to false",
					go: function(data){ doSet(data, 'bool1', false); },
					tests: {h12:1, h22:1, h32:1, h42:1, h11:0, h21:0, h31:0, h41:0}
				},
				{
					name: "Set bool1 to true",
					go: function(data){ doSet(data, 'bool1', true); },
					tests: {h11:1, h21:1, h31:1, h41:1, h12:0, h22:0, h32:0, h42:0}
				},
				{
					name: "Set bool2 to false",
					go: function(data){ doSet(data, 'bool2', false); },
					tests: {}
				},
				{
					name: "Set bool1 to false",
					go: function(data){ doSet(data, 'bool1', false); },
					tests: {h13:1, h23:1, h33:1, h43:1, h11:0, h21:0, h31:0, h41:0}
				}
			]
		},


		{
			name:"Attribute: unless",
			tests: { // TODO: Should empty array be false and tested? Probably not.
				h1: ruleElExists('h1[if]'),
				h2: ruleElExists('h2'),
				h3: ruleElExists('h3'),
				h4: ruleElExists('h4'),
				h5: ruleElExists('h5'),
				h6: ruleElExists('h6'),
				p: ruleElExists('p')
			},
			testsstart: {'h2':1, 'h3':1, 'h4':1, 'h5':1, 'h6':1, 'p':1},
			init: onetwothreeinit,
			template:
				"<h1 unless='bogus'>a</h1>"+
				"<h2 unless='{{one}}'>b</h2>"+
				"<h3 unless='{{two.too}}'>c</h3>"+
				"<h4 unless='{{three.tree.tee}}'>d</h4>"+
				"<h5 unless='{{yes}}'>e</h5>"+
				"<h6 unless='{{no}}'>f</h6>"+
				"<p unless='{{zero}}'></p>",
			actions: onetwothreetests({h2:0}, {h3:0}, {h4:0}).concat([
				{
					name: "Set zero to 0",
					go: function(data){ doSet(data, 'zero', 0); },
					tests: {}
				},
				{
					name: "Set yes to true",
					go: function(data){ doSet(data, 'yes', true); },
					tests: {h5:0}
				},
				{
					name: "Set no to false",
					go: function(data){ doSet(data, 'no', false); },
					tests: {}
				}
			])
		},


		{
			name:"Attribute: with",
			tests: { // TODO: Should empty array be false and tested? Probably not.
				h1: ruleElExists('h1[with]'),
				h2: ruleElText('h2', 'First', ''),
				h3: ruleElText('h3', 'Second', ''),
				h4: ruleElText('h4 span', 'Third', ''),
				h5: ruleElText('h5', 'First', '')
			},
			testsstart: {'h1':1},
			init: onetwothreeinit,
			template:
				"<h1 with='bogus'>a</h1>"+
				"<h2 with='{{one}}'>{{.}}</h2>"+
				"<h3 with='{{two}}'>{{too}}</h3>"+
				"<h4 with='{{three}}'><span with='{{tree}}'>{{tee}}</span></h4>"+
				"<h5 with='{{three}}'><span with='{{tree}}'>{{...one}}</span></h5>",
			actions: onetwothreetests({h2:1, h5:1}, {h3:1}, {h4:1})
		},


		// Backbone collection entries have to be models, so we can't have nums.
		{
			name:"Attribute: foreach",
			tests: {
				h1: ruleElExists('h1[foreach]'),
				h20: ruleElCount('h2', 0),
				h21: ruleElCount('h2', 1),
				h22: ruleElCount('h2', 2),
				h23: ruleElCount('h2', 3),
				h2A: ruleElText('h2', 'A'),
				h2AC: ruleElText('h2', 'AC'),
				h2ABC: ruleElText('h2', 'ABC')
			},
			testsstart: {h1:1, h20:1, h30:1},
			init: function() {
				var o = newObj();
				doSet(o, 'objs', undefined);
				return o;
			},
			template:
				"<h1 foreach='bogus'>a</h1>"+
				"<h2 foreach='{{objs}}'>{{txt}}</h2>",
			actions: [
				{
					name: "Set objs to noise",
					go: function(data){ doSet(data, 'objs', 'noise'); },
					tests: {}
				},
				{
					name: "Set objs to empty collection",
					go: function(data){ doSet(data, 'objs', newColl()); },
					tests: {}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {h20:0, h21:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {h21:0, h22:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {h22:0, h23:1}
				},
				{
					name: "Alter objs[0] to contain A",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 0);
						doSet(el, 'txt', 'A');
					},
					tests: {h2A:1}
				},
				{
					name: "Alter objs[2] to contain C",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 2);
						doSet(el, 'txt', 'C');
					},
					tests: {h2A:0, h2AC:1}
				},
				{
					name: "Alter objs[1] to contain B",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						doSet(el, 'txt', 'B');
					},
					tests: {h2AC:0, h2ABC:1}
				},
				{
					name: "Remove objs[1]",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						coll.remove(el);
					},
					tests: {h2ABC:0, h2AC:1, h23:0, h22:1}
				},
				{
					name: "Alter objs[1] to contain BC",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						doSet(el, 'txt', 'BC');
					},
					tests: {h2AC:0, h2ABC:1}
				},
				{
					name: "Reset the collection to A,C",
					go: function(data){
						var el1 = newObj();
						doSet(el1, 'txt', 'A');
						var el2 = newObj();
						doSet(el2, 'txt', 'C');
						var coll = PlatterTest.Get(data, 'objs');
						collReset(coll, [el1, el2]);
					},
					tests: {h2ABC:0, h2AC:1}
				},
				{
					name: "Replace objs with plain object",
					go: function(data){ doSet(data, 'objs', [{txt:'A'}, {txt:'BC'}]); },
					tests: {h2AC:0, h2ABC:1}
				},
				{
					name: "Replace objs with garbage",
					go: function(data){ doSet(data, 'objs', 'garbage'); },
					tests: {h2ABC:0, h22:0, h20:1}
				}
			]
		},


		{
			name:"Special: Manual 'Loop'",
			tests: {
				h1: ruleElExists('h1[foreach]'),
				h20: ruleElCount('h2', 0),
				h21: ruleElCount('h2', 1),
				h22: ruleElCount('h2', 2),
				h23: ruleElCount('h2', 3),
				h2A: ruleElText('h2', 'A'),
				h2AC: ruleElText('h2', 'AC'),
				h2ABC: ruleElText('h2', 'ABC'),
				h3empty: ruleElText('h3', ''),
				h30: ruleElText('h3', '0'),
				h31: ruleElText('h3', '1'),
				h32: ruleElText('h3', '2'),
				h33: ruleElText('h3', '3')
			},
			testsstart: {h1:1, h20:1, h3empty:1},
			init: function() {
				var o = newObj();
				doSet(o, 'objs', undefined);
				return o;
			},
			template:
				"<h1 foreach='bogus'>a</h1>"+
				"<h2 if='{{objs.0}}' with='{{objs.0}}'>{{txt}}</h2>"+
				"<h2 if='{{objs.1}}' with='{{objs.1}}'>{{txt}}</h2>"+
				"<h2 if='{{objs.2}}' with='{{objs.2}}'>{{txt}}</h2>"+
				"<h2 if='{{objs.3}}' with='{{objs.3}}'>{{txt}}</h2>"+
				"<h3>{{objs.length}}</h3>",
			actions: [
				{
					name: "Set objs to 0",
					go: function(data){ doSet(data, 'objs', 0); },
					tests: {}
				},
				{
					name: "Set objs to empty collection",
					go: function(data){ doSet(data, 'objs', newColl()); },
					tests: {h3empty:0, h30:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {h20:0, h21:1, h30:0, h31:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {h21:0, h22:1, h31:0, h32:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {h22:0, h23:1, h32:0, h33:1}
				},
				{
					name: "Alter objs[0] to contain A",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 0);
						doSet(el, 'txt', 'A');
					},
					tests: {h2A:1}
				},
				{
					name: "Alter objs[2] to contain C",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 2);
						doSet(el, 'txt', 'C');
					},
					tests: {h2A:0, h2AC:1}
				},
				{
					name: "Alter objs[1] to contain B",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						doSet(el, 'txt', 'B');
					},
					tests: {h2AC:0, h2ABC:1}
				},
				{
					name: "Remove objs[1]",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						coll.remove(el);
					},
					tests: {h2ABC:0, h2AC:1, h23:0, h22:1, h33:0, h32:1}
				},
				{
					name: "Alter objs[1] to contain BC",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						doSet(el, 'txt', 'BC');
					},
					tests: {h2AC:0, h2ABC:1}
				},
				{
					name: "Reset the collection to A,C",
					go: function(data){
						var el1 = newObj();
						doSet(el1, 'txt', 'A');
						var el2 = newObj();
						doSet(el2, 'txt', 'C');
						var coll = PlatterTest.Get(data, 'objs');
						collReset(coll, [el1, el2]);
					},
					tests: {h2ABC:0, h2AC:1}
				},
				{
					name: "Replace objs with plain object",
					go: function(data){ doSet(data, 'objs', [{txt:'A'}, {txt:'BC'}]); },
					tests: {h2AC:0, h2ABC:1}
				},
				{
					name: "Replace objs with 0",
					go: function(data){ doSet(data, 'objs', 0); },
					tests: {h2ABC:0, h22:0, h20:1, h32:0, h3empty:1}
				}
			]
		},


		// Backbone collection indirected
		{
			name:"Attribute: foreach indirect",
			tests: {
				h1: ruleElExists('h1[foreach]'),
				h20: ruleElCount('h2', 0),
				h21: ruleElCount('h2', 1),
				h22: ruleElCount('h2', 2),
				h23: ruleElCount('h2', 3),
				h2A: ruleElText('h2', 'A'),
				h2AC: ruleElText('h2', 'AC'),
				h2ABC: ruleElText('h2', 'ABC')
			},
			testsstart: {h1:1, h20:1, h30:1},
			init: function() {
				var o = newObj();
				doSet(o, 'a', undefined);
				return o;
			},
			template:
				"<h1 foreach='bogus'>a</h1>"+
				"<h2 foreach='{{a.b.objs}}'>{{txt}}</h2>",
			actions: [
				{
					name: "Set objs to noise",
					go: function(data){ doSet(data, 'a', {b: {objs:'noise'}}); },
					tests: {}
				},
				{
					name: "Set objs to empty collection",
					go: function(data){ doSet(data, 'a', {b: {objs:newColl()}}); },
					tests: {h5:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'a').b.objs;
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {h20:0, h21:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'a').b.objs;
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {h21:0, h22:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'a').b.objs;
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {h22:0, h23:1}
				},
				{
					name: "Alter objs[0] to contain A",
					go: function(data){
						var coll = PlatterTest.Get(data, 'a').b.objs;
						var el = PlatterTest.Get(coll, 0);
						doSet(el, 'txt', 'A');
					},
					tests: {h2A:1}
				},
				{
					name: "Alter objs[2] to contain C",
					go: function(data){
						var coll = PlatterTest.Get(data, 'a').b.objs;
						var el = PlatterTest.Get(coll, 2);
						doSet(el, 'txt', 'C');
					},
					tests: {h2A:0, h2AC:1}
				},
				{
					name: "Alter objs[1] to contain B",
					go: function(data){
						var coll = PlatterTest.Get(data, 'a').b.objs;
						var el = PlatterTest.Get(coll, 1);
						doSet(el, 'txt', 'B');
					},
					tests: {h2AC:0, h2ABC:1}
				},
				{
					name: "Remove objs[1]",
					go: function(data){
						var coll = PlatterTest.Get(data, 'a').b.objs;
						var el = PlatterTest.Get(coll, 1);
						coll.remove(el);
					},
					tests: {h2ABC:0, h2AC:1, h23:0, h22:1}
				},
				{
					name: "Alter objs[1] to contain BC",
					go: function(data){
						var coll = PlatterTest.Get(data, 'a').b.objs;
						var el = PlatterTest.Get(coll, 1);
						doSet(el, 'txt', 'BC');
					},
					tests: {h2AC:0, h2ABC:1}
				},
				{
					name: "Reset the collection to A,C",
					go: function(data){
						var el1 = newObj();
						doSet(el1, 'txt', 'A');
						var el2 = newObj();
						doSet(el2, 'txt', 'C');
						var coll = PlatterTest.Get(data, 'a').b.objs;
						collReset(coll, [el1, el2]);
					},
					tests: {h2ABC:0, h2AC:1}
				},
				{
					name: "Replace objs with plain object",
					go: function(data){ doSet(data, 'a', {b: {objs:[{txt:'A'}, {txt:'BC'}]}}); },
					tests: {h2AC:0, h2ABC:1}
				},
				{
					name: "Replace objs with garbage",
					go: function(data){ doSet(data, 'a', {b: {objs:'garbage'}}); },
					tests: {h2ABC:0, h22:0, h20:1}
				}
			]
		},


		// Magical selects
		// TODO: Make sure that the selected element being removed is handled
		// TODO: Make sure that the selected option's value changing is correctly reflected
		{
			name:"Element: magical select",
			tests: {
				h1: ruleElExists('h1'),
				h1A: ruleElText('h1', 'A'),
				h1B: ruleElText('h1', 'B'),
				h1C: ruleElText('h1', 'C'),
				valNone: ruleElText('option:selected', 'None'),
				valA: ruleElText('option:selected', 'A'),
				valB: ruleElText('option:selected', 'B'),
				valC: ruleElText('option:selected', 'C'),
				selA: ruleElText('select', 'NoneA'),
				selAC: ruleElText('select', 'NoneAC'),
				selABC: ruleElText('select', 'NoneABC'),
				option1: ruleElCount('option', 1),
				option2: ruleElCount('option', 2),
				option3: ruleElCount('option', 3),
				option4: ruleElCount('option', 4)
			},
			testsstart: {option1:1, valNone:1},
			init: function() {
				var o = newObj();
				doSet(o, 'magselval', undefined);
				doSet(o, 'objs', undefined);
				return o;
			},
			template:
				"<select value='{{magselval}}'>"+
					"<option>None</option>"+
					"<option foreach='{{objs}}'>{{txt}}</option>"+
				"</select>"+
				"<h1 if='{{magselval}}'>{{magselval.txt}}</h1>",
			actions: [
				{
					name: "Set objs to noise",
					go: function(data){ doSet(data, 'objs', 'noise'); },
					tests: {}
				},
				{
					name: "Set objs to empty collection",
					go: function(data){ doSet(data, 'objs', newColl()); },
					tests: {}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {option1:0, option2:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {option2:0, option3:1}
				},
				{
					name: "Insert empty model into objs",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var obj = newObj();
						doSet(obj, 'txt', undefined);
						collAdd(coll, obj);
					},
					tests: {option3:0, option4:1}
				},
				{
					name: "Alter objs[0] to contain A",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 0);
						doSet(el, 'txt', 'A');
					},
					tests: {selA:1}
				},
				{
					name: "Alter objs[2] to contain C",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 2);
						doSet(el, 'txt', 'C');
					},
					tests: {selA:0, selAC:1}
				},
				{
					name: "Alter objs[1] to contain B",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						doSet(el, 'txt', 'B');
					},
					tests: {selAC:0, selABC:1}
				},
				{
					name: "Choose B",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						doSet(data, 'magselval', el);
					},
					tests: {h1:1, h1B:1, valNone:0, valB:1}
				},
				{
					name: "Choose A",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 0);
						doSet(data, 'magselval', el);
					},
					tests: {h1B:0, h1A:1, valB:0, valA:1}
				},
				{
					name: "Choose C",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 2);
						doSet(data, 'magselval', el);
					},
					tests: {h1A:0, h1C:1, valA:0, valC:1}
				},
				{
					name: "Choose nothing",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						doSet(data, 'magselval', void 0);
					},
					tests: {h1:0, h1C:0, valC:0, valNone:1}
				},
				{
					name: "Remove objs[1]",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						coll.remove(el);
					},
					tests: {selABC:0, selAC:1, option4:0, option3:1}
				},
				{
					name: "Alter objs[1] to contain BC",
					go: function(data){
						var coll = PlatterTest.Get(data, 'objs');
						var el = PlatterTest.Get(coll, 1);
						doSet(el, 'txt', 'BC');
					},
					tests: {selAC:0, selABC:1}
				},
				{
					name: "Reset the collection to A,C",
					go: function(data){
						var el1 = newObj();
						doSet(el1, 'txt', 'A');
						var el2 = newObj();
						doSet(el2, 'txt', 'C');
						var coll = PlatterTest.Get(data, 'objs');
						collReset(coll,[el1, el2]);
					},
					tests: {selABC:0, selAC:1}
				},
				{
					name: "Replace objs with plain object",
					go: function(data){ doSet(data, 'objs', [{txt:'A'}, {txt:'BC'}]); },
					tests: {selAC:0, selABC:1}
				},
				{
					name: "Replace objs with garbage",
					go: function(data){ doSet(data, 'objs', 'garbage'); },
					tests: {selABC:0, option3:0, option1:1}
				}
			]
		}
	];

	// TODO: Events (add/remove/count/parameters)
	// TODO: oninput="{{<>blah}}"
	// TODO: value="{{<>blah}}"


	function dotest(def) {
		test(def.name, function(){
			startsubs = PlatterTest.Internal.SubsCount
			ok(testdiv.innerHTML=='', 'test div is empty');
			var undo = new PlatterTest.Undo();
			var totest = copyFrom(def.testsstart);
			var model = def.init?def.init():newObj();
			var tmpl = PlatterTest.Dynamic.compile(def.template);
			var divs = [];
			var addDiv = function(){
				var div = document.createElement('div');
				testdiv.appendChild(div);
				div.appendChild(tmpl.run(model, undo).docfrag);
				divs.push(div);
			}
			var runTests = function(actioni){
				for (var i=0; i<divs.length; ++i)
					for (var t in def.tests)
						if (def.tests.hasOwnProperty(t))
							def.tests[t][totest[t]?0:1](divs[i], actioni+"."+i);
			};
			addDiv();
			runTests('pre');

			for (var i=0; i<def.actions.length; ++i) {
				var action = def.actions[i];
				action.go(model);
				addDiv();
				ok(true, action.name);
				totest = copyFrom(totest, action.tests);
				runTests(i);
			}

			undo.undo();
			testdiv.innerHTML = '';
			equal(PlatterTest.Internal.SubsCount, startsubs, "Events all gone");
		});
	}

	for (var i=0; i<bbtests.length; ++i)
		dotest(bbtests[i]);

	var commoneventbit = function(tpl, data, o) {
		var runthis = false;
		var runev = null;
		function dorun(ev){runthis = this; runev = ev;};
		doSet(o, 'a', dorun);
		doSet(o, 'b', 20);
		doSet(o, 'c', 30);
		doSet(o, 'd', '');
		var tplrun = tpl.run(data);
		var div = tplrun.el;
		ok(!runthis, "Event not yet run");
		ok(!runev, "Event not yet run");
		equal(PlatterTest.Get(o, 'b'), 20, "Correct initial b");
		equal(PlatterTest.Get(o, 'c'), 30, "Correct initial c");
		equal(PlatterTest.Get(o, 'd'), '', "Correct initial d");

		$(div).trigger('foo');
		equal(runthis, o, "Correct this for event");
		ok(runev, "There was an event object");

		$(div).trigger('up');
		equal(PlatterTest.Get(o, 'b'), 21, "Increment b worked");
		$(div).trigger('up');
		equal(PlatterTest.Get(o, 'b'), 22, "Increment b worked again");
		$(div).trigger('down');
		equal(PlatterTest.Get(o, 'b'), 21, "Decrement b worked");
		$(div).trigger('down');
		equal(PlatterTest.Get(o, 'b'), 20, "Decrement b worked again");

		$(div).trigger('up2');
		equal(PlatterTest.Get(o, 'c'), 31, "Increment c worked");
		$(div).trigger('up2');
		equal(PlatterTest.Get(o, 'c'), 32, "Increment c worked again");
		$(div).trigger('down2');
		equal(PlatterTest.Get(o, 'c'), 31, "Decrement c worked");
		$(div).trigger('down2');
		equal(PlatterTest.Get(o, 'c'), 30, "Decrement c worked again");

		$(div).trigger('put');
		equal(PlatterTest.Get(o, 'd'), 'bar', "Value-grabbing worked");

		tplrun.undo();
	}

	test("Mark: element", function(){
		var tpl = PlatterTest.Dynamic.compile("<h1>bo{{#element boo}}b</h1>");
		var o = newObj();
		doSet(o, 'boo', undefined);
		var df = tpl.run(o).docfrag;
		equal($(df.firstChild).text(), "bob", "Initially bob");
		doSet(o, 'boo', document.createTextNode("bom"));
		equal($(df.firstChild).text(), "bobomb", "Then bobomb");
		var span = document.createElement("span");
		span.innerHTML="inner";
		doSet(o, 'boo', span);
		equal($(df.firstChild).html().toLowerCase(), "bo<span>inner</span>b", "Then boinnerb");
	});

	test("Event-handlers", function(){
		var tpl = PlatterTest.Dynamic.compile('<input type="text" value="bar" onfoo="{{a}}" onup="{{++b}}" ondown="{{--b}}" onup2="{{++c}}" ondown2="{{--c}}" onput="{{<>d}}"/>');
		var o = newObj();
		commoneventbit(tpl, o, o);
	});

	test("Event-handlers nested props", function(){
		var tpl = PlatterTest.Dynamic.compile('<input type="text" value="bar" onfoo="{{z.a}}" onup="{{++z.b}}" ondown="{{--z.b}}" onup2="{{++z.c}}" ondown2="{{--z.c}}" onput="{{<>z.d}}"/>');
		var o = newObj();
		commoneventbit(tpl, {z:o}, o);
	});

	test("Subscriptions for collections", function(){
		var tpl = PlatterTest.Dynamic.compile('<div>{{#foreach .}}a{{/foreach}}</div>');
		var c = newColl();
		collReset(c, [{}, {}]);
		var sub1 = PlatterTest.Internal.SubsCount;
		var df = tpl.run(c).docfrag;
		equal($(df.firstChild).text(), "aa", "Two elements work");
		var sub2 = PlatterTest.Internal.SubsCount;
		notEqual(sub2, sub1, "Sub-count changed on template-run");
		collReset(c, [{}, {}]);
		equal($(df.firstChild).text(), "aa", "Two elements reset work");
		var sub3 = PlatterTest.Internal.SubsCount;
		equal(sub3, sub2, "Sub-count unchanged on reset");
	});
}