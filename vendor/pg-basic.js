// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"node_modules/context-eval/lib/context-browser.js":[function(require,module,exports) {
var global = arguments[3];
function Context(sandbox, parentElement) {
  this.iframe = document.createElement('iframe');
  this.iframe.style.display = 'none';
  parentElement = parentElement || document.body;
  parentElement.appendChild(this.iframe);
  var win = this.iframe.contentWindow;
  if (sandbox) {
    this.extend(sandbox);
  }
}

Context.prototype.evaluate = function (code) {
  return this.iframe.contentWindow.eval(code);
};

Context.prototype.destroy = function () {
  if (this.iframe) {
    this.iframe.parentNode.removeChild(this.iframe);
    this.iframe = null;
  }
};

Context.prototype.getGlobal = function () {
  return this.iframe.contentWindow;
};

Context.prototype.extend = function (sandbox) {
  var global = this.getGlobal();
  Object.keys(sandbox).forEach(function (key) {
    global[key] = sandbox[key];
  });
};

module.exports = Context;

},{}],"functions.js":[function(require,module,exports) {
var Functions = {
  // Math:
  ABS: function ABS(n) {
    return Math.abs(n);
  },
  COS: function COS(n) {
    return Math.cos(n);
  },
  SIN: function SIN(n) {
    return Math.sin(n);
  },
  TAN: function TAN(n) {
    return Math.tan(n);
  },
  EXP: function EXP(n) {
    return Math.exp(n);
  },
  INT: function INT(n) {
    return Math.floor(n);
  },
  FLOOR: function FLOOR(n) {
    return Math.floor(n);
  },
  ROUND: function ROUND(n) {
    return Math.round(n);
  },
  ATN: function ATN(n) {
    return Math.atan(n);
  },
  LOG: function LOG(n) {
    return Math.log(n);
  },
  SGN: function SGN(n) {
    if (n === 0) return 0;
    if (n < 0) return -1;
    return 1;
  },
  SQR: function SQR(n) {
    return Math.sqrt(n);
  },
  VAL: function VAL(str) {
    var n = parseFloat(str);
    if (isNaN(n)) return 0;
    return n;
  },
  RND: function RND() {
    var f = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

    if (f === 0) {
      return Math.random();
    }

    return Math.ceil(Math.random() * f);
  },
  // Strings:
  ASC: function ASC(str) {
    return str.charCodeAt(0);
  },
  LEFT: function LEFT(str, n) {
    return str.slice(0, n);
  },
  MID: function MID(str, start, len) {
    // len is optional
    return str.substr(start, len);
  },
  RIGHT: function RIGHT(str, n) {
    return str.slice(n * -1);
  },
  CHR: function CHR(n) {
    return String.fromCharCode(n);
  },
  STR: function STR(n) {
    return String.fromCharCode(n);
  },
  LEN: function LEN(str) {
    return str.length;
  },
  SPC: function SPC(n) {
    return ' '.repeat(n);
  },
  // Display stubs
  COLOR: function COLOR() {
    // This is just a stub. This gets injected.
    throw new Error('Unimplemented');
  },
  GETCHAR: function GETCHAR() {
    // This is just a stub. This gets injected.
    throw new Error('Unimplemented');
  },
  UPPERCASE: function UPPERCASE(str) {
    return str.toUpperCase();
  },
  LOWERCASE: function LOWERCASE(str) {
    return str.toLowerCase();
  }
};
var aliases = {
  LEFT$: 'LEFT',
  ATAN: 'ATN',
  CHR$: 'CHR',
  MID$: 'MID',
  RIGHT$: 'RIGHT',
  RAND: 'RND',
  // Technically TAB should be relative to the current cursor position
  // but that's too hard to implement now.
  TAB: 'SPC'
};

for (var a in aliases) {
  Functions[a] = Functions[aliases[a]];
}

module.exports = Functions;
},{}],"errors.js":[function(require,module,exports) {
function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _construct(Parent, args, Class) { if (isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var ParseError =
/*#__PURE__*/
function (_Error) {
  _inherits(ParseError, _Error);

  function ParseError(lineno, message) {
    var _this;

    _classCallCheck(this, ParseError);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ParseError).call(this));
    _this.message = "Parse error on line ".concat(lineno, ": ").concat(message);
    _this.name = 'ParseError';
    return _this;
  }

  return ParseError;
}(_wrapNativeSuper(Error));

var RuntimeError =
/*#__PURE__*/
function (_Error2) {
  _inherits(RuntimeError, _Error2);

  function RuntimeError(lineno, message) {
    var _this2;

    _classCallCheck(this, RuntimeError);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(RuntimeError).call(this));
    _this2.message = "Error on line ".concat(lineno, ": ").concat(message);
    _this2.name = 'RuntimeError';
    return _this2;
  }

  return RuntimeError;
}(_wrapNativeSuper(Error));

module.exports = {
  ParseError: ParseError,
  RuntimeError: RuntimeError
};
},{}],"tokenizer.js":[function(require,module,exports) {
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Functions = require('./functions');

var _require = require('./errors'),
    ParseError = _require.ParseError;

var Token =
/*#__PURE__*/
function () {
  function Token(type, lexeme) {
    _classCallCheck(this, Token);

    this.type = type;
    this.lexeme = lexeme;
  }

  _createClass(Token, [{
    key: "toJSON",
    value: function toJSON() {
      return {
        type: this.type,
        lexeme: this.lexeme
      };
    }
  }]);

  return Token;
}();

var eof = new Token('eof', '');
var KEYWORDS = ['IF', 'THEN', 'ELSE', 'FOR', 'ON', 'TO', 'STEP', 'GOTO', 'GOSUB', 'RETURN', 'NEXT', 'INPUT', 'LET', 'CLC', 'CLT', 'CLS', 'END', 'PRINT', 'PLOT', 'DRAW', 'UNDRAW', 'ARRAY', 'DIM', 'DATA', 'READ', 'REM', 'PAUSE', 'STOP'];
var CONSTANTS = ['LEVEL', 'PI'];
var LINE = /^\s*(\d+)\s*/;
var QUOTE = /^"((\\.|[^"\\])*)"\s*/;
var KEY = new RegExp('^(' + KEYWORDS.join('|') + ')\\s*', 'i');
var FUN = new RegExp('^(' + Object.keys(Functions).join('|') + ')\\s*', 'i');
var CONST = new RegExp('^(' + CONSTANTS.join('|') + ')\\s*', 'i');
var VAR = /^([a-z][0-9]*)\$?\s*/i;
var NUM = /^(\d+(\.\d+)?)\s*/i;
var OP = /^(<>|>=|<=|[,\+\-\*\/%=<>\(\)\]\[])\s*/i;
var LOGIC = /^(AND|OR)\s*/i;
var LINEMOD = /^(;)\s*/i;

