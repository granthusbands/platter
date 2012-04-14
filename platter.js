(function() {

  this.Platter = {
    Internal: {
      SubsCount: 0,
      Subs: {}
    },
    Helper: {}
  };

}).call(this);

(function() {
  var addArraysThroughProto, usedNames;

  usedNames = [];

  addArraysThroughProto = function(ret, o, name) {
    var arr, ent, proto, _i, _len;
    proto = o.constructor.__super__ || o.constructor._super || o.constructor.prototype;
    if (proto && proto !== o) addArraysThroughProto(ret, proto, name);
    arr = o[name];
    if (arr) {
      if (arr.parent) addArraysThroughProto(ret, arr.parent, name);
      for (_i = 0, _len = arr.length; _i < _len; _i++) {
        ent = arr[_i];
        ret.push(ent);
      }
    }
    return ret;
  };

  Platter.Internal.PluginBase = (function() {

    function PluginBase() {}

    PluginBase.prototype.addPluginBase = function(type, details) {
      var name;
      name = "plugins_" + type;
      if (!this.hasOwnProperty(name)) this[name] = [];
      return this[name].push(details);
    };

    PluginBase.prototype.getPlugins = function(type) {
      return addArraysThroughProto([], this, "plugins_" + type);
    };

    PluginBase.UniqueName = function(name) {
      var num;
      name = "plugin_" + name;
      num = '';
      if (usedNames[name]) {
        while (usedNames[name + num]) {
          num = (num || 0) + 1;
        }
      }
      usedNames[name + num] = 1;
      return name + num;
    };

    PluginBase.prototype.addUniqueMethod = function(name, fn) {
      name = Platter.Internal.PluginBase.UniqueName(name);
      this[name] = fn;
      return name;
    };

    return PluginBase;

  })();

}).call(this);

