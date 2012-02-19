//Generated file: Compilation/concatenation of platter.core.coffee, platter.core.codegen.cofee, platter.plain.coffee, platter.dynamic.coffee, platter.dynamic.backbone.coffee

(function(undefined){
///platter.core.coffee
var templateCompiler, templateRunner, undoer;

templateRunner = (function() {

  function templateRunner(node) {
    this.node = node;
  }

  templateRunner.prototype.removeBetween = function(startel, endel) {
    var par, prev;
    par = startel.parentNode;
    prev = void 0;
    while ((prev = endel.previousSibling) !== startel) {
      par.removeChild(prev);
    }
    return;
  };

  templateRunner.prototype.runEvent = function(el, ev, fn) {
    el.addEventListener(ev, fn);
    return $undo.add(function() {
      return el.removeEventListener(ev, fn);
    });
  };

  return templateRunner;

})();

templateCompiler = (function() {

  function templateCompiler() {}

  templateCompiler.prototype.makeRet = function(node) {
    return new templateRunner(node);
  };

  templateCompiler.prototype.compile = function(txt) {
    return this.compileFrag(this.tmplToFrag(txt));
  };

  templateCompiler.prototype.compileFrag = function(frag) {
    var js, jsData, jsEl, ret;
    js = new platter.internal.codegen;
    jsData = 'data';
    js.existingVar(jsData);
    jsEl = js.addVar('el', 'this.node.cloneNode(true)');
    ret = this.makeRet(frag);
    this.compileInner(ret, frag, js, jsEl, jsData);
    js.addExpr("return #" + jsEl + "#");
    ret.run = new Function('data', "" + js);
    return ret;
  };

  templateCompiler.prototype.compileInner = function(ret, cur, js, jsEl, jsData) {
    var att, ct, ev, isSpecial, jsCur, n, n2, txt, v, _i, _j, _len, _len2, _ref, _ref2, _ref3, _results;
    jsCur = js.addVar(jsEl + "_ch", "#" + jsEl + "#.firstChild");
    cur = cur.firstChild;
    _results = [];
    while (cur) {
      if (cur.nodeType === 1) {
        isSpecial = false;
        _ref = cur.attributes;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          att = _ref[_i];
          n = att.nodeName;
          if (this["special_" + n]) {
            isSpecial = true;
            v = att.nodeValue;
            v = v.replace(/<!--\{\{/g, "{{");
            v = v.replace(/\}\}-->/g, "}}");
            cur.removeAttribute(n);
            _ref2 = this["special_" + n](ret, js, cur, jsCur, jsEl, jsData, v), cur = _ref2[0], jsCur = _ref2[1];
            break;
          }
        }
        if (!isSpecial) {
          _ref3 = cur.attributes;
          for (_j = 0, _len2 = _ref3.length; _j < _len2; _j++) {
            att = _ref3[_j];
            if (/<!--\{\{/.exec(att.nodeValue)) {
              n = att.nodeName;
              v = att.nodeValue;
              v = v.replace(/<!--\{\{/g, "{{");
              v = v.replace(/\}\}-->/g, "}}");
              if (n[0] === 'o' && n[1] === 'n') {
                ev = n.substr(2);
                this.escapesReplace(v, function(t) {
                  return js.addExpr("this.runEvent(#" + jsCur + "#, '" + ev + "', function(ev){ return data." + t + "(ev, '" + ev + "', #" + jsCur + "#); })");
                });
              } else {
                n2 = this.assigners[n] ? n : '#default';
                this.doSimple(ret, js, jsCur, n, v, this.assigners[n2]);
              }
            }
          }
          this.compileInner(ret, cur, js, jsCur);
        }
      } else if (cur.nodeType === 8) {
        ct = cur.nodeValue;
        if (/^\{\{.*\}\}$/.exec(ct)) {
          txt = document.createTextNode();
          cur.parentNode.insertBefore(txt, cur);
          cur.parentNode.removeChild(cur);
          cur = txt;
          this.doSimple(ret, js, jsCur, 'text', ct, this.assigners['#text']);
        }
      }
      jsCur = js.addVar("" + jsEl + "_ch", "#" + jsCur + "#.nextSibling");
      _results.push(cur = cur.nextSibling);
    }
    return _results;
  };

  templateCompiler.prototype.special_if = function(ret, js, cur, jsCur, jsEl, jsData, val) {
    var frag, inner, jsPost, post, pre;
    pre = document.createComment("");
    post = document.createComment("");
    cur.parentNode.insertBefore(pre, cur);
    cur.parentNode.insertBefore(post, cur);
    frag = document.createDocumentFragment();
    frag.appendChild(cur);
    inner = this.compileFrag(frag);
    jsPost = js.addVar("" + jsCur + "_end", "#" + jsCur + "#.nextSibling");
    this.doIf(ret, js, pre, jsCur, post, jsPost, jsEl, jsData, val, inner);
    return [post, jsPost];
  };

  templateCompiler.prototype.special_foreach = function(ret, js, cur, jsCur, jsEl, jsData, val) {
    var frag, inner, jsPost, post, pre;
    pre = document.createComment("");
    post = document.createComment("");
    cur.parentNode.insertBefore(pre, cur);
    cur.parentNode.insertBefore(post, cur);
    frag = document.createDocumentFragment();
    frag.appendChild(cur);
    inner = this.compileFrag(frag);
    jsPost = js.addVar("" + jsCur + "_end", "#" + jsCur + "#.nextSibling");
    this.doForEach(ret, js, pre, jsCur, post, jsPost, jsEl, jsData, val, inner);
    return [post, jsPost];
  };

  templateCompiler.prototype.tmplToFrag = function(txt) {
    txt = txt.replace(/\{\{/g, "<!--{{");
    txt = txt.replace(/\}\}/g, "}}-->");
    return this.htmlToFrag(txt).cloneNode(true).cloneNode(true);
  };

  templateCompiler.prototype.htmlToFrag = function(html) {
    var depth, el, firsttag, frag, wrap;
    firsttag = /<(\w+)/.exec(html)[1].toLowerCase();
    wrap = this.nodeWraps[firsttag] || this.nodeWraps['#other'];
    el = document.createElement("div");
    el.innerHTML = wrap[1] + html + wrap[2];
    depth = wrap[0];
    while (depth--) {
      el = el.firstChild;
    }
    frag = document.createDocumentFragment();
    while (el.firstChild) {
      frag.appendChild(el.firstChild);
    }
    return frag;
  };

  templateCompiler.prototype.nodeWraps = {
    '#other': [4, '<table><tbody><tr><td>', '</td></tr></tbody></table>'],
    td: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
    tr: [2, '<table><tbody>', '</tbody></table>'],
    tbody: [1, '<table>', '</table>'],
    tfoot: [1, '<table>', '</table>'],
    thead: [1, '<table>', '</table>'],
    option: [1, '<select multiple="multiple">', '</select>'],
    optgroup: [1, '<select multiple="multiple">', '</select>'],
    li: [1, '<ul>', '</ul>'],
    legend: [1, '<fieldset>', '</fieldset>']
  };

  templateCompiler.prototype.escapesReplace = function(txt, fn) {
    var escape, last, m, s;
    escape = /\{\{(.*?)\}\}/g;
    m = void 0;
    last = 0;
    s = "";
    while (m = escape.exec(txt)) {
      if (m.index > last) {
        s += '+"' + txt.substring(last, m.index).replace(/[\\\"]/g, "\\$1") + '"';
      }
      s += '+' + fn(m[1]);
      last = m.index + m[0].length;
    }
    if (last < txt.length) {
      s += '+"' + txt.substring(last, txt.length).replace(/[\\\"]/g, "\\$1") + '"';
    }
    return s.slice(1);
  };

  templateCompiler.prototype.assigners = {
    '#text': "#el#.nodeValue = #v#",
    '#default': "#el#.setAttribute(#n#, #v#)",
    'class': "#el#.className = #v#"
  };

  return templateCompiler;

})();

undoer = (function() {

  undoer.prototype.cur = {
    push: function() {}
  };

  function undoer() {
    this.stack = [];
  }

  undoer.prototype.add = function(fn) {
    return this.cur.push(fn);
  };

  undoer.prototype.start = function() {
    this.stack.push(this.cur);
    return this.cur = [];
  };

  undoer.prototype.claim = function() {
    var cur;
    cur = this.cur;
    this.cur = this.stack.pop();
    return function() {
      var fn, _i, _len;
      for (_i = 0, _len = cur.length; _i < _len; _i++) {
        fn = cur[_i];
        fn();
      }
      return cur = [];
    };
  };

  return undoer;

})();

this.$undo = new undoer;

this.platter = {
  internal: {
    templateCompiler: templateCompiler,
    templateRunner: templateRunner
  }
};

///platter.core.codegen.coffeee
var codegen, exprvar;

exprvar = /#(\w+)#/g;

codegen = (function() {

  function codegen() {
    this._code = [];
    this._vars = {};
  }

  codegen.prototype.existingVar = function(name) {
    return this._vars[name] = {
      _name: name,
      _count: 1000
    };
  };

  codegen.prototype.forceVar = function(name) {
    return this._vars[name]._count = 1000;
  };

  codegen.prototype.addVar = function(name, expr) {
    name = this._uniqName(name);
    this._vars[name] = {
      _name: name,
      _count: -1,
      _expr: expr
    };
    this.addOp({
      _expr: "var #" + name + "# = " + expr,
      _type: 'var',
      _src: expr,
      _name: name
    });
    return name;
  };

  codegen.prototype.addExpr = function(expr) {
    return this.addOp({
      _expr: expr
    });
  };

  codegen.prototype.addOp = function(op) {
    var _this = this;
    op._expr.replace(exprvar, function($0, $1) {
      return _this._vars[$1]._count++;
    });
    return this._code.push(op);
  };

  codegen.prototype.toString = function() {
    var code, i, op, rep, s, sub, varreps, varsub, _i, _len, _ref;
    s = "";
    varsub = {};
    varreps = {};
    sub = function(expr) {
      return expr.replace(exprvar, function($0, $1) {
        return varsub[$1] = (varsub[$1] || 0) + 1;
      });
    };
    rep = function(expr) {
      return expr.replace(exprvar, function($0, $1) {
        return varreps[$1] || $1;
      });
    };
    code = this._code.slice(0);
    for (i = _ref = code.length - 1; i >= 0; i += -1) {
      op = code[i];
      if (op._type === 'var' && this._vars[op._name]._count - (varsub[op._name] || 0) === 0) {
        code[i] = void 0;
        sub(op._src);
      }
    }
    for (_i = 0, _len = code.length; _i < _len; _i++) {
      op = code[_i];
      if (op) {
        if (op._type === 'var' && this._vars[op._name]._count - (varsub[op._name] || 0) === 1) {
          varreps[op._name] = rep(op._src);
        } else {
          s += rep(op._expr) + ";\n";
        }
      }
    }
    return s;
  };

  codegen.prototype._uniqName = function(name) {
    var c;
    if (this._vars[name]) {
      c = (this._vars[name]._lastNum || 1) + 1;
      while (this._vars[name + c]) {
        ++c;
      }
      this._vars[name]._lastNum = c;
      name = name + c;
    }
    return name;
  };

  return codegen;

})();

platter.internal.codegen = codegen;


///platter.plain.coffee
var plainCompiler,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

plainCompiler = (function(_super) {

  __extends(plainCompiler, _super);

  function plainCompiler() {
    plainCompiler.__super__.constructor.apply(this, arguments);
  }

  plainCompiler.prototype.doSimple = function(ret, js, jsCur, n, v, expr) {
    return js.addExpr(expr.replace("#el#", "#" + jsCur + "#").replace("#n#", "'" + n + "'").replace("#v#", this.escapesReplace(v, function(t) {
      if (t === '.') {
        return "data";
      } else {
        return "data." + t;
      }
    })));
  };

  plainCompiler.prototype.doIf = function(ret, js, pre, jsCur, post, jsPost, jsEl, jsData, val, inner) {
    var _this = this;
    ret[jsCur] = inner;
    val = this.escapesReplace(val, function(t) {
      return ("#" + jsData + "#.") + t;
    });
    return js.addExpr("if (" + val + ") #" + jsEl + "#.insertBefore(this." + jsCur + ".run(#" + jsData + "#), #" + jsPost + "#)");
  };

  plainCompiler.prototype.doForEach = function(ret, js, pre, jsCur, post, jsPost, jsEl, jsData, val, inner) {
    var jsFor,
      _this = this;
    ret[jsCur] = inner;
    val = this.escapesReplace(val, function(t) {
      return "data." + t;
    });
    jsFor = js.addVar("" + jsCur + "_for", val);
    js.forceVar(jsPost);
    return js.addExpr("for (var i=0;i<#" + jsFor + "#.length; ++i)\n	#" + jsEl + "#.insertBefore(this." + jsCur + ".run(#" + jsFor + "#[i]), #" + jsPost + "#)");
  };

  return plainCompiler;

})(platter.internal.templateCompiler);

platter.internal.plainCompiler = plainCompiler;

platter.plain = new plainCompiler;


///platter.dynamic.coffee
var dynamicCompiler, dynamicRunner,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

dynamicRunner = (function(_super) {

  __extends(dynamicRunner, _super);

  function dynamicRunner() {
    dynamicRunner.__super__.constructor.apply(this, arguments);
  }

  dynamicRunner.prototype.runIf = function(fn, data, extra, tmpl, start, end) {
    var onchange, shown, undo,
      _this = this;
    shown = false;
    undo = null;
    $undo.add(function() {
      if (undo) return undo();
    });
    onchange = function() {
      var show;
      show = !!fn();
      if (shown === show) return;
      shown = show;
      if (show) {
        $undo.start();
        end.parentNode.insertBefore(tmpl.run(data), end);
        return undo = $undo.claim();
      } else {
        _this.removeBetween(start, end);
        undo();
        return undo = null;
      }
    };
    return this.runGet(onchange, data, ev);
  };

  dynamicRunner.prototype.runForEach = function(coll, tmpl, start, end) {
    var add, ends, par, rem, undo,
      _this = this;
    ends = [start, end];
    undo = [];
    par = start.parentNode;
    add = function(model, coll, opts) {
      var at, newend;
      at = opts.index;
      newend = document.createComment("");
      ends.splice(at + 1, 0, newend);
      par.insertBefore(newend, ends[at].nextSibling);
      $undo.start();
      par.insertBefore(tmpl.run(model), newend);
      return undo.splice(at, 0, $undo.claim());
    };
    rem = function(model, coll, opts) {
      var at;
      at = opts.index;
      _this.removeBetween(ends[at], ends[at + 1].nextSibling);
      ends.splice(at + 1, 1);
      undo[at]();
      return undo.splice(at, 1);
    };
    this.watchCollection(coll, add, rem);
    return $undo.add(function() {
      var undoer, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = undo.length; _i < _len; _i++) {
        undoer = undo[_i];
        _results.push(undoer());
      }
      return _results;
    });
  };

  return dynamicRunner;

})(platter.internal.templateRunner);

dynamicCompiler = (function(_super) {

  __extends(dynamicCompiler, _super);

  function dynamicCompiler() {
    dynamicCompiler.__super__.constructor.apply(this, arguments);
  }

  dynamicCompiler.prototype.makeRet = function(node) {
    return new dynamicRunner(node);
  };

  dynamicCompiler.prototype.doSimple = function(ret, js, jsCur, n, v, expr) {
    var safen;
    safen = n.replace(/[^a-z0-9$_]/g, "");
    expr = expr.replace("#el#", "#" + jsCur + "#").replace("#n#", "'" + n + "'").replace("#v#", this.convertVal(v));
    return js.addExpr("this.runGet(function(){\n\t" + expr + ";\n}, data, " + (this.extraParam(v)) + ")");
  };

  dynamicCompiler.prototype.doIf = function(ret, js, pre, jsPre, post, jsPost, jsEl, jsData, val, inner) {
    var v;
    ret[jsPre] = inner;
    v = val;
    val = this.convertVal(val);
    return js.addExpr("this.runIf(function(){return " + val + ";}, #" + jsData + "#, " + (this.extraParam(v)) + ", this." + jsPre + ", #" + jsPre + "#, #" + jsPost + "#)");
  };

  dynamicCompiler.prototype.doForEach = function(ret, js, pre, jsPre, post, jsPost, jsEl, jsData, val, inner) {
    var v;
    ret[jsPre] = inner;
    v = val;
    val = this.convertColl(val);
    return js.addExpr("this.runForEach(" + val + ", this." + jsPre + ", #" + jsPre + "#, #" + jsPost + "#)");
  };

  dynamicCompiler.prototype.convertColl = function(txt) {
    return this.escapesReplace(txt, function(t) {
      return "data." + t;
    });
  };

  return dynamicCompiler;

})(platter.internal.templateCompiler);

platter.internal.dynamicRunner = dynamicRunner;

platter.internal.dynamicCompiler = dynamicCompiler;


///platter.dynamic.backbone.coffee
var backboneCompiler, backboneRunner,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

if (!Backbone.Model.prototype.hasKey) {
  Backbone.Model.prototype.hasKey = function(n) {
    return this.attributes.hasOwnProperty(n);
  };
}

backboneRunner = (function(_super) {

  __extends(backboneRunner, _super);

  function backboneRunner() {
    backboneRunner.__super__.constructor.apply(this, arguments);
  }

  backboneRunner.prototype.runGet = function(fn, data, ev) {
    data.on(ev, fn);
    $undo.add(function() {
      return data.off(ev, fn);
    });
    return fn();
  };

  backboneRunner.prototype.watchCollection = function(coll, add, rem) {
    var i, _ref;
    coll.on('add', add);
    coll.on('remove', rem);
    for (i = 0, _ref = coll.length - 1; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
      add(coll.at(i), coll, {
        index: i
      });
    }
    return $undo.add(function() {
      coll.off('add', add);
      return coll.off('remove', rem);
    });
  };

  backboneRunner.prototype.fetchVal = function(data, ident) {
    var ret;
    if (data.hasKey(ident)) {
      return data.get(ident);
    } else {
      ret = data[ident];
      if (typeof ret === 'function') {
        return ret();
      } else {
        return ret;
      }
    }
  };

  return backboneRunner;

})(platter.internal.dynamicRunner);

backboneCompiler = (function(_super) {

  __extends(backboneCompiler, _super);

  function backboneCompiler() {
    backboneCompiler.__super__.constructor.apply(this, arguments);
  }

  backboneCompiler.prototype.makeRet = function(node) {
    return new backboneRunner(node);
  };

  backboneCompiler.prototype.convertVal = function(txt) {
    return this.escapesReplace(txt, function(t) {
      return "data.get('" + t + "')";
    });
  };

  backboneCompiler.prototype.extraParam = function(txt) {
    var ev, seen;
    seen = {};
    ev = [];
    this.escapesReplace(txt, function(t) {
      if (!seen[t]) {
        seen[t] = 1;
        return ev.push("change:" + t);
      }
    });
    return "'" + (ev.join(" ")) + "'";
  };

  return backboneCompiler;

})(platter.internal.dynamicCompiler);

platter.internal.backboneRunner = backboneRunner;
platter.internal.backboneCompiler = backboneCompiler;
platter.backbone = new backboneCompiler;

}())