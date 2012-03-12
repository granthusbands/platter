(function() {
  var attrList, bigDebug, bigDebugRan, browser, clean, codegen, collprot, commentEscapes, defaultRunEvent, dynamicCompiler, dynamicRunner, e, expropdefs, exprvar, hasEscape, hideAttr, inopdefs, inopre, inops, isEvent, isPlatterAttr, jskeywords, jslikeparse, jslikeunparse, modprot, n, never_equal_to_anything, plainCompiler, plainGet, plainRunner, populate, preopdefs, preopre, preops, pullNode, runDOMEvent, runJQueryEvent, specpri, stackTrace, str, templateCompiler, templateRunner, trim, uncommentEscapes, undoer, unhideAttr, unhideAttrName, unsupported, valre,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __slice = Array.prototype.slice;

  browser = {};

  (function() {
    var att, div, div2, _i, _len, _ref;
    div = document.createElement('div');
    div.innerHTML = "<div> <span>a</span></div>";
    if (div.firstChild.firstChild === div.firstChild.lastChild) {
      browser.brokenWhitespace = true;
    }
    div.innerHTML = "a";
    div.appendChild(document.createTextNode("b"));
    div = div.cloneNode(true);
    if (div.firstChild === div.lastChild) browser.combinesTextNodes = true;
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
      return browser.attributeIterationBreaksClone = true;
    }
  })();

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

    return templateRunner;

  })();

  templateCompiler = (function() {

    function templateCompiler() {}

    templateCompiler.prototype.makeRet = function(node) {
      return new templateRunner(node);
    };

    templateCompiler.prototype.compile = function(txt) {
      return this.compileFrag(this.tmplToFrag(txt), 1);
    };

    templateCompiler.prototype.compileFrag = function(frag, ctxCnt) {
      var d, i, js, jsAutoRemove, jsDatas, jsEl, jsFirstChild, jsLastChild, jsSelf, ret;
      js = new platter.internal.codegen;
      jsDatas = [];
      for (i = 0; 0 <= ctxCnt ? i < ctxCnt : i > ctxCnt; 0 <= ctxCnt ? i++ : i--) {
        jsDatas.push(js.existingVar('data' + i));
      }
      jsAutoRemove = js.existingVar('autoRemove');
      jsEl = js.addVar('el', 'this.node.cloneNode(true)', frag);
      ret = this.makeRet(frag);
      this.compileInner(ret, js, jsEl, jsDatas);
      jsFirstChild = js.addForcedVar("firstChild", "" + jsEl + ".firstChild");
      jsLastChild = js.addForcedVar("lastChild", "" + jsEl + ".lastChild");
      jsSelf = js.addForcedVar("self", "this");
      js.addExpr("if (" + jsAutoRemove + "===true||" + jsAutoRemove + "==null)\n	$undo.add(function(){\n		" + jsSelf + ".removeAll(" + jsFirstChild + ", " + jsLastChild + ");\n	});");
      if (jsEl.v.firstChild === jsEl.v.lastChild) {
        js.addExpr("return " + jsFirstChild);
      } else {
        js.addExpr("return " + jsEl);
      }
      ret.run = new Function(((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = jsDatas.length; _i < _len; _i++) {
          d = jsDatas[_i];
          _results.push(d.n);
        }
        return _results;
      })()).join(', '), 'autoRemove', "" + js);
      return ret;
    };

    templateCompiler.prototype.compileInner = function(ret, js, jsEl, jsDatas) {
      var attrs, ct, isSpecial, jsCur, n, n2, realn, v, _i, _j, _len, _len2, _ref, _ref2, _results;
      jsCur = js.addVar(jsEl + "_ch", "" + jsEl + ".firstChild", jsEl.v.firstChild);
      js.forceVar(jsCur);
      _results = [];
      while (jsCur.v) {
        if (jsCur.v.nodeType === 1) {
          isSpecial = false;
          attrs = attrList(jsCur.v);
          if (jsCur.v.tagName.toLowerCase() === 'textarea' && hasEscape(jsCur.v.value)) {
            attrs.push({
              n: 'value',
              realn: 'value',
              v: uncommentEscapes(unhideAttr(jsCur.v.value))
            });
          }
          for (_i = 0, _len = attrs.length; _i < _len; _i++) {
            _ref = attrs[_i], n = _ref.n, realn = _ref.realn, v = _ref.v;
            if (realn && this["special_" + realn] && hasEscape(v)) {
              isSpecial = true;
              jsCur.v.removeAttribute(n);
              jsCur = this["special_" + realn](ret, js, jsCur, jsDatas, v);
              break;
            }
          }
          if (!isSpecial) {
            for (_j = 0, _len2 = attrs.length; _j < _len2; _j++) {
              _ref2 = attrs[_j], n = _ref2.n, realn = _ref2.realn, v = _ref2.v;
              if (realn !== n) jsCur.v.removeAttribute(n);
              if (!(hasEscape(v))) {
                if (realn !== n) jsCur.v.setAttribute(realn, v);
              } else {
                if (isEvent(realn)) {
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

    templateCompiler.prototype.doEvent = function(ret, js, jsCur, jsDatas, realn, v) {
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
          return js.addExpr("this.runEvent(" + jsCur + ", " + (js.toSrc(ev)) + ", function(ev){ " + jsThis + ".doSet(" + jsDatas[0] + ", " + (js.toSrc(t)) + ", " + (js.index(jsCur, prop)) + "); })");
        } else {
          return js.addExpr("this.runEvent(" + jsCur + ", " + (js.toSrc(ev)) + ", function(ev){ return " + (js.index(jsDatas[0], t)) + "(ev, " + (js.toSrc(ev)) + ", " + jsCur + "); })");
        }
      });
    };

    templateCompiler.prototype.special_if = function(ret, js, jsCur, jsDatas, val) {
      var frag, inner, jsPost, post, _ref;
      _ref = pullNode(jsCur.v), jsCur.v = _ref[0], post = _ref[1], frag = _ref[2];
      inner = this.compileFrag(frag, jsDatas.length);
      ret[jsCur.n] = inner;
      jsPost = js.addVar("" + jsCur + "_end", "" + jsCur + ".nextSibling", post);
      this.doIf(ret, js, jsCur, jsPost, jsDatas, val, inner);
      return jsPost;
    };

    templateCompiler.prototype.special_unless = function(ret, js, jsCur, jsDatas, val) {
      var frag, inner, jsPost, post, _ref;
      _ref = pullNode(jsCur.v), jsCur.v = _ref[0], post = _ref[1], frag = _ref[2];
      inner = this.compileFrag(frag, jsDatas.length);
      ret[jsCur.n] = inner;
      jsPost = js.addVar("" + jsCur + "_end", "" + jsCur + ".nextSibling", post);
      this.doUnless(ret, js, jsCur, jsPost, jsDatas, val, inner);
      return jsPost;
    };

    templateCompiler.prototype.special_foreach = function(ret, js, jsCur, jsDatas, val) {
      var frag, inner, jsPost, post, _ref;
      _ref = pullNode(jsCur.v), jsCur.v = _ref[0], post = _ref[1], frag = _ref[2];
      inner = this.compileFrag(frag, jsDatas.length + 1);
      ret[jsCur.n] = inner;
      jsPost = js.addVar("" + jsCur + "_end", "" + jsCur + ".nextSibling", post);
      this.doForEach(ret, js, jsCur, jsPost, jsDatas, val, inner);
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

    templateCompiler.prototype.escapesParse = function(txt, jsDatas, fn) {
      return this.escapesReplace(txt, function(v) {
        var op;
        op = platter.internal.jslikeparse(v, function(ex) {
          var dref, ex2, m;
          ex2 = ex;
          dref = 0;
          if (m = /^(\.+)(.*?)$/.exec(ex)) {
            if (m[1].length > jsDatas.length) {
              throw new Error("" + ex + " has too many dots");
            }
            dref = m[1].length - 1;
            ex2 = m[2] || '.';
          }
          return "" + fn(ex, ex2, jsDatas[dref]);
        });
        return platter.internal.jslikeunparse(op);
      });
    };

    templateCompiler.prototype.assigners = {
      '#text': "#el#.nodeValue = #v#",
      '#default': "#el#.setAttribute(#n#, #v#)",
      'class': "#el#.className = #v#",
      'checked': "#el#.defaultChecked = #el#.checked = !!(#v#)",
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
    return txt = txt.replace(/data-platter-(?!type=)([a-z][-a-z0-9_]*=)/g, "$1");
  };

  unhideAttrName = function(txt) {
    return txt = txt.replace(/data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/g, "$1");
  };

  isPlatterAttr = function(txt) {
    return txt === 'type' || !!/data-platter-(?!type(?:[^-a-z0-9_]|$))([a-z][-a-z0-9_]*)/.exec(txt);
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

  str = function(o) {
    return o != null ? o : '';
  };

  attrList = function(node) {
    var att, _i, _len, _ref, _results;
    if (browser.attributeIterationBreaksClone) node = node.cloneNode(false);
    _ref = node.attributes;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      att = _ref[_i];
      if (isPlatterAttr(att.nodeName)) {
        _results.push({
          n: att.nodeName,
          realn: unhideAttrName(att.nodeName),
          v: uncommentEscapes(unhideAttr(att.nodeValue))
        });
      }
    }
    return _results;
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
    _ref = platter.internal.debuglist;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      o = _ref[_i];
      _results.push((function(o) {
        var id, id2, orig, orig2;
        if (o.platter_watch) {
          id = Math.random();
          orig = o.platter_watch.platter_watch;
          o.platter_watch.platter_watch = function(n, fn) {
            platter.internal.subscount++;
            platter.internal.subs[id] = stackTrace();
            $undo.add(function() {
              platter.internal.subscount--;
              return delete platter.internal.subs[id];
            });
            return orig.call(this, n, fn);
          };
        }
        if (o.platter_watchcoll) {
          id2 = Math.random();
          orig2 = o.platter_watchcoll.platter_watchcoll;
          return o.platter_watchcoll.platter_watchcoll = function(add, remove, replaceMe) {
            platter.internal.subscount++;
            platter.internal.subs[id2] = stackTrace();
            $undo.add(function() {
              platter.internal.subscount--;
              return delete platter.internal.subs[id2];
            });
            return orig2.call(this, add, remove, replaceMe);
          };
        }
      })(o));
    }
    return _results;
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

    undoer.prototype.undoToStart = function() {
      return this.claim()();
    };

    return undoer;

  })();

  this.$undo = new undoer;

  this.platter = {
    str: str,
    browser: browser,
    internal: {
      templateCompiler: templateCompiler,
      templateRunner: templateRunner,
      debuglist: [],
      subscount: 0,
      subs: {},
      bigDebug: bigDebug
    }
  };

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

  platter.internal.jslikeparse = jslikeparse;

  platter.internal.jslikeunparse = jslikeunparse;

  platter.internal.jsmunge = function(txt, valfn) {
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

    codegen.prototype.toSrc = function(o) {
      var a;
      if (typeof o === 'string') {
        return "'" + (o.replace(/([\\'])/g, "\\$1")) + "'";
      }
      if (typeof o === 'number' || !o) return o + '';
      if (o instanceof Array) {
        return "[" + (((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = o.length; _i < _len; _i++) {
            a = o[_i];
            _results.push(this.toSrc(a));
          }
          return _results;
        }).call(this)).join(',')) + "]";
      }
      throw "Kaboom!";
    };

    codegen.prototype.index = function(arr, entry) {
      if (!/^[a-z$_][a-z0-9$_]*$/.exec(entry) || jskeywords[entry]) {
        return "" + arr + "[" + (this.toSrc(entry)) + "]";
      } else {
        return "" + arr + "." + entry;
      }
    };

    return codegen;

  })();

  platter.internal.codegen = codegen;

  plainGet = function(js) {
    return function(id, t, jsData) {
      if (t === '.') {
        return "" + jsData;
      } else {
        return "this.runGetMulti(" + jsData + ", " + (js.toSrc(t.split('.'))) + ")";
      }
    };
  };

  plainRunner = (function(_super) {

    __extends(plainRunner, _super);

    function plainRunner() {
      plainRunner.__super__.constructor.apply(this, arguments);
    }

    plainRunner.prototype.doSet = function(data, n, v) {
      return data[n] = v;
    };

    plainRunner.prototype.runGetMulti = function(data, bits) {
      var bit, _i, _len;
      for (_i = 0, _len = bits.length; _i < _len; _i++) {
        bit = bits[_i];
        if (!data) return data;
        data = data[bit];
      }
      return data;
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

    plainCompiler.prototype.doSimple = function(ret, js, jsCur, jsDatas, n, v, expr) {
      return js.addExpr(expr.replace(/#el#/g, "" + jsCur).replace(/#n#/g, js.toSrc(n)).replace(/#v#/g, this.escapesParse(v, jsDatas, plainGet(js))));
    };

    plainCompiler.prototype.doIf = function(ret, js, jsCur, jsPost, jsDatas, val, inner) {
      val = this.escapesParse(val, jsDatas, plainGet(js));
      return js.addExpr("if (" + val + ") " + jsPost + ".parentNode.insertBefore(this." + jsCur + ".run(" + (jsDatas.join(', ')) + ", false), " + jsPost + ")");
    };

    plainCompiler.prototype.doUnless = function(ret, js, jsCur, jsPost, jsDatas, val, inner) {
      val = this.escapesParse(val, jsDatas, plainGet(js));
      return js.addExpr("if (!(" + val + ")) " + jsPost + ".parentNode.insertBefore(this." + jsCur + ".run(" + (jsDatas.join(', ')) + ", false), " + jsPost + ")");
    };

    plainCompiler.prototype.doForEach = function(ret, js, jsCur, jsPost, jsDatas, val, inner) {
      var jsFor;
      val = this.escapesParse(val, jsDatas, plainGet(js));
      jsFor = js.addVar("" + jsCur + "_for", val);
      js.forceVar(jsPost);
      return js.addExpr("for (var i=0;i<" + jsFor + ".length; ++i)\n	" + jsPost + ".parentNode.insertBefore(this." + jsCur + ".run(" + jsFor + "[i], " + (jsDatas.join(',')) + ", false), " + jsPost + ")");
    };

    return plainCompiler;

  })(platter.internal.templateCompiler);

  platter.internal.plainRunner = plainRunner;

  platter.internal.plainCompiler = plainCompiler;

  platter.plain = new plainCompiler;

  never_equal_to_anything = {};

  dynamicRunner = (function(_super) {

    __extends(dynamicRunner, _super);

    function dynamicRunner() {
      dynamicRunner.__super__.constructor.apply(this, arguments);
    }

    dynamicRunner.prototype.runGetMulti = function(fn, data, _arg) {
      var bit1, bits, fn2, undo, val,
        _this = this;
      bit1 = _arg[0], bits = 2 <= _arg.length ? __slice.call(_arg, 1) : [];
      val = never_equal_to_anything;
      undo = null;
      $undo.add(function() {
        if (undo) return undo();
      });
      fn2 = function() {
        var oval;
        oval = val;
        val = _this.fetchVal(data, bit1);
        if (oval === val) return;
        if (undo) undo();
        $undo.start();
        if (bits.length === 0) {
          fn(val);
        } else {
          _this.runGetMulti(fn, val, bits);
        }
        return undo = $undo.claim();
      };
      if (data && data.platter_watch) data.platter_watch(bit1, fn2);
      return fn2();
    };

    dynamicRunner.prototype.doSet = function(data, n, v) {
      if (data.platter_set) {
        return data.platter_set(n, v);
      } else {
        return data[n] = v;
      }
    };

    dynamicRunner.prototype.watchCollection = function(coll, add, rem, replaceMe) {
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
        return coll.platter_watchcoll(add, rem, replaceMe);
      }
    };

    dynamicRunner.prototype.fetchVal = function(data, ident) {
      if (!data) return;
      if (data.platter_get) {
        return data.platter_get(ident);
      } else {
        return data[ident];
      }
    };

    dynamicRunner.prototype.runIf = function(datas, tmpl, start, end) {
      var shown, undo,
        _this = this;
      shown = false;
      undo = null;
      $undo.add(function() {
        if (undo) return undo();
      });
      return function(show) {
        show = !!show;
        if (shown === show) return;
        shown = show;
        if (show) {
          $undo.start();
          end.parentNode.insertBefore(tmpl.run.apply(tmpl, __slice.call(datas).concat([false])), end);
          return undo = $undo.claim();
        } else {
          _this.removeBetween(start, end);
          undo();
          return undo = null;
        }
      };
    };

    dynamicRunner.prototype.runForEach = function(tmpl, datas, start, end) {
      var ret, undo,
        _this = this;
      undo = null;
      $undo.add(function() {
        if (undo) return undo();
      });
      return ret = function(coll) {
        if (undo) {
          undo();
          _this.removeBetween(start, end);
        }
        $undo.start();
        _this.runForEachInner(coll, tmpl, datas, start, end, ret);
        return undo = $undo.claim();
      };
    };

    dynamicRunner.prototype.runForEachInner = function(coll, tmpl, datas, start, end, replaceMe) {
      var add, ends, rem, undo,
        _this = this;
      ends = [start, end];
      undo = [];
      add = function(model, coll, opts) {
        var at, newend, par;
        at = opts.index;
        newend = document.createComment("");
        ends.splice(at + 1, 0, newend);
        par = start.parentNode;
        par.insertBefore(newend, ends[at].nextSibling);
        $undo.start();
        par.insertBefore(tmpl.run.apply(tmpl, [model].concat(__slice.call(datas), [false])), newend);
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
      this.watchCollection(coll, add, rem, replaceMe);
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

    dynamicCompiler.prototype.doSimple = function(ret, js, jsCur, jsDatas, n, v, expr) {
      var esc, escn, escvar, jsChange;
      esc = {};
      jsChange = js.addVar("" + jsCur + "_change", "null");
      this.escapesParse(v, jsDatas, function(id, t, jsData) {
        if (t !== '.') {
          return esc[id] = js.addForcedVar("" + jsCur + "_" + t, "null", [t, jsData]);
        }
      });
      expr = expr.replace(/#el#/g, "" + jsCur).replace(/#n#/g, js.toSrc(n)).replace(/#v#/g, this.escapesParse(v, jsDatas, function(id, t, jsData) {
        if (t !== '.') {
          return esc[id];
        } else {
          return jsData;
        }
      }));
      for (escn in esc) {
        escvar = esc[escn];
        js.addExpr("this.runGetMulti(function(val){\n	" + escvar + " = val;\n	if (" + jsChange + ") " + jsChange + "();\n}, " + escvar.v[1] + ", " + (js.toSrc(escvar.v[0].split('.'))) + ")");
      }
      js.addExpr("" + jsChange + " = function() {\n	" + expr + ";\n}");
      return js.addExpr("" + jsChange + "()");
    };

    dynamicCompiler.prototype.doIf = function(ret, js, jsPre, jsPost, jsDatas, val, inner) {
      var jsChange;
      jsChange = js.addForcedVar("" + jsPre + "_ifchange", "this.runIf([" + (jsDatas.join(', ')) + "], this." + jsPre + ", " + jsPre + ", " + jsPost + ")");
      return this.doSimple(ret, js, jsPre, jsDatas, null, val, "" + jsChange + "(#v#)");
    };

    dynamicCompiler.prototype.doUnless = function(ret, js, jsPre, jsPost, jsDatas, val, inner) {
      var jsChange;
      jsChange = js.addForcedVar("" + jsPre + "_ifchange", "this.runIf([" + (jsDatas.join(', ')) + "], this." + jsPre + ", " + jsPre + ", " + jsPost + ")");
      return this.doSimple(ret, js, jsPre, jsDatas, null, val, "" + jsChange + "(!(#v#))");
    };

    dynamicCompiler.prototype.doForEach = function(ret, js, jsPre, jsPost, jsDatas, val, inner) {
      var jsChange;
      jsChange = js.addForcedVar("" + jsPre + "_forchange", "this.runForEach(this." + jsPre + ", [" + (jsDatas.join(', ')) + "], " + jsPre + ", " + jsPost + ")");
      return this.doSimple(ret, js, jsPre, jsDatas, null, val, "" + jsChange + "(#v#)");
    };

    return dynamicCompiler;

  })(platter.internal.templateCompiler);

  platter.internal.dynamicRunner = dynamicRunner;

  platter.internal.dynamicCompiler = dynamicCompiler;

  platter.dynamic = new dynamicCompiler;

  if (window.Backbone) {
    modprot = Backbone.Model.prototype;
    collprot = Backbone.Collection.prototype;
    modprot.platter_hasKey = modprot.hasKey || function(n) {
      return this.attributes.hasOwnProperty(n);
    };
    modprot.platter_watch = function(n, fn) {
      var ev,
        _this = this;
      ev = "change:" + n;
      this.on(ev, fn);
      return $undo.add(function() {
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
    collprot.platter_watchcoll = function(add, remove, replaceMe) {
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
      return $undo.add(function() {
        _this.off('add', add);
        _this.off('remove', remove);
        return _this.off('reset', doRep);
      });
    };
    platter.internal.debuglist.push({
      platter_haskey: modprot,
      platter_watch: modprot,
      platter_get: modprot,
      platter_set: modprot,
      platter_watchcoll: collprot
    });
    platter.backbone = platter.dynamic;
  }

}).call(this);