var Tokenizer =
/*#__PURE__*/
function () {
  _createClass(Tokenizer, null, [{
    key: "tokenizeLine",
    value: function tokenizeLine(line) {
      var t = new Tokenizer(line);
      t.tokenize();
      return t.tokens;
    }
  }, {
    key: "expressionTypes",
    get: function get() {
      return ['string', 'function', 'operation', 'number', 'variable', 'logic', 'constant'];
    }
  }, {
    key: "eof",
    get: function get() {
      return eof;
    }
  }]);

  function Tokenizer(stmnt) {
    _classCallCheck(this, Tokenizer);

    this.stmnt = stmnt;
    this.tokens = [];
    this.index = 0;
    this.tokenized = false;
    this.lineno = -1;
  }

  _createClass(Tokenizer, [{
    key: "assertTokenized",
    value: function assertTokenized() {
      if (!this.tokenized) {
        throw new ParseError(this.lineno, 'Call tokenize() first');
      }
    }
  }, {
    key: "peek",
    value: function peek() {
      var n = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      this.assertTokenized();
      if (this.index >= this.tokens.length) return eof;
      return this.tokens[this.index + n];
    }
  }, {
    key: "next",
    value: function next() {
      this.assertTokenized();
      if (this.index >= this.tokens.length) return eof;
      return this.tokens[this.index++];
    }
  }, {
    key: "nextExpr",
    value: function nextExpr() {
      this.assertTokenized();
      var expr = [];

      while (this.index !== this.tokens.length) {
        if (!Tokenizer.expressionTypes.includes(this.peek().type)) {
          break;
        }

        expr.push(this.next());
      }

      return expr;
    }
  }, {
    key: "tokenize",
    value: function tokenize() {
      var linem = this.stmnt.match(LINE);

      if (!linem) {
        throw new ParseError(this.lineno, 'Every line must start with a line number');
      }

      this.lineno = parseInt(linem[1]); // First token is always line number.

      this.tokens.push(new Token('lineno', this.lineno));
      this.stmnt = this.stmnt.slice(linem[0].length);

      while (this.stmnt.length) {
        var eaten = this.eatKeyword() || this.eatQuote() || this.eatLogic() || this.eatFunction() || this.eatConstant() || this.eatVariable() || this.eatNumber() || this.eatOperation() || this.eatLineMod();

        if (!eaten) {
          throw new ParseError(this.lineno, "Invalid syntax near: '".concat(this.stmnt, "'"));
        }

        this.stmnt = this.stmnt.slice(eaten.length);
      }

      this.tokenized = true;
    }
  }, {
    key: "eatLogic",
    value: function eatLogic() {
      var m = this.stmnt.match(LOGIC);

      if (m && m[0]) {
        var keyword = m[1].toUpperCase();
        this.tokens.push(new Token('logic', keyword));
        return m[0];
      }

      return null;
    }
  }, {
    key: "eatKeyword",
    value: function eatKeyword() {
      var m = this.stmnt.match(KEY);

      if (m && m[0]) {
        var keyword = m[1].toUpperCase();
        this.tokens.push(new Token('keyword', keyword)); // If the keyword is a comment then eat it up.

        if (keyword === 'REM') {
          this.tokens.push(new Token('comment', this.stmnt.slice(m[0].length)));
          return this.stmnt;
        }

        return m[0];
      }

      return null;
    }
  }, {
    key: "eatFunction",
    value: function eatFunction() {
      var m = this.stmnt.match(FUN);

      if (m && m[0]) {
        var fun = m[1].toUpperCase();
        this.tokens.push(new Token('function', fun));
        return m[0];
      }

      return null;
    }
  }, {
    key: "eatConstant",
    value: function eatConstant() {
      var m = this.stmnt.match(CONST);

      if (m && m[0]) {
        var fun = m[1].toUpperCase();
        this.tokens.push(new Token('constant', fun));
        return m[0];
      }

      return null;
    }
  }, {
    key: "eatVariable",
    value: function eatVariable() {
      var m = this.stmnt.match(VAR);

      if (m && m[0]) {
        var variable = m[1].toUpperCase();
        this.tokens.push(new Token('variable', variable));
        return m[0];
      }

      return null;
    }
  }, {
    key: "eatNumber",
    value: function eatNumber() {
      var m = this.stmnt.match(NUM);

      if (m && m[0]) {
        var num = parseFloat(m[1], 10);

        if (isNaN(num)) {
          throw new ParseError(this.lineno, "Error parsing number: ".concat(m[1]));
        }

        this.tokens.push(new Token('number', num));
        return m[0];
      }

      return null;
    }
  }, {
    key: "eatOperation",
    value: function eatOperation() {
      var m = this.stmnt.match(OP);

      if (m && m[0]) {
        this.tokens.push(new Token('operation', m[1]));
        return m[0];
      }

      return null;
    }
  }, {
    key: "eatQuote",
    value: function eatQuote() {
      var m = this.stmnt.match(QUOTE);

      if (m && m[0]) {
        this.tokens.push(new Token('string', "\"".concat(m[1], "\"")));
        return m[0];
      }

      return null;
    }
  }, {
    key: "eatLineMod",
    value: function eatLineMod() {
      var m = this.stmnt.match(LINEMOD);

      if (m && m[0]) {
        this.tokens.push(new Token('linemod', "\"".concat(m[1], "\"")));
        return m[0];
      }

      return null;
    }
  }]);

  return Tokenizer;
}();

