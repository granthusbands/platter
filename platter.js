(function() {
  var backboneCompiler, backboneRunner, clean, codegen, commentEscapes, defaultRunEvent, dynamicCompiler, dynamicRunner, exprvar, hasEscape, hideAttr, isEvent, plainCompiler, plainRunner, pullNode, runDOMEvent, runJQueryEvent, str, templateCompiler, templateRunner, trim, uncommentEscapes, undoer, unhideAttr, unhideAttrName,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  runDOMEvent = function(el, ev, fn) {
    el.addEventListener(ev, fn);
    return $undo.add(function() {
      return el.removeEventListener(ev, fn);
    });
  };

  runJQueryEvent = function(el, ev, fn) {
    jQuery(el).on(ev, fn);
    return $undo.add(function() {
      return jQuery(el).off(ev, fn);
    });
  };

  defaultRunEvent = runDOMEvent;

  if (window.jQuery) defaultRunEvent = runJQueryEvent;

  templateRunner = (function() {

    function templateRunner(node) {
      this.node = node;
    }

    templateRunner.prototype.removeBetween = function(startel, endel) {
      var par, prev;
      par = startel.parentNode;
      if (!par) return;
      prev = void 0;
      while ((prev = endel.previousSibling) !== startel) {
        par.removeChild(prev);
      }
      return;
    };

    templateRunner.prototype.runEvent = defaultRunEvent;

    templateRunner.prototype.removeAll = function(startel, endel) {
      var par;
      this.removeBetween(startel, endel);
      par = startel.parentNode;
      if (!par) return;
      par.removeChild(endel);
      return par.removeChild(startel);
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
      var js, jsAutoRemove, jsData, jsEl, jsFirstChild, jsLastChild, jsSelf, ret;
      js = new platter.internal.codegen;
      jsData = js.existingVar('data');
      jsAutoRemove = js.existingVar('autoRemove');
      jsEl = js.addVar('el', 'this.node.cloneNode(true)', frag);
      ret = this.makeRet(frag);
      this.compileInner(ret, js, jsEl, jsData);
      jsFirstChild = js.addForcedVar("firstChild", "" + jsEl + ".firstChild");
      jsLastChild = js.addForcedVar("lastChild", "" + jsEl + ".lastChild");
      jsSelf = js.addForcedVar("self", "this");
      js.addExpr("if (" + jsAutoRemove + "===true||" + jsAutoRemove + "==null)\n	$undo.add(function(){\n		" + jsSelf + ".removeAll(" + jsFirstChild + ", " + jsLastChild + ");\n	});");
      if (jsEl.v.firstChild === jsEl.v.lastChild) {
        js.addExpr("return " + jsFirstChild);
      } else {
        js.addExpr("return " + jsEl);
      }
      ret.run = new Function('data', 'autoRemove', "" + js);
      return ret;
    };

    templateCompiler.prototype.compileInner = function(ret, js, jsEl, jsData) {
      var att, attrs, ct, isSpecial, jsCur, n, n2, realn, txt, v, _i, _j, _len, _len2, _ref, _ref2, _results;
      jsCur = js.addVar(jsEl + "_ch", "" + jsEl + ".firstChild", jsEl.v.firstChild);
      js.forceVar(jsCur);
      _results = [];
      while (jsCur.v) {
        if (jsCur.v.nodeType === 1) {
          isSpecial = false;
          attrs = (function() {
            var _i, _len, _ref, _results2;
            _ref = jsCur.v.attributes;
            _results2 = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              att = _ref[_i];
              _results2.push({
                n: att.nodeName,
                realn: unhideAttrName(att.nodeName),
                v: uncommentEscapes(unhideAttr(att.nodeValue))
              });
            }
            return _results2;
          })();
          if (jsCur.v.tagName.toLowerCase() === 'textarea' && hasEscape(jsCur.v.value)) {
            attrs.push({
              n: 'value',
              realn: 'value',
              v: uncommentEscapes(unhideAttr(jsCur.v.value))
            });
          }
          for (_i = 0, _len = attrs.length; _i < _len; _i++) {
            _ref = attrs[_i], n = _ref.n, realn = _ref.realn, v = _ref.v;
            if (realn && this["special_" + realn]) {
              isSpecial = true;
              jsCur.v.removeAttribute(n);
              jsCur = this["special_" + realn](ret, js, jsCur, jsData, v);
              break;
            }
          }
          if (!isSpecial) {
            for (_j = 0, _len2 = attrs.length; _j < _len2; _j++) {
              _ref2 = attrs[_j], n = _ref2.n, realn = _ref2.realn, v = _ref2.v;
              if (realn !== n) jsCur.v.removeAttribute(n);
              if (!(hasEscape(v))) {
                jsCur.v.setAttribute(realn, v);
              } else {
                if (isEvent(realn)) {
                  this.doEvent(ret, js, jsCur, jsData, realn, v);
                } else {
                  n2 = this.assigners[realn] ? realn : '#default';
                  this.doSimple(ret, js, jsCur, jsData, realn, v, this.assigners[n2]);
                }
              }
            }
            this.compileInner(ret, js, jsCur, jsData);
          }
        } else if (jsCur.v.nodeType === 8) {
          ct = jsCur.v.nodeValue;
          ct = unhideAttr(ct);
          if (/^\{\{.*\}\}$/.exec(ct)) {
            txt = document.createTextNode("");
            jsCur.v.parentNode.insertBefore(txt, jsCur.v);
            jsCur.v.parentNode.removeChild(jsCur.v);
            jsCur.v = txt;
            this.doSimple(ret, js, jsCur, jsData, 'text', ct, this.assigners['#text']);
          }
        } else if (jsCur.v.nodeType === 3 || jsCur.v.nodeType === 4) {
          jsCur.v.nodeValue = unhideAttr(jsCur.v.nodeValue);
        }
        _results.push(jsCur = js.addVar("" + jsEl + "_ch", "" + jsCur + ".nextSibling", jsCur.v.nextSibling));
      }
      return _results;
    };

    templateCompiler.prototype.doEvent = function(ret, js, jsCur, jsData, realn, v) {
      var ev;
      ev = realn.substr(2);
      return this.escapesReplace(v, function(t) {
        var jsThis, prop;
        if (t[0] === '>') {
          t = t.substr(1);
          jsThis = js.addVar("" + jsCur + "_this", "this");
          js.forceVar(jsThis);
          if (jsCur.v.type === 'checkbox') {
            prop = 'checked';
          } else {
            prop = 'value';
          }
          return js.addExpr("this.runEvent(" + jsCur + ", '" + ev + "', function(ev){ " + jsThis + ".doSet(" + jsData + ", '" + t + "', " + jsCur + "." + prop + "); })");
        } else {
          return js.addExpr("this.runEvent(" + jsCur + ", '" + ev + "', function(ev){ return " + jsData + "." + t + "(ev, '" + ev + "', " + jsCur + "); })");
        }
      });
    };

    templateCompiler.prototype.special_if = function(ret, js, jsCur, jsData, val) {
      var frag, inner, jsPost, post, _ref;
      _ref = pullNode(jsCur.v), jsCur.v = _ref[0], post = _ref[1], frag = _ref[2];
      inner = this.compileFrag(frag);
      ret[jsCur.n] = inner;
      jsPost = js.addVar("" + jsCur + "_end", "" + jsCur + ".nextSibling", post);
      this.doIf(ret, js, jsCur, jsPost, jsData, val, inner);
      return jsPost;
    };

    templateCompiler.prototype.special_foreach = function(ret, js, jsCur, jsData, val) {
      var frag, inner, jsPost, post, _ref;
      _ref = pullNode(jsCur.v), jsCur.v = _ref[0], post = _ref[1], frag = _ref[2];
      inner = this.compileFrag(frag);
      ret[jsCur.n] = inner;
      jsPost = js.addVar("" + jsCur + "_end", "" + jsCur + ".nextSibling", post);
      this.doForEach(ret, js, jsCur, jsPost, jsData, val, inner);
      return jsPost;
    };

    templateCompiler.prototype.tmplToFrag = function(txt) {
      txt = hideAttr(commentEscapes(trim(txt)));
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
        s += '+platter.str(' + fn(m[1]) + ')';
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
      'class': "#el#.className = #v#",
      'checked': "#el#.checked = !!#v#",
      'value': "#el#.value = #v#"
    };

    return templateCompiler;

  })();

  trim = function(txt) {
    txt = txt.replace(/^\s+/, "");
    return txt = txt.replace(/\s+$/, "");
  };

  hideAttr = function(txt) {
    txt = txt.replace(/([a-z][-a-z0-9_]*=)/ig, "data-platter-$1");
    return txt = txt.replace(/data-platter-type=/g, "type=");
  };

  unhideAttr = function(txt) {
    return txt = txt.replace(/data-platter-([a-z][-a-z0-9_]*=)/g, "$1");
  };

  unhideAttrName = function(txt) {
    return txt = txt.replace(/data-platter-([a-z][-a-z0-9_]*)/g, "$1");
  };

  commentEscapes = function(txt) {
    txt = txt.replace(/\{\{/g, "<!--{{");
    return txt = txt.replace(/\}\}/g, "}}-->");
  };

  uncommentEscapes = function(txt) {
    txt = txt.replace(/<!--\{\{/g, "{{");
    return txt = txt.replace(/\}\}-->/g, "}}");
  };

  hasEscape = function(txt) {
    return !!/\{\{/.exec(txt);
  };

  str = function(o) {
    return o != null ? o : '';
  };

  pullNode = function(node) {
    var frag, post, pre;
    pre = document.createComment("");
    post = document.createComment("");
    node.parentNode.insertBefore(pre, node);
    node.parentNode.insertBefore(post, node);
    frag = document.createDocumentFragment();
    frag.appendChild(node);
    return [pre, post, frag];
  };

  isEvent = function(name) {
    return name[0] === 'o' && name[1] === 'n';
  };

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
    str: str,
    internal: {
      templateCompiler: templateCompiler,
      templateRunner: templateRunner
    }
  };

  clean = function(n) {
    return n.replace(/#/g, "");
  };

  exprvar = /#(\w+)#/g;

  codegen = (function() {

    function codegen() {
      this._code = [];
      this._vars = {};
    }

    codegen.prototype.existingVar = function(name) {
      name = clean(name);
      this._vars[name] = {
        _name: name,
        _count: 1000
      };
      return this.getVar(name);
    };

    codegen.prototype.forceVar = function(name) {
      return this._vars[name.n || name]._count = 1000;
    };

    codegen.prototype.addForcedVar = function(name, expr, compVal) {
      var ret;
      ret = this.addVar(name, expr, compVal);
      this.forceVar(ret);
      return ret;
    };

    codegen.prototype.addVar = function(name, expr, compVal) {
      name = clean(name);
      name = this._uniqName(name);
      this._vars[name] = {
        _name: name,
        _count: -1,
        _expr: expr,
        _compVal: compVal
      };
      this.addOp({
        _expr: "var #" + name + "# = " + expr,
        _type: 'var',
        _src: expr,
        _name: name
      });
      return this.getVar(name);
    };

    codegen.prototype.getVar = function(name) {
      var v;
      v = this._vars[name];
      return {
        n: name,
        v: v._compVal,
        toString: function() {
          return "#" + this.n + "#";
        }
      };
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

  plainRunner = (function(_super) {

    __extends(plainRunner, _super);

    function plainRunner() {
      plainRunner.__super__.constructor.apply(this, arguments);
    }

    plainRunner.prototype.doSet = function(data, n, v) {
      return data[n] = v;
    };

    return plainRunner;

  })(platter.internal.templateRunner);

  plainCompiler = (function(_super) {

    __extends(plainCompiler, _super);

    function plainCompiler() {
      plainCompiler.__super__.constructor.apply(this, arguments);
    }

    plainCompiler.prototype.makeRet = function(node) {
      return new plainRunner(node);
    };

    plainCompiler.prototype.doSimple = function(ret, js, jsCur, jsData, n, v, expr) {
      return js.addExpr(expr.replace("#el#", "" + jsCur).replace("#n#", "'" + n + "'").replace("#v#", this.escapesReplace(v, function(t) {
        if (t === '.') {
          return "" + jsData;
        } else {
          return "" + jsData + "." + t;
        }
      })));
    };

    plainCompiler.prototype.doIf = function(ret, js, jsCur, jsPost, jsData, val, inner) {
      var _this = this;
      val = this.escapesReplace(val, function(t) {
        return ("" + jsData + ".") + t;
      });
      return js.addExpr("if (" + val + ") " + jsPost + ".parentNode.insertBefore(this." + jsCur.n + ".run(" + jsData + ", false), " + jsPost + ")");
    };

    plainCompiler.prototype.doForEach = function(ret, js, jsCur, jsPost, jsData, val, inner) {
      var jsFor,
        _this = this;
      val = this.escapesReplace(val, function(t) {
        return ("" + jsData + ".") + t;
      });
      jsFor = js.addVar("" + jsCur + "_for", val);
      js.forceVar(jsPost);
      return js.addExpr("for (var i=0;i<" + jsFor + ".length; ++i)\n	" + jsPost + ".parentNode.insertBefore(this." + jsCur.n + ".run(" + jsFor + "[i], false), " + jsPost + ")");
    };

    return plainCompiler;

  })(platter.internal.templateCompiler);

  platter.internal.plainRunner = plainRunner;

  platter.internal.plainCompiler = plainCompiler;

  platter.plain = new plainCompiler;

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
          end.parentNode.insertBefore(tmpl.run(data, false), end);
          return undo = $undo.claim();
        } else {
          _this.removeBetween(start, end);
          undo();
          return undo = null;
        }
      };
      return this.runGet(onchange, data, extra);
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
        par.insertBefore(tmpl.run(model, false), newend);
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

    dynamicCompiler.prototype.doSimple = function(ret, js, jsCur, jsData, n, v, expr) {
      var safen;
      safen = n.replace(/[^a-z0-9$_]/g, "");
      expr = expr.replace("#el#", "" + jsCur).replace("#n#", "'" + n + "'").replace("#v#", this.convertVal(v, jsData));
      return js.addExpr("this.runGet(function(){\n\t" + expr + ";\n}, " + jsData + ", " + (this.extraParam(v)) + ")");
    };

    dynamicCompiler.prototype.doIf = function(ret, js, jsPre, jsPost, jsData, val, inner) {
      var v;
      v = val;
      val = this.convertVal(val, jsData);
      return js.addExpr("this.runIf(function(){return " + val + ";}, " + jsData + ", " + (this.extraParam(v)) + ", this." + jsPre + ", " + jsPre + ", " + jsPost + ")");
    };

    dynamicCompiler.prototype.doForEach = function(ret, js, jsPre, jsPost, jsData, val, inner) {
      var v;
      v = val;
      val = this.convertColl(val, jsData);
      return js.addExpr("this.runForEach(" + val + ", this." + jsPre + ", " + jsPre + ", " + jsPost + ")");
    };

    dynamicCompiler.prototype.convertColl = function(txt, jsData) {
      return this.escapesReplace(txt, function(t) {
        return "" + jsData + "." + t;
      });
    };

    return dynamicCompiler;

  })(platter.internal.templateCompiler);

  platter.internal.dynamicRunner = dynamicRunner;

  platter.internal.dynamicCompiler = dynamicCompiler;

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

    backboneRunner.prototype.doSet = function(data, n, v) {
      return data.set(n, v);
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

    backboneCompiler.prototype.convertVal = function(txt, jsData) {
      return this.escapesReplace(txt, function(t) {
        return "" + jsData + ".get('" + t + "')";
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

}).call(this);