(function() {
  var neverMatch, platterData, platterDataID, sby,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  platterData = {};

  platterDataID = 0;

  sby = function(name) {
    return function(a, b) {
      if (a[name] < b[name]) {
        return 1;
      } else if (a[name] > b[name]) {
        return -1;
      } else {
        return 0;
      }
    };
  };

  Platter.Internal.CompilerState = (function() {

    function CompilerState(clone, parent) {
      this.parent = parent;
      if (clone) {
        this.ret = clone.ret, this.plugins = clone.plugins, this.js = clone.js, this.jsDatas = clone.jsDatas, this.el = clone.el, this.jsEl = clone.jsEl, this.jsSelf = clone.jsSelf;
        this.parent || (this.parent = clone);
      }
      this.afters = [];
    }

    CompilerState.prototype.clone = function() {
      return new Platter.Internal.CompilerState(this);
    };

    CompilerState.prototype.setEl = function(el) {
      this.el = el;
      this._attrs = void 0;
      return this._attrNames = void 0;
    };

    CompilerState.prototype.attrs = function() {
      if (this._attrs) return this._attrs;
      return this._attrs = Platter.AttrList(this.el);
    };

    CompilerState.prototype.attrNames = function() {
      if (this._attrNames) return this._attrNames;
      return this._attrNames = Platter.AttrNames(this.attrs());
    };

    CompilerState.prototype.getAttr = function(n) {
      var _ref;
      return (_ref = this.attrs()[n]) != null ? _ref.v : void 0;
    };

    CompilerState.prototype.getAttrName = function(n) {
      var _ref;
      return (_ref = this.attrs()[n]) != null ? _ref.n : void 0;
    };

    CompilerState.prototype.setAttr = function(n, v) {
      this.attrs();
      if (!this._attrs[n]) {
        this._attrNames = void 0;
        return this._attrs[n] = {
          n: n,
          v: v,
          realn: n
        };
      } else {
        return this._attrs[n].v = v;
      }
    };

    CompilerState.prototype.remAttr = function(n) {
      this.attrs();
      if (this._attrs[n]) {
        delete this._attrs[n];
        return this._attrNames = void 0;
      }
    };

    CompilerState.prototype.getJSElData = function() {
      return this.jsElData || (this.jsElData = this.js.addForcedVar("" + this.jsEl + "_data", "this.createPlatterData(undo, " + this.jsEl + ")"));
    };

    CompilerState.prototype.doAfter = function(fn) {
      return this.afters.push(fn);
    };

    CompilerState.prototype.runAfters = function() {
      var _results;
      _results = [];
      while (this.afters.length) {
        _results.push(this.afters.pop()());
      }
      return _results;
    };

    return CompilerState;

  })();

  Platter.Internal.TemplateRunner = (function(_super) {

    __extends(TemplateRunner, _super);

    function TemplateRunner(node) {
      this.node = node;
    }

    TemplateRunner.prototype.removeBetween = function(startel, endel) {
      var par, prev;
      par = startel.parentNode;
      if (!par) return;
      prev = void 0;
      while ((prev = endel.previousSibling) !== startel) {
        par.removeChild(prev);
      }
      return;
    };

    TemplateRunner.prototype.removeAll = function(startel, endel) {
      var par;
      par = startel.parentNode;
      if (!par) return;
      if (startel === endel) {
        par.removeChild(startel);
        return;
      }
      if (startel.nextSibling !== endel) this.removeBetween(startel, endel);
      par.removeChild(endel);
      return par.removeChild(startel);
    };

    TemplateRunner.prototype.createPlatterData = function(undo, el) {
      var data, id;
      id = el.getAttribute('data-platter');
      if (!id) {
        id = ++platterDataID;
        el.setAttribute('data-platter', id);
        data = platterData[id] = {
          createCount: 1
        };
      } else {
        data = platterData[id];
        ++data.createCount;
      }
      undo.add(function() {
        if (!--data.refCount) {
          el.removeAttribute('data-platter');
          return delete platterData[id];
        }
      });
      return data;
    };

    TemplateRunner.prototype.getPlatterData = function(el) {
      var id;
      id = el.getAttribute('data-platter');
      if (id) {
        return platterData[id];
      } else {
        return;
      }
    };

    return TemplateRunner;

  })(Platter.Internal.PluginBase);

  neverMatch = /^a\bb/;

  Platter.Internal.TemplateCompiler = (function(_super) {

    __extends(TemplateCompiler, _super);

    function TemplateCompiler() {
      TemplateCompiler.__super__.constructor.apply(this, arguments);
    }

    TemplateCompiler.prototype.runner = Platter.Internal.TemplateRunner;

    TemplateCompiler.prototype.compile = function(txt) {
      return this.compileFrag(Platter.Helper.TmplToFrag(txt), 1);
    };

    TemplateCompiler.prototype.compileFrag = function(frag, ctxCnt, parent) {
      var d, i, jsAutoRemove, jsFirstChild, jsLastChild, jsRoot, ps;
      ps = new Platter.Internal.CompilerState;
      if (parent) ps.parent = parent;
      ps.js = new Platter.Internal.CodeGen;
      ps.ret = new this.runner;
      ps.ret.node = frag;
      ps.plugins = {};
      this.extractPlugins(ps.plugins, 'block', '');
      this.extractPlugins(ps.plugins, 'el', 'img');
      ps.jsDatas = [];
      for (i = 0; 0 <= ctxCnt ? i < ctxCnt : i > ctxCnt; 0 <= ctxCnt ? i++ : i--) {
        ps.jsDatas.push(ps.js.existingVar('data' + i));
      }
      ps.js.existingVar('undo');
      jsAutoRemove = ps.js.existingVar('autoRemove');
      ps.jsSelf = ps.js.addForcedVar("self", "this");
      ps.js.addExpr('undo = undo ? undo.child() : new Platter.Undo()');
      jsRoot = ps.jsEl = ps.js.addVar('el', 'this.node.cloneNode(true)');
      ps.el = frag;
      this.compileChildren(ps);
      jsFirstChild = ps.js.addForcedVar("firstChild", "" + jsRoot + ".firstChild");
      jsLastChild = ps.js.addForcedVar("lastChild", "" + jsRoot + ".lastChild");
      ps.js.addExpr("if (" + jsAutoRemove + "===true||" + jsAutoRemove + "==null)\n	undo.add(function(){\n		" + ps.jsSelf + ".removeAll(" + jsFirstChild + ", " + jsLastChild + ");\n	});");
      if (frag.firstChild === frag.lastChild) {
        ps.js.addExpr("return {el: " + jsFirstChild + ", docfrag: " + jsRoot + ", undo: function(){undo.undo()}};");
      } else {
        ps.js.addExpr("return {docfrag: " + jsRoot + ", undo: function(){undo.undo()}};");
      }
      try {
        ps.ret.run = new Function(((function() {
          var _i, _len, _ref, _results;
          _ref = ps.jsDatas;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            d = _ref[_i];
            _results.push(d.n);
          }
          return _results;
        })()).join(', '), 'undo', 'autoRemove', "" + ps.js);
      } catch (e) {
        throw new Error("Internal error: Function compilation failed: " + e.message + "\n\n" + ps.js);
      }
      return ps.ret;
    };

    TemplateCompiler.prototype.extractPlugins = function(ret, name, regflags) {
      var plugs, reg, x;
      plugs = this.getPlugins(name);
      plugs.sort(sby('pri'));
      if (plugs.length === 0) {
        reg = neverMatch;
      } else {
        reg = new RegExp(((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = plugs.length; _i < _len; _i++) {
            x = plugs[_i];
            _results.push(x.regTxt);
          }
          return _results;
        })()).join("|"), regflags);
      }
      ret[name] = plugs;
      return ret["" + name + "Reg"] = reg;
    };

    TemplateCompiler.prototype.doPlugins = function(plugs, n, ps, param) {
      var plug, thisn, _i, _len;
      for (_i = 0, _len = plugs.length; _i < _len; _i++) {
        plug = plugs[_i];
        thisn = (n[plug.type] || n)();
        if (thisn.match(plug.reg)) {
          ps.isHandled = plug.fn(this, ps, param, thisn);
          if (ps.isHandled) return;
        }
      }
      return null;
    };

    TemplateCompiler.prototype.compileChildren = function(ps) {
      var baseName, ch, jsCh, ps2, _results;
      baseName = "" + ps.jsEl;
      ch = ps.el.firstChild;
      jsCh = ps.js.addVar(ps.jsEl + "_ch", "" + ps.jsEl + ".firstChild");
      _results = [];
      while (ch) {
        ps2 = ps.clone();
        ps2.setEl(ch);
        ps2.jsEl = jsCh;
        ps2.js.forceVar(jsCh);
        this.compileElement(ps2);
        jsCh = ps2.js.addVar("" + baseName + "_ch", "" + (ps2.jsPost || ps2.jsEl) + ".nextSibling");
        _results.push(ch = (ps2.post || ps2.el).nextSibling);
      }
      return _results;
    };

    TemplateCompiler.prototype.compileElement = function(ps) {
      var ct, m, n, realn, v, _ref, _ref2;
      ps.isHandled = false;
      if (ps.el.nodeType === 1) {
        if (ps.el.tagName.match(ps.plugins.elReg) || ps.attrNames().match(ps.plugins.elReg)) {
          this.doPlugins(ps.plugins.el, {
            el: (function() {
              return ps.el.tagName;
            }),
            attr: (function() {
              return ps.attrNames();
            })
          }, ps);
        }
        if (!ps.isHandled) {
          _ref = ps.attrs();
          for (realn in _ref) {
            if (!__hasProp.call(_ref, realn)) continue;
            _ref2 = _ref[realn], n = _ref2.n, realn = _ref2.realn, v = _ref2.v;
            if (realn !== n) ps.el.removeAttribute(n);
            if (typeof v === 'function') {
              v(ps, realn);
            } else if (!(Platter.HasEscape(v))) {
              if (realn !== n) ps.el.setAttribute(realn, v);
            } else {
              this.doSimple(ps, realn, v, "#el#.setAttribute(#n#, #v#)");
            }
          }
          if (ps.el.tagName.toLowerCase() !== 'textarea') this.compileChildren(ps);
          return ps.runAfters();
        }
      } else if (ps.el.nodeType === 8) {
        ct = ps.el.nodeValue;
        ct = Platter.UnhideAttr(ct);
        if (m = /^\{\{([#\/])([^\s\}]+)\s*(.*?)\}\}$/.exec(ct)) {
          if (m[1] === '/') throw new Error("Unmatched end-block " + ct);
          if (m[2].match(ps.plugins.blockReg)) {
            this.doPlugins(ps.plugins.block, (function() {
              return m[2];
            }), ps, m[3]);
          }
          if (!ps.isHandled) throw new Error("Unhandled block " + ct);
        }
      } else if (ps.el.nodeType === 3 || ps.el.nodeType === 4) {
        ps.el.nodeValue = Platter.UnhideAttr(ps.el.nodeValue);
        if (ps.el.nodeValue.indexOf('{{') !== -1) {
          return this.doSimple(ps, 'text', ps.el.nodeValue, "#el#.nodeValue = #v#");
        }
      }
    };

    TemplateCompiler.prototype.addExtractorPlugin = function(n, pri, method, extradepth) {
      var fn;
      fn = function(comp, ps, val, bits) {
        var frag;
        ps.pre = bits[0], ps.post = bits[1], frag = bits[2];
        ps.extraScopes = extradepth;
        ps.jsPre = ps.jsEl;
        ps.jsPost = ps.js.addVar("" + ps.jsPre + "_end", "" + ps.jsPre + ".nextSibling", ps.post);
        ps.jsEl = null;
        ps.setEl(frag);
        ps.ret[ps.jsPre.n] = comp.compileFrag(ps.el, ps.jsDatas.length + extradepth, ps);
        comp[method](ps, val);
        return true;
      };
      this.addBlockExtractorPlugin(n, fn);
      return this.addAttrExtractorPlugin(n, pri, fn);
    };

    TemplateCompiler.prototype.addBlockExtractorPlugin = function(n, fn) {
      var fn2, regTxt;
      regTxt = "^(?:" + n + ")$";
      fn2 = function(comp, ps, val, n) {
        return fn(comp, ps, "{{" + val + "}}", Platter.PullBlock(ps.el));
      };
      return this.addPluginBase('block', {
        fn: fn2,
        regTxt: regTxt,
        reg: new RegExp(regTxt),
        pri: 0
      });
    };

    TemplateCompiler.prototype.addElPlugin = function(n, pri, fn) {
      var regTxt;
      regTxt = "^(?:" + n + ")$";
      return this.addPluginBase('el', {
        type: 'el',
        fn: fn,
        regTxt: regTxt,
        reg: new RegExp(regTxt, "i"),
        pri: pri
      });
    };

    TemplateCompiler.prototype.addAttrAssigner = function(n, pri, str) {
      var fn;
      fn = function(comp, ps) {
        var v;
        v = ps.getAttr(n);
        if (Platter.HasEscape(v)) {
          ps.setAttr(n, function(ps, n) {
            return comp.doSimple(ps, n, v, str);
          });
        }
        return false;
      };
      return this.addAttrPlugin(n, pri, fn);
    };

    TemplateCompiler.prototype.addAttrPlugin = function(n, pri, fn) {
      var regTxt;
      regTxt = "^(?:" + n + ")$";
      return this.addPluginBase('el', {
        type: 'attr',
        fn: fn,
        regTxt: regTxt,
        reg: new RegExp(regTxt, "mg"),
        pri: pri
      });
    };

    TemplateCompiler.prototype.addAttrExtractorPlugin = function(n, pri, fn) {
      return this.addAttrPlugin(n, pri, function(comp, ps) {
        var val;
        val = ps.getAttr(n);
        if (!Platter.HasEscape(val)) return;
        ps.el.removeAttribute(ps.getAttrName(n));
        return fn(comp, ps, val, Platter.PullNode(ps.el));
      });
    };

    return TemplateCompiler;

  })(Platter.Internal.PluginBase);

}).call(this);

(function() {
  var chooseData, escapesHandle, jsParser;

  Platter.Trim = function(txt) {
    txt = txt.replace(/^\s+/, "");
    return txt = txt.replace(/\s+$/, "");
  };

  Platter.HideAttr = function(txt) {
    txt = txt.replace(/([a-z][-a-z0-9_]*=)/ig, "data-platter-$1");
    return txt = txt.replace(/data-platter-type=/g, "type=");
  };

  Platter.UnhideAttr = function(txt) {
    return txt = txt.replace(/data-platter-(?!type=)([a-z][-a-z0-9_]*=)/g, "$1");
  };

  Platter.UnhideAttrName = function(txt) {
    return txt = txt.replace(/data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/g, "$1");
  };

  Platter.CommentEscapes = function(txt) {
    return txt = txt.replace(/\{\{([#\/].*?)\}\}/g, "<!--{{$1}}-->");
  };

  Platter.UncommentEscapes = function(txt) {
    return txt = txt.replace(/<!--\{\{([#\/].*?)\}\}-->/g, "{{$1}}");
  };

  Platter.HasEscape = function(txt) {
    return !!/\{\{/.exec(txt);
  };

  Platter.IsPlatterAttr = function(txt) {
    return txt === 'type' || !!/data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/.exec(txt);
  };

  Platter.Str = function(o) {
    if (o != null) {
      return '' + o;
    } else {
      return '';
    }
  };

  escapesHandle = function(txt, tfn, efn) {
    var escape, last, m, ret, v;
    escape = /\{\{(.*?)\}\}/g;
    m = void 0;
    last = 0;
    ret = [];
    while (m = escape.exec(txt)) {
      if (m.index > last) {
        v = tfn(txt.substring(last, m.index));
        if (v != null) ret.push(v);
      }
      v = efn(m[1]);
      if (v != null) ret.push(v);
      last = m.index + m[0].length;
    }
    if (last < txt.length) {
      v = tfn(txt.substring(last, txt.length));
      if (v != null) ret.push(v);
    }
    return ret;
  };

  Platter.EscapesString = function(txt, fn) {
    var ret;
    ret = escapesHandle(txt, Platter.Internal.ToSrc, function(bit) {
      return "Platter.Str(" + (fn(bit)) + ")";
    });
    return ret.join('+');
  };

  Platter.EscapesNoString = function(txt, join, fn) {
    var ret;
    ret = escapesHandle(txt, function(txt) {
      if (/\S/.exec(txt)) throw new Error(txt + " not allowed here");
    }, fn);
    if (ret.length > 1 && !join) throw new Error("Only one escape allowed here");
    return ret.join(join);
  };

  Platter.EscapesStringParse = function(txt, jsDatas, fn) {
    return Platter.EscapesString(txt, jsParser(jsDatas, fn));
  };

  Platter.EscapesNoStringParse = function(txt, join, jsDatas, fn) {
    return Platter.EscapesNoString(txt, join, jsParser(jsDatas, fn));
  };

  chooseData = function(txt, jsDatas) {
    var dots, m;
    m = /^(\.+)(.*?)$/.exec(txt);
    if (!m) return [jsDatas[0], txt];
    dots = m[1].length;
    if (dots > jsDatas.length) throw new Error("" + ex + " has too many dots");
    return [jsDatas[dots - 1], m[2] || '.'];
  };

  jsParser = function(jsDatas, fn) {
    return function(v) {
      var op;
      op = Platter.Internal.JSLikeParse(v, function(ex) {
        var ex2, jsData, _ref;
        _ref = chooseData(ex, jsDatas), jsData = _ref[0], ex2 = _ref[1];
        return "" + fn(ex, ex2, jsData);
      });
      return Platter.Internal.JSLikeUnparse(op);
    };
  };

}).call(this);

(function() {
  var bits, nodeWraps,
    __hasProp = Object.prototype.hasOwnProperty;

  nodeWraps = {
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

  Platter.Helper.HtmlToFrag = function(html) {
    var depth, el, firsttag, frag, wrap;
    firsttag = /<(\w+)/.exec(html)[1].toLowerCase();
    wrap = nodeWraps[firsttag] || nodeWraps['#other'];
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

  Platter.Helper.TmplToFrag = function(txt) {
    txt = Platter.HideAttr(Platter.CommentEscapes(Platter.Trim(txt)));
    return Platter.Helper.HtmlToFrag(txt).cloneNode(true).cloneNode(true);
  };

  Platter.AttrList = function(node) {
    var att, realn, ret, _i, _len, _ref;
    if (Platter.Browser.AttributeIterationBreaksClone) {
      node = node.cloneNode(false);
    }
    ret = {};
    _ref = node.attributes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      att = _ref[_i];
      if (!(Platter.IsPlatterAttr(att.nodeName))) continue;
      realn = Platter.UnhideAttrName(att.nodeName);
      ret[realn] = {
        n: att.nodeName,
        realn: realn,
        v: Platter.UncommentEscapes(Platter.UnhideAttr(att.nodeValue))
      };
    }
    return ret;
  };

  Platter.AttrNames = function(attrList) {
    var n, v;
    return ((function() {
      var _results;
      _results = [];
      for (n in attrList) {
        if (!__hasProp.call(attrList, n)) continue;
        v = attrList[n];
        _results.push(n);
      }
      return _results;
    })()).join('\n');
  };

  Platter.PullNode = function(node) {
    var frag, post, pre;
    pre = document.createComment("");
    post = document.createComment("");
    node.parentNode.insertBefore(pre, node);
    node.parentNode.insertBefore(post, node);
    frag = document.createDocumentFragment();
    frag.appendChild(node);
    return [pre, post, frag];
  };

  bits = /^\{\{([#\/])([^\s\}]*)(.*?)\}\}$/;

  Platter.PullBlock = function(node) {
    var end, frag, m, matched, post, pre, stack;
    end = node;
    stack = [bits.exec(node.nodeValue)[2]];
    while (true) {
      matched = false;
      end = end.nextSibling;
      if (!end) break;
      if (end.nodeType !== 8) continue;
      m = bits.exec(end.nodeValue);
      if (!m) continue;
      if (m[1] === '#') {
        stack.push(m[2]);
        continue;
      }
      while (stack.length && stack[stack.length - 1] !== m[2]) {
        stack.pop();
      }
      if (stack.length && stack[stack.length - 1] === m[2]) {
        matched = true;
        stack.pop();
      }
      if (stack.length === 0) break;
    }
    frag = document.createDocumentFragment();
    while (node.nextSibling !== end) {
      frag.appendChild(node.nextSibling);
    }
    if (matched) end.parentNode.removeChild(end);
    pre = document.createComment("");
    post = document.createComment("");
    node.parentNode.insertBefore(pre, node);
    node.parentNode.insertBefore(post, node);
    node.parentNode.removeChild(node);
    return [pre, post, frag];
  };

}).call(this);

(function() {

  Platter.Undo = (function() {

    function Undo() {
      this.undos = [];
    }

    Undo.prototype.add = function(fn) {
      return this.undos.push(fn);
    };

    Undo.prototype.child = function() {
      var ret;
      ret = new Undo;
      this.add(function() {
        return ret.undo();
      });
      return ret;
    };

    Undo.prototype.undo = function() {
      var _results;
      _results = [];
      while (this.undos.length > 0) {
        _results.push(this.undos.pop()());
      }
      return _results;
    };

    return Undo;

  })();

}).call(this);

(function() {

  Platter.Browser = {};

  (function() {
    var att, div, div2, _i, _len, _ref;
    div = document.createElement('div');
    div.innerHTML = "<div> <span>a</span></div>";
    if (div.firstChild.firstChild === div.firstChild.lastChild) {
      Platter.Browser.BrokenWhitespace = true;
    }
    div.innerHTML = "a";
    div.appendChild(document.createTextNode("b"));
    div = div.cloneNode(true);
    if (div.firstChild === div.lastChild) Platter.Browser.CombinesTextNodes = true;
    div.innerHTML = '<div></div>';
    div2 = div.firstChild;
    _ref = div2.attributes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      att = _ref[_i];
      1;
    }
    div2 = div2.cloneNode(true);
    div2.setAttribute('id', 'b');
    if (div2.getAttributeNode('id') && div2.getAttributeNode('id').nodeValue !== 'b') {
      return Platter.Browser.AttributeIterationBreaksClone = true;
    }
  })();

}).call(this);

(function() {
  var bigDebug, bigDebugRan, stackTrace;

  stackTrace = function() {
    try {
      throw new Error;
    } catch (e) {
      return e.stack;
    }
  };

  bigDebugRan = false;

  bigDebug = function() {
    var o, _i, _len, _ref, _results;
    if (bigDebugRan) return;
    bigDebugRan = true;
    _ref = Platter.Internal.DebugList;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      o = _ref[_i];
      _results.push((function(o) {
        var id, id2, orig, orig2;
        if (o.platter_watch) {
          id = Math.random();
          orig = o.platter_watch.platter_watch;
          o.platter_watch.platter_watch = function(undo, n, fn) {
            Platter.Internal.SubsCount++;
            Platter.Internal.Subs[id] = stackTrace();
            undo.add(function() {
              Platter.Internal.SubsCount--;
              return delete Platter.Internal.Subs[id];
            });
            return orig.call(this, undo, n, fn);
          };
        }
        if (o.platter_watchcoll) {
          id2 = Math.random();
          orig2 = o.platter_watchcoll.platter_watchcoll;
          return o.platter_watchcoll.platter_watchcoll = function(undo, add, remove, replaceMe) {
            Platter.Internal.SubsCount++;
            Platter.Internal.Subs[id2] = stackTrace();
            undo.add(function() {
              Platter.Internal.SubsCount--;
              return delete Platter.Internal.Subs[id2];
            });
            return orig2.call(this, undo, add, remove, replaceMe);
          };
        }
      })(o));
    }
    return _results;
  };

  Platter.Internal.DebugList = [];

  Platter.Internal.BigDebug = bigDebug;

}).call(this);

(function() {
  var e, expropdefs, inopdefs, inopre, inops, jslikeparse, jslikeunparse, n, populate, preopdefs, preopre, preops, specpri, unsupported, valre;

  specpri = 101;

  preopdefs = {
    0.99: "new",
    3: "++ --",
    3.99: "! ~ - + typeof void"
  };

  preopdefs[specpri] = "(";

  inopdefs = {
    1: '[',
    2: '(',
    3: '++ --',
    5: '* / %',
    6: '+ -',
    7: '<< >> >>>',
    8: '< <= > >= in instanceof',
    9: '== != === !==',
    10: '&',
    11: '^',
    12: '|',
    13: '&&',
    14: '||',
    14.99: '?',
    17: ',',
    100: ':'
  };

  expropdefs = {
    100: ') ] ()'
  };

  inopre = /^\s*(\(\)|\)|\]|(?:\binstanceof\b|>>>|===|!==|\bin\b|>=|<=|\+\+|\-\-|==|!=|<<|>>|&&|\|\||\(|\+|\-|\[|\*|\/|<|&|\^|\||%|>|,|:|\?)(?=[^\[\*\/%<>=&\^\|,:\?]|$)|[\+\-\(!~\\\[\*\/%<>=&\^\|,:\?\)\]]+|$)(.*)/;

  preopre = /^\s*(?:(\btypeof\b|\bvoid\b|\bnew\b|\+\+|\-\-|\(|!|~|\-|\+)(?=[^\[\*\/%<>=&\^\|,:\?])|[\[\(\+\-\*\/%<>=!&\^\|,:\?]+)(.*)/;

  valre = /^(?:(\btrue\b|\bfalse\b|\bnull\b)|(\d+\.?\d*(?:e[-+]?\d+)?)|('(?:\\.|[^'])*')|("(?:\\.|[^"])*")|(.*?))\s*((\(\)|\)|\]|(?:\binstanceof\b|>>>|===|!==|\bin\b|>=|<=|\+\+|\-\-|==|!=|<<|>>|&&|\|\||\(|\+|\-|\[|\*|\/|<|&|\^|\||%|>|,|:|\?)(?=[^\[\*\/%<>=&\^\|,:\?]|$)|[\+\-\(!~\\\[\*\/%<>=&\^\|,:\?\)\]]+|$).*)/;

  inops = {};

  preops = {};

  unsupported = {
    alter: function(op) {
      throw new Error(op.txt + " operator not supported");
    }
  };

  populate = function(opdefs, opout) {
    var op, ops, pri, _results;
    _results = [];
    for (pri in opdefs) {
      ops = opdefs[pri];
      ops = ops.split(/\ /g);
      _results.push((function() {
        var _i, _len, _results2;
        _results2 = [];
        for (_i = 0, _len = ops.length; _i < _len; _i++) {
          op = ops[_i];
          _results2.push(opout[op] = {
            pri: +pri,
            upri: Math.round(pri)
          });
        }
        return _results2;
      })());
    }
    return _results;
  };

  populate(expropdefs, inops);

  for (n in inops) {
    e = inops[n];
    e.isSpecial = true;
  }

  populate(inopdefs, inops);

  populate(preopdefs, preops);

  inops[''] = {
    upri: 1000,
    isend: true
  };

  inops['?'].pri = specpri;

  inops[':'].match = '?';

  inops[':'].newpri = 15;

  inops['('].pri = specpri;

  inops[')'].match = '(';

  inops['['].pri = specpri;

  inops[']'].match = '[';

  inops[':'].isSpecial = true;

  preops['--'] = unsupported;

  preops['++'] = unsupported;

  delete inops['--'];

  delete inops['++'];

  jslikeparse = function(txt, fnexpr) {
    var lastval, m, op, opdef, opstack, optxt, origtxt, top;
    origtxt = txt;
    opstack = [];
    lastval = null;
    while (true) {
      while (true) {
        if (m = /^\s+(.*)/.exec(txt)) txt = m[1];
        if (!(m = preopre.exec(txt))) break;
        txt = m[2];
        opdef = preops[m[1]] || unsupported;
        op = {
          upri: opdef.upri,
          pri: opdef.pri,
          txt: m[1]
        };
        if (opdef.alter) op = opdef.alter(op);
        opstack.push(op);
      }
      m = valre.exec(txt);
      if (m[1] || m[2] || m[4]) {
        lastval = JSON.stringify(JSON.parse(m[1] || m[2] || m[4]));
      } else if (m[3]) {
        lastval = m[3].slice(1, m[3].length - 1).replace(/(?:(\\.)|(")|(.))/g, function($0, $1, $2, $3) {
          return $1 || $3 || ("\\" + $2);
        });
        lastval = JSON.stringify(JSON.parse("\"" + lastval + "\""));
      } else {
        lastval = fnexpr(m[5]);
      }
      txt = m[6];
      while (true) {
        op = null;
        m = inopre.exec(txt);
        if (!m) throw new Error("Unrecognised input");
        txt = m[2];
        optxt = m[1] || '';
        opdef = inops[optxt];
        if (!opdef) throw new Error("" + optxt + " operator not supported");
        while ((top = opstack.length && opstack[opstack.length - 1]).pri <= opdef.upri) {
          top.right = lastval;
          lastval = top;
          if (lastval.pri === specpri) {
            throw new Error("Unmatched '" + lastval.txt + "'");
          }
          opstack.pop();
        }
        if (opdef.isSpecial) {
          if (optxt === "()") {
            lastval = {
              left: lastval,
              pri: 2,
              txt: "()"
            };
            continue;
          }
          if (opdef.match && opdef.match !== top.txt) {
            throw new Error("Unmatched '" + optxt + "'");
          }
          top.inner = lastval;
          opstack.pop();
          op = top;
          lastval = top;
          if (!opdef.newpri) continue;
          top.pri = opdef.newpri;
        }
        break;
      }
      if (opdef.isend) return lastval;
      op = op || {
        left: lastval,
        upri: opdef.upri,
        pri: opdef.pri,
        txt: optxt
      };
      opstack.push(op);
      lastval = null;
    }
  };

  jslikeunparse = function(op) {
    var inner, left, right;
    if (typeof op === 'string') return op;
    if (op.left) left = jslikeunparse(op.left);
    if (op.right) right = jslikeunparse(op.right);
    if (op.inner) inner = jslikeunparse(op.inner);
    if (op.txt === '(' && op.left) {
      return "" + left + "(" + inner + ")";
    } else if (op.txt === '(') {
      return "(" + inner + ")";
    } else if (op.txt === '[') {
      return "" + left + "[" + inner + "]";
    } else if (op.txt === '()') {
      return "" + left + "()";
    } else if (op.txt === 'a(b)') {
      return "" + left + "(" + inner + ")";
    } else if (op.txt === '?') {
      return "" + left + " ? " + inner + " : " + right;
    } else if (!op.left) {
      return "" + op.txt + " " + right;
    } else if (op.txt === ',') {
      return "" + left + ", " + right;
    } else {
      return "" + left + " " + op.txt + " " + right;
    }
  };

  Platter.Internal.JSLikeParse = jslikeparse;

  Platter.Internal.JSLikeUnparse = jslikeunparse;

  Platter.Internal.JSMunge = function(txt, valfn) {
    var op;
    op = jslikeparse(txt, valfn);
    return jslikeunparse(op);
  };

}).call(this);

(function() {
  var clean, exprvar, jskeywords, singrep, toSrc;

  clean = function(n) {
    n = n.replace(/#/g, "");
    if (!/^[a-z]/i.exec(n)) n = 'v' + n;
    n = n.replace(/[^a-z0-9\$]+/ig, "_");
    if (jskeywords[n]) n = "" + n + "_";
    return n;
  };

  singrep = {
    "'": "\\'",
    "\\": "\\\\",
    "\r": "\\r",
    "\n": "\\n"
  };

  Platter.Internal.ToSrc = toSrc = function(o) {
    var a;
    if (typeof o === 'string') {
      return "'" + (o.replace(/[\\'\r\n]/g, function(t) {
        return singrep[t];
      })) + "'";
    }
    if (typeof o === 'number' || !o) return o + '';
    if (o instanceof Array) {
      return "[" + (((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = o.length; _i < _len; _i++) {
          a = o[_i];
          _results.push(toSrc(a));
        }
        return _results;
      })()).join(',')) + "]";
    }
    throw "Kaboom!";
  };

  exprvar = /#(\w+)#/g;

  jskeywords = {
    'break': 1,
    'else': 1,
    'new': 1,
    'var': 1,
    'case': 1,
    'finally': 1,
    'return': 1,
    'void': 1,
    'catch': 1,
    'for': 1,
    'switch': 1,
    'while': 1,
    'continue': 1,
    'function': 1,
    'this': 1,
    'with': 1,
    'default': 1,
    'if': 1,
    'throw': 1,
    'delete': 1,
    'in': 1,
    'try': 1,
    'do': 1,
    'instanceof': 1,
    'typeof': 1,
    'abstract': 1,
    'enum': 1,
    'int': 1,
    'short': 1,
    'boolean': 1,
    'export': 1,
    'interface': 1,
    'static': 1,
    'byte': 1,
    'extends': 1,
    'long': 1,
    'super': 1,
    'char': 1,
    'final': 1,
    'native': 1,
    'synchronized': 1,
    'class': 1,
    'float': 1,
    'package': 1,
    'throws': 1,
    'const': 1,
    'goto': 1,
    'private': 1,
    'transient': 1,
    'debugger': 1,
    'implements': 1,
    'protected': 1,
    'volatile': 1,
    'double': 1,
    'import': 1,
    'public': 1,
    'null': 1,
    'true': 1,
    'false': 1
  };

  Platter.Internal.CodeGen = (function() {

    function CodeGen() {
      this._code = [];
      this._vars = {};
    }

    CodeGen.prototype.existingVar = function(name) {
      name = clean(name);
      this._vars[name] = {
        _name: name,
        _count: 1000
      };
      return this.getVar(name);
    };

    CodeGen.prototype.forceVar = function(name) {
      var v;
      v = this._vars[name.n || name];
      if (v._forced) return;
      return v._count++;
    };

    CodeGen.prototype.addForcedVar = function(name, expr, compVal) {
      var ret;
      ret = this.addVar(name, expr, compVal);
      this.forceVar(ret);
      return ret;
    };

    CodeGen.prototype.addVar = function(name, expr, compVal) {
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

    CodeGen.prototype.getVar = function(name) {
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

    CodeGen.prototype.addExpr = function(expr) {
      return this.addOp({
        _expr: expr
      });
    };

    CodeGen.prototype.addOp = function(op) {
      var _this = this;
      op._expr.replace(exprvar, function($0, $1) {
        return _this._vars[$1]._count++;
      });
      return this._code.push(op);
    };

    CodeGen.prototype.toString = function() {
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

    CodeGen.prototype._uniqName = function(name) {
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

    CodeGen.prototype.toSrc = toSrc;

    CodeGen.prototype.index = function(arr, entry) {
      if (!/^[a-z$_][a-z0-9$_]*$/.exec(entry) || jskeywords[entry]) {
        return "" + arr + "[" + (this.toSrc(entry)) + "]";
      } else {
        return "" + arr + "." + entry;
      }
    };

    return CodeGen;

  })();

}).call(this);

(function() {
  var __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Platter.Internal.PlainRunner = (function(_super) {

    __extends(PlainRunner, _super);

    function PlainRunner() {
      PlainRunner.__super__.constructor.apply(this, arguments);
    }

    PlainRunner.prototype.runGetMulti = function(data, bits) {
      var bit, _i, _len;
      for (_i = 0, _len = bits.length; _i < _len; _i++) {
        bit = bits[_i];
        if (!data) return data;
        data = data[bit];
      }
      return data;
    };

    return PlainRunner;

  })(Platter.Internal.TemplateRunner);

  Platter.Internal.PlainCompiler = (function(_super) {

    __extends(PlainCompiler, _super);

    function PlainCompiler() {
      PlainCompiler.__super__.constructor.apply(this, arguments);
    }

    PlainCompiler.prototype.runner = Platter.Internal.PlainRunner;

    PlainCompiler.prototype.plainGet = function(js) {
      return function(id, t, jsData) {
        if (t === '.') return "" + jsData;
        t = t.split('.');
        if (t.length === 1) {
          return "(" + jsData + " ? " + jsData + "[" + (js.toSrc(t[0])) + "] : void 0)";
        } else {
          return "this.runGetMulti(" + jsData + ", " + (js.toSrc(t)) + ")";
        }
      };
    };

    PlainCompiler.prototype.doBase = function(ps, n, v, expr, sep) {
      var parse;
      if (sep === true) {
        parse = Platter.EscapesStringParse;
      } else {
        parse = function(txt, jsDatas, fn) {
          return Platter.EscapesNoStringParse(txt, sep, jsDatas, fn);
        };
      }
      return ps.js.addExpr(expr.replace(/#el#/g, "" + ps.jsEl).replace(/#n#/g, ps.js.toSrc(n)).replace(/#v#/g, parse(v, ps.jsDatas, this.plainGet(ps.js))));
    };

    PlainCompiler.prototype.doSimple = function(ps, n, v, expr) {
      return this.doBase(ps, n, v, expr, true);
    };

    return PlainCompiler;

  })(Platter.Internal.TemplateCompiler);

  Platter.Plain = new Platter.Internal.PlainCompiler;

}).call(this);

(function() {
  var never_equal_to_anything,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __slice = Array.prototype.slice;

  never_equal_to_anything = {};

  Platter.Internal.DynamicRunner = (function(_super) {

    __extends(DynamicRunner, _super);

    function DynamicRunner() {
      DynamicRunner.__super__.constructor.apply(this, arguments);
    }

    DynamicRunner.prototype.runGetMulti = function(undo, fn, data, _arg) {
      var bit1, bits, fn2, undoch, val,
        _this = this;
      bit1 = _arg[0], bits = 2 <= _arg.length ? __slice.call(_arg, 1) : [];
      val = never_equal_to_anything;
      undoch = undo.child();
      fn2 = function() {
        var oval;
        oval = val;
        val = _this.fetchVal(data, bit1);
        if (oval === val) return;
        undoch.undo();
        if (bits.length === 0) {
          return fn(val);
        } else {
          return _this.runGetMulti(undo, fn, val, bits);
        }
      };
      if (data && data.platter_watch) data.platter_watch(undo, bit1, fn2);
      return fn2();
    };

    DynamicRunner.prototype.fetchVal = function(data, ident) {
      if (!data) return;
      if (data.platter_get) {
        return data.platter_get(ident);
      } else {
        return data[ident];
      }
    };

    return DynamicRunner;

  })(Platter.Internal.TemplateRunner);

  Platter.Internal.DynamicCompiler = (function(_super) {

    __extends(DynamicCompiler, _super);

    function DynamicCompiler() {
      DynamicCompiler.__super__.constructor.apply(this, arguments);
    }

    DynamicCompiler.prototype.runner = Platter.Internal.DynamicRunner;

    DynamicCompiler.prototype.doBase = function(ps, n, v, expr, sep) {
      var esc, escn, escvar, jsChange, parse;
      if (sep === true) {
        parse = Platter.EscapesStringParse;
      } else {
        parse = function(txt, jsDatas, fn) {
          return Platter.EscapesNoStringParse(txt, sep, jsDatas, fn);
        };
      }
      esc = {};
      jsChange = ps.js.addVar("" + ps.jsEl + "_change", "null");
      parse(v, ps.jsDatas, function(id, t, jsData) {
        if (t !== '.') {
          return esc[id] = ps.js.addForcedVar("" + ps.jsEl + "_" + t, "null", [t, jsData]);
        }
      });
      expr = expr.replace(/#el#/g, "" + ps.jsEl).replace(/#n#/g, ps.js.toSrc(n)).replace(/#v#/g, parse(v, ps.jsDatas, function(id, t, jsData) {
        if (t !== '.') {
          return esc[id];
        } else {
          return jsData;
        }
      }));
      for (escn in esc) {
        escvar = esc[escn];
        ps.js.addExpr("this.runGetMulti(undo, function(val){\n	" + escvar + " = val;\n	if (" + jsChange + ") " + jsChange + "();\n}, " + escvar.v[1] + ", " + (ps.js.toSrc(escvar.v[0].split('.'))) + ")");
      }
      ps.js.addExpr("" + jsChange + " = function() {\n	" + expr + ";\n}");
      return ps.js.addExpr("" + jsChange + "()");
    };

    DynamicCompiler.prototype.doSimple = function(ps, n, v, expr) {
      return this.doBase(ps, n, v, expr, true);
    };

    return DynamicCompiler;

  })(Platter.Internal.TemplateCompiler);

  Platter.Dynamic = new Platter.Internal.DynamicCompiler;

}).call(this);

(function() {
  var collprot, isNat, modprot;

  isNat = function(n) {
    return !!/^[0-9]+$/.exec(n);
  };

  if (window.Backbone) {
    modprot = Backbone.Model.prototype;
    modprot.platter_hasKey = modprot.hasKey || function(n) {
      return this.attributes.hasOwnProperty(n);
    };
    modprot.platter_watch = function(undo, n, fn) {
      var ev,
        _this = this;
      ev = "change:" + n;
      this.on(ev, fn);
      return undo.add(function() {
        return _this.off(ev, fn);
      });
    };
    modprot.platter_get = function(n) {
      if (this.platter_hasKey(n)) {
        return this.get(n);
      } else {
        return this[n];
      }
    };
    modprot.platter_set = function(n, v) {
      return this.set(n, v);
    };
    modprot.platter_modify = function(n, fn) {
      if (this.platter_hasKey(n)) {
        return this.set(n, fn(this.get(n)));
      } else {
        return this[n] = fn(this[n]);
      }
    };
    collprot = Backbone.Collection.prototype;
    collprot.platter_watchcoll = function(undo, add, remove, replaceMe) {
      var doRep, i, _ref,
        _this = this;
      doRep = function() {
        return replaceMe(this);
      };
      this.on('add', add);
      this.on('remove', remove);
      this.on('reset', doRep);
      for (i = 0, _ref = this.length; i < _ref; i += 1) {
        add(this.at(i), this, {
          index: i
        });
      }
      return undo.add(function() {
        _this.off('add', add);
        _this.off('remove', remove);
        return _this.off('reset', doRep);
      });
    };
    collprot.platter_hasKey = function(n) {
      return n === 'length' || isNat(n);
    };
    collprot.platter_watch = function(undo, n, fn) {
      var add, rem,
        _this = this;
      if (n === 'length') {
        this.on('add remove reset', fn);
        return undo.add(function() {
          return _this.off('add remove reset', fn);
        });
      } else if (isNat(n)) {
        add = function(el, coll, opts) {
          if (opts.index <= n) return fn();
        };
        rem = function(el, coll, opts) {
          if (opts.index <= n) return fn();
        };
        this.on('add', add);
        this.on('remove', rem);
        this.on('reset', fn);
        return undo.add(function() {
          _this.off('add', add);
          _this.off('remove', rem);
          return _this.off('reset', fn);
        });
      }
    };
    collprot.platter_get = function(n) {
      if (isNat(n)) {
        return this.at(n);
      } else {
        return this[n];
      }
    };
    collprot.platter_set = function(n, v) {
      var _results;
      if (isNat(n)) {
        this.remove(this.at(n));
        return this.add(v, {
          index: n
        });
      } else if (n === 'length' && isNat(v)) {
        _results = [];
        while (this.length > n && this.length > 0) {
          _results.push(this.remove(this.at(this.length - 1)));
        }
        return _results;
      } else {
        return this[n] = v;
      }
    };
    Platter.Internal.DebugList.push({
      platter_haskey: modprot,
      platter_watch: modprot,
      platter_get: modprot,
      platter_set: modprot
    });
    Platter.Internal.DebugList.push({
      platter_haskey: collprot,
      platter_watch: collprot,
      platter_get: collprot,
      platter_set: collprot,
      platter_watchcoll: collprot
    });
  }

}).call(this);

(function() {

  Platter.Internal.TemplateCompiler.prototype.addAttrAssigner('checked', 0, "#el#.defaultChecked = #el#.checked = !!(#v#)");

}).call(this);

(function() {

  Platter.Internal.TemplateCompiler.prototype.addAttrAssigner('class', 0, '#el#.className = #v#');

}).call(this);

(function() {
  var Compiler, Runner, defaultRunEvent, doEvent, doModify, doSet, isEventAttr, runDOMEvent, runEvent, runJQueryEvent,
    __hasProp = Object.prototype.hasOwnProperty;

  Runner = Platter.Internal.TemplateRunner;

  Compiler = Platter.Internal.TemplateCompiler;

  isEventAttr = function(name) {
    return !!/^on/.exec(name);
  };

  runDOMEvent = function(undo, el, ev, fn) {
    el.addEventListener(ev, fn);
    return undo.add(function() {
      return el.removeEventListener(ev, fn);
    });
  };

  runJQueryEvent = function(undo, el, ev, fn) {
    jQuery(el).on(ev, fn);
    return undo.add(function() {
      return jQuery(el).off(ev, fn);
    });
  };

  defaultRunEvent = runDOMEvent;

  if (window.jQuery) defaultRunEvent = runJQueryEvent;

  doModify = Runner.prototype.addUniqueMethod('doModify', function(data, n, fn) {
    if (data.platter_modify) {
      return data.platter_modify(n, fn);
    } else {
      return data[n] = fn(data[n]);
    }
  });

  doSet = Runner.prototype.addUniqueMethod('doSet', function(data, n, v) {
    if (data.platter_set) {
      return data.platter_set(n, v);
    } else {
      return data[n] = v;
    }
  });

  runEvent = Runner.prototype.addUniqueMethod('runEvent', defaultRunEvent);

  doEvent = Compiler.prototype.addUniqueMethod('doEvent', function(ps, realn, v) {
    var ev,
      _this = this;
    ev = realn.substr(2);
    return Platter.EscapesNoString(v, "", function(t) {
      var jsFn, jsTarget, jsThis, m, op, orig, post, valGetter;
      orig = t;
      m = /^(>|\+\+|--)?(.*?)(\+\+|--)?$/.exec(t);
      if (!m || m[1] && m[3] && m[1] !== m[3]) {
        throw new Error("{{" + orig + "}} is bad; only event handlers of the forms a.b, >a.b, ++a.b, --a.b, a.b++ and a.b-- are currently supported");
      }
      t = m[2];
      op = m[1] || m[3];
      jsThis = ps.js.addForcedVar("" + ps.jsEl + "_this", "this");
      m = /^\s*(\.*)([^.\s].*)\.(.*)$/.exec(t);
      if (m) {
        jsTarget = ps.js.addForcedVar("" + ps.jsEl + "_target", "null");
        _this.doBase(ps, 'text', "{{" + m[1] + m[2] + "}}", "" + jsTarget + " = #v#", null);
        post = m[3];
      } else {
        m = /^\s*(\.*)([^.\s].*)$/.exec(t);
        if (m) {
          jsTarget = ps.jsDatas[(m[1].length || 1) - 1];
          post = m[2];
        } else if (op) {
          throw new Error("Sorry, {{" + orig + "}} is not supported, because I can't replace the current data item");
        } else {
          m = /^\s*(\.+)$/.exec(t);
          jsTarget = ps.jsDatas[(m[1].length || 1) - 1];
        }
      }
      if (op === '++' || op === '--') {
        return ps.js.addExpr("this." + runEvent + "(undo, " + ps.jsEl + ", " + (ps.js.toSrc(ev)) + ", function(ev){ " + jsThis + "." + doModify + "(" + jsTarget + ", " + (ps.js.toSrc(post)) + ", function(v){return " + op + "v})})");
      } else if (op === '>') {
        valGetter = ps.valGetter ? ps.valGetter.replace("#el#", "" + ps.jsEl) : ps.js.index(ps.jsEl, ps.el.type === 'checkbox' ? 'checked' : 'value');
        return ps.js.addExpr("this." + runEvent + "(undo, " + ps.jsEl + ", " + (ps.js.toSrc(ev)) + ", function(ev){ " + jsThis + "." + doSet + "(" + jsTarget + ", " + (ps.js.toSrc(post)) + ", " + valGetter + "); })");
      } else {
        if (post) {
          jsFn = ps.js.addForcedVar("" + ps.jsEl + "_fn", "null");
          _this.doBase(ps, 'text', "{{" + t + "}}", "" + jsFn + " = #v#", null);
        } else {
          jsFn = jsTarget;
        }
        return ps.js.addExpr("this." + runEvent + "(undo, " + ps.jsEl + ", " + (ps.js.toSrc(ev)) + ", function(ev){ " + jsFn + ".call(" + jsTarget + ", ev, " + (ps.js.toSrc(ev)) + ", " + ps.jsEl + "); })");
      }
    });
  });

  Compiler.prototype.addAttrPlugin('on.*', 0, function(comp, ps) {
    var n, realn, v, _ref, _ref2;
    _ref = ps.attrs();
    for (realn in _ref) {
      if (!__hasProp.call(_ref, realn)) continue;
      _ref2 = _ref[realn], n = _ref2.n, realn = _ref2.realn, v = _ref2.v;
      if (isEventAttr(realn)) {
        if (realn !== n) ps.el.removeAttribute(n);
        comp[doEvent](ps, realn, v);
        ps.remAttr(realn);
      }
    }
    return false;
  });

}).call(this);

(function() {

  Platter.Internal.TemplateCompiler.prototype.addAttrAssigner('value', 0, "#el#.value = #v#");

  Platter.Internal.TemplateCompiler.prototype.addAttrPlugin('value|checked', 200, function(comp, ps) {
    var ev, m, n, type, v, _i, _len, _ref;
    _ref = ['value', 'checked'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      n = _ref[_i];
      v = ps.getAttr(n);
      if (!v) continue;
      m = /^\{\{>(.*?)\}\}/.exec(v);
      if (!m) continue;
      if (m[0].length !== v.length) {
        throw new Error("{{>thing}} cannot be in the same value attribute as anything else");
      }
      type = ps.getAttr('type');
      if (Platter.HasEscape(type || '')) {
        throw new Error("{{>thing}} cannot be the value of an element with dynamic type");
      }
      ev = type && (type === 'checkbox' || type === 'radio') || ps.el.nodeName.toLowerCase() === 'select' ? 'onchange' : 'oninput';
      ps.setAttr(ev, v + (ps.getAttr(ev) || ''));
      ps.setAttr(n, "{{" + m[1] + "}}");
    }
    return false;
  });

}).call(this);

(function() {
  var getOptVal, getSelVal, setSelVal;

  getOptVal = Platter.Internal.TemplateRunner.prototype.addUniqueMethod('getOptVal', function(opt) {
    var data;
    data = this.getPlatterData(opt);
    if (data && data.hasOwnProperty('value')) {
      return data.value;
    } else {
      return opt.value;
    }
  });

  getSelVal = Platter.Internal.TemplateRunner.prototype.addUniqueMethod('getSelVal', function(el) {
    var opt, _i, _len, _ref;
    _ref = el.options;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      opt = _ref[_i];
      if (opt.selected) return this[getOptVal](opt);
    }
    return null;
  });

  setSelVal = Platter.Internal.TemplateRunner.prototype.addUniqueMethod('setSelVal', function(el, val) {
    var opt, _i, _len, _ref, _results;
    _ref = el.options;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      opt = _ref[_i];
      if (val === this[getOptVal](opt)) {
        _results.push(opt.selected = true);
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  });

  Platter.Internal.TemplateCompiler.prototype.addElPlugin('select', 1, function(comp, ps) {
    var v;
    if (!Platter.HasEscape(ps.getAttr('value'))) return;
    ps.magicSelect = true;
    v = ps.getAttr('value');
    ps.remAttr('value');
    ps.valGetter = "" + ps.jsSelf + "." + getSelVal + "(#el#)";
    ps.doAfter(function() {
      return comp.doBase(ps, 'value', v, "" + ps.jsSelf + "." + setSelVal + "(#el#, #v#)", null);
    });
    return false;
  });

  Platter.Internal.TemplateCompiler.prototype.addElPlugin('option', 1, function(comp, ps) {
    var extraScopes, jsOptData, pps, v;
    pps = ps;
    extraScopes = false;
    while (pps && !pps.magicSelect) {
      extraScopes || (extraScopes = pps.extraScopes);
      pps = pps.parent;
    }
    if (!pps) return;
    if (!ps.getAttr('value')) {
      ps.setAttr('value', extraScopes ? '{{.}}' : '{{undefined}}');
    }
    if (!Platter.HasEscape(ps.getAttr('value'))) return;
    jsOptData = ps.getJSElData();
    v = ps.getAttr('value');
    ps.setAttr('value', function(ps, n) {
      return comp.doBase(ps, n, v, "" + jsOptData + ".value = #v#", null);
    });
    return false;
  });

}).call(this);

(function() {

  Platter.Internal.TemplateCompiler.prototype.addElPlugin('textarea', 300, function(comp, ps) {
    if (Platter.HasEscape(ps.el.value)) {
      ps.setAttr('value', Platter.UncommentEscapes(Platter.UnhideAttr(ps.el.value)));
    }
    return false;
  });

}).call(this);

(function() {
  var Dynamic, DynamicRun, Plain, doForEach, plainName, runForEach, runForEachInner, watchCollection,
    __slice = Array.prototype.slice;

  Plain = Platter.Internal.PlainCompiler;

  plainName = Plain.prototype.addUniqueMethod('foreach', function(ps, val) {
    var jsFor;
    val = Platter.EscapesNoStringParse(val, null, ps.jsDatas, this.plainGet(ps.js));
    jsFor = ps.js.addVar("" + ps.jsPre + "_for", val);
    ps.js.forceVar(ps.jsPost);
    return ps.js.addExpr("if (" + jsFor + ")\n	for (var i=0;i<" + jsFor + ".length; ++i)\n		" + ps.jsPost + ".parentNode.insertBefore(this." + ps.jsPre + ".run(" + jsFor + "[i], " + (ps.jsDatas.join(',')) + ", undo, false).docfrag, " + ps.jsPost + ")");
  });

  Plain.prototype.addExtractorPlugin('foreach', 100, plainName, 1);

  Dynamic = Platter.Internal.DynamicCompiler;

  DynamicRun = Platter.Internal.DynamicRunner;

  runForEach = DynamicRun.prototype.addUniqueMethod('foreach', function(undo, tmpl, datas, start, end) {
    var hasRun, ret, undoch,
      _this = this;
    undoch = undo.child();
    hasRun = false;
    return ret = function(coll) {
      if (hasRun) {
        undoch.undo();
        _this.removeBetween(start, end);
      } else {
        hasRun = true;
      }
      return _this[runForEachInner](undo, coll, tmpl, datas, start, end, ret);
    };
  });

  runForEachInner = DynamicRun.prototype.addUniqueMethod('foreach_inner', function(undo, coll, tmpl, datas, start, end, replaceMe) {
    var add, ends, rem, spareUndos, undos,
      _this = this;
    ends = [start, end];
    undos = [];
    spareUndos = [];
    add = function(model, coll, opts) {
      var at, newend, par, undoch;
      at = opts.index;
      newend = document.createComment("");
      ends.splice(at + 1, 0, newend);
      par = start.parentNode;
      par.insertBefore(newend, ends[at].nextSibling);
      undoch = spareUndos.pop() || undo.child();
      par.insertBefore(tmpl.run.apply(tmpl, [model].concat(__slice.call(datas), [undoch], [false])).docfrag, newend);
      return undos.splice(at, 0, undoch);
    };
    rem = function(model, coll, opts) {
      var at;
      at = opts.index;
      _this.removeBetween(ends[at], ends[at + 1].nextSibling);
      ends.splice(at + 1, 1);
      undos[at].undo();
      return spareUndos.push(undos.splice(at, 1)[0]);
    };
    return this[watchCollection](undo, coll, add, rem, replaceMe);
  });

  watchCollection = DynamicRun.prototype.addUniqueMethod('foreach_watch', function(undo, coll, add, rem, replaceMe) {
    var i, o, _len;
    if (coll instanceof Array) {
      for (i = 0, _len = coll.length; i < _len; i++) {
        o = coll[i];
        add(o, coll, {
          index: i
        });
      }
      return;
    }
    if (coll && coll.platter_watchcoll) {
      return coll.platter_watchcoll(undo, add, rem, replaceMe);
    }
  });

  doForEach = Dynamic.prototype.addUniqueMethod('foreach', function(ps, val) {
    var jsChange;
    jsChange = ps.js.addForcedVar("" + ps.jsPre + "_forchange", "this." + runForEach + "(undo, this." + ps.jsPre + ", [" + (ps.jsDatas.join(', ')) + "], " + ps.jsPre + ", " + ps.jsPost + ")");
    return this.doBase(ps, null, val, "" + jsChange + "(#v#)", null);
  });

  Dynamic.prototype.addExtractorPlugin('foreach', 100, doForEach, 1);

}).call(this);

(function() {
  var Dynamic, DynamicRun, Plain, dynName, dynRunName, plainName,
    __slice = Array.prototype.slice;

  Plain = Platter.Internal.PlainCompiler;

  plainName = Plain.prototype.addUniqueMethod('if', function(ps, val) {
    val = Platter.EscapesNoStringParse(val, "&&", ps.jsDatas, this.plainGet(ps.js));
    return ps.js.addExpr("if (" + val + ") " + ps.jsPost + ".parentNode.insertBefore(this." + ps.jsPre + ".run(" + (ps.jsDatas.join(', ')) + ", undo, false).docfrag, " + ps.jsPost + ")");
  });

  Plain.prototype.addExtractorPlugin('if', 60, plainName, 0);

  plainName = Plain.prototype.addUniqueMethod('unless', function(ps, val) {
    val = Platter.EscapesNoStringParse(val, "&&", ps.jsDatas, this.plainGet(ps.js));
    return ps.js.addExpr("if (!(" + val + ")) " + ps.jsPost + ".parentNode.insertBefore(this." + ps.jsPre + ".run(" + (ps.jsDatas.join(', ')) + ", undo, false).docfrag, " + ps.jsPost + ")");
  });

  Plain.prototype.addExtractorPlugin('unless', 60, plainName, 0);

  Dynamic = Platter.Internal.DynamicCompiler;

  DynamicRun = Platter.Internal.DynamicRunner;

  dynRunName = DynamicRun.prototype.addUniqueMethod('if', function(undo, datas, tmpl, start, end) {
    var shown, undoch,
      _this = this;
    shown = false;
    undoch = undo.child();
    return function(show) {
      show = !!show;
      if (shown === show) return;
      shown = show;
      if (show) {
        return end.parentNode.insertBefore(tmpl.run.apply(tmpl, __slice.call(datas).concat([undoch], [false])).docfrag, end);
      } else {
        _this.removeBetween(start, end);
        return undoch.undo();
      }
    };
  });

  dynName = Dynamic.prototype.addUniqueMethod('if', function(ps, val) {
    var jsChange;
    jsChange = ps.js.addForcedVar("" + ps.jsPre + "_ifchange", "this." + dynRunName + "(undo, [" + (ps.jsDatas.join(', ')) + "], this." + ps.jsPre + ", " + ps.jsPre + ", " + ps.jsPost + ")");
    return this.doBase(ps, null, val, "" + jsChange + "(#v#)", "&&");
  });

  Dynamic.prototype.addExtractorPlugin('if', 60, dynName, 0);

  dynName = Dynamic.prototype.addUniqueMethod('unless', function(ps, val) {
    var jsChange;
    jsChange = ps.js.addForcedVar("" + ps.jsPre + "_ifchange", "this." + dynRunName + "(undo, [" + (ps.jsDatas.join(', ')) + "], this." + ps.jsPre + ", " + ps.jsPre + ", " + ps.jsPost + ")");
    return this.doBase(ps, null, val, "" + jsChange + "(!(#v#))", "&&");
  });

  Dynamic.prototype.addExtractorPlugin('unless', 60, dynName, 0);

}).call(this);

(function() {
  var Dynamic, DynamicRun, Plain, dynName, dynRunName, plainName,
    __slice = Array.prototype.slice;

  Plain = Platter.Internal.PlainCompiler;

  plainName = Plain.prototype.addUniqueMethod('with', function(ps, val) {
    val = Platter.EscapesNoStringParse(val, null, ps.jsDatas, this.plainGet(ps.js));
    return ps.js.addExpr("" + ps.jsPost + ".parentNode.insertBefore(this." + ps.jsPre + ".run(" + val + ", " + (ps.jsDatas.join(', ')) + ", undo, false).docfrag, " + ps.jsPost + ")");
  });

  Plain.prototype.addExtractorPlugin('with', 40, plainName, 1);

  Dynamic = Platter.Internal.DynamicCompiler;

  DynamicRun = Platter.Internal.DynamicRunner;

  dynRunName = DynamicRun.prototype.addUniqueMethod('with', function(undo, datas, tmpl, start, end) {
    var undoch,
      _this = this;
    undoch = undo.child();
    return function(val) {
      _this.removeBetween(start, end);
      undoch.undo();
      if (end.parentNode) {
        return end.parentNode.insertBefore(tmpl.run.apply(tmpl, [val].concat(__slice.call(datas), [undoch], [false])).docfrag, end);
      }
    };
  });

  dynName = Dynamic.prototype.addUniqueMethod('with', function(ps, val) {
    var jsChange;
    jsChange = ps.js.addForcedVar("" + ps.jsPre + "_ifchange", "this." + dynRunName + "(undo, [" + (ps.jsDatas.join(', ')) + "], this." + ps.jsPre + ", " + ps.jsPre + ", " + ps.jsPost + ")");
    return this.doBase(ps, null, val, "" + jsChange + "(#v#)", null);
  });

  Dynamic.prototype.addExtractorPlugin('with', 40, dynName, 1);

}).call(this);
