# Warning

This repo is incomplete. It's suitable for the very few users it has, but requires more work for a wider release. There are so many templating solutions out there. If you want to use this one, get in touch; if there's enough demand, I'll do more on it.

# Platter

A compiled-template engine that supports backbone and should eventually support many reactive frameworks. It supports reactivity while still using natural HTML syntax.

There are still a number of missing features.

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
var template = Platter.Plain.compile(ttext);
var data = {title: "This is the title", blah: []};
for (var i=0;Math.random()*5>i;++i)
	data.blah.push({class:'row'+i, name:'Name '+Math.random(), click:function(){alert(1);}});
var els = template.run(data).docfrag;
document.body.appendChild(els);
```

```javascript
var template = Platter.Dynamic.compile(ttext);
var data = new Backbone.Model();
data.set({title: "This is the title"});
data.blah = new Backbone.Collection();
for (var i=0;Math.random()*5>i;++i) {
	var row = new Backbone.Model();
	row.set({class:'row'+i, name:'Name '+Math.random()});
	row.click=function(){alert(2);};
	data.blah.add(row);
}
var els = template.run(data).docfrag;
document.body.appendChild(els);
```

To safely remove the template and all of the effects, including the all of the event handlers, call the undo method of the result:

```javascript
var t = template.run(data);
document.body.appendChild(t.docfrag);
t.undo();
```

