# Platter

A compiled-template engine that supports backbone and should eventually support many reactive frameworks. It supports reactivity while still using natural HTML syntax.

__This is not suitable for production use.__ Mainly because there's not yet a test suite.

There's a usage example in example.html, but here's a template and a couple of example usages:

```html
<h1>{{title}}</h1>
<ul>
  <li class="before">This is before the list</li>
  <li foreach="{{blah}}" class="{{class}} within" onclick="{{click}}">{{name}}</li>
  <li class="after">This is after the list</li>
</ul>
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

Undoing a template is currently slightly long-winded. Basically, create it like this:
```javascript
$undo.start();
template.run(data);
var undoer = $undo.claim();
```

And then run ```undoer``` to undo all of the template's effects (that will also remove its nodes from wherever they've been put).
