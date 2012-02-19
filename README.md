# Platter

A compiled-template engine that supports backbone and should eventually support many reactive frameworks. It supports reactivity while still using natural HTML syntax.

Currently requires you to supply coffee-script.js in the same folder and to serve it from a web server (since browser-based coffeescript doesn't work on local files). There's a usage example in templatetest.html, but here's a template and a couple of example usages:

```javascript
var ttext = '\
	<h1>{{title}}</h1>\n\
	<ul>\n\
		<li class="before">This is before the list</li>\n\
		<li foreach="{{blah}}" class="{{class}} within" onclick="{{click}}">{{name}}</li>\n\
		<li class="after">This is after the list</li>\n\
	</ul>\n\
';
```

```javascript
var template = platter.plain.compile(ttext);
var data = {title: "This is the title", blah: []};
for (var i=0;Math.random()*5>i;++i)
	data.blah.push({class:'row'+i, name:'Name '+Math.random(), click:function(){alert(1);}});
var els = template.run(data);
document.body.appendChild(els);
```

```javascript
var template = platter.backbone.compile(ttext);
var data = new Backbone.Model();
data.set({title: "This is the title"});
data.blah = new Backbone.Collection();
for (var i=0;Math.random()*5>i;++i) {
	var row = new Backbone.Model();
	row.set({class:'row'+i, name:'Name '+Math.random()});
	row.click=function(){alert(2);};
	data.blah.add(row);
}
var els = template.run(data);
document.body.appendChild(els);
```