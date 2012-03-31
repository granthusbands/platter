(function() {
  var Browser, DynamicCompiler, DynamicRunner, PlainCompiler, PlainRunner, TemplateCompiler, TemplateRunner, Undo, addBlockAndAttrExtract, addBlockExtract, addSpecialAttrExtract, attrList, bigDebug, bigDebugRan, chooseData, clean, codegen, collprot, commentEscapes, defaultRunEvent, e, escapesHandle, escapesNoString, escapesNoStringParse, escapesString, escapesStringParse, expropdefs, exprvar, hasEscape, hideAttr, htmlToFrag, inopdefs, inopre, inops, isEventAttr, isNat, isPlatterAttr, jsParser, jskeywords, jslikeparse, jslikeunparse, modprot, n, never_equal_to_anything, nodeWraps, plainGet, populate, preopdefs, preopre, preops, pullBlock, pullNode, runDOMEvent, runJQueryEvent, singrep, specAttrs, specBlocks, specpri, stackTrace, str, tmplToFrag, toSrc, trim, uncommentEscapes, unhideAttr, unhideAttrName, unsupported, valre,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __slice = Array.prototype.slice;

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

  specAttrs = [];

  specBlocks = {};

  addBlockExtract = function(n, fn) {
    var fn2;
    fn2 = function(comp, ret, js, jsCur, jsDatas, val) {
      var frag, post, _ref;
      _ref = pullBlock(n, jsCur.v), jsCur.v = _ref[0], post = _ref[1], frag = _ref[2];
      return fn(comp, frag, ret, js, jsCur, post, jsDatas, val);
    };
    return specBlocks[n] = fn2;
  };

  addSpecialAttrExtract = function(n, pri, fn) {
    var fn2;
    fn2 = function(comp, ret, js, jsCur, jsDatas, val) {
      var frag, post, _ref;
      _ref = pullNode(jsCur.v), jsCur.v = _ref[0], post = _ref[1], frag = _ref[2];
      return fn(comp, frag, ret, js, jsCur, post, jsDatas, val);
    };
    specAttrs.push({
      pri: pri,
      n: n,
      fn: fn2
    });
    return specAttrs.sort(function(a, b) {
      if (a.pri < b.pri) {
        return 1;
      } else if (a.pri > b.pri) {
        return -1;
      } else {
        return 0;
      }
    });
  };

  addBlockAndAttrExtract = function(n, pri, fn) {
    addBlockExtract(n, fn);
    return addSpecialAttrExtract(n, pri, fn);
  };

  TemplateRunner = (function() {

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

    TemplateRunner.prototype.runEvent = defaultRunEvent;

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

    return TemplateRunner;

  })();

  TemplateCompiler = (function() {

    function TemplateCompiler() {}

    TemplateCompiler.prototype.makeRet = function(node) {
      return new TemplateRunner(node);
    };

    TemplateCompiler.prototype.compile = function(txt) {
      return this.compileFrag(tmplToFrag(txt), 1);
    };

    TemplateCompiler.prototype.compileFrag = function(frag, ctxCnt) {
      var d, i, js, jsAutoRemove, jsDatas, jsEl, jsFirstChild, jsLastChild, jsSelf, ret;
      js = new Platter.Internal.CodeGen;
      jsDatas = [];
      for (i = 0; 0 <= ctxCnt ? i < ctxCnt : i > ctxCnt; 0 <= ctxCnt ? i++ : i--) {
        jsDatas.push(js.existingVar('data' + i));
      }
      js.existingVar('undo');
      jsAutoRemove = js.existingVar('autoRemove');
      js.addExpr('undo = undo ? undo.child() : new Platter.Undo()');
      jsEl = js.addVar('el', 'this.node.cloneNode(true)', frag);
      ret = this.makeRet(frag);
      this.compileInner(ret, js, jsEl, jsDatas);
      jsFirstChild = js.addForcedVar("firstChild", "" + jsEl + ".firstChild");
      jsLastChild = js.addForcedVar("lastChild", "" + jsEl + ".lastChild");
      jsSelf = js.addForcedVar("self", "this");
      js.addExpr("if (" + jsAutoRemove + "===true||" + jsAutoRemove + "==null)\n	undo.add(function(){\n		" + jsSelf + ".removeAll(" + jsFirstChild + ", " + jsLastChild + ");\n	});");
      if (jsEl.v.firstChild === jsEl.v.lastChild) {
        js.addExpr("return {el: " + jsFirstChild + ", docfrag: " + jsEl + ", undo: function(){undo.undo()}};");
      } else {
        js.addExpr("return {docfrag: " + jsEl + ", undo: function(){undo.undo()}};");
      }
      try {
        ret.run = new Function(((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = jsDatas.length; _i < _len; _i++) {
            d = jsDatas[_i];
            _results.push(d.n);
          }
          return _results;
        })()).join(', '), 'undo', 'autoRemove', "" + js);
      } catch (e) {
        throw new Error("Internal error: Function compilation failed: " + e.message + "\n\n" + js);
      }
      return ret;
    };

    TemplateCompiler.prototype.compileInner = function(ret, js, jsEl, jsDatas) {
      var attrs, ct, fn, isSpecial, jsCur, m, n, n2, realn, v, _i, _len, _ref, _ref2, _results;
      jsCur = js.addVar(jsEl + "_ch", "" + jsEl + ".firstChild", jsEl.v.firstChild);
      js.forceVar(jsCur);
      _results = [];
      while (jsCur.v) {
        if (jsCur.v.nodeType === 1) {
          isSpecial = false;
          attrs = attrList(jsCur.v);
          if (jsCur.v.tagName.toLowerCase() === 'textarea' && hasEscape(jsCur.v.value)) {
            attrs.value = {
              n: 'value',
              realn: 'value',
              v: uncommentEscapes(unhideAttr(jsCur.v.value))
            };
          }
          for (_i = 0, _len = specAttrs.length; _i < _len; _i++) {
            _ref = specAttrs[_i], n = _ref.n, fn = _ref.fn;
            if (attrs.hasOwnProperty(n) && hasEscape(attrs[n].v)) {
              isSpecial = true;
              jsCur.v.removeAttribute(attrs[n].n);
              jsCur = fn(this, ret, js, jsCur, jsDatas, attrs[n].v);
              break;
            }
          }
          if (!isSpecial) {
            for (realn in attrs) {
              _ref2 = attrs[realn], n = _ref2.n, realn = _ref2.realn, v = _ref2.v;
              if (realn !== n) jsCur.v.removeAttribute(n);
              if (!(hasEscape(v))) {
                if (realn !== n) jsCur.v.setAttribute(realn, v);
              } else {
                if (isEventAttr(realn)) {
                  this.doEvent(ret, js, jsCur, jsDatas, realn, v);
                } else {
                  n2 = this.assigners[realn] ? realn : '#default';
                  this.doSimple(ret, js, jsCur, jsDatas, realn, v, this.assigners[n2]);
                }
              }
            }
            if (jsCur.v.tagName.toLowerCase() !== 'textarea') {
              this.compileInner(ret, js, jsCur, jsDatas);
            }
          }
        } else if (jsCur.v.nodeType === 8) {
          ct = jsCur.v.nodeValue;
          ct = unhideAttr(ct);
          if (m = /^\{\{([#\/])([^\s\}]+)\s*(.*?)\}\}$/.exec(ct)) {
            if (m[1] === '/') throw new Error("Unmatched end-block " + ct);
            if (!specBlocks.hasOwnProperty(m[2])) {
              throw new Error("Unrecognised block " + ct);
            }
            jsCur = specBlocks[m[2]](this, ret, js, jsCur, jsDatas, "{{" + m[3] + "}}");
          }
        } else if (jsCur.v.nodeType === 3 || jsCur.v.nodeType === 4) {
          jsCur.v.nodeValue = unhideAttr(jsCur.v.nodeValue);
          if (jsCur.v.nodeValue.indexOf('{{') !== -1) {
            this.doSimple(ret, js, jsCur, jsDatas, 'text', jsCur.v.nodeValue, this.assigners['#text']);
          }
        }
        _results.push(jsCur = js.addVar("" + jsEl + "_ch", "" + jsCur + ".nextSibling", jsCur.v.nextSibling));
      }
      return _results;
    };

    TemplateCompiler.prototype.doEvent = function(ret, js, jsCur, jsDatas, realn, v) {
      var ev,
        _this = this;
      ev = realn.substr(2);
      return escapesNoString(v, "", function(t) {
        var jsFn, jsTarget, jsThis, m, op, orig, post, prop;
        orig = t;
        m = /^(>|\+\+|--)?(.*?)(\+\+|--)?$/.exec(t);
        if (!m || m[1] && m[3] && m[1] !== m[3]) {
          throw new Error("{{" + orig + "}} is bad; only event handlers of the forms a.b, >a.b, ++a.b, --a.b, a.b++ and a.b-- are currently supported");
        }
        t = m[2];
        op = m[1] || m[3];
        jsThis = js.addForcedVar("" + jsCur + "_this", "this");
        m = /^\s*(\.*)([^.\s].*)\.(.*)$/.exec(t);
        if (m) {
          jsTarget = js.addForcedVar("" + jsCur + "_target", "null");
          _this.doBase(ret, js, jsCur, jsDatas, 'text', "{{" + m[1] + m[2] + "}}", "" + jsTarget + " = #v#", null);
          post = m[3];
        } else {
          m = /^\s*(\.*)([^.\s].*)$/.exec(t);
          if (m) {
            jsTarget = jsDatas[(m[1].length || 1) - 1];
            post = m[2];
          } else if (op) {
            throw new Error("Sorry, {{" + orig + "}} is not supported, because I can't replace the current data item");
          } else {
            m = /^\s*(\.+)$/.exec(t);
            jsTarget = jsDatas[(m[1].length || 1) - 1];
          }
        }
        if (op === '++' || op === '--') {
          return js.addExpr("this.runEvent(undo, " + jsCur + ", " + (js.toSrc(ev)) + ", function(ev){ " + jsThis + ".doModify(" + jsTarget + ", " + (js.toSrc(post)) + ", function(v){return " + op + "v})})");
        } else if (op === '>') {
          if (jsCur.v.type === 'checkbox') {
            prop = 'checked';
          } else {
            prop = 'value';
          }
          return js.addExpr("this.runEvent(undo, " + jsCur + ", " + (js.toSrc(ev)) + ", function(ev){ " + jsThis + ".doSet(" + jsTarget + ", " + (js.toSrc(post)) + ", " + (js.index(jsCur, prop)) + "); })");
        } else {
          if (post) {
            jsFn = js.addForcedVar("" + jsCur + "_fn", "null");
            _this.doBase(ret, js, jsCur, jsDatas, 'text', "{{" + t + "}}", "" + jsFn + " = #v#", null);
          } else {
            jsFn = jsTarget;
          }
          return js.addExpr("this.runEvent(undo, " + jsCur + ", " + (js.toSrc(ev)) + ", function(ev){ " + jsFn + ".call(" + jsTarget + ", ev, " + (js.toSrc(ev)) + ", " + jsCur + "); })");
        }
      });
    };

    TemplateCompiler.prototype.assigners = {
      '#text': "#el#.nodeValue = #v#",
      '#default': "#el#.setAttribute(#n#, #v#)",
      'class': "#el#.className = #v#",
      'checked': "#el#.defaultChecked = #el#.checked = !!(#v#)",
      'value': "#el#.value = #v#"
    };

    return TemplateCompiler;

  })();

  this.Platter = {
    Internal: {
      TemplateCompiler: TemplateCompiler,
      TemplateRunner: TemplateRunner,
      SubsCount: 0,
      Subs: {}
    },
    Helper: {}
  };

  addBlockAndAttrExtract('foreach', 100, function(comp, frag, ret, js, jsCur, post, jsDatas, val) {
    var inner, jsPost;
    inner = comp.compileFrag(frag, jsDatas.length + 1);
    ret[jsCur.n] = inner;
    jsPost = js.addVar("" + jsCur + "_end", "" + jsCur + ".nextSibling", post);
    comp.doForEach(ret, js, jsCur, jsPost, jsDatas, val, inner);
    return jsPost;
  });

  addBlockAndAttrExtract('if', 60, function(comp, frag, ret, js, jsCur, post, jsDatas, val) {
    var inner, jsPost;
    inner = comp.compileFrag(frag, jsDatas.length);
    ret[jsCur.n] = inner;
    jsPost = js.addVar("" + jsCur + "_end", "" + jsCur + ".nextSibling", post);
    comp.doIf(ret, js, jsCur, jsPost, jsDatas, val, inner);
    return jsPost;
  });

  addBlockAndAttrExtract('unless', 60, function(comp, frag, ret, js, jsCur, post, jsDatas, val) {
    var inner, jsPost;
    inner = comp.compileFrag(frag, jsDatas.length);
    ret[jsCur.n] = inner;
    jsPost = js.addVar("" + jsCur + "_end", "" + jsCur + ".nextSibling", post);
    comp.doUnless(ret, js, jsCur, jsPost, jsDatas, val, inner);
    return jsPost;
  });

  addBlockAndAttrExtract('with', 40, function(comp, frag, ret, js, jsCur, post, jsDatas, val) {
    var inner, jsPost;
    inner = comp.compileFrag(frag, jsDatas.length + 1);
    ret[jsCur.n] = inner;
    jsPost = js.addVar("" + jsCur + "_end", "" + jsCur + ".nextSibling", post);
    comp.doWith(ret, js, jsCur, jsPost, jsDatas, val, inner);
    return jsPost;
  });

  trim = function(txt) {
    txt = txt.replace(/^\s+/, "");
    return txt = txt.replace(/\s+$/, "");
  };

  hideAttr = function(txt) {
    txt = txt.replace(/([a-z][-a-z0-9_]*=)/ig, "data-platter-$1");
    return txt = txt.replace(/data-platter-type=/g, "type=");
  };

  unhideAttr = function(txt) {
    return txt = txt.replace(/data-platter-(?!type=)([a-z][-a-z0-9_]*=)/g, "$1");
  };

  unhideAttrName = function(txt) {
    return txt = txt.replace(/data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/g, "$1");
  };

  commentEscapes = function(txt) {
    return txt = txt.replace(/\{\{([#\/].*?)\}\}/g, "<!--{{$1}}-->");
  };

  uncommentEscapes = function(txt) {
    return txt = txt.replace(/<!--\{\{([#\/].*?)\}\}-->/g, "{{$1}}");
  };

  hasEscape = function(txt) {
    return !!/\{\{/.exec(txt);
  };

  isPlatterAttr = function(txt) {
    return txt === 'type' || !!/data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/.exec(txt);
  };

  str = function(o) {
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

  escapesString = function(txt, fn) {
    var ret;
    ret = escapesHandle(txt, Platter.Internal.ToSrc, function(bit) {
      return "Platter.Str(" + (fn(bit)) + ")";
    });
    return ret.join('+');
  };

  escapesNoString = function(txt, join, fn) {
    var ret;
    ret = escapesHandle(txt, function(txt) {
      if (/\S/.exec(txt)) throw new Error(txt + " not allowed here");
    }, fn);
    if (ret.length > 1 && !join) throw new Error("Only one escape allowed here");
    return ret.join(join);
  };

  escapesStringParse = function(txt, jsDatas, fn) {
    return escapesString(txt, jsParser(jsDatas, fn));
  };

  escapesNoStringParse = function(txt, join, jsDatas, fn) {
    return escapesNoString(txt, join, jsParser(jsDatas, fn));
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

  Platter.Str = str;

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

  htmlToFrag = function(html) {
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

  tmplToFrag = function(txt) {
    txt = hideAttr(commentEscapes(trim(txt)));
    return htmlToFrag(txt).cloneNode(true).cloneNode(true);
  };

  attrList = function(node) {
    var att, realn, ret, _i, _len, _ref;
    if (Platter.Browser.AttributeIterationBreaksClone) {
      node = node.cloneNode(false);
    }
    ret = {};
    _ref = node.attributes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      att = _ref[_i];
      if (!(isPlatterAttr(att.nodeName))) continue;
      realn = unhideAttrName(att.nodeName);
      ret[realn] = {
        n: att.nodeName,
        realn: realn,
        v: uncommentEscapes(unhideAttr(att.nodeValue))
      };
    }
    return ret;
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

  pullBlock = function(endtext, node) {
    var end, frag, m, matched, post, pre, stack;
    end = node;
    stack = [endtext];
    while (true) {
      matched = false;
      end = end.nextSibling;
      if (!end) break;
      if (end.nodeType !== 8) continue;
      m = /^\{\{([#\/])([^\s\}]*)(.*?)\}\}$/.exec(end.nodeValue);
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

  isEventAttr = function(name) {
    return !!/^on/.exec(name);
  };

  Platter.Helper.TmplToFrag = tmplToFrag;

  Platter.Helper.HtmlToFrag = htmlToFrag;

  Undo = (function() {

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

  Platter.Undo = Undo;

  Browser = {};

  (function() {
    var att, div, div2, _i, _len, _ref;
    div = document.createElement('div');
    div.innerHTML = "<div> <span>a</span></div>";
    if (div.firstChild.firstChild === div.firstChild.lastChild) {
      Browser.BrokenWhitespace = true;
    }
    div.innerHTML = "a";
    div.appendChild(document.createTextNode("b"));
    div = div.cloneNode(true);
    if (div.firstChild === div.lastChild) Browser.CombinesTextNodes = true;
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
      return Browser.AttributeIterationBreaksClone = true;
    }
  })();

  Platter.Browser = Browser;

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

  toSrc = function(o) {
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

    codegen.prototype.toSrc = toSrc;

    codegen.prototype.index = function(arr, entry) {
      if (!/^[a-z$_][a-z0-9$_]*$/.exec(entry) || jskeywords[entry]) {
        return "" + arr + "[" + (this.toSrc(entry)) + "]";
      } else {
        return "" + arr + "." + entry;
      }
    };

    return codegen;

  })();

  Platter.Internal.CodeGen = codegen;

  Platter.Internal.ToSrc = toSrc;

  plainGet = function(js) {
    return function(id, t, jsData) {
      if (t === '.') return "" + jsData;
      t = t.split('.');
      if (t.length === 1) {
        return "(" + jsData + " ? " + jsData + "[" + (js.toSrc(t[0])) + "] : " + jsData + ")";
      } else {
        return "this.runGetMulti(" + jsData + ", " + (js.toSrc(t)) + ")";
      }
    };
  };

  PlainRunner = (function(_super) {

    __extends(PlainRunner, _super);

    function PlainRunner() {
      PlainRunner.__super__.constructor.apply(this, arguments);
    }

    PlainRunner.prototype.doModify = function(data, n, fn) {
      return data[n] = fn(data[n]);
    };

    PlainRunner.prototype.doSet = function(data, n, v) {
      return data[n] = v;
    };

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

  PlainCompiler = (function(_super) {

    __extends(PlainCompiler, _super);

    function PlainCompiler() {
      PlainCompiler.__super__.constructor.apply(this, arguments);
    }

    PlainCompiler.prototype.makeRet = function(node) {
      return new PlainRunner(node);
    };

    PlainCompiler.prototype.doBase = function(ret, js, jsCur, jsDatas, n, v, expr, sep) {
      var parse;
      if (sep === true) {
        parse = escapesStringParse;
      } else {
        parse = function(txt, jsDatas, fn) {
          return escapesNoStringParse(txt, sep, jsDatas, fn);
        };
      }
      return js.addExpr(expr.replace(/#el#/g, "" + jsCur).replace(/#n#/g, js.toSrc(n)).replace(/#v#/g, parse(v, jsDatas, plainGet(js))));
    };

    PlainCompiler.prototype.doSimple = function(ret, js, jsCur, jsDatas, n, v, expr) {
      return this.doBase(ret, js, jsCur, jsDatas, n, v, expr, true);
    };

    PlainCompiler.prototype.doIf = function(ret, js, jsCur, jsPost, jsDatas, val, inner) {
      val = escapesNoStringParse(val, "&&", jsDatas, plainGet(js));
      return js.addExpr("if (" + val + ") " + jsPost + ".parentNode.insertBefore(this." + jsCur + ".run(" + (jsDatas.join(', ')) + ", undo, false).docfrag, " + jsPost + ")");
    };

    PlainCompiler.prototype.doUnless = function(ret, js, jsCur, jsPost, jsDatas, val, inner) {
      val = escapesNoStringParse(val, "&&", jsDatas, plainGet(js));
      return js.addExpr("if (!(" + val + ")) " + jsPost + ".parentNode.insertBefore(this." + jsCur + ".run(" + (jsDatas.join(', ')) + ", undo, false).docfrag, " + jsPost + ")");
    };

    PlainCompiler.prototype.doForEach = function(ret, js, jsCur, jsPost, jsDatas, val, inner) {
      var jsFor;
      val = escapesNoStringParse(val, null, jsDatas, plainGet(js));
      jsFor = js.addVar("" + jsCur + "_for", val);
      js.forceVar(jsPost);
      return js.addExpr("if (" + jsFor + ")\n	for (var i=0;i<" + jsFor + ".length; ++i)\n		" + jsPost + ".parentNode.insertBefore(this." + jsCur + ".run(" + jsFor + "[i], " + (jsDatas.join(',')) + ", undo, false).docfrag, " + jsPost + ")");
    };

    PlainCompiler.prototype.doWith = function(ret, js, jsCur, jsPost, jsDatas, val, inner) {
      val = escapesNoStringParse(val, null, jsDatas, plainGet(js));
      return js.addExpr("" + jsPost + ".parentNode.insertBefore(this." + jsCur + ".run(" + val + ", " + (jsDatas.join(', ')) + ", undo, false).docfrag, " + jsPost + ")");
    };

    return PlainCompiler;

  })(Platter.Internal.TemplateCompiler);

  Platter.Internal.PlainRunner = PlainRunner;

  Platter.Internal.PlainCompiler = PlainCompiler;

  Platter.Plain = new PlainCompiler;

  never_equal_to_anything = {};

  DynamicRunner = (function(_super) {

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

    DynamicRunner.prototype.doModify = function(data, n, fn) {
      if (data.platter_modify) {
        return data.platter_modify(n, fn);
      } else {
        return data[n] = fn(data[n]);
      }
    };

    DynamicRunner.prototype.doSet = function(data, n, v) {
      if (data.platter_set) {
        return data.platter_set(n, v);
      } else {
        return data[n] = v;
      }
    };

    DynamicRunner.prototype.watchCollection = function(undo, coll, add, rem, replaceMe) {
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
    };

    DynamicRunner.prototype.fetchVal = function(data, ident) {
      if (!data) return;
      if (data.platter_get) {
        return data.platter_get(ident);
      } else {
        return data[ident];
      }
    };

    DynamicRunner.prototype.runIf = function(undo, datas, tmpl, start, end) {
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
    };

    DynamicRunner.prototype.runForEach = function(undo, tmpl, datas, start, end) {
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
        return _this.runForEachInner(undo, coll, tmpl, datas, start, end, ret);
      };
    };

    DynamicRunner.prototype.runForEachInner = function(undo, coll, tmpl, datas, start, end, replaceMe) {
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
      return this.watchCollection(undo, coll, add, rem, replaceMe);
    };

    DynamicRunner.prototype.runWith = function(undo, datas, tmpl, start, end) {
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
    };

    return DynamicRunner;

  })(Platter.Internal.TemplateRunner);

  DynamicCompiler = (function(_super) {

    __extends(DynamicCompiler, _super);

    function DynamicCompiler() {
      DynamicCompiler.__super__.constructor.apply(this, arguments);
    }

    DynamicCompiler.prototype.makeRet = function(node) {
      return new DynamicRunner(node);
    };

    DynamicCompiler.prototype.doBase = function(ret, js, jsCur, jsDatas, n, v, expr, sep) {
      var esc, escn, escvar, jsChange, parse;
      if (sep === true) {
        parse = escapesStringParse;
      } else {
        parse = function(txt, jsDatas, fn) {
          return escapesNoStringParse(txt, sep, jsDatas, fn);
        };
      }
      esc = {};
      jsChange = js.addVar("" + jsCur + "_change", "null");
      parse(v, jsDatas, function(id, t, jsData) {
        if (t !== '.') {
          return esc[id] = js.addForcedVar("" + jsCur + "_" + t, "null", [t, jsData]);
        }
      });
      expr = expr.replace(/#el#/g, "" + jsCur).replace(/#n#/g, js.toSrc(n)).replace(/#v#/g, parse(v, jsDatas, function(id, t, jsData) {
        if (t !== '.') {
          return esc[id];
        } else {
          return jsData;
        }
      }));
      for (escn in esc) {
        escvar = esc[escn];
        js.addExpr("this.runGetMulti(undo, function(val){\n	" + escvar + " = val;\n	if (" + jsChange + ") " + jsChange + "();\n}, " + escvar.v[1] + ", " + (js.toSrc(escvar.v[0].split('.'))) + ")");
      }
      js.addExpr("" + jsChange + " = function() {\n	" + expr + ";\n}");
      return js.addExpr("" + jsChange + "()");
    };

    DynamicCompiler.prototype.doSimple = function(ret, js, jsCur, jsDatas, n, v, expr) {
      return this.doBase(ret, js, jsCur, jsDatas, n, v, expr, true);
    };

    DynamicCompiler.prototype.doIf = function(ret, js, jsPre, jsPost, jsDatas, val, inner) {
      var jsChange;
      jsChange = js.addForcedVar("" + jsPre + "_ifchange", "this.runIf(undo, [" + (jsDatas.join(', ')) + "], this." + jsPre + ", " + jsPre + ", " + jsPost + ")");
      return this.doBase(ret, js, jsPre, jsDatas, null, val, "" + jsChange + "(#v#)", "&&");
    };

    DynamicCompiler.prototype.doUnless = function(ret, js, jsPre, jsPost, jsDatas, val, inner) {
      var jsChange;
      jsChange = js.addForcedVar("" + jsPre + "_ifchange", "this.runIf(undo, [" + (jsDatas.join(', ')) + "], this." + jsPre + ", " + jsPre + ", " + jsPost + ")");
      return this.doBase(ret, js, jsPre, jsDatas, null, val, "" + jsChange + "(!(#v#))", "&&");
    };

    DynamicCompiler.prototype.doForEach = function(ret, js, jsPre, jsPost, jsDatas, val, inner) {
      var jsChange;
      jsChange = js.addForcedVar("" + jsPre + "_forchange", "this.runForEach(undo, this." + jsPre + ", [" + (jsDatas.join(', ')) + "], " + jsPre + ", " + jsPost + ")");
      return this.doBase(ret, js, jsPre, jsDatas, null, val, "" + jsChange + "(#v#)", null);
    };

    DynamicCompiler.prototype.doWith = function(ret, js, jsPre, jsPost, jsDatas, val, inner) {
      var jsChange;
      jsChange = js.addForcedVar("" + jsPre + "_ifchange", "this.runWith(undo, [" + (jsDatas.join(', ')) + "], this." + jsPre + ", " + jsPre + ", " + jsPost + ")");
      return this.doBase(ret, js, jsPre, jsDatas, null, val, "" + jsChange + "(#v#)", null);
    };

    return DynamicCompiler;

  })(Platter.Internal.TemplateCompiler);

  Platter.Internal.DynamicRunner = DynamicRunner;

  Platter.Internal.DynamicCompiler = DynamicCompiler;

  Platter.Dynamic = new DynamicCompiler;

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
      for (i = 0, _ref = this.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
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
    Platter.Backbone = Platter.Dynamic;
  }

}).call(this);