module.exports = Tokenizer;
},{"./functions":"functions.js","./errors":"errors.js"}],"nodes.js":[function(require,module,exports) {
function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _require = require('./errors'),
    RuntimeError = _require.RuntimeError;

var Node =
/*#__PURE__*/
function () {
  function Node(lineno, type) {
    _classCallCheck(this, Node);

    this.lineno = lineno;
    this.type = type;
  }

  _createClass(Node, [{
    key: "toJSON",
    value: function toJSON() {
      var _this = this;

      var ret = {};
      Object.keys(this).forEach(function (k) {
        ret[k] = _this[k];
      });
      return ret;
    }
  }, {
    key: "assert",
    value: function assert(truth, message) {
      if (!truth) {
        throw new RuntimeError(this.lineno, message);
      }
    }
  }]);

  return Node;
}();

var Variable =
/*#__PURE__*/
function (_Node) {
  _inherits(Variable, _Node);

  function Variable(lineno, name, subscript) {
    var _this2;

    _classCallCheck(this, Variable);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(Variable).call(this, lineno, 'variable'));
    _this2.name = name;

    if (subscript == null) {
      _this2.array = false;
    } else {
      _this2.array = true;
      _this2.subscript = subscript;
    }

    return _this2;
  }

  return Variable;
}(Node);

var REM =
/*#__PURE__*/
function (_Node2) {
  _inherits(REM, _Node2);

  function REM(lineno, comment) {
    var _this3;

    _classCallCheck(this, REM);

    _this3 = _possibleConstructorReturn(this, _getPrototypeOf(REM).call(this, lineno, 'REM'));
    _this3.comment = comment;
    return _this3;
  }

  _createClass(REM, [{
    key: "run",
    value: function run() {// noop
    }
  }]);

  return REM;
}(Node);

var PRINT =
/*#__PURE__*/
function (_Node3) {
  _inherits(PRINT, _Node3);

  function PRINT(lineno, expr, linemod) {
    var _this4;

    _classCallCheck(this, PRINT);

    _this4 = _possibleConstructorReturn(this, _getPrototypeOf(PRINT).call(this, lineno, 'PRINT'));
    _this4.expr = expr;
    _this4.newline = !linemod;
    return _this4;
  }

  _createClass(PRINT, [{
    key: "run",
    value: function run(context) {
      var value = context.evaluate(this.expr);
      context.print(value);

      if (this.newline) {
        context.print("\n");
      }
    }
  }]);

  return PRINT;
}(Node);

var GOTO =
/*#__PURE__*/
function (_Node4) {
  _inherits(GOTO, _Node4);

  function GOTO(lineno, expr) {
    var _this5;

    _classCallCheck(this, GOTO);

    _this5 = _possibleConstructorReturn(this, _getPrototypeOf(GOTO).call(this, lineno, 'GOTO'));
    _this5.expr = expr;
    return _this5;
  }

  _createClass(GOTO, [{
    key: "run",
    value: function run(context) {
      var targetno = context.evaluate(this.expr);
      this.assert(typeof targetno === 'number', 'Expected GOTO `expr` to evaluate to a number');
      context.goto(targetno);
    }
  }]);

  return GOTO;
}(Node);

var LET =
/*#__PURE__*/
function (_Node5) {
  _inherits(LET, _Node5);

  function LET(lineno, variable, expr) {
    var _this6;

    _classCallCheck(this, LET);

    _this6 = _possibleConstructorReturn(this, _getPrototypeOf(LET).call(this, lineno, 'LET'));
    _this6.variable = variable;
    _this6.expr = expr;
    return _this6;
  }

  _createClass(LET, [{
    key: "run",
    value: function run(context) {
      var value = context.evaluate(this.expr);

      if (this.variable.array) {
        var sub = context.evaluate(this.variable.subscript);
        context.setArray(this.variable.name, sub, value);
      } else {
        context.set(this.variable.name, value);
      }
    }
  }]);

  return LET;
}(Node);

var PAUSE =
/*#__PURE__*/
function (_Node6) {
  _inherits(PAUSE, _Node6);

  function PAUSE(lineno, expr) {
    var _this7;

    _classCallCheck(this, PAUSE);

    _this7 = _possibleConstructorReturn(this, _getPrototypeOf(PAUSE).call(this, lineno, 'PAUSE'));
    _this7.expr = expr;
    return _this7;
  }

  _createClass(PAUSE, [{
    key: "run",
    value: function run(context) {
      var value = context.evaluate(this.expr);
      this.assert(typeof value === 'number', 'PAUSE value should be a number or should evaluate to one');
      context.pause(value);
    }
  }]);

  return PAUSE;
}(Node);

var INPUT =
/*#__PURE__*/
function (_Node7) {
  _inherits(INPUT, _Node7);

  function INPUT(lineno, expr, variable) {
    var _this8;

    _classCallCheck(this, INPUT);

    _this8 = _possibleConstructorReturn(this, _getPrototypeOf(INPUT).call(this, lineno, 'INPUT'));
    _this8.expr = expr;
    _this8.variable = variable;
    return _this8;
  }

  _createClass(INPUT, [{
    key: "run",
    value: function run(context) {
      var _this9 = this;

      var prompt = context.evaluate(this.expr);
      context.print(prompt); // Yield.

      context.halt();
      context.input(function (value) {
        if (_this9.variable.array) {
          var sub = context.evaluate(_this9.variable.subscript);
          context.setArray(_this9.variable.name, sub, value);
        } else {
          context.set(_this9.variable.name, value);
        } // Resume.


        context.execute();
      });
    }
  }]);

  return INPUT;
}(Node);

var FOR =
/*#__PURE__*/
function (_Node8) {
  _inherits(FOR, _Node8);

  function FOR(lineno, variable, left, right, step) {
    var _this10;

    _classCallCheck(this, FOR);

    _this10 = _possibleConstructorReturn(this, _getPrototypeOf(FOR).call(this, lineno, 'FOR'));
    _this10.lineno = lineno;
    _this10.variable = variable;
    _this10.left = left;
    _this10.right = right;
    _this10.step = step;
    return _this10;
  }

  _createClass(FOR, [{
    key: "run",
    value: function run(context) {
      var value = context.evaluate(this.left);
      var max = context.evaluate(this.right);
      var increment = this.step ? context.evaluate(this.step) : 1;
      this.assert(!this.variable.array, 'FOR loops variables cannot be arrays');
      context.loopStart({
        variable: this.variable.name,
        value: value,
        max: max,
        increment: increment
      });
    }
  }]);

  return FOR;
}(Node);

var NEXT =
/*#__PURE__*/
function (_Node9) {
  _inherits(NEXT, _Node9);

  function NEXT(lineno, variable) {
    var _this11;

    _classCallCheck(this, NEXT);

    _this11 = _possibleConstructorReturn(this, _getPrototypeOf(NEXT).call(this, lineno, 'NEXT'));
    _this11.variable = variable;
    return _this11;
  }

  _createClass(NEXT, [{
    key: "run",
    value: function run(context) {
      context.loopJump(this.variable.name);
    }
  }]);

  return NEXT;
}(Node);

var PLOT =
/*#__PURE__*/
function (_Node10) {
  _inherits(PLOT, _Node10);

  function PLOT(lineno, x, y) {
    var _this12;

    var color = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "black";

    _classCallCheck(this, PLOT);

    _this12 = _possibleConstructorReturn(this, _getPrototypeOf(PLOT).call(this, lineno, 'PLOT'));
    _this12.x = x;
    _this12.y = y;
    _this12.color = color;
    return _this12;
  }

  _createClass(PLOT, [{
    key: "run",
    value: function run(context) {
      context.plot(context.evaluate(this.x), context.evaluate(this.y), context.evaluate(this.color));
    }
  }]);

  return PLOT;
}(Node);

var END =
/*#__PURE__*/
function (_Node11) {
  _inherits(END, _Node11);

  function END() {
    _classCallCheck(this, END);

    return _possibleConstructorReturn(this, _getPrototypeOf(END).apply(this, arguments));
  }

  _createClass(END, [{
    key: "run",
    value: function run(context) {
      context.end();
    }
  }]);

  return END;
}(Node);

var IF =
/*#__PURE__*/
function (_Node12) {
  _inherits(IF, _Node12);

  function IF(lineno, condition, then, elze) {
    var _this13;

    _classCallCheck(this, IF);

    _this13 = _possibleConstructorReturn(this, _getPrototypeOf(IF).call(this, lineno, 'IF'));
    _this13.condition = condition;
    _this13.then = then;
    _this13.elze = elze;
    return _this13;
  }

  _createClass(IF, [{
    key: "run",
    value: function run(context) {
      if (context.evaluate(this.condition)) {
        this.then.run(context);
      } else if (this.other) {
        this.elze.run(context);
      }
    }
  }]);

  return IF;
}(Node);

var GOSUB =
/*#__PURE__*/
function (_Node13) {
  _inherits(GOSUB, _Node13);

  function GOSUB(lineno, expr) {
    var _this14;

    _classCallCheck(this, GOSUB);

    _this14 = _possibleConstructorReturn(this, _getPrototypeOf(GOSUB).call(this, lineno, 'GOSUB'));
    _this14.expr = expr;
    return _this14;
  }

  _createClass(GOSUB, [{
    key: "run",
    value: function run(context) {
      var lineno = context.evaluate(this.expr);
      this.assert(typeof lineno === 'number', 'GOSUB argument should be a number');
      context.gosub(lineno);
    }
  }]);

  return GOSUB;
}(Node);

var RETURN =
/*#__PURE__*/
function (_Node14) {
  _inherits(RETURN, _Node14);

  function RETURN() {
    _classCallCheck(this, RETURN);

    return _possibleConstructorReturn(this, _getPrototypeOf(RETURN).apply(this, arguments));
  }

  _createClass(RETURN, [{
    key: "run",
    value: function run(context) {
      context.return();
    }
  }]);

  return RETURN;
}(Node);

var ARRAY =
/*#__PURE__*/
function (_Node15) {
  _inherits(ARRAY, _Node15);

  function ARRAY(lineno, variable) {
    var _this15;

    _classCallCheck(this, ARRAY);

    _this15 = _possibleConstructorReturn(this, _getPrototypeOf(ARRAY).call(this, lineno, 'ARRAY'));
    _this15.variable = variable;
    return _this15;
  }

  _createClass(ARRAY, [{
    key: "run",
    value: function run(context) {
      context.array(this.variable.name);
    }
  }]);

  return ARRAY;
}(Node);

var CLS =
/*#__PURE__*/
function (_Node16) {
  _inherits(CLS, _Node16);

  function CLS() {
    _classCallCheck(this, CLS);

    return _possibleConstructorReturn(this, _getPrototypeOf(CLS).apply(this, arguments));
  }

  _createClass(CLS, [{
    key: "run",
    value: function run(context) {
      context.clearAll();
    }
  }]);

  return CLS;
}(Node);

var CLT =
/*#__PURE__*/
function (_Node17) {
  _inherits(CLT, _Node17);

  function CLT() {
    _classCallCheck(this, CLT);

    return _possibleConstructorReturn(this, _getPrototypeOf(CLT).apply(this, arguments));
  }

  _createClass(CLT, [{
    key: "run",
    value: function run(context) {
      context.clearConsole();
    }
  }]);

  return CLT;
}(Node);

var CLC =
/*#__PURE__*/
function (_Node18) {
  _inherits(CLC, _Node18);

  function CLC() {
    _classCallCheck(this, CLC);

    return _possibleConstructorReturn(this, _getPrototypeOf(CLC).apply(this, arguments));
  }

  _createClass(CLC, [{
    key: "run",
    value: function run(context) {
      context.clearGraphics();
    }
  }]);

  return CLC;
}(Node);

module.exports = {
  Node: Node,
  PRINT: PRINT,
  GOTO: GOTO,
  LET: LET,
  REM: REM,
  PAUSE: PAUSE,
  INPUT: INPUT,
  FOR: FOR,
  NEXT: NEXT,
  PLOT: PLOT,
  END: END,
  IF: IF,
  GOSUB: GOSUB,
  RETURN: RETURN,
  ARRAY: ARRAY,
  CLS: CLS,
  CLT: CLT,
  CLC: CLC,
  Variable: Variable
};
},{"./errors":"errors.js"}],"expr.js":[function(require,module,exports) {
function exprToJS(expr) {
  var jsExpr = '';

  while (expr.length) {
    var t = expr.shift();

    if (t.type === 'variable') {
      jsExpr += '__pgb.get("' + t.lexeme + '")';
      continue;
    }

    if (t.type === 'function') {
      jsExpr += '__pgb.fun("' + t.lexeme + '")';
      continue;
    }

    if (t.type === 'constant') {
      jsExpr += '__pgb.getConst("' + t.lexeme + '")';
      continue;
    }

    if (t.type === 'logic') {
      if (t.lexeme === 'AND') {
        jsExpr += '&&';
      } else if (t.lexeme === 'OR') {
        jsExpr += '||';
      }

      continue;
    }

    if (t.type === 'operation') {
      if (t.lexeme === '<>') {
        jsExpr += '!=';
        continue;
      }

      if (t.lexeme === '=') {
        jsExpr += '==';
        continue;
      }
    }

    jsExpr += t.lexeme;
  }

  return jsExpr;
}

module.exports = exprToJS;
},{}],"parser.js":[function(require,module,exports) {
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Tokenizer = require('./tokenizer');

var _require = require('./nodes'),
    PRINT = _require.PRINT,
    LET = _require.LET,
    REM = _require.REM,
    PAUSE = _require.PAUSE,
    INPUT = _require.INPUT,
    FOR = _require.FOR,
    NEXT = _require.NEXT,
    GOTO = _require.GOTO,
    END = _require.END,
    IF = _require.IF,
    GOSUB = _require.GOSUB,
    RETURN = _require.RETURN,
    ARRAY = _require.ARRAY,
    PLOT = _require.PLOT,
    CLS = _require.CLS,
    CLC = _require.CLC,
    CLT = _require.CLT,
    Variable = _require.Variable;

var exprToJS = require('./expr');

var _require2 = require('./errors'),
    ParseError = _require2.ParseError;

var Parser =
/*#__PURE__*/
function () {
  _createClass(Parser, null, [{
    key: "parseLine",
    value: function parseLine(line) {
      var t = new Tokenizer(line);
      t.tokenize();
      var p = new Parser(t);
      return p.parse();
    }
  }]);

  function Parser(tokenizer) {
    _classCallCheck(this, Parser);

    this.tokenizer = tokenizer;
    this.lineno = this.getLineNo(this.tokenizer.next());
  }

  _createClass(Parser, [{
    key: "parse",
    value: function parse() {
      var top = this.tokenizer.next();
      this.assertType(top, 'keyword');

      switch (top.lexeme) {
        case 'PRINT':
          return new PRINT(this.lineno, this.expectExpr(), this.acceptLineMod());

        case 'LET':
          {
            var variable = this.expectVariable();
            this.expectOperation('=');
            return new LET(this.lineno, variable, this.expectExpr());
          }

        case 'REM':
          return new REM(this.lineno, this.expectComment());

        case 'PAUSE':
          return new PAUSE(this.lineno, this.expectExpr());

        case 'INPUT':
          {
            var expr = this.expectExpr();
            this.expectLineMod();
            return new INPUT(this.lineno, expr, this.expectVariable());
          }

        case 'FOR':
          {
            var _variable = this.expectVariable();

            this.expectOperation('=');
            var frm = this.expectExpr();
            this.expectKeyword('TO');
            var to = this.expectExpr();
            var step = this.acceptKeyword('STEP') ? this.expectExpr() : null;
            return new FOR(this.lineno, _variable, frm, to, step);
          }

        case 'NEXT':
          return new NEXT(this.lineno, this.expectVariable());

        case 'GOTO':
          return new GOTO(this.lineno, this.expectExpr());

        case 'END':
          return new END(this.lineno);

        case 'IF':
          var cond = this.expectExpr();
          this.expectKeyword('THEN');
          var then; // Shortcut: number is interpreted as goto statement.

          if (this.tokenizer.peek().type === 'number') {
            then = new GOTO(this.lineno, this.expectExpr());
          } else {
            then = this.parse();
          }

          var elze = null;

          if (this.acceptKeyword('else')) {
            if (this.tokenizer.peek().type === 'number') {
              elze = new GOTO(this.lineno, this.expectExpr());
            } else {
              elze = this.parse();
            }
          }

          return new IF(this.lineno, cond, then, elze);

        case 'GOSUB':
          return new GOSUB(this.lineno, this.expectExpr());

        case 'RETURN':
          return new RETURN(this.lineno);

        case 'ARRAY':
          return new ARRAY(this.lineno, this.expectVariable());

        case 'PLOT':
          var x = this.expectExpr(true);
          this.expectOperation(',');
          var y = this.expectExpr(true);
          this.expectOperation(',');
          var color = this.expectExpr(true);
          return new PLOT(this.lineno, x, y, color);

        case 'CLS':
          return new CLS(this.lineno);

        case 'CLC':
          return new CLC(this.lineno);

        case 'CLT':
          return new CLT(this.lineno);
      }

      throw new ParseError(this.lineno, "Unexpected token ".concat(top.lexeme));
    }
  }, {
    key: "acceptKeyword",
    value: function acceptKeyword(keyword) {
      if (this.tokenizer.peek().type === 'keyword') {
        return this.tokenizer.next();
      }

      return null;
    }
  }, {
    key: "expectKeyword",
    value: function expectKeyword(keyword) {
      var t = this.acceptKeyword(keyword);

      if (t == null) {
        throw new ParseError(this.lineno, "Expected ".concat(keyword, " but got ").concat(this.tokenizer.peek().lexeme));
      }

      return t.lexeme;
    }
  }, {
    key: "expectComment",
    value: function expectComment() {
      var t = this.tokenizer.next();

      if (t.type === 'comment') {
        this.assertType(this.tokenizer.next(), 'eof');
        return t.lexeme;
      }

      this.assertType(t, 'eof');
      return '';
    }
  }, {
    key: "expectOperation",
    value: function expectOperation(op) {
      var t = this.tokenizer.next();
      this.assertType(t, 'operation');

      if (t.lexeme !== op) {
        throw new ParseError(this.lineno, 'Expected operation ' + op);
      }

      return t.lexeme;
    }
  }, {
    key: "expectVariable",
    value: function expectVariable() {
      var t = this.tokenizer.next();
      this.assertType(t, 'variable');
      return new Variable(this.lineno, t.lexeme, this.acceptSubscript());
    }
  }, {
    key: "expectExpr",
    value: function expectExpr() {
      var stopOnComma = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var expr = [];
      var brackets = 0;

      while (this.tokenizer.peek() != Tokenizer.eof) {
        if (stopOnComma && this.tokenizer.peek().lexeme === ',') {
          break;
        }

        if (!Tokenizer.expressionTypes.includes(this.tokenizer.peek().type)) {
          break;
        }

        var t = this.tokenizer.peek(); // We might be in a subscript or function call and if we see an
        // extra paren it's not ours to eat.

        if (brackets === 0 && (t.lexeme === ']' || t.lexeme === ')')) {
          break;
        }

        this.tokenizer.next();

        if (t.lexeme === '[' || t.lexeme === '(') {
          brackets++;
        }

        if (t.lexeme === ']' || t.lexeme === ']') {
          brackets--;
        } // Multiple variables in a row usually means users are trying
        // to use multi-letter variables


        if (expr[expr.length - 1] && t.type === 'variable' && expr[expr.length - 1].type === 'variable') {
          throw new ParseError(this.lineno, 'Variables should be single letter');
        }

        expr.push(t);
      }

      if (expr.length === 0) {
        throw new ParseError(this.lineno, 'Expected expression');
      }

      return exprToJS(expr);
    }
  }, {
    key: "expectLineMod",
    value: function expectLineMod() {
      if (!this.acceptLineMod()) {
        throw new ParseError(this.lineno, 'Expected ;');
      }

      return true;
    }
  }, {
    key: "acceptLineMod",
    value: function acceptLineMod() {
      if (this.tokenizer.peek().type === 'linemod') {
        this.tokenizer.next();
        return true;
      }

      return false;
    }
  }, {
    key: "acceptSubscript",
    value: function acceptSubscript() {
      if (this.tokenizer.peek().lexeme !== '[') return null;
      this.assertType(this.tokenizer.next(), 'operation', '[');
      var expr = this.expectExpr();
      this.assertType(this.tokenizer.next(), 'operation', ']');
      return expr;
    }
  }, {
    key: "assertType",
    value: function assertType(token, expected) {
      var value = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      if (token.type !== expected) {
        throw new ParseError(this.lineno, "Expected a ".concat(expected, " but got a ").concat(token.type, " instead \uD83D\uDE15"));
      }

      if (value != null && token.lexeme !== value) {
        throw new ParseError(this.lineno, "Expected a ".concat(value, " but got a ").concat(token.lexeme));
      }
    }
  }, {
    key: "getLineNo",
    value: function getLineNo(token) {
      this.assertType(token, 'lineno');

      if (typeof token.lexeme !== 'number') {
        throw new ParseError(this.lineno, 'Lines should start with line numbers');
      }

      return token.lexeme;
    }
  }]);

  return Parser;
}();

module.exports = Parser;
},{"./tokenizer":"tokenizer.js","./nodes":"nodes.js","./expr":"expr.js","./errors":"errors.js"}],"basic.js":[function(require,module,exports) {
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Context = require('context-eval');

var Parser = require('./parser');

var Functions = require('./functions');

var _require = require('./errors'),
    ParseError = _require.ParseError,
    RuntimeError = _require.RuntimeError;

var Basic =
/*#__PURE__*/
function () {
  function Basic(_ref) {
    var console = _ref.console,
        debugLevel = _ref.debugLevel,
        display = _ref.display,
        _ref$constants = _ref.constants,
        constants = _ref$constants === void 0 ? {
      PI: Math.PI,
      LEVEL: 1
    } : _ref$constants;

    window.console.log(_ref);
    window.console.log(constants)

    _classCallCheck(this, Basic);

    this.debugLevel = debugLevel;
    this.console = console;
    this.context = new Context({
      __pgb: this
    });
    this.variables = {};
    this.lineno = -1;
    this.program = [];
    this.loops = {};
    this.stack = [];
    this.jumped = false;
    this.display = display;
    this.constants = constants;
  }

  _createClass(Basic, [{
    key: "debug",
    value: function debug(str) {
      var level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      if (this.debugLevel >= level) {
        console.log("Debug ".concat(this.lineno, ":"), str);
      }
    }
  }, {
    key: "run",
    value: function run(program) {
      var _this = this;

      return new Promise(function (resolve, reject) {
        _this.onEnd = {
          resolve: resolve,
          reject: reject
        };
        _this.ended = false;
        var seen = {};
        _this.program = program.split('\n').filter(function (l) {
          return l.trim() !== '';
        }).map(function (l) {
          try {
            return Parser.parseLine(l);
          } catch (e) {
            _this.end(e);
          }
        }).sort(function (a, b) {
          return a.lineno - b.lineno;
        });

        if (_this.ended) {
          return;
        }

        _this.program.forEach(function (_ref2) {
          var lineno = _ref2.lineno;

          if (seen[lineno]) {
            return _this.end(new ParseError(lineno, "Line with number ".concat(lineno, " repeated")));
          }

          seen[lineno] = true;
        });

        if (!_this.program.length) return _this.end();
        _this.lineno = _this.program[0].lineno;

        _this.execute();
      });
    }
  }, {
    key: "execute",
    value: function execute() {
      var _this2 = this;

      while (true) {
        this.step();
        if (this.ended) return;

        if (!this.jumped) {
          var next = this.getNextLine();

          if (!next) {
            return this.end();
          }

          this.lineno = next.lineno;
        } else {
          this.jumped = false;
        }

        if (this.delay) {
          var delay = this.delay;
          this.delay = null;
          return setTimeout(function () {
            _this2.execute();
          }, delay);
        }

        if (this.halted) {
          return;
        }
      }
    }
  }, {
    key: "getCurLine",
    value: function getCurLine() {
      var _this3 = this;

      return this.program.find(function (_ref3) {
        var lineno = _ref3.lineno;
        return lineno === _this3.lineno;
      });
    }
  }, {
    key: "getNextLine",
    value: function getNextLine() {
      return this.program[this.program.indexOf(this.getCurLine()) + 1];
    }
  }, {
    key: "step",
    value: function step() {
      var node = this.getCurLine();

      if (!node) {
        return this.end(new RuntimeError(this.lineno, "Cannot find line ".concat(this.lineno, " \uD83E\uDD26\u200D\u2642\uFE0F")));
      }

      this.debug('step', 1);
      this.debug(node.toJSON(), 2);

      try {
        node.run(this);
      } catch (e) {
        this.end(e);
      }
    }
  }, {
    key: "end",
    value: function end(error) {
      this.ended = true;

      if (error) {
        this.debug("program ended with error: ".concat(error.message));
        this.onEnd.reject(error);
      } else {
        this.debug('program ended');
        this.onEnd.resolve();
      }
    }
  }, {
    key: "evaluate",
    value: function evaluate(code) {
      try {
        return this.context.evaluate(code);
      } catch (e) {
        console.error('Error evaluating code:', code);
        throw e;
      }
    }
  }, {
    key: "set",
    value: function set(vari, value) {
      this.variables[vari] = value;
    }
  }, {
    key: "setArray",
    value: function setArray(vari, sub, value) {
      if (!(this.variables[vari] instanceof BasicArray)) {
        return this.end(new RuntimeError(this.lineno, "".concat(vari, " is not an array, did you call ARRAY?")));
      }

      this.variables[vari][sub] = value;
    }
  }, {
    key: "array",
    value: function array(name) {
      this.variables[name] = new BasicArray();
    }
  }, {
    key: "fun",
    value: function fun(name) {
      if (!Functions[name]) {
        return this.end(new RuntimeError(this.lineno, "Function ".concat(name, " does not exist \u2639\uFE0F")));
      } // External functions


      switch (name.toLowerCase()) {
        case 'color':
          return this.color.bind(this);

        case 'getchar':
          return this.getChar.bind(this);
      } // Internal utils


      return Functions[name];
    }
  }, {
    key: "get",
    value: function get(vari) {
      return this.variables[vari] || 0;
    }
  }, {
    key: "getConst",
    value: function getConst(constant) {
      if (this.constants.hasOwnProperty(constant)) {
        return this.constants[constant];
      }

      this.end(new RuntimeError(this.lineno, "Constant ".concat(constant, " is undefined")));
    }
  }, {
    key: "pause",
    value: function pause(millis) {
      this.debug("pause ".concat(millis));
      this.delay = millis;
    }
  }, {
    key: "goto",
    value: function goto(lineno) {
      this.debug("goto ".concat(lineno));
      this.lineno = lineno;
      this.jumped = true;
    }
  }, {
    key: "loopStart",
    value: function loopStart(_ref4) {
      var variable = _ref4.variable,
          value = _ref4.value,
          increment = _ref4.increment,
          max = _ref4.max;
      this.debug("marking loop ".concat(variable));
      this.set(variable, value);
      var next = this.getNextLine();
      if (!next) return this.end();
      this.loops[variable] = {
        variable: variable,
        value: value,
        increment: increment,
        max: max,
        lineno: next.lineno
      };
    }
  }, {
    key: "loopJump",
    value: function loopJump(name) {
      this.debug("jumping to loop ".concat(name));
      var loop = this.loops[name];
      loop.value += loop.increment;
      this.set(loop.variable, loop.value);
      if (loop.value >= loop.max) return;
      this.goto(loop.lineno);
    }
  }, {
    key: "gosub",
    value: function gosub(lineno) {
      var next = this.getNextLine();

      if (next) {
        this.stack.push(next.lineno);
      } else {
        this.stack.push(this.lineno + 1);
      }

      this.goto(lineno);
    }
  }, {
    key: "return",
    value: function _return() {
      if (this.stack.length === 0) {
        return this.end(new RuntimeError(this.lineno, "There are no function calls to return from \uD83E\uDD37"));
      }

      var lineno = this.stack.pop();
      this.goto(lineno);
    }
  }, {
    key: "assertDisplay",
    value: function assertDisplay() {
      if (!this.display) {
        return this.end(new RuntimeError(this.lineno, 'No display found'));
      }
    }
  }, {
    key: "plot",
    value: function plot(x, y, color) {
      this.assertDisplay();
      this.display.plot(x, y, color);
    }
  }, {
    key: "color",
    value: function color(x, y) {
      this.assertDisplay();
      return this.display.color(x, y);
    }
  }, {
    key: "clearAll",
    value: function clearAll() {
      this.clearConsole();
      this.clearGraphics();
    }
  }, {
    key: "print",
    value: function print(s) {
      this.console.write(s.toString());
    }
  }, {
    key: "clearConsole",
    value: function clearConsole() {
      this.console.clear();
    }
  }, {
    key: "clearGraphics",
    value: function clearGraphics() {
      this.assertDisplay();
      this.display.clear();
    }
  }, {
    key: "getChar",
    value: function getChar() {
      this.assertDisplay();
      return this.display.getChar() || '';
    }
  }, {
    key: "input",
    value: function input(callback) {
      this.console.input(callback);
    }
  }, {
    key: "halt",
    value: function halt() {
      this.halted = true;
    }
  }]);

  return Basic;
}();

var BasicArray =
/*#__PURE__*/
function () {
  function BasicArray() {
    _classCallCheck(this, BasicArray);
  }

  _createClass(BasicArray, [{
    key: "toString",
    value: function toString() {
      var s = '';

      for (var prop in this) {
        if (this.hasOwnProperty(prop)) {
          s += "".concat(prop, ", ");
        }
      }

      return s.replace(/,\s$/, '');
    }
  }]);

  return BasicArray;
}();

module.exports = Basic;
},{"context-eval":"node_modules/context-eval/lib/context-browser.js","./parser":"parser.js","./functions":"functions.js","./errors":"errors.js"}]},{},["basic.js"], "pg-basic")