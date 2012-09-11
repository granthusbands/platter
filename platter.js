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
    if (proto && proto !== o) {
      addArraysThroughProto(ret, proto, name);
    }
    arr = o[name];
    if (arr) {
      if (arr.parent) {
        addArraysThroughProto(ret, arr.parent, name);
      }
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
      if (!this.hasOwnProperty(name)) {
        this[name] = [];
      }
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
  var blockbits, neverMatch, platterData, platterDataID, sby,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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

  blockbits = /^\{\{([#\/])([^\s\}]*)(.*?)\}\}$/;

  Platter.Internal.CompilerState = (function() {

    function CompilerState(clone, parent) {
      this.parent = parent;
      if (clone) {
        this.ret = clone.ret, this.plugins = clone.plugins, this.js = clone.js, this.jsDatas = clone.jsDatas, this.el = clone.el, this.jsEl = clone.jsEl, this.jsSelf = clone.jsSelf;
        this.parent || (this.parent = clone);
      }
      this.afters = [];
      this.children = [];
    }

    CompilerState.prototype.child = function() {
      var prev, ret;
      ret = new Platter.Internal.CompilerState(this);
      if (this.children.length) {
        prev = this.children[this.children.length - 1];
        prev.next = ret;
        ret.prev = prev;
      }
      this.children.push(ret);
      return ret;
    };

    CompilerState.prototype.setEl = function(el) {
      this.el = el;
      this._attrs = void 0;
      return this._attrNames = void 0;
    };

    CompilerState.prototype.attrs = function() {
      if (this._attrs) {
        return this._attrs;
      }
      return this._attrs = Platter.AttrList(this.el);
    };

    CompilerState.prototype.attrNames = function() {
      if (this._attrNames) {
        return this._attrNames;
      }
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

    CompilerState.prototype.optimiseAwayPre = function() {
      if (this.prev && (this.prev.jsPost || this.prev.jsEl)) {
        this.jsPre = this.prev.jsPost || this.prev.jsEl;
        this.jsPost = this.jsEl;
        Platter.RemoveNode(this.pre);
        return this.pre = null;
      } else if (!this.prev && this.parent && this.parent.jsEl) {
        this.jsPre = 'null';
        this.jsPost = this.jsEl;
        Platter.RemoveNode(this.pre);
        return this.pre = null;
      }
    };

    CompilerState.prototype.optimiseAwayLastPost = function() {
      if (!this.prev || !this.prev.post) {
        return;
      }
      this.js.replaceExpr(this.jsEl, this.prev.jsPost);
      this.jsEl = this.prev.jsPost;
      Platter.RemoveNode(this.prev.post);
      return this.prev.post = null;
    };

    CompilerState.prototype.optimiseAwayLastChildPost = function() {
      var ch;
      ch = this.children[this.children.length - 1];
      if (!ch || !ch.post) {
        return;
      }
      this.js.replaceExpr(ch.jsPost, 'null');
      Platter.RemoveNode(ch.post);
      return ch.post = null;
    };

    CompilerState.prototype.pulled = function(pre, post, frag) {
      this.pre = pre;
      this.post = post;
      this.jsPre = this.jsEl;
      this.jsPost = this.js.addVar("" + this.jsPre + "_end", "" + this.jsPre + ".nextSibling", this.post);
      this.optimiseAwayPre();
      this.jsEl = null;
      this.setEl(null);
      return frag;
    };

    CompilerState.prototype.pullEl = function() {
      var frag, post, pre;
      pre = document.createComment("");
      post = document.createComment("");
      this.el.parentNode.insertBefore(pre, this.el);
      this.el.parentNode.insertBefore(post, this.el);
      frag = document.createDocumentFragment();
      frag.appendChild(this.el);
      return this.pulled(pre, post, frag);
    };

    CompilerState.prototype.pullBlock = function() {
      var end, frag, m, matched, post, pre, stack;
      end = this.el;
      stack = [blockbits.exec(this.el.nodeValue)[2]];
      while (true) {
        matched = false;
        end = end.nextSibling;
        if (!end) {
          break;
        }
        if (end.nodeType !== 8) {
          continue;
        }
        m = blockbits.exec(end.nodeValue);
        if (!m) {
          continue;
        }
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
        if (stack.length === 0) {
          break;
        }
      }
      frag = document.createDocumentFragment();
      while (this.el.nextSibling !== end) {
        frag.appendChild(this.el.nextSibling);
      }
      if (matched) {
        end.parentNode.removeChild(end);
      }
      pre = document.createComment("");
      post = document.createComment("");
      this.el.parentNode.insertBefore(pre, this.el);
      this.el.parentNode.insertBefore(post, this.el);
      this.el.parentNode.removeChild(this.el);
      return this.pulled(pre, post, frag);
    };

    return CompilerState;

  })();

  Platter.Internal.TemplateRunner = (function(_super) {

    __extends(TemplateRunner, _super);

    function TemplateRunner(node) {
      this.node = node;
    }

    TemplateRunner.prototype.removeBetween = function(startel, endel, par) {
      var last, next, prev;
      par || (par = startel.parentNode || endel.parentNode);
      if (!par) {
        return;
      }
      if (!startel && !endel) {
        while (last = par.lastChild) {
          par.removeChild(last);
        }
      } else if (endel) {
        while ((prev = endel.previousSibling) !== startel) {
          par.removeChild(prev);
        }
      } else if (startel) {
        while ((next = startel.nextSibling) !== endel) {
          par.removeChild(next);
        }
      }
      return void 0;
    };

    TemplateRunner.prototype.removeAll = function(startel, endel) {
      var par;
      par = startel.parentNode;
      if (!par) {
        return;
      }
      if (startel === endel) {
        par.removeChild(startel);
        return;
      }
      if (startel.nextSibling !== endel) {
        this.removeBetween(startel, endel);
      }
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
        return void 0;
      }
    };

    return TemplateRunner;

  })(Platter.Internal.PluginBase);

  neverMatch = /^a\bb/;

  Platter.Internal.TemplateCompiler = (function(_super) {

    __extends(TemplateCompiler, _super);

    function TemplateCompiler() {
      return TemplateCompiler.__super__.constructor.apply(this, arguments);
    }

    TemplateCompiler.prototype.runner = Platter.Internal.TemplateRunner;

    TemplateCompiler.prototype.compile = function(txt) {
      return this.compileFrag(Platter.Helper.TmplToFrag(txt), 1);
    };

    TemplateCompiler.prototype.compileFrag = function(frag, ctxCnt, parent) {
      var d, i, jsAutoRemove, jsFirstChild, jsLastChild, jsRoot, ps, _i;
      ps = new Platter.Internal.CompilerState;
      ps.parent = parent;
      ps.js = new Platter.Internal.CodeGen;
      ps.ret = new this.runner;
      ps.ret.node = frag;
      ps.plugins = {};
      this.extractPlugins(ps.plugins, 'block', '');
      this.extractPlugins(ps.plugins, 'el', 'img');
      ps.jsDatas = [];
      for (i = _i = 0; 0 <= ctxCnt ? _i < ctxCnt : _i > ctxCnt; i = 0 <= ctxCnt ? ++_i : --_i) {
        ps.jsDatas.push(ps.js.existingVar('data' + i));
      }
      ps.js.existingVar('undo');
      jsAutoRemove = ps.js.existingVar('autoRemove');
      ps.jsSelf = ps.js.addForcedVar("self", "this");
      ps.js.addExpr('undo = undo ? undo.child() : new Platter.Undo()');
      jsRoot = ps.js.addVar('el', 'this.node.cloneNode(true)');
      this.compileChildren(ps, frag, jsRoot);
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
          var _j, _len, _ref, _results;
          _ref = ps.jsDatas;
          _results = [];
          for (_j = 0, _len = _ref.length; _j < _len; _j++) {
            d = _ref[_j];
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
          if (ps.isHandled) {
            return;
          }
        }
      }
      return null;
    };

    TemplateCompiler.prototype.compileChildren = function(ps, el, jsEl) {
      var baseName, ch, jsCh, ps2, _ref;
      baseName = "" + jsEl;
      ch = el.firstChild;
      jsCh = ps.js.addForcedVar("" + (((_ref = ps.jsEl || ps.jsPre) != null ? _ref.n : void 0) || 'el') + "_ch", "" + jsEl + ".firstChild");
      while (ch) {
        ps2 = ps.child();
        ps2.setEl(ch);
        ps2.jsEl = jsCh;
        this.compileElement(ps2);
        jsCh = ps2.js.addVar("" + baseName + "_ch", "" + (ps2.jsPost || ps2.jsEl) + ".nextSibling");
        ch = (ps2.post || ps2.el).nextSibling;
      }
      if (ps.el) {
        return ps.optimiseAwayLastChildPost();
      }
    };

    TemplateCompiler.prototype.compileElement = function(ps) {
      var ct, m, n, realn, v, _ref, _ref1;
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
            _ref1 = _ref[realn], n = _ref1.n, realn = _ref1.realn, v = _ref1.v;
            if (realn !== n) {
              ps.el.removeAttribute(n);
            }
            if (typeof v === 'function') {
              v(ps, realn);
            } else if (!(Platter.HasEscape(v))) {
              if (realn !== n) {
                ps.el.setAttribute(realn, v);
              }
            } else {
              this.doSimple(ps, realn, v, "#el#.setAttribute(#n#, #v#)");
            }
          }
          if (ps.el.tagName.toLowerCase() !== 'textarea') {
            this.compileChildren(ps, ps.el, ps.jsEl);
            ps.optimiseAwayLastPost();
            ps.optimiseAwayLastChildPost();
          }
          return ps.runAfters();
        }
      } else if (ps.el.nodeType === 8) {
        ct = ps.el.nodeValue;
        ct = Platter.UnhideAttr(ct);
        if (m = /^\{\{([#\/])([^\s\}]+)\s*(.*?)\}\}$/.exec(ct)) {
          if (m[1] === '/') {
            throw new Error("Unmatched end-block " + ct);
          } else if (m[1] === '#') {
            if (m[2].match(ps.plugins.blockReg)) {
              this.doPlugins(ps.plugins.block, (function() {
                return m[2];
              }), ps, m[3]);
            }
          }
          if (!ps.isHandled) {
            throw new Error("Unhandled block " + ct);
          }
        } else if (m = /^\{\{>(.*?)\}\}$/.exec(ct)) {
          return this.doRedo(ps, null, "{{" + m[1] + "}}", "if (#v#) Platter.InsertNode(" + (ps.parent.jsEl || 'null') + ", " + ps.jsPost + ", (#v#).run(" + ps.jsDatas[0] + ", undo).docfrag)", null);
        } else {
          return ps.optimiseAwayLastPost();
        }
      } else if (ps.el.nodeType === 3 || ps.el.nodeType === 4) {
        ps.el.nodeValue = Platter.UnhideAttr(ps.el.nodeValue);
        if (ps.el.nodeValue.indexOf('{{') !== -1) {
          this.doSimple(ps, 'text', ps.el.nodeValue, "#el#.nodeValue = #v#");
        }
        return ps.optimiseAwayLastPost();
      }
    };

    TemplateCompiler.prototype.addExtractorPlugin = function(n, pri, method, extradepth) {
      var fn;
      fn = function(comp, ps, val, frag) {
        var tmplname;
        ps.extraScopes = extradepth;
        tmplname = (ps.js.addVar("" + ps.jsPre + "_tmpl")).n;
        ps.ret[tmplname] = comp.compileFrag(frag, ps.jsDatas.length + extradepth, ps);
        comp[method](ps, val, tmplname);
        return true;
      };
      this.addBlockExtractorPlugin(n, fn);
      return this.addAttrExtractorPlugin(n, pri, fn);
    };

    TemplateCompiler.prototype.addBlockExtractorPlugin = function(n, fn) {
      var fn2, regTxt;
      regTxt = "^(?:" + n + ")$";
      fn2 = function(comp, ps, val, n) {
        return fn(comp, ps, "{{" + val + "}}", ps.pullBlock());
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

    TemplateCompiler.prototype.addAttrAssigner = function(n, pri, str, sep) {
      var fn;
      fn = function(comp, ps) {
        var v;
        v = ps.getAttr(n);
        if (Platter.HasEscape(v)) {
          ps.setAttr(n, function(ps, n) {
            return comp.doBase(ps, n, v, str, sep);
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
        if (!Platter.HasEscape(val)) {
          return;
        }
        ps.el.removeAttribute(ps.getAttrName(n));
        return fn(comp, ps, val, ps.pullEl());
      });
    };

    return TemplateCompiler;

  })(Platter.Internal.PluginBase);

}).call(this);

(function() {
  var chooseData, jsParser;

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
    return txt = txt.replace(/\{\{([#\/>].*?)\}\}/g, "<!--{{$1}}-->");
  };

  Platter.UncommentEscapes = function(txt) {
    return txt = txt.replace(/<!--\{\{([#\/>].*?)\}\}-->/g, "{{$1}}");
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

  Platter.EscapesHandle = function(txt, tfn, efn) {
    var escape, last, m, ret, v;
    escape = /\{\{(.*?)\}\}/g;
    m = void 0;
    last = 0;
    ret = [];
    while (m = escape.exec(txt)) {
      if (m.index > last) {
        v = tfn(txt.substring(last, m.index));
        if (v != null) {
          ret.push(v);
        }
      }
      v = efn(m[1]);
      if (v != null) {
        ret.push(v);
      }
      last = m.index + m[0].length;
    }
    if (last < txt.length) {
      v = tfn(txt.substring(last, txt.length));
      if (v != null) {
        ret.push(v);
      }
    }
    return ret;
  };

  Platter.EscapesNoString = function(txt, join, fn) {
    var ret;
    ret = Platter.EscapesHandle(txt, function(txt) {
      if (/\S/.exec(txt)) {
        throw new Error(txt + " not allowed here");
      }
    }, fn);
    if (ret.length > 1 && !join) {
      throw new Error("Only one escape allowed here");
    }
    return ret.join(join);
  };

  Platter.EscapesNoStringParse = function(txt, join, jsDatas, fn) {
    return Platter.EscapesNoString(txt, join, jsParser(jsDatas, fn));
  };

  chooseData = function(txt, jsDatas) {
    var dots, m;
    m = /^(\.+)(.*?)$/.exec(txt);
    if (!m) {
      return [jsDatas[0], txt];
    }
    dots = m[1].length;
    if (dots > jsDatas.length) {
      throw new Error("" + ex + " has too many dots");
    }
    return [jsDatas[dots - 1], m[2] || '.'];
  };

  jsParser = function(jsDatas, fn) {
    return function(v) {
      var op;
      op = Platter.Internal.ParseJS(v, function(ex) {
        var ex2, jsData, _ref;
        _ref = chooseData(ex, jsDatas), jsData = _ref[0], ex2 = _ref[1];
        return "" + fn(ex, ex2, jsData);
      });
      return Platter.Internal.UnparseJS(op);
    };
  };

}).call(this);

(function() {
  var nodeWraps,
    __hasProp = {}.hasOwnProperty;

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
    el.innerHTML = "a" + wrap[1] + html + wrap[2];
    depth = wrap[0];
    while (depth--) {
      el = el.lastChild;
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
      if (!(Platter.IsPlatterAttr(att.nodeName))) {
        continue;
      }
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

  Platter.RemoveNode = function(node) {
    return node.parentNode.removeChild(node);
  };

  Platter.InsertNode = function(par, before, node) {
    if (!par) {
      par = before.parentNode;
    }
    if (!par) {
      return;
    }
    if (!before) {
      return par.appendChild(node);
    } else {
      return par.insertBefore(node, before);
    }
  };

}).call(this);

(function() {

  Platter.Undo = (function() {

    function Undo(repeat) {
      this.repeat = repeat;
      this.undos = [];
    }

    Undo.prototype.add = function(fn) {
      return this.undos.push(fn);
    };

    Undo.prototype.child = function() {
      var ret;
      ret = new Undo(this.repeat);
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

    Undo.prototype.repeater = function(fn) {
      var alldone, ret, undo;
      undo = this.child();
      alldone = false;
      this.add(function() {
        return alldone = true;
      });
      ret = function() {
        undo.undo();
        if (!alldone) {
          return fn(undo);
        }
      };
      undo.repeat = ret;
      ret();
      return ret;
    };

    return Undo;

  })();

}).call(this);

(function() {

  Platter.Transformer = function(a, b, addfn, remfn, ai, bi, aj, bj) {
    var added, ai2, bi2, diff, i, j, matched, maxdiff, _i, _j, _k, _l, _m, _n;
    if (ai == null) {
      ai = 0;
    }
    if (bi == null) {
      bi = 0;
    }
    if (aj == null) {
      aj = a.length;
    }
    if (bj == null) {
      bj = b.length;
    }
    added = 0;
    a = a.slice();
    while (ai < aj && bi < bj && a[aj - 1] === b[bj - 1]) {
      --aj;
      --bj;
    }
    while (true) {
      while (ai < aj && bi < bj && a[ai] === b[bi]) {
        ++ai;
        ++bi;
      }
      if (ai >= aj || bi >= bj) {
        break;
      }
      maxdiff = bj - bi - 1 + aj - ai - 1;
      matched = false;
      for (diff = _i = 1; _i <= maxdiff; diff = _i += 1) {
        for (i = _j = 0; _j <= diff; i = _j += 1) {
          ai2 = ai + i;
          bi2 = bi + diff - i;
          if (ai2 > aj || bi2 > bj || a[ai2] !== b[bi2]) {
            continue;
          }
          matched = true;
          for (j = _k = ai; _k < ai2; j = _k += 1) {
            remfn(added + ai);
          }
          for (j = _l = bi; _l < bi2; j = _l += 1) {
            addfn(added + ai, b[j]);
            ++added;
          }
          added -= ai2 - ai;
          ai = ai2;
          bi = bi2;
          break;
        }
        if (matched) {
          break;
        }
      }
      if (!matched) {
        break;
      }
    }
    if (ai < aj) {
      for (i = _m = ai; _m < aj; i = _m += 1) {
        remfn(added + ai);
      }
    }
    if (bi < bj) {
      for (i = _n = bi; _n < bj; i = _n += 1) {
        addfn(added + ai, b[i]);
        ++added;
      }
    }
    return added -= aj - ai;
  };

}).call(this);

(function() {

  Platter.Watch = function(undo, o, n, fn) {
    if (!(o != null)) {
      return;
    }
    if (o.platter_watch) {
      return o.platter_watch(undo, n, fn);
    }
  };

  Platter.Get = function(o, n) {
    if (!(o != null)) {
      return void 0;
    } else if (o.platter_get) {
      return o.platter_get(n);
    } else {
      return o[n];
    }
  };

  Platter.GetR = function(undo, o, n) {
    if (!(o != null)) {
      return void 0;
    } else if (o.platter_get) {
      o.platter_watch(undo, n, undo.repeat);
      return o.platter_get(n);
    } else {
      return o[n];
    }
  };

  Platter.Set = function(o, n, v) {
    if (!(o != null)) {
      return;
    }
    if (o.platter_set) {
      return o.platter_set(n, v);
    } else {
      return o[n] = v;
    }
  };

  Platter.Modify = function(o, n, fn) {
    if (!(o != null)) {
      return;
    }
    if (o.platter_modify) {
      return o.platter_modify(n, fn);
    } else {
      return Platter.Set(o, n, fn(Platter.Get(o, n)));
    }
  };

}).call(this);

(function() {

  Platter.Browser = {};

  (function() {
    var att, div, div2, isIE9, isOpera, isSafari, opera, txt, ua, ver, _i, _len, _ref;
    div = document.createElement('div');
    div.innerHTML = "<div> <span>a</span></div>";
    if (div.firstChild.firstChild === div.firstChild.lastChild) {
      Platter.Browser.BrokenWhitespace = true;
    }
    div.innerHTML = "a";
    div.appendChild(document.createTextNode("b"));
    div = div.cloneNode(true);
    if (div.firstChild === div.lastChild) {
      Platter.Browser.CombinesTextNodes = true;
    }
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
      Platter.Browser.AttributeIterationBreaksClone = true;
    }
    txt = document.createElement('input');
    if (!("oninput" in txt)) {
      txt.setAttribute("oninput", "return;");
      if (typeof txt.oninput !== "function") {
        Platter.Browser.LacksInputEvent = true;
      }
    }
    if ("onpropertychange" in txt) {
      Platter.Browser.SupportsPropertyChangeEvent = true;
    }
    if (!Platter.Browser.LacksInputEvent) {
      ua = navigator.userAgent;
      ver = /Version\/(\d+)/.exec(ua);
      opera = /Opera (\d+)/.exec(ua);
      isOpera = /Opera\//.exec(ua);
      isSafari = /Safari\//.exec(ua);
      isIE9 = /MSIE 9/.exec(ua);
      if (isIE9 || isSafari && ver && ver[1] < 5 || isOpera && ver && ver[1] < 11 || opera && opera[1] < 11) {
        return Platter.Browser.BrokenInputEvent = true;
      }
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
    if (bigDebugRan) {
      return;
    }
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
  var defaultPrint, e, expropdefs, inopdefs, inopre, inops, n, populate, preopdefs, preopre, preops, specpri, unsupported, valre,
    _this = this;

  specpri = 101;

  preopdefs = {
    0.99: "new",
    3: "++ --",
    3.99: "! ~ - + typeof void"
  };

  preopdefs[specpri] = "(";

  inopdefs = {
    1: '. [',
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

  inopre = /^\s*(\(\)|\)|\]|(?:\binstanceof\b|>>>|===|!==|\bin\b|\|\||<=|>=|\+\+|\-\-|==|!=|<<|>>|&&|>|%|\+|\-|\.|\(|\*|<|&|\^|\||\/|\[|,|:|\?)(?=[^\[\*\/%<>=&\^\|,:\?]|$)|[\+\-\(!~\\\[\*\/%<>=&\^\|,:\?\)\]]+|$)(.*)/;

  preopre = /^\s*(?:(\btypeof\b|\bvoid\b|\bnew\b|\+\+|\-\-|\(|!|~|\-|\+)(?=[^\[\*\/%<>=&\^\|,:\?])|[\[\(\+\-\*\/%<>=!&\^\|,:\?]+)(.*)/;

  valre = /^(?:(\btrue\b|\bfalse\b|\bnull\b)|(\d+\.?\d*(?:e[-+]?\d+)?)|('(?:\\.|[^'])*')|("(?:\\.|[^"])*")|(\.*)(.*?))\s*((\(\)|\)|\]|(?:\binstanceof\b|>>>|===|!==|\bin\b|\|\||<=|>=|\+\+|\-\-|==|!=|<<|>>|&&|>|%|\+|\-|\.|\(|\*|<|&|\^|\||\/|\[|,|:|\?)(?=[^\[\*\/%<>=&\^\|,:\?]|$)|[\+\-\(!~\\\[\*\/%<>=&\^\|,:\?\)\]]+|$).*)/;

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
        var _i, _len, _results1;
        _results1 = [];
        for (_i = 0, _len = ops.length; _i < _len; _i++) {
          op = ops[_i];
          _results1.push(opout[op] = {
            pri: +pri,
            upri: Math.round(pri)
          });
        }
        return _results1;
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

  inops['.'].isSpecial = true;

  inops[':'].isSpecial = true;

  preops['--'] = unsupported;

  preops['++'] = unsupported;

  delete inops['--'];

  delete inops['++'];

  Platter.Internal.ParseJS = function(txt) {
    var lastval, m, op, opdef, opstack, optxt, origtxt, top, val;
    origtxt = txt;
    opstack = [];
    lastval = null;
    while (true) {
      while (true) {
        if (m = /^\s+(.*)/.exec(txt)) {
          txt = m[1];
        }
        if (!(m = preopre.exec(txt))) {
          break;
        }
        txt = m[2];
        opdef = preops[m[1]] || unsupported;
        op = {
          upri: opdef.upri,
          pri: opdef.pri,
          txt: m[1]
        };
        if (opdef.alter) {
          op = opdef.alter(op);
        }
        opstack.push(op);
      }
      m = valre.exec(txt);
      if (m[1] || m[2]) {
        val = JSON.parse(m[1] || m[2]);
        lastval = {
          txt: 'val',
          val: val
        };
      } else if (m[3] || m[4]) {
        val = m[3] || m[4];
        val = val.slice(1, val.length - 1).replace(/(?:(\\.)|("|')|(.))/g, function($0, $1, $2, $3) {
          return $1 || $3 || ("\\" + $2);
        });
        val = JSON.parse("\"" + val + "\"");
        lastval = {
          txt: 'val',
          val: val
        };
      } else {
        lastval = {
          txt: 'get',
          ident: m[6],
          dots: m[5].length
        };
      }
      txt = m[7];
      while (true) {
        op = null;
        m = inopre.exec(txt);
        if (!m) {
          throw new Error("Unrecognised input");
        }
        txt = m[2];
        optxt = m[1] || '';
        opdef = inops[optxt];
        if (!opdef) {
          throw new Error("" + optxt + " operator not supported");
        }
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
              txt: "a()"
            };
            continue;
          }
          if (optxt === ".") {
            m = txt.match(/^([a-z0-9$_]+)(.*)/i);
            if (!m) {
              throw new Error("'.' should have an identifier after it");
            }
            txt = m[2];
            lastval = {
              left: lastval,
              pri: 1,
              txt: '.',
              ident: m[1]
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
          if (!opdef.newpri) {
            if (top.left && top.txt === '(') {
              top.txt = 'a(b)';
            }
            continue;
          }
          top.pri = opdef.newpri;
        }
        break;
      }
      if (opdef.isend) {
        return lastval;
      }
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

  Platter.Internal.ParseString = function(str) {
    var gotop, gotsrc, gottext, op;
    op = null;
    gotop = function(op2) {
      return op = op ? {
        txt: '+',
        left: op,
        right: op2
      } : op2;
    };
    gottext = function(txt) {
      return gotop({
        txt: 'val',
        val: txt
      });
    };
    gotsrc = function(txt) {
      return gotop({
        txt: 'tostr',
        inner: Platter.Internal.ParseJS(txt)
      });
    };
    Platter.EscapesHandle(str, gottext, gotsrc);
    return op;
  };

  Platter.Internal.ParseNonString = function(str, joinop) {
    var gotop, gotsrc, gottext, op;
    op = null;
    gotop = function(op2) {
      return op = (function() {
        if (!op) {
          return op2;
        } else if (!joinop) {
          throw new Error("Only one escape allowed: " + str);
        } else {
          return {
            txt: joinop,
            left: op,
            right: op2
          };
        }
      })();
    };
    gottext = function(txt) {
      if (/\S/.exec(txt)) {
        throw new Error("Only whitespace allowed around escapes: " + str);
      }
    };
    gotsrc = function(txt) {
      return gotop(Platter.Internal.ParseJS(txt));
    };
    Platter.EscapesHandle(str, gottext, gotsrc);
    return op;
  };

  defaultPrint = {
    '(': function(op, ctx) {
      return "(" + (this.go(op.inner, ctx)) + ")";
    },
    '[': function(op, ctx) {
      if (op.inner.txt === 'val' && typeof op.inner.val === 'string') {
        return Platter.Internal.Index(this.go(op.left, ctx), op.inner.val);
      } else {
        return "" + (this.go(op.left, ctx)) + "[" + (this.go(op.inner, ctx)) + "]";
      }
    },
    '.': function(op, ctx) {
      return Platter.Internal.Index(this.go(op.left, ctx), op.ident);
    },
    'a()': function(op, ctx) {
      return "" + (this.go(op.left, ctx)) + "()";
    },
    'a(b)': function(op, ctx) {
      return "" + (this.go(op.left, ctx)) + "(" + (this.go(op.inner, ctx)) + ")";
    },
    '?': function(op, ctx) {
      return "" + (this.go(op.left, ctx)) + " ? " + (this.go(op.inner, ctx)) + " : " + (this.go(op.right, ctx));
    },
    ',': function(op, ctx) {
      return "" + (this.go(op.left, ctx)) + ", " + (this.go(op.right, ctx));
    },
    '#binop': function(op, ctx) {
      return "" + (this.go(op.left, ctx)) + " " + op.txt + " " + (this.go(op.right, ctx));
    },
    '#other': function(op, ctx) {
      return "" + op.txt + " " + (this.go(op.right, ctx));
    },
    'varGet': function(op, ctx) {},
    'dataGet': function(op, ctx) {
      throw new Error("No datas and no variables");
    },
    'get': function(op, ctx) {
      var ret;
      if (!op.dots) {
        ret = this.varGet(op, ctx);
        if (ret) {
          return ret;
        }
      }
      return this.dataGet(op, ctx);
    },
    'val': function(op, ctx) {
      return JSON.stringify(op.val);
    },
    'tostr': function(op, ctx) {
      return "Platter.Str(" + (this.go(op.inner, ctx)) + ")";
    },
    go: function(op, ctx) {
      if (this[op.txt]) {
        return this[op.txt](op, ctx);
      } else if (op.left) {
        return this['#binop'](op, ctx);
      } else {
        return this['#other'](op, ctx);
      }
    }
  };

  Platter.Internal.UnparseJS = function(op) {
    return defaultPrint.go(op);
  };

  Platter.Internal.JSPrinter = function() {
    var a;
    a = function() {};
    a.prototype = defaultPrint;
    return new a;
  };

}).call(this);

(function() {
  var clean, exprvar, index, jskeywords, singrep, toSrc;

  clean = function(n) {
    n = n.replace(/#/g, "");
    if (!/^[a-z]/i.exec(n)) {
      n = 'v' + n;
    }
    n = n.replace(/[^a-z0-9\$]+/ig, "_");
    if (jskeywords[n]) {
      n = "" + n + "_";
    }
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
    if (typeof o === 'number' || !o) {
      return o + '';
    }
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

  Platter.Internal.Index = index = function(arr, entry) {
    if (!/^[a-z$_][a-z0-9$_]*$/i.exec(entry) || jskeywords[entry]) {
      return "" + arr + "[" + (toSrc(entry)) + "]";
    } else {
      return "" + arr + "." + entry;
    }
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

    function CodeGen(parent) {
      this.parent = parent;
      this._code = [];
      this._vars = {};
    }

    CodeGen.prototype.child = function() {
      return new Platter.Internal.CodeGen(this);
    };

    CodeGen.prototype.existingVar = function(name) {
      name = clean(name);
      this._vars[name] = {
        _name: name,
        _existing: true
      };
      return this.getVar(name);
    };

    CodeGen.prototype.forceVar = function(name) {
      return this._vars[name.n || name]._forced = true;
    };

    CodeGen.prototype.addForcedVar = function(name, expr, compVal) {
      var ret;
      ret = this.addVar(name, expr, compVal);
      this.forceVar(ret);
      return ret;
    };

    CodeGen.prototype.addVar = function(name, expr, compVal) {
      if (expr == null) {
        expr = 'null';
      }
      if (compVal == null) {
        compVal = null;
      }
      name = clean(name);
      name = this._uniqName(name);
      this._vars[name] = {
        _name: name,
        _expr: expr,
        _compVal: compVal
      };
      this._code.push({
        _expr: expr,
        _type: 'var',
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
      return this._code.push({
        _expr: expr
      });
    };

    CodeGen.prototype.toString = function() {
      var add, code, i, op, rep, s, sub, varcnt, varreps, vr, _i, _j, _k, _len, _len1, _ref, _ref1;
      s = "";
      varcnt = {};
      varreps = {};
      add = function(expr) {
        return expr.replace(exprvar, function($0, $1) {
          return ++varcnt[$1];
        });
      };
      sub = function(expr) {
        return expr.replace(exprvar, function($0, $1) {
          return --varcnt[$1];
        });
      };
      rep = function(expr) {
        return expr.replace(exprvar, function($0, $1) {
          return varreps[$1] || $1;
        });
      };
      _ref = this._code;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        op = _ref[_i];
        if (op._type === 'var') {
          vr = this._vars[op._name];
          varcnt[op._name] = vr._existing ? 1000 : vr._forced ? 1 : 0;
        }
        add(op._expr);
      }
      code = this._code.slice(0);
      for (i = _j = _ref1 = code.length - 1; _j >= 0; i = _j += -1) {
        op = code[i];
        if (op._type === 'var' && (varcnt[op._name] || 0) === 0) {
          code[i] = void 0;
          sub(op._expr);
        }
      }
      for (_k = 0, _len1 = code.length; _k < _len1; _k++) {
        op = code[_k];
        if (op) {
          if (op._type === 'var') {
            if ((varcnt[op._name] || 0) === 1) {
              varreps[op._name] = rep(op._expr);
            } else {
              s += rep("var #" + op._name + "# = " + op._expr + ";\n");
            }
          } else {
            s += rep(op._expr) + ";\n";
          }
        }
      }
      return s;
    };

    CodeGen.prototype._uniqName = function(name) {
      var c;
      if (this._varExists(name)) {
        c = (this._vars[name]._lastNum || 1) + 1;
        while (this._varExists(name + c)) {
          ++c;
        }
        if (this._vars[name]) {
          this._vars[name]._lastNum = c;
        }
        name = name + c;
      }
      return name;
    };

    CodeGen.prototype._varExists = function(name) {
      var _ref;
      return this._vars[name] || ((_ref = this.parent) != null ? _ref._varExists(name) : void 0);
    };

    CodeGen.prototype.toSrc = toSrc;

    CodeGen.prototype.index = index;

    CodeGen.prototype.replaceExpr = function(from, to) {
      var op, _i, _len, _ref, _results;
      _ref = this._code;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        op = _ref[_i];
        _results.push(op._expr = op._expr.split(from).join(to));
      }
      return _results;
    };

    return CodeGen;

  })();

}).call(this);

(function() {
  var printer,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  printer = Platter.Internal.JSPrinter();

  printer['dataGet'] = function(op, ctx) {
    var data;
    data = ctx.datas[(op.dots || 1) - 1];
    if (op.ident) {
      return Platter.Internal.Index(data, op.ident);
    } else {
      return data;
    }
  };

  printer['.'] = function(op, ctx) {
    return "Platter.Get(" + (this.go(op.left, ctx)) + ", " + (Platter.Internal.ToSrc(op.ident)) + ")";
  };

  printer['['] = function(op, ctx) {
    return "Platter.Get(" + (this.go(op.left, ctx)) + ", " + (this.go(op.inner, ctx)) + ")";
  };

  printer['a()'] = function(op, ctx) {
    var fn, lop, t;
    lop = op.left;
    if (lop.txt === 'get' && lop.dots) {
      t = ctx.js.addVar('t');
      fn = "Platter.Get(" + t + "=" + (this.go({
        txt: 'get',
        dots: lop.dots,
        ident: ''
      }, ctx)) + ", " + (this.go({
        txt: 'val',
        val: lop.ident
      }, ctx)) + ")";
    } else if (lop.txt === '.') {
      t = ctx.js.addVar('t');
      fn = "Platter.Get(" + t + "=" + (this.go(lop.left, ctx)) + ", " + (this.go({
        txt: 'val',
        val: lop.ident
      }, ctx)) + ")";
    } else if (lop.txt === '[') {
      t = ctx.js.addVar('t');
      fn = "Platter.Get(" + t + "=" + (this.go(lop.left, ctx)) + ", " + (this.go(lop.inner, ctx)) + ")";
    } else {
      t = ctx.datas[0];
      fn = "(" + (this.go(lop, ctx)) + ")";
    }
    if (op.inner) {
      return "" + fn + ".call(" + t + ", " + (this.go(op.inner, ctx)) + ")";
    } else {
      return "" + fn + ".call(" + t + ")";
    }
  };

  printer['a(b)'] = printer['a()'];

  Platter.Internal.PlainRunner = (function(_super) {

    __extends(PlainRunner, _super);

    function PlainRunner() {
      return PlainRunner.__super__.constructor.apply(this, arguments);
    }

    return PlainRunner;

  })(Platter.Internal.TemplateRunner);

  Platter.Internal.PlainCompiler = (function(_super) {

    __extends(PlainCompiler, _super);

    function PlainCompiler() {
      return PlainCompiler.__super__.constructor.apply(this, arguments);
    }

    PlainCompiler.prototype.runner = Platter.Internal.PlainRunner;

    PlainCompiler.prototype.doBase = function(ps, n, v, expr, sep) {
      var ctx, op;
      if (sep === true) {
        op = Platter.Internal.ParseString(v);
      } else {
        op = Platter.Internal.ParseNonString(v, sep);
      }
      ctx = {
        datas: ps.jsDatas,
        js: ps.js.child()
      };
      ctx.js.existingVar('undo');
      expr = expr.replace(/#el#/g, "" + ps.jsEl).replace(/#n#/g, ps.js.toSrc(n)).replace(/#v#/g, printer.go(op, ctx));
      return ps.js.addExpr(expr);
    };

    PlainCompiler.prototype.doRedo = PlainCompiler.prototype.doBase;

    PlainCompiler.prototype.doSimple = function(ps, n, v, expr) {
      return this.doBase(ps, n, v, expr, true);
    };

    return PlainCompiler;

  })(Platter.Internal.TemplateCompiler);

  Platter.Plain = new Platter.Internal.PlainCompiler;

}).call(this);

(function() {
  var printer,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  printer = Platter.Internal.JSPrinter();

  printer['dataGet'] = function(op, ctx) {
    var data;
    data = ctx.datas[(op.dots || 1) - 1];
    if (op.ident) {
      return "Platter.GetR(undo, " + data + ", " + (Platter.Internal.ToSrc(op.ident)) + ")";
    } else {
      return data;
    }
  };

  printer['.'] = function(op, ctx) {
    return "Platter.GetR(undo, " + (this.go(op.left, ctx)) + ", " + (Platter.Internal.ToSrc(op.ident)) + ")";
  };

  printer['['] = function(op, ctx) {
    return "Platter.GetR(undo, " + (this.go(op.left, ctx)) + ", " + (this.go(op.inner, ctx)) + ")";
  };

  printer['a()'] = function(op, ctx) {
    var fn, lop, t;
    lop = op.left;
    if (lop.txt === 'get' && lop.dots) {
      t = ctx.js.addVar('t');
      fn = "Platter.GetR(undo, " + t + "=" + (this.go({
        txt: 'get',
        dots: lop.dots,
        ident: ''
      }, ctx)) + ", " + (this.go({
        txt: 'val',
        val: lop.ident
      }, ctx)) + ")";
    } else if (lop.txt === '.') {
      t = ctx.js.addVar('t');
      fn = "Platter.GetR(undo, " + t + "=" + (this.go(lop.left, ctx)) + ", " + (this.go({
        txt: 'val',
        val: lop.ident
      }, ctx)) + ")";
    } else if (lop.txt === '[') {
      t = ctx.js.addVar('t');
      fn = "Platter.GetR(undo, " + t + "=" + (this.go(lop.left, ctx)) + ", " + (this.go(lop.inner, ctx)) + ")";
    } else {
      t = ctx.datas[0];
      fn = "(" + (this.go(lop, ctx)) + ")";
    }
    if (op.inner) {
      return "" + fn + ".call(" + t + ", " + (this.go(op.inner, ctx)) + ")";
    } else {
      return "" + fn + ".call(" + t + ")";
    }
  };

  printer['a(b)'] = printer['a()'];

  Platter.Internal.DynamicRunner = (function(_super) {

    __extends(DynamicRunner, _super);

    function DynamicRunner() {
      return DynamicRunner.__super__.constructor.apply(this, arguments);
    }

    return DynamicRunner;

  })(Platter.Internal.TemplateRunner);

  Platter.Internal.DynamicCompiler = (function(_super) {

    __extends(DynamicCompiler, _super);

    function DynamicCompiler() {
      return DynamicCompiler.__super__.constructor.apply(this, arguments);
    }

    DynamicCompiler.prototype.runner = Platter.Internal.DynamicRunner;

    DynamicCompiler.prototype.doBase = function(ps, n, v, expr, sep) {
      var ctx, op;
      if (sep === true) {
        op = Platter.Internal.ParseString(v);
      } else {
        op = Platter.Internal.ParseNonString(v, sep);
      }
      ctx = {
        datas: ps.jsDatas,
        js: ps.js.child()
      };
      ctx.js.existingVar('undo');
      expr = expr.replace(/#el#/g, "" + ps.jsEl).replace(/#n#/g, ps.js.toSrc(n)).replace(/#v#/g, printer.go(op, ctx));
      return ps.js.addExpr("undo.repeater(function(undo){\n	" + expr + "\n})");
    };

    DynamicCompiler.prototype.doSimple = function(ps, n, v, expr) {
      return this.doBase(ps, n, v, expr, true);
    };

    DynamicCompiler.prototype.doRedo = function(ps, n, v, expr, sep) {
      var jsChange, jsUndo2;
      jsUndo2 = ps.js.addForcedVar("" + ps.jsPre + "_undo", "undo.child()");
      jsChange = ps.js.addForcedVar("" + ps.jsPre + "_change", "function(val) {\n	" + jsUndo2 + ".undo();\n	" + (expr.replace(/#v#/g, 'val').replace(/#el#/g, ps.jsEl)) + ";\n}");
      return this.doBase(ps, n, v, "" + jsChange + "(#v#)", sep);
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
      var doRep, i, _i, _ref,
        _this = this;
      doRep = function() {
        return replaceMe(this);
      };
      this.on('add', add);
      this.on('remove', remove);
      this.on('reset', doRep);
      for (i = _i = 0, _ref = this.length; _i < _ref; i = _i += 1) {
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
          if (opts.index <= n) {
            return fn();
          }
        };
        rem = function(el, coll, opts) {
          if (opts.index <= n) {
            return fn();
          }
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
  var isNat, objprot, setprot;

  isNat = function(n) {
    return !!/^[0-9]+$/.exec(n);
  };

  if (window.Batman) {
    objprot = Batman.Object.prototype;
    objprot.platter_watch = function(undo, n, fn) {
      var _this = this;
      this.observe(n, fn);
      return undo.add(function() {
        return _this.forget(n, fn);
      });
    };
    objprot.platter_get = function(n) {
      if (this.hasProperty(n)) {
        return this.get(n);
      } else {
        return this[n];
      }
    };
    objprot.platter_set = function(n, v) {
      return this.set(n, v);
    };
    objprot.platter_modify = function(n, fn) {
      if (this.hasProperty(n)) {
        return this.set(n, fn(this.get(n)));
      } else {
        return this[n] = fn(this[n]);
      }
    };
    objprot.platter_watchcoll = function(undo, add, remove, replaceMe) {
      var arr, doRep, i, _i, _ref,
        _this = this;
      arr = this.toArray();
      doRep = function() {
        var arr2;
        arr2 = _this.toArray();
        return Platter.Transformer(arr, arr2, function(i, o) {
          arr.splice(i, 0, o);
          return add(o, this, {
            index: i
          });
        }, function(i) {
          remove(arr[i], this, {
            index: i
          });
          return arr.splice(i, 1);
        });
      };
      for (i = _i = 0, _ref = arr.length; _i < _ref; i = _i += 1) {
        add(arr[i], this, {
          index: i
        });
      }
      this.event('change').addHandler(doRep);
      return undo.add(function() {
        return _this.event('change').removeHandler(doRep);
      });
    };
    setprot = Batman.Set.prototype;
    setprot.platter_get = function(n) {
      if (isNat(n)) {
        return this.toArray()[n];
      } else if (this.hasProperty(n)) {
        return this.get(n);
      } else {
        return this[n];
      }
    };
    setprot.platter_watch = function(undo, n, fn) {
      var _this = this;
      if (isNat(n)) {
        this.event('change').addHandler(fn);
        return undo.add(function() {
          return _this.event('change').removeHandler(fn);
        });
      } else {
        this.observe(n, fn);
        return undo.add(function() {
          return _this.forget(n, fn);
        });
      }
    };
    Platter.Internal.DebugList.push({
      platter_watch: objprot,
      platter_get: objprot,
      platter_set: objprot,
      platter_watchcoll: objprot
    });
    Platter.Internal.DebugList.push({
      platter_get: setprot,
      platter_watch: setprot
    });
  }

}).call(this);

(function() {
  var collprot, isNat;

  isNat = function(n) {
    return !!/^[0-9]+$/.exec(n);
  };

  if (window.ko) {
    Platter.WatchPreKO = Platter.Watch;
    Platter.Watch = function(undo, o, n, fn) {
      var sub, v;
      v = Platter.GetPreKO(o, n);
      if (v && ko.isSubscribable(v) && !v.platter_watchcoll) {
        sub = v.subscribe(fn);
        undo.add(function() {
          return sub.dispose();
        });
      }
      return Platter.WatchPreKO(undo, o, n, fn);
    };
    Platter.GetPreKO = Platter.Get;
    Platter.Get = function(o, n) {
      var v;
      v = Platter.GetPreKO(o, n);
      if (ko.isObservable(v) && !v.platter_watchcoll) {
        return v();
      } else {
        return v;
      }
    };
    Platter.GetRPreKO = Platter.GetR;
    Platter.GetR = function(undo, o, n) {
      var sub, v;
      v = Platter.GetRPreKO(undo, o, n);
      if (ko.isObservable(v) && !v.platter_watchcoll) {
        sub = v.subscribe(undo.repeat);
        undo.add(function() {
          return sub.dispose();
        });
        return v();
      } else {
        return v;
      }
    };
    Platter.SetPreKO = Platter.Set;
    Platter.Set = function(o, n, v) {
      var oldv;
      oldv = Platter.GetPreKO(o, n);
      if (ko.isObservable(oldv)) {
        return oldv(v);
      } else {
        return Platter.SetPreKO(o, n, v);
      }
    };
    Platter.ModifyPreKO = Platter.Modify;
    Platter.Modify = function(o, n, fn) {
      var oldv;
      oldv = Platter.GetPreKO(o, n);
      if (ko.isObservable(oldv)) {
        return oldv(fn(oldv()));
      } else {
        return Platter.ModifyPreKO(o, n, fn);
      }
    };
    collprot = ko.observableArray.fn;
    collprot.platter_watch = function(undo, n, fn) {
      var sub;
      sub = this.subscribe(fn);
      return undo.add(function() {
        return sub.dispose();
      });
    };
    collprot.platter_get = function(n) {
      return this()[n];
    };
    collprot.platter_set = function(n, v) {
      this()[n] = v;
      return this.valueHasMutated();
    };
    collprot.platter_modify = function(n, fn) {
      this()[n] = fn(this()[n]);
      return this.valueHasMutated();
    };
    collprot.platter_watchcoll = function(undo, add, remove, replaceMe) {
      var arr, doRep, i, sub, _i, _ref,
        _this = this;
      arr = this().slice();
      doRep = function() {
        var arr2;
        arr2 = _this();
        return Platter.Transformer(arr, arr2, function(i, o) {
          arr.splice(i, 0, o);
          return add(o, this, {
            index: i
          });
        }, function(i) {
          remove(arr[i], this, {
            index: i
          });
          return arr.splice(i, 1);
        });
      };
      for (i = _i = 0, _ref = arr.length; _i < _ref; i = _i += 1) {
        add(arr[i], this, {
          index: i
        });
      }
      sub = this.subscribe(doRep);
      return undo.add(function() {
        return sub.dispose();
      });
    };
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
  var collprot, collprots, isNat, modprot, unique, _i, _len;

  isNat = function(n) {
    return !!/^[0-9]+$/.exec(n);
  };

  unique = {};

  if (window.Ember) {
    modprot = Ember.Object.prototype;
    modprot.platter_watch = function(undo, n, fn) {
      var _this = this;
      this.addObserver(n, fn);
      return undo.add(function() {
        return _this.removeObserver(n, fn);
      });
    };
    modprot.platter_get = function(n) {
      return this.getWithDefault(n, this[n]);
    };
    modprot.platter_set = function(n, v) {
      return this.set(n, v);
    };
    modprot.platter_modify = function(n, fn) {
      var v;
      v = this.getWithDefault(n, unique);
      if (v !== unique) {
        return this.set(n, fn(v));
      } else {
        return this[n] = fn(this[n]);
      }
    };
    Platter.Internal.DebugList.push({
      platter_watch: modprot,
      platter_get: modprot,
      platter_set: modprot,
      platter_modify: modprot
    });
    collprots = [Ember.Enumerable.mixins[0].properties, Ember.ArrayProxy.prototype, Ember.Set.prototype];
    for (_i = 0, _len = collprots.length; _i < _len; _i++) {
      collprot = collprots[_i];
      collprot.platter_watchcoll = function(undo, add, remove, replaceMe) {
        var arr, doRep, obs,
          _this = this;
        arr = [];
        doRep = function() {
          var arr2;
          arr2 = _this.toArray();
          return Platter.Transformer(arr, arr2, function(i, o) {
            arr.splice(i, 0, o);
            return add(o, this, {
              index: i
            });
          }, function(i) {
            remove(arr[i], this, {
              index: i
            });
            return arr.splice(i, 1);
          });
        };
        doRep();
        obs = {
          enumerableWillChange: function() {},
          enumerableDidChange: doRep
        };
        this.addEnumerableObserver(obs);
        return undo.add(function() {
          return _this.removeEnumerableObserver(obs);
        });
      };
      collprot.platter_watch = function(undo, n, fn) {
        var obs,
          _this = this;
        obs = {
          enumerableWillChange: function() {},
          enumerableDidChange: fn
        };
        this.addEnumerableObserver(obs);
        return undo.add(function() {
          return _this.removeEnumerableObserver(obs);
        });
      };
      collprot.platter_get = function(n) {
        return this.toArray()[n];
      };
      collprot.platter_set = function(n, v) {
        var _results;
        if (n === 'length' && isNat(v)) {
          while (this.length > n && this.length > 0) {
            this.pop();
          }
          _results = [];
          while (this.length < n) {
            _results.push(this.push(void 0));
          }
          return _results;
        } else {
          return this[n] = v;
        }
      };
      Platter.Internal.DebugList.push({
        platter_watch: collprot,
        platter_get: collprot,
        platter_set: collprot,
        platter_watchcoll: collprot
      });
    }
  }

}).call(this);

(function() {

  Platter.Internal.TemplateCompiler.prototype.addAttrAssigner('checked', 0, "#el#.defaultChecked = #el#.checked = !!(#v#)", '&&');

}).call(this);

(function() {

  Platter.Internal.TemplateCompiler.prototype.addAttrAssigner('class', 0, '#el#.className = #v#', true);

}).call(this);

(function() {
  var Compiler, Runner, defaultRunEvent, doEvent, isEventAttr, runDOMEvent, runEvent, runJQueryEvent,
    __hasProp = {}.hasOwnProperty;

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

  if (window.jQuery) {
    defaultRunEvent = runJQueryEvent;
  }

  runEvent = Runner.prototype.addUniqueMethod('runEvent', defaultRunEvent);

  doEvent = Compiler.prototype.addUniqueMethod('doEvent', function(ps, realn, v) {
    var ev, isAfter, m,
      _this = this;
    m = /^on(after)?(.*)$/.exec(realn);
    isAfter = m[1];
    ev = m[2];
    return Platter.EscapesNoString(v, "", function(t) {
      var handler, jsFn, jsTarget, jsThis, op, orig, post, valGetter;
      orig = t;
      m = /^(<>|\+\+|--)?(.*?)(\+\+|--)?$/.exec(t);
      if (!m || m[1] && m[3] && m[1] !== m[3]) {
        throw new Error("{{" + orig + "}} is bad; only event handlers of the forms a.b, <>a.b, ++a.b, --a.b, a.b++ and a.b-- are currently supported");
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
        handler = "Platter.Modify(" + jsTarget + ", " + (ps.js.toSrc(post)) + ", function(v){return " + op + "v})";
      } else if (op === '<>') {
        valGetter = ps.valGetter ? ps.valGetter.replace("#el#", "" + ps.jsEl) : ps.js.index(ps.jsEl, ps.el.type === 'checkbox' ? 'checked' : 'value');
        handler = "Platter.Set(" + jsTarget + ", " + (ps.js.toSrc(post)) + ", " + valGetter + ")";
      } else {
        if (post) {
          jsFn = ps.js.addForcedVar("" + ps.jsEl + "_fn", "null");
          _this.doBase(ps, 'text', "{{" + t + "}}", "" + jsFn + " = #v#", null);
        } else {
          jsFn = jsTarget;
        }
        handler = "" + jsFn + ".call(" + jsTarget + ", ev, " + (ps.js.toSrc(ev)) + ", " + ps.jsEl + ")";
      }
      if (isAfter) {
        return ps.js.addExpr("this." + runEvent + "(undo, " + ps.jsEl + ", " + (ps.js.toSrc(ev)) + ", function(ev) {setTimeout(function(){ " + handler + " }, 1)})");
      } else {
        return ps.js.addExpr("this." + runEvent + "(undo, " + ps.jsEl + ", " + (ps.js.toSrc(ev)) + ", function(ev){ " + handler + " })");
      }
    });
  });

  Compiler.prototype.addAttrPlugin('on.*', 0, function(comp, ps) {
    var n, realn, v, _ref, _ref1;
    _ref = ps.attrs();
    for (realn in _ref) {
      if (!__hasProp.call(_ref, realn)) continue;
      _ref1 = _ref[realn], n = _ref1.n, realn = _ref1.realn, v = _ref1.v;
      if (isEventAttr(realn)) {
        if (realn !== n) {
          ps.el.removeAttribute(n);
        }
        comp[doEvent](ps, realn, v);
        ps.remAttr(realn);
      }
    }
    return false;
  });

}).call(this);

(function() {

  if (Platter.Browser.LacksInputEvent || Platter.Browser.BrokenInputEvent) {
    Platter.Internal.TemplateCompiler.prototype.addAttrPlugin('oninput', 199, function(comp, ps) {
      var ev, v, _i, _len, _ref;
      v = ps.getAttr('oninput');
      if (Platter.Browser.LacksInputEvent) {
        ps.remAttr('oninput');
      }
      if (Platter.Browser.SupportsPropertyChangeEvent) {
        ps.setAttr('onpropertychange', v);
      }
      _ref = ['onafterdrop', 'onafterkeydown', 'onafterpaste', 'onaftercut', 'onaftertextInput', 'onafterdragend'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ev = _ref[_i];
        ps.setAttr(ev, v + (ps.getAttr(ev) || ''));
      }
      return false;
    });
  }

}).call(this);

(function() {

  if (Platter.Browser.SupportsPropertyChangeEvent) {
    Platter.Internal.TemplateCompiler.prototype.addAttrAssigner('value', 0, "if (#el#.value !== #v#) #el#.value = #v#", true);
  } else {
    Platter.Internal.TemplateCompiler.prototype.addAttrAssigner('value', 0, "#el#.value = #v#", true);
  }

  Platter.Internal.TemplateCompiler.prototype.addAttrPlugin('value|checked', 200, function(comp, ps) {
    var ev, m, n, type, v, _i, _len, _ref;
    _ref = ['value', 'checked'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      n = _ref[_i];
      v = ps.getAttr(n);
      if (!v) {
        continue;
      }
      m = /^\{\{<>(.*?)\}\}/.exec(v);
      if (!m) {
        continue;
      }
      if (m[0].length !== v.length) {
        throw new Error("{{<>thing}} cannot be in the same value attribute as anything else");
      }
      type = ps.getAttr('type');
      if (Platter.HasEscape(type || '')) {
        throw new Error("{{<>thing}} cannot be the value of an element with dynamic type");
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
      if (opt.selected) {
        return this[getOptVal](opt);
      }
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
    if (!Platter.HasEscape(ps.getAttr('value'))) {
      return;
    }
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
    if (!pps) {
      return;
    }
    if (!ps.getAttr('value')) {
      ps.setAttr('value', extraScopes ? '{{.}}' : '{{undefined}}');
    }
    if (!Platter.HasEscape(ps.getAttr('value'))) {
      return;
    }
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
    __slice = [].slice;

  Plain = Platter.Internal.PlainCompiler;

  plainName = Plain.prototype.addUniqueMethod('foreach', function(ps, val, tmplname) {
    var jsFor;
    jsFor = ps.js.addVar("" + ps.jsPre + "_for");
    ps.js.forceVar(ps.jsPost);
    return this.doBase(ps, null, val, "" + jsFor + " = #v#;\nif (" + jsFor + ")\n	for (var i=0; i<" + jsFor + ".length; ++i)\n		Platter.InsertNode(" + (ps.parent.jsEl || 'null') + ", " + ps.jsPost + ", this." + tmplname + ".run(" + jsFor + "[i], " + (ps.jsDatas.join(',')) + ", undo, false).docfrag)", null);
  });

  Plain.prototype.addExtractorPlugin('foreach', 100, plainName, 1);

  Dynamic = Platter.Internal.DynamicCompiler;

  DynamicRun = Platter.Internal.DynamicRunner;

  runForEach = DynamicRun.prototype.addUniqueMethod('foreach', function(undo, tmpl, datas, par, start, end) {
    var hasRun, ret, undoch,
      _this = this;
    undoch = undo.child();
    hasRun = false;
    return ret = function(coll) {
      if (hasRun) {
        undoch.undo();
        _this.removeBetween(start, end, par);
      } else {
        hasRun = true;
      }
      return _this[runForEachInner](undoch, coll, tmpl, datas, par, start, end, ret);
    };
  });

  runForEachInner = DynamicRun.prototype.addUniqueMethod('foreach_inner', function(undo, coll, tmpl, datas, par, start, end, replaceMe) {
    var add, posts, pres, rem, spareUndos, undos,
      _this = this;
    pres = [start];
    posts = [end];
    undos = [];
    spareUndos = [];
    add = function(model, coll, opts) {
      var at, frag, fragfirst, fraglast, newend, undoch;
      at = opts.index;
      newend = document.createComment("");
      undoch = spareUndos.pop() || undo.child();
      frag = tmpl.run.apply(tmpl, [model].concat(__slice.call(datas), [undoch], [false])).docfrag;
      fragfirst = frag.firstChild;
      fraglast = frag.lastChild;
      Platter.InsertNode(par, posts[at], frag);
      undos.splice(at, 0, undoch);
      pres.splice(at + 1, 0, fraglast);
      return posts.splice(at, 0, fragfirst);
    };
    rem = function(model, coll, opts) {
      var at;
      at = opts.index;
      _this.removeBetween(pres[at], posts[at + 1], par);
      pres.splice(at + 1, 1);
      posts.splice(at, 1);
      undos[at].undo();
      return spareUndos.push(undos.splice(at, 1)[0]);
    };
    return this[watchCollection](undo, coll, add, rem, replaceMe);
  });

  watchCollection = DynamicRun.prototype.addUniqueMethod('foreach_watch', function(undo, coll, add, rem, replaceMe) {
    var i, o, _i, _len;
    if (coll instanceof Array) {
      for (i = _i = 0, _len = coll.length; _i < _len; i = ++_i) {
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

  doForEach = Dynamic.prototype.addUniqueMethod('foreach', function(ps, val, tmplname) {
    var jsChange;
    jsChange = ps.js.addForcedVar("" + ps.jsPre + "_forchange", "this." + runForEach + "(undo, this." + tmplname + ", [" + (ps.jsDatas.join(', ')) + "], " + (ps.parent.jsEl || null) + ", " + ps.jsPre + ", " + ps.jsPost + ")");
    return this.doBase(ps, null, val, "" + jsChange + "(#v#)", null);
  });

  Dynamic.prototype.addExtractorPlugin('foreach', 100, doForEach, 1);

}).call(this);

(function() {
  var Dynamic, DynamicRun, Plain, dynName, dynRunName, plainName,
    __slice = [].slice;

  Plain = Platter.Internal.PlainCompiler;

  plainName = Plain.prototype.addUniqueMethod('if', function(ps, val, tmplname) {
    ps.js.forceVar(ps.jsPost);
    return this.doBase(ps, null, val, "if (#v#) Platter.InsertNode(" + (ps.parent.jsEl || 'null') + ", " + ps.jsPost + ", this." + tmplname + ".run(" + (ps.jsDatas.join(', ')) + ", undo, false).docfrag)", "&&");
  });

  Plain.prototype.addExtractorPlugin('if', 60, plainName, 0);

  plainName = Plain.prototype.addUniqueMethod('unless', function(ps, val, tmplname) {
    ps.js.forceVar(ps.jsPost);
    return this.doBase(ps, null, val, "if (!(#v#)) Platter.InsertNode(" + (ps.parent.jsEl || 'null') + ", " + ps.jsPost + ", this." + tmplname + ".run(" + (ps.jsDatas.join(', ')) + ", undo, false).docfrag)", "&&");
  });

  Plain.prototype.addExtractorPlugin('unless', 60, plainName, 0);

  Dynamic = Platter.Internal.DynamicCompiler;

  DynamicRun = Platter.Internal.DynamicRunner;

  dynRunName = DynamicRun.prototype.addUniqueMethod('if', function(undo, datas, tmpl, par, start, end) {
    var shown, undoch,
      _this = this;
    shown = false;
    undoch = undo.child();
    return function(show) {
      show = !!show;
      if (shown === show) {
        return;
      }
      shown = show;
      if (show) {
        return Platter.InsertNode(par, end, tmpl.run.apply(tmpl, __slice.call(datas).concat([undoch], [false])).docfrag);
      } else {
        _this.removeBetween(start, end, par);
        return undoch.undo();
      }
    };
  });

  dynName = Dynamic.prototype.addUniqueMethod('if', function(ps, val, tmplname) {
    var jsChange;
    jsChange = ps.js.addForcedVar("" + ps.jsPre + "_ifchange", "this." + dynRunName + "(undo, [" + (ps.jsDatas.join(', ')) + "], this." + tmplname + ", " + (ps.parent.jsEl || 'null') + ", " + ps.jsPre + ", " + ps.jsPost + ")");
    return this.doBase(ps, null, val, "" + jsChange + "(#v#)", "&&");
  });

  Dynamic.prototype.addExtractorPlugin('if', 60, dynName, 0);

  dynName = Dynamic.prototype.addUniqueMethod('unless', function(ps, val, tmplname) {
    var jsChange;
    jsChange = ps.js.addForcedVar("" + ps.jsPre + "_ifchange", "this." + dynRunName + "(undo, [" + (ps.jsDatas.join(', ')) + "], this." + tmplname + ", " + (ps.parent.jsEl || 'null') + ", " + ps.jsPre + ", " + ps.jsPost + ")");
    return this.doBase(ps, null, val, "" + jsChange + "(!(#v#))", "&&");
  });

  Dynamic.prototype.addExtractorPlugin('unless', 60, dynName, 0);

}).call(this);

(function() {
  var Dynamic, DynamicRun, Plain, dynName, dynRunName, plainName,
    __slice = [].slice;

  Plain = Platter.Internal.PlainCompiler;

  plainName = Plain.prototype.addUniqueMethod('with', function(ps, val, tmplname) {
    ps.js.forceVar(ps.jsPost);
    return this.doBase(ps, null, val, "Platter.InsertNode(" + (ps.parent.jsEl || 'null') + ", " + ps.jsPost + ", this." + tmplname + ".run(#v#, " + (ps.jsDatas.join(', ')) + ", undo, false).docfrag)", null);
  });

  Plain.prototype.addExtractorPlugin('with', 40, plainName, 1);

  Dynamic = Platter.Internal.DynamicCompiler;

  DynamicRun = Platter.Internal.DynamicRunner;

  dynRunName = DynamicRun.prototype.addUniqueMethod('with', function(undo, datas, tmpl, par, start, end) {
    var undoch,
      _this = this;
    undoch = undo.child();
    return function(val) {
      _this.removeBetween(start, end, par);
      undoch.undo();
      return Platter.InsertNode(par, end, tmpl.run.apply(tmpl, [val].concat(__slice.call(datas), [undoch], [false])).docfrag);
    };
  });

  dynName = Dynamic.prototype.addUniqueMethod('with', function(ps, val, tmplname) {
    var jsChange;
    jsChange = ps.js.addForcedVar("" + ps.jsPre + "_withchange", "this." + dynRunName + "(undo, [" + (ps.jsDatas.join(', ')) + "], this." + tmplname + ", " + (ps.parent.jsEl || 'null') + ", " + ps.jsPre + ", " + ps.jsPost + ")");
    return this.doBase(ps, null, val, "" + jsChange + "(#v#)", null);
  });

  Dynamic.prototype.addExtractorPlugin('with', 40, dynName, 1);

}).call(this);
