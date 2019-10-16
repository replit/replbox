/**
  @preserve
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

// Defines the main QBasic object.
var QBasic = {};

/**
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
  Defines:
    QBasic.Locus
    QBasic.Token
    QBasic.Tokenizer
  Uses:
    -
*/

(function () {
  var NextStateId = 0;

  var POST_NEWLINE = -1;
  var PRE_NEWLINE = -2;
  var DIGIT_CHAR = -3;
  var ANY_CHAR = -4;

  /**
    Represents a location in the source file. (The name "location" cannot be
    used because it has a special meaning in browsers.) This is used throughout
    the compiler to map program statements to token positions.

    @constructor
  */
  QBasic.Locus = function(line, position) {
    this.line = line;
    this.position = position;
  };

  QBasic.Locus.prototype = {
    toString: function () {
      return "" + (this.line + 1) + ":" + (this.position + 1);
    }
  };

  /**
    When the match function is called, it will return true if the argument
    matches a particular character.

    @constructor
  */
  function CharMatcher(ch) {
    this.mchar = ch;
  }

  CharMatcher.prototype = {
    match: function (ch) {
      //dbg.printf("Compare %s with %s\n", this.mchar, ch );
      if (this.mchar == DIGIT_CHAR) {
        return ch >= '0' && ch <= '9';
      } else if (this.mchar == ANY_CHAR) {
        return ch != POST_NEWLINE && ch != PRE_NEWLINE && ch != '\n';
      } else {
        return ch == this.mchar;
      }
    },

    toString: function () {
      if (this.mchar == DIGIT_CHAR) {
        return "\\d";
      } else {
        return this.mchar;
      }
    }
  };

  /**
    When the match function is called, it will return true if the argument
    matches a particular character range.

    @constructor
  */
  function RangeMatcher(ranges, include) {
    // list of [ start, end ]
    this.ranges = ranges;
    this.include = include; // boolean
  }

  RangeMatcher.prototype = {
    match: function (ch) {
      for (var i = 0; i < this.ranges.length; i++) {
        var range = this.ranges[i];
        if (ch >= range[0] && ch <= range[1]) {
          return this.include;
        }
      }

      return !this.include;
    },

    toString: function () {
      var str = "[";
      if (!this.include) {
        str += "^";
      }
      for (var i = 0; i < this.ranges.length; i++) {
        if (this.ranges[i][0] == this.ranges[i][1]) {
          str += this.ranges[i][0];
        } else {
          str += this.ranges[i][0] + "-" + this.ranges[i][1];
        }
      }
      return str + "]";
    }
  };

  /** @constructor */
  function NfaState(charMatcher) {
    this.mchar = charMatcher;
    this.next = [];
    this.id = NextStateId++;
    this.lastList = 0;
    this.accept = undefined;
  }

  /** @constructor */
  function DfaState() {
    this.nfaStates = [];
    this.next = {};
    this.accepts = [];
    this.id = NextStateId++;
  }

  NfaState.prototype.toString = function () {
    var str = "\nState [" + this.id + "] ch=" + this.mchar + "\n";
    if (this.accept !== undefined) {
      str += "    Accept " + this.accept + "\n";
    }
    for (var i = 0; i < this.next.length; i++) {
      str += ("    ch=" + this.next[i].mchar +
              " goto [" + this.next[i].id + "]\n");
    }
    return str;
  };

  /** @constructor */
  function NFA(start, end) {
    this.start = start;
    this.end = end;
  }

  NFA.prototype.toString = function () {
    var processed = {};
    var stack = [this.start];
    var str = "";

    while (stack.length > 0) {
      var state = stack.pop();
      if (processed[state]) {
        continue;
      }
      processed[state] = 1;

      for (var i = 0; i < state.next.length; i++) {
        stack.push(state.next[i]);
      }
      str += state.toString();
    }
    return str;
  };

  /** @constructor */
  QBasic.Token = function(id, text, line, position) {
    this.id = id;
    this.text = text;
    this.locus = new QBasic.Locus(line, position);
  };

  QBasic.Token.prototype = {
    toString: function () {
      return "Token(" + this.text + ")";
    }

  };

  /** @constructor */
  QBasic.Tokenizer = function() {
    this.root = new NfaState(null);
    this.expr = null;
    this.index = 0;
    this.listId = 1;
    this.dfaCache = {};

    // text to tokenize.
    this.text = "";

    // for each line, the character position of that line in the text.
    this.lineNumbers = [];

    // users can redefine these if they want.
    this.EOF_TOKEN = {};
    this.IGNORE_TOKEN = {};

    // check this to determine if we have reached the end of the text.
    this.finished = true;
  };

  QBasic.Tokenizer.prototype = {
    addToken: function (id, expr) {
      this.expr = expr;
      this.index = 0;
      var nfa = this.parseAlternation();
      this.root.next.push(nfa.start);
      nfa.end.accept = id;
    },

    ignore: function (expr) {
      this.addToken(this.IGNORE_TOKEN, expr);
    },

    eof: function () {
      return this.index == this.expr.length;
    },

    matchChar: function (ch) {
      if (this.expr[this.index] == ch) {
        this.index++;
        return true;
      }
      return false;
    },

    peek: function (ch) {
      return this.expr[this.index] == ch;
    },

    parseChar: function () {
      if (this.matchChar('\\')) {
        if (this.matchChar('n')) {
          return '\n';
        } else if (this.matchChar('r')) {
          return '\r';
        } else if (this.matchChar('t')) {
          return '\t';
        } else if (this.matchChar('d')) {
          return DIGIT_CHAR;
        } else {
          return this.expr[this.index++];
        }
      } else if (this.matchChar('.')) {
        return ANY_CHAR;
      } else if (this.matchChar('$')) {
        return PRE_NEWLINE;
      } else if (this.matchChar('^')) {
        return POST_NEWLINE;
      } else {
        return this.expr[this.index++];
      }
    },

    parseRange: function () {
      var include = true;
      var ranges = [];

      while (!this.eof() && !this.peek(']')) {
        if (this.matchChar('^')) {
          include = false;
        }
        var first = this.parseChar();
        var last = first;
        if (this.matchChar('-')) {
          last = this.parseChar();
        }

        if (first == DIGIT_CHAR) {
          first = '0';
          last = '9';
        }

        //console.log("Pushing range " + first + ".." + last);
        ranges.push([first, last]);
      }

      var state = new NfaState(new RangeMatcher(ranges, include));
      return new NFA(state, state);
    },

    parseBasic: function () {
      var nfa;

      if (this.matchChar('(')) {
        nfa = this.parseAlternation();
        if (!this.matchChar(')')) {
          throw "Expected ')'";
        }
      } else if (this.matchChar('[')) {
        //console.log("Encountered RANGE!\n");
        nfa = this.parseRange();
        if (!this.matchChar(']')) {
          throw "Expected ']'";
        }
      } else {
        var state = new NfaState(new CharMatcher(this.parseChar()));
        nfa = new NFA(state, state);
      }

      return nfa;
    },

    parseKleene: function () {
      var nfa = this.parseBasic();
      var splitter;
      if (this.matchChar("+")) {
        splitter = new NfaState(null);
        nfa.end.next.push(splitter);
        splitter.next.push(nfa.start);
        nfa.end = splitter;
      } else if (this.matchChar("*")) {
        splitter = new NfaState(null);
        splitter.next.push(nfa.start);
        nfa.end.next.push(splitter);
        nfa.start = splitter;
        nfa.end = splitter;
      } else if (this.matchChar("?")) {
        var start = new NfaState(null);
        var end = new NfaState(null);
        start.next.push(nfa.start);
        start.next.push(end);
        nfa.end.next.push(end);
        nfa.start = start;
        nfa.end = end;
      }

      return nfa;
    },

    parseConcat: function () {
      var start = new NfaState(null);
      var end = start;
      for (;;) {
        if (this.peek("|") || this.peek(")") || this.eof()) {
          break;
        }
        var nfa = this.parseKleene();
        end.next.push(nfa.start);
        end = nfa.end;
      }
      return new NFA(start, end);
    },

    parseAlternation: function () {
      var start = new NfaState(null);
      var end = new NfaState(null);
      do {
        var nfa = this.parseConcat();
        start.next.push(nfa.start);
        nfa.end.next.push(end);
      } while (this.matchChar("|"));

      return new NFA(start, end);
    },

    addState: function (nfaStateList, accepts, nfaState) {
      if (nfaState.lastList == this.listId) {
        //console.log("Skip adding nfa State [" + nfaState.id + "]");
        return;
      }

      //console.log("Add NFA state [" + nfaState.id + "]\n");
      if (nfaState.accept !== undefined) {
        accepts.push(nfaState.accept);
      }

      nfaState.lastList = this.listId;
      nfaStateList.push(nfaState);

      if (nfaState.mchar === null) {
        for (var i = 0; i < nfaState.next.length; i++) {
          this.addState(nfaStateList, accepts, nfaState.next[i]);
        }
      }
    },

    nextState: function (dfaState, ch) {
      var nfaStateList = [];
      var accepts = [];
      var i;
      //console.log("Transition from DFA[" + dfaState.id + "] on ch=" + ch);
      this.listId++;

      for (i = 0; i < dfaState.nfaStates.length; i++) {
        var nfaState = dfaState.nfaStates[i];
        if (nfaState.mchar !== null) {
          if (nfaState.mchar.match(ch)) {
            this.addState(nfaStateList, accepts, nfaState.next[0]);
          } else if (ch == PRE_NEWLINE || ch == POST_NEWLINE) {
            this.addState(nfaStateList, accepts, nfaState);
          }
        }
      }

      nfaStateList.sort(function (a, b) {
        return a.id - b.id;
      });

      var key = "";
      for (i = 0; i < nfaStateList.length; i++) {
        key += nfaStateList[i].id + ".";
      }

      if (this.dfaCache[key] === undefined) {
        dfaState = new DfaState();
        //console.log("Created DFA state [" + dfaState.id + "] accepts=" +
        //            accepts);
        dfaState.nfaStates = nfaStateList;
        dfaState.accepts = accepts;
        this.dfaCache[key] = dfaState;
      } else {
        //console.log("Returning cached DFA state [" + this.dfaCache[key].id +
        //            "] accepts=" + this.dfaCache[key].accepts);
      }

      return this.dfaCache[key];
    },

    setText: function (text) {
      this.text = text;
      this.lineNumbers.length = 0;
      this.lineNumbers.push(0);
      this.finished = false;

      for (var i = 0; i < this.text.length; i++) {
        if (this.text[i] == '\n') {
          this.lineNumbers.push(i + 1);
        }
      }
    },

    getLine: function (lineno) {
      return this.text.substr(this.lineNumbers[lineno],
                              (this.lineNumbers[lineno + 1] - 
                               this.lineNumbers[lineno]));
    },

    /**
      Retrieve a list of tokens that match at a given position. The list is
      returned sorted in order of length.

      @param text Text to match.
      @param line Line number to begin matching, starting from 0
      @param position Character position on the line to begin matching.
    */
    nextTokenInternal: function (line, position) {
      var last = 0;
      var i;
      var accept = null;

      if (this.rootDfa === undefined) {
        this.rootDfa = new DfaState();
        this.addState(this.rootDfa.nfaStates, this.rootDfa.accepts, this.root);
      }

      var dfaState = this.rootDfa;

      var startPosition = this.lineNumbers[line] + position;
      //dbg.printf("Start match from %d:%d\n", line, position );
      if (startPosition == this.text.length) {
        this.finished = true;
        return new QBasic.Token(this.EOF_TOKEN, "!EOF", line, position);
      }

      if (startPosition > 0) {
        last = this.text[startPosition - 1];
      }

      for (i = startPosition; i < this.text.length; i++) {
        //dbg.printf("Enter DFA state %d\n", dfaState.id );
        var ch = this.text[i];

        if (ch === '\n' && last != PRE_NEWLINE) {
          ch = PRE_NEWLINE;
          i--;
        } else if (last === '\n' || last === 0) {
          ch = POST_NEWLINE;
          i--;
        }

        if (last === '\n') {
          line++;
        }
        last = ch;

        if (dfaState.next[ch] === undefined) {
          dfaState.next[ch] = this.nextState(dfaState, ch);
        }
        dfaState = dfaState.next[ch];

        if (dfaState.accepts.length) {
          //console.log("Would accept " + dfaState.accepts[0]);
          //console.log("i:" + i + " line:" + line +
          //            " lineNumbers=" + this.lineNumbers[line]);
          accept = new QBasic.Token(dfaState.accepts[0], 
                                    this.text.substr(startPosition, 
                                                     i - startPosition + 1),
                                    line, 
                                    startPosition - this.lineNumbers[line]);
        }

        if (dfaState.nfaStates.length === 0) {
          break;
        }
      }

      if (accept) {
        //console.log("Returning match id=" + accept.id + " at " + 
        //            accept.locus.line + ":" + accept.locus.position +
        //            " text=" accept.text);
      } else if (0) {
        console.log("Bad token at " + this.text.substr(startPosition, 10));
        console.log("ascii " + this.text.charCodeAt(startPosition));
      }

      return accept;
    },

    nextToken: function (line, position) {
      for (;;) {
        var token = this.nextTokenInternal(line, position);
        if (token === null || token.id !== this.IGNORE_TOKEN) {
          return token;
        }
        line = token.locus.line;
        position = token.locus.position + token.text.length;
      }
    }
  };
})();

/**
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
  Defines:
    QBasic.NullType
    QBasic.IntegerType
    QBasic.SingleType
    QBasic.DoubleType
    QBasic.StringType
    QBasic.AnyType
    QBasic.DeriveTypeNameFromVariable
    QBasic.ArrayType
    QBasic.UserType
    QBasic.Dimension
    QBasic.ScalarVariable
    QBasic.ArrayVariable
    QBasic.IsNumericType
    QBasic.IsStringType
    QBasic.IsArrayType
    QBasic.IsUserType
    QBasic.IsNullType
    QBasic.AreTypesCompatible
  Uses:
    -
*/

(function() {
  /** @constructor */
  QBasic.NullType = function() {
    // used to denote the absense of a parameter in system calls.
    this.name = ":NULL";
  };

  QBasic.NullType.prototype = {
    createInstance: function() {
      return null;
    },

    copy: function (value) {
      return value;
    }
  };

  /** @constructor */
  QBasic.IntegerType = function() {
    this.name = "INTEGER";
  };

  QBasic.IntegerType.prototype = {
    createInstance: function() {
      return 0;
    },

    copy: function (value) {
      return (Math.round(value + 32768) & 65535) - 32768;
    }
  };

  /** @constructor */
  QBasic.SingleType = function() {
    this.name = "SINGLE";
  };

  QBasic.SingleType.prototype = {
    createInstance: function() {
      return 0.0;
    },

    copy: function (value) {
      return value;
    }
  };

  /** @constructor */
  QBasic.DoubleType = function() {
    this.name = "DOUBLE";
  };

  QBasic.DoubleType.prototype = {
    createInstance: function() {
      return 0.0;
    },

    copy: function (value) {
      return value;
    }
  };

  /** @constructor */
  QBasic.StringType = function() {
    this.name = "STRING";
  };

  QBasic.StringType.prototype = {
    createInstance: function() {
      return "";
    },

    copy: function (value) {
      return value;
    }
  };

  /** @constructor */
  QBasic.AnyType = function() {
    this.name = "ANY";
  };

  QBasic.DeriveTypeNameFromVariable = function(name) {
    switch (name[name.length - 1]) {
    case '$':
      return "STRING";
    case '%':
      return "INTEGER";
    case '&':
      return "LONG";
    case '#':
      return "DOUBLE";
    case '!':
      return "SINGLE";
    }
    return null; // Must use default type from DEFINT or single.
  };

  /** @constructor */
  QBasic.ArrayType = function(elementType) {
    this.elementType = elementType;
    this.name = "ARRAY OF " + elementType.name;
  };

  /** @constructor */
  QBasic.UserType = function(name, members) {
    this.name = name;

    // Members: A mapping of names to types.
    this.members = members;
  };

  QBasic.UserType.prototype = {
    createInstance: function() {
      var user = {};

      for (var name in this.members) {
        user[name] = new QBasic.ScalarVariable(
            this.members[name], this.members[name].createInstance());
      }

      return user;
    },

    copy: function (value) {
      var newValue = {};
      for (var key in value) {
        newValue[key] = value[key].copy();
      }
      return newValue;
    }
  };

  /** @constructor */
  QBasic.Dimension = function(lower, upper) {
    this.lower = lower;
    this.upper = upper;
  };

  /** @constructor */
  QBasic.ScalarVariable = function(type, value) {
    this.type = type;
    this.value = value;
  };

  QBasic.ScalarVariable.prototype = {
    copy: function() {
      return new QBasic.ScalarVariable(this.type, this.type.copy(this.value));
    }
  };

  /** @constructor */
  QBasic.ArrayVariable = function(type, dimensions) {
    this.type = type;
    this.dimensions = dimensions;
    this.values = [];
    var totalSize = 1;
    var i;

    for (i = 0; i < this.dimensions.length; i++) {
      totalSize *= this.dimensions[i].upper - this.dimensions[i].lower + 1;
    }

    for (i = 0; i < totalSize; i++) {
      this.values.push(
      new QBasic.ScalarVariable(this.type, this.type.createInstance()));
    }
  };

  QBasic.ArrayVariable.prototype = {
    copy: function() {
      return this;
    },
    getIndex: function(indexes) {
      var mult = 1;
      var index = 0;

      //console.log("Access array indexes: " + indexes);
      for (var i = this.dimensions.length - 1; i >= 0; i--) {
        index += (indexes[i] - this.dimensions[i].lower) * mult;
        mult *= this.dimensions[i].upper - this.dimensions[i].lower + 1;
      }
      return index;
    },
    assign: function(indexes, value) {
      var index = this.getIndex(indexes);
      //console.log("Assign " + value + " to array index " + index);
      this.values[index] = value;
    },
    access: function(indexes, value) {
      var index = this.getIndex(indexes);
      //console.log("access array index " + index);
      return this.values[index];
    }
  };

  QBasic.IsNumericType = function(type) {
    return (type.name == "INTEGER" ||
            type.name == "SINGLE" ||
            type.name == "DOUBLE");
  };

  QBasic.IsStringType = function(type) {
    return type.name == "STRING";
  };

  QBasic.IsArrayType = function(type) {
    return type instanceof QBasic.ArrayType;
  };

  QBasic.IsUserType = function(type) {
    return type instanceof QBasic.UserType;
  };

  QBasic.IsNullType = function(type) {
    return type instanceof QBasic.NullType;
  };

  QBasic.AreTypesCompatible = function(type1, type2) {
    if (type1.name == type2.name) return true;
    if (QBasic.IsNumericType(type1) && QBasic.IsNumericType(type2)) return true;
    if (QBasic.IsArrayType(type1) && QBasic.IsArrayType(type2) &&
        (type1.elementType.name == "ANY" || type2.elementType.name == "ANY")) {
      return true;
    }
    if (!QBasic.IsArrayType(type1) && !QBasic.IsArrayType(type2) && 
        (type1.name == "ANY" || type2.name == "ANY")) {
      return true;
    }
    return false;
  };
})();

/**
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
  NOTE: This parser is slow but reliable. A faster alternative is GlrParser from
    http://stevehanov.ca/blog/index.php?id=92. However, it is not currently
    reliable.
*/

/**
  Defines:
    QBasic.EarleyParser
  Uses:
    # Tokenizer.js
    QBasic.Token
*/

(function() {
  // The current index for the unique ID generator.
  var NextId = 0;

  /** @constructor */
  var EarleyItem = function(rule, position, base, token, prev, locus) {
    this.id = NextId++;
    this.rule = rule;
    this.pos = position;
    this.base = base;
    this.token = token;
    this.prev = prev;
    this.locus = locus;
  };

  EarleyItem.prototype = {
    toString: function() {
      var str = "[" + this.id + "] " + this.rule.name + ":";
      for (var i = 0; i < this.rule.symbols.length; i++) {
        if (i == this.pos) {
          str += " .";
        }
        str += " " + this.rule.symbols[i];
      }

      if (i == this.pos) {
        str += " .";
      }
      str += ", " + this.base;
      if (this.token instanceof QBasic.Token) {
        str += ", token=" + this.token.text;
      } else if (this.token) {
        str += ", rule=" + this.token.rule;
      }
      if (this.prev) {
        str += ", prev=" + this.prev.id;
      }
      return str;
    }
  };

  /**
    The Earley parser is like the proverbial tortoise. Its simplicity lets
    slowly but surely it chug through any grammar you throw its way.

    @constructor
  */
  QBasic.EarleyParser = function(ruleSet) {
    // Map from rule name to NFA.
    this.tokenizer = ruleSet.createTokenizer();
    this.EPSILON = ruleSet.EPSILON;

    ruleSet.computeFirst();

    this.rules = ruleSet.rules;
    this.first = ruleSet.first;

    // Set this to true to enable debug messages (requires console).
    this.debug = false;
  };

  QBasic.EarleyParser.prototype = {
    getNonTerminal: function(name) {
      return this.rules[name];
    },

    getRegexFromTerminal: function(terminal) {
      return terminal.substr(1, terminal.length - 2);
    },

    isTerminal: function(symbol) {
      return symbol !== undefined && symbol[0] == "'";
    },

    isNonTerminal: function(symbol) {
      return symbol !== undefined && symbol[0] != "'";
    },

    parse: function(text) {
      var states = [[new EarleyItem(this.rules._start[0], 0, 0)]];

      var line = 0;
      var position = 0;
      var j;
      this.tokenizer.setText(text);

      this.errors = [];

      for (var i = 0;; i++) {
        var token = this.tokenizer.nextToken(line, position);
        if (token === null) {
          this.errors.push("Bad token at " + line + ":" + position);
          if (this.debug) console.log("Bad token!");
          return null;
        } else if (this.debug) {
          if (this.debug) console.log("Got token " + token + " at " + token.locus);
        }
        this.locus = token.locus;

        states.push([]);
        var processedTo = 0;
        while (processedTo < states[i].length) {
          // remain calm
          this.predict(states[i], processedTo, i, token);
          this.complete(states, i, processedTo, i);
          processedTo++;
        }

        this.scan(states, i, token);

        if (states[i].length === 0) {
          this.errors.push("Syntax error at " + this.locus + ": " + token);
          for (j = 0; j < states[i - 1].length; j++) {
            this.errors.push("  " + states[i - 1][j] + "\n");
          }
          break;
        }

        if (this.debug) {
          this.printState(states, i);
        }

        line = token.locus.line;
        position = token.locus.position + token.text.length;

        if (token.id === this.tokenizer.EOF_TOKEN) {
          //console.log("Reached end of input.");
          i++;
          break;
        }
      }

      if (this.debug) {
        this.printState(states, i);
      }
      if (states[i].length) {
        return this.evaluate(states[i][0]);
      }

      this.errors.push("Syntax error at " + this.locus);
      for (j = 0; j < states[i - 1].length; j++) {
        this.errors.push("  " + states[i - 1][j] + "\n");
      }
      return null;
    },

    predict: function(items, index, base, token) {
      var item = items[index];
      if (this.isNonTerminal(item.rule.symbols[item.pos])) {
        var nonTerminal = this.getNonTerminal(item.rule.symbols[item.pos]);
        for (var i = 0; i < nonTerminal.length; i++) {
          var rule = nonTerminal[i];
          if (rule.symbols.length === 0 ||
              rule.symbols[0][0] === "'" ||
              this.first[rule.symbols[0]][token.id] ||
              this.first[rule.symbols[0]][this.EPSILON]) {
            this.addToState(items, rule, 0, base, undefined, undefined);
          }
        }
      }
    },

    complete: function(states, i, index, base) {
      var item = states[i][index];
      if (item.pos == item.rule.symbols.length) {
        var baseItems = states[item.base];
        for (var j = 0; j < baseItems.length; j++) {
          if (baseItems[j].rule.symbols[baseItems[j].pos] == item.rule.name) {
            this.addToState(states[i], baseItems[j].rule, baseItems[j].pos + 1,
                            baseItems[j].base, item, baseItems[j]);
          }
        }
      }
    },

    scan: function(states, i, token) {
      var items = states[i];
      for (var j = 0; j < items.length; j++) {
        if (items[j].rule.symbols[items[j].pos] == token.id) {
          var item = new EarleyItem(items[j].rule, items[j].pos + 1,
                                    items[j].base, token, items[j], this.locus);
          states[i + 1].push(item);
        }
      }
    },

    addToState: function(items, rule, pos, base, token, prev) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].rule === rule && items[i].pos === pos && items[i].base === base) {
          return;
        }
      }
      items.push(new EarleyItem(rule, pos, base, token, prev, this.locus));
    },

    printState: function(states, index) {
      if (!this.debug) {
        return;
      }
      var items = states[index];
      console.log("State [" + index + "]");
      for (var i = 0; i < items.length; i++) {
        console.log(items[i]);
      }
    },

    // -------------------------------------------------------------------------
    // Given an earley item, reconstruct the dervation and invoke any associated
    // actions.
    // -------------------------------------------------------------------------
    evaluate: function(item_in) {
      if (!item_in) {
        return;
      }

      var args = [];
      var item = item_in;
      var locus = item_in.locus;

      while (item) {
        if (item.token instanceof QBasic.Token) {
          args.unshift(item.token.text);
        } else if (item.token) {
          args.unshift(this.evaluate(item.token));
        }
        locus = item.locus;
        item = item.prev;
      }

      var result;

      if (item_in.rule.action) {
        result = item_in.rule.action(args, locus);
      } else {
        result = args[0];
      }
      return result;
    }
  };
})();
/**
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
  Defines:
    QBasic.RuleSet
  Uses:
    # Tokenizer.js
    QBasic.Tokenizer
*/

(function () {
  var NextRuleId = 0;

  /** @constructor */
  function Rule(name, symbols, action) {
    this.id = NextRuleId++;

    // Name of the rule.
    this.name = name;

    // array of symbols. If the symbol begins with ' then it is a regular
    // expression. Otherwise, it is the name of another rule. The array
    // may not be null. For an empty rule, use a zero-length array.
    this.symbols = symbols;

    // The action. May be undefined.
    this.action = action;
  }

  Rule.prototype = {
    /** Returns string representation of a rule for debugging. */
    toString: function () {
      var str = this.name + ":";

      for (var i = 0; i < this.symbols.length; i++) {
        str += " " + this.symbols[i];
      }

      if (0 && this.action) {
        // this prints out the whole function which can be undesirable.
        str += " action=" + this.action;
      }

      return str;
    }
  };

  /** @constructor */
  QBasic.RuleSet = function() {
    // Each entry is an array of rules that have the same name.
    this.rules = {};

    // list of terminals in the grammar, from highest priority to lowest.
    this.terminals = [];

    // Keep track of which terminals have been added already.
    this.terminalsAdded = {};

    // map from rule name to map of symbols of FIRST set.
    this.first = {};

    // Whitespace can be significant in some languages. For now, we ignore it.
    this.eatWhiteSpace = true;

    if (this.eatWhiteSpace) {
      this.joinExpr = " *";
    } else {
      this.joinExpr = "";
    }

    // should be calculated later to be something not in the grammar.
    this.EOF_TOKEN = "'EOF'";

    this.addRule("_start", ["start", this.EOF_TOKEN]);
  };

  QBasic.RuleSet.prototype = {
    // A constant representing nothing in the FIRST set.
    EPSILON: {
      toString: function () {
        return "EPSILON";
      }
    },

    /** Returns string representation of a ruleset for debugging. */
    toString: function () {
      var str = "";
      for (var name in this.rules) {
        var rules = this.rules[name];
        for (var i = 0; i < rules.length; i++) {
          str += rules[i].toString() + "\n";
        }
      }

      return str;
    },

    /**
      Verify consistency of the rules.

      @param errors an array. Text describing the errors will be added to the
        end of this array.
      @return Number of errors found.
    */
    check: function (errors) {
      var size = errors.length;

      // for each rule name, 
      for (var ruleName in this.rules) {

        // for each rule by that name,
        var rules = this.rules[ruleName];
        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i];

          for (var j = 0; j < rule.symbols.length; j++) {
            var symbol = rule.symbols[j];
            if (symbol.length === 0) {
              errors.push("Error: Rule '" + ruleName +
                          "' contains a zero length symbol: " + symbol);

              // Verify that all non-terminals in the rule exist.
            } else if (symbol[0] != "'") {
              if (this.rules[symbol] === undefined) {
                errors.push("Error: Rule'" + ruleName + 
                            "' contains an undefined symbol: " + symbol);
              }

              // 2. Verify that all terminals are valid regular expressions.
            } else {
              // not easily done....
            }
          }
        }
      }
      return errors.length - size;
    },

    /** Transform the grammar to try to reduce the number of rules. */
    optimize: function () {
      var changed = 1;
      // loop until no change.
      while (changed) {
        changed = 0;

        // for each rule name,
        for (var name in this.rules) {
          var rules = this.rules[name];

          // inline the rule if it has no alternatives, one symbol, and
          // no associated actions.
          if (rules.length == 1 &&
              rules[0].name != "_start" && 
              !rules[0].action) {
            this.replaceRule(rules[0].name, rules[0].symbols);
            changed |= 1;
          }
        }

        //console.log("Iteration---------------------------");
        //console.log(this.toString());
      }
    },

    /** Remove quotes from a string. */
    innerExpr: function (symbol) {
      return symbol.substr(1, symbol.length - 2);
    },

    /**
      Delete the rule, and replace all references to the rule with the given
      symbols.
    */
    replaceRule: function (name, newSymbols) {
      delete this.rules[name];
      for (var ruleName in this.rules) {
        var rules = this.rules[ruleName];
        for (var i = 0; i < rules.length; i++) {
          for (var j = 0; j < rules[i].symbols.length; j++) {
            if (rules[i].symbols[j] == name) {
              rules[i].symbols.splice(j, 1);
              for (var k = 0; k < newSymbols.length; k++) {
                rules[i].symbols.splice(j + k, 0, newSymbols[k]);
              }
              j += newSymbols.length - 1;
            }
          }
        }
      }
    },

    /** Add the rule to the set. */
    addRule: function (name, symbols, action) {
      if (this.rules[name] === undefined) {
        this.rules[name] = [];
      }

      this.rules[name].push(new Rule(name, symbols, action));
      for (var i = 0; i < symbols.length; i++) {
        if (symbols.length > 0 && symbols[i][0] == "'" && !this.terminalsAdded[symbols[i]]) {
          this.terminalsAdded[symbols[i]] = 1;
          this.terminals.push(symbols[i]);
        }
      }
    },

    /** Add a token. This simply creates a new rule. */
    addToken: function (name, re) {
      this.addRule(name, ["'" + re + "'"]);
    },

    /** Compute rules that are nullable (non-terminal leads to nothing) */
    computeFirst: function () {
      this.first = {};
      var name;
      for (name in this.rules) {
        this.first[name] = {};
      }

      var changed = 1;
      var self = this;

      function addFirst(name, token) {
        var ret = !(token in self.first[name]);
        self.first[name][token] = 1;
        return ret;
      }

      function merge(destName, sourceName) {
        var ret = 0;
        for (var token in self.first[sourceName]) {
          ret |= addFirst(destName, token);
        }
        return ret;
      }

      // loop until no change.
      while (changed) {
        changed = 0;

        // for each rule name,
        for (name in this.rules) {

          var rules = this.rules[name];
          // for each RHS of the rule,
          for (var i = 0; i < rules.length; i++) {

            // If the rule has no symbols,
            if (rules[i].symbols.length === 0) {
              // add EPSILON to first set
              changed |= addFirst(name, this.EPSILON);
            }

            // for each symbol of the rule,
            for (var j = 0; j < rules[i].symbols.length; j++) {
              // if it is a terminal 
              if (rules[i].symbols[j][0] == "\'") {
                changed |= addFirst(name, rules[i].symbols[j]);
                break;

                // if it's a terminal, 
              } else {
                changed |= merge(name, rules[i].symbols[j]);

                if (this.first[rules[i].symbols[j]][this.EPSILON] !== 1) {
                  // continue only if it contains the epsilon
                  // symbol.
                  break;
                }
              }
            }
          }
        }
      }
    },

    /** Compute follow set of all non-terminals. */
    computeFollow: function () {
      var name;
      this.follow = {};
      for (name in this.rules) {
        this.follow[name] = {};
      }

      var changed = 1;

      while (changed) {
        changed = 0;
        var f;
        for (name in this.rules) {
          var rules = this.rules[name];
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            for (var j = 0; j < rule.symbols.length; j++) {
              if (rule.symbols[j][0] === "'") {
                continue;
              }

              var follow = this.follow[rule.symbols[j]];

              if (j == rule.symbols.length - 1) {
                if (rule.symbols[j][0] != "'" && rule.symbols[j] != name) {
                  for (f in this.follow[name]) {
                    if (f !== this.EPSILON) {
                      //dbg.printf("%s follows %s cause it's last of %s\n", 
                      //    f, rule.symbols[j], name );
                      changed |= follow[f] === undefined;
                      follow[f] = 1;
                    }
                  }
                }
              } else if (rule.symbols[j + 1][0] == "'" || rule.symbols[j + 1] === this.EOF_TOKEN) {
                changed |= follow[rule.symbols[j + 1]] === undefined;
                follow[rule.symbols[j + 1]] = 1;
                //dbg.printf("%s follows %s\n", rule.symbols[j+1],
                //    rule.symbols[j]);
              } else {
                for (f in this.first[rule.symbols[j + 1]]) {
                  if (f !== this.EPSILON) {
                    //dbg.printf("%s follows %s via %s\n", 
                    //    f, name, rule.symbols[j+1] );
                    changed |= follow[f] === undefined;
                    follow[f] = 1;
                  }
                }
              }
            }
          }
        }
      }
    },

    finalize: function () {
      this.optimize();
      this.computeFirst();
      this.computeFollow();
    },

    createTokenizer: function () {
      var tokenizer = new QBasic.Tokenizer();
      tokenizer.ignore("[ \t\r\u001a]+");

      for (var i = 0; i < this.terminals.length; i++) {
        //console.log("Add token " + this.terminals[i] +
        //            "='" + this.innerExpr(this.terminals[i]) + "'");
        tokenizer.addToken(
        this.terminals[i], this.innerExpr(this.terminals[i]));
      }

      tokenizer.EOF_TOKEN = this.EOF_TOKEN;
      return tokenizer;
    }
  };
})();
/**
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
  Defines:
    QBasic.RuleParser
  Uses:
    # EarleyParser.js
    QBasic.EarleyParser
    # RuleSet.js
    QBasic.RuleSet
*/

(function() {
  /**
    The RuleParser uses the parser to parse your rules from a string 
    into a RuleSet. It extends the grammar to handle *, +, ?, and | operators 
    in the grammar.

    @constructor
  */
  QBasic.RuleParser = function() {
    // a unique number to let us make up rule names.
    this.nextRuleId = 0;

    // The buildset is the rules that we are building.
    this.buildSet = new QBasic.RuleSet();

    // The rules are the grammar of the rules themselves.
    var rules = new QBasic.RuleSet();

    // Lets us access this from local functions inside this function.
    var self = this;

    rules.addRule("start", ["rule"]);
    rules.addRule("identifier", ["'[A-Za-z0-9_]+'"]);
    rules.addRule("terminal", ["''([^'\\\\]|\\\\.)*''"]);
    rules.addRule("expr", ["or_expr"]);
    rules.addRule("rule", ["identifier", "':'", "expr"], function (args) {
      self.buildSet.addRule(args[0], args[2], self.action);
      return args[0];
    });
    rules.addRule("rule", ["identifier", "':'"], function (args) {
      self.buildSet.addRule(args[0], [], self.action);
      return args[0];
    });
    rules.addRule("or_expr", ["or_expr", "'\\|'", "cat_expr"], function (args) {
      // Implement the or operator by making two new rules.
      var name = "_" + self.nextRuleId++;
      self.buildSet.addRule(name, args[0]);
      self.buildSet.addRule(name, args[2]);
      return [name];
    });
    rules.addRule("or_expr", ["cat_expr"]);
    rules.addRule("cat_expr", ["cat_expr", "list_expr"], function (args) {
      args[0].push(args[1]);
      return args[0];
    });
    rules.addRule("cat_expr", ["list_expr"], function (args) {
      return [args[0]];
    });

    rules.addRule("list_expr", ["kleene_expr"]);
    var list_expr = ["'\\['", "kleene_expr", "','", "kleene_expr", "'\\]'"];
    rules.addRule("list_expr", list_expr, function (args) {
      var nameOpt = "_" + self.nextRuleId++;
      var name = "_" + self.nextRuleId++;

      self.buildSet.addRule(nameOpt, [name]);

      self.buildSet.addRule(nameOpt, [], function (args) {
        return [];
      });

      self.buildSet.addRule(name, [args[1]], function (args) {
        return args; // list of one element.
      });

      self.buildSet.addRule(name, [name, args[3], args[1]], function (args) {
        // join the lists and return the result.
        args[0].push(args[2]);
        return args[0];
      });

      return nameOpt;
    });

    var kleene_expr = ["basic_expr", "'[\\+\\*\\?]'"];
    rules.addRule("kleene_expr", kleene_expr, function (args) {
      var name = "_" + self.nextRuleId++;

      // Simulates kleene-star operations by adding more rules.
      if (args[1] == '*') {

        self.buildSet.addRule(name, [name, args[0]], function (args) {
          args[0].push(args[1]);
          return args[0];
        });
        self.buildSet.addRule(name, [], function (args) {
          return [];
        });

      } else if (args[1] == '?') {

        self.buildSet.addRule(name, [args[0]]);
        self.buildSet.addRule(name, [], function (args) {
          return null;
        });

      } else if (args[1] == '+') {

        var name2 = "_" + self.nextRuleId++;
        self.buildSet.addRule(name, [name2, args[0]]);
        self.buildSet.addRule(name2, [name2, args[0]]);
        self.buildSet.addRule(name2, []);
      }

      return name;
    });
    rules.addRule("kleene_expr", ["basic_expr"]);
    rules.addRule("basic_expr", ["identifier"]);
    rules.addRule("basic_expr", ["'\\('", "expr", "'\\)'"], function (args) {
      var name = "_" + self.nextRuleId++;
      self.buildSet.addRule(name, args[1]);
      return name;
    });

    rules.addRule("basic_expr", ["terminal"]);

    rules.finalize();
    //dbg.printf("%s", rules);
    this.parser = new QBasic.EarleyParser(rules);
  }

  QBasic.RuleParser.prototype = {
    /** Add a token to the rules. See RuleSet.addToken(). */
    addToken: function (name, re) {
      this.buildSet.addToken(name, re);
    },

    /**
      Add a rule to the grammar. The rule will be parsed and can include
      regular-expression-like syntax.
    */
    addRule: function (str, action) {
      this.action = action;
      this.parser.parse(str);
    }
  };
})();
/**
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
  Defines:
    QBasic.TypeChecker
  Uses:
    # Tokenizer.js
    QBasic.Locus
    # Types.js
    QBasic.IntegerType
    QBasic.SingleType
    QBasic.DoubleType
    QBasic.StringType
    QBasic.AnyType
    QBasic.NullType
    QBasic.UserType
    QBasic.ArrayType
    QBasic.IsStringType
    QBasic.IsNumericType
    QBasic.IsArrayType
    QBasic.IsUserType
    QBasic.DeriveTypeNameFromVariable
    QBasic.AreTypesCompatible
    # VirtualMachine.js
    QBasic.SystemFunctions
    QBasic.SystemSubroutines
    # QBasic.js
    QBasic.AstDeclareFunction
    QBasic.AstVariableReference
*/

(function () {
  /** @constructor */
  function TypeScope() {
    // map from names to type objects.
    this.names = {};
  }

  /** @constructor */
  function CheckedLabel(name, astNode) {
    this.name = name;
    this.astNode = astNode;
  }

  /** @constructor */
  function CheckedLoopContext(type, counter) {
    // "FOR", "DO"
    this.type = type;

    // variable name
    this.counter = counter;
  }

  /** @constructor */
  QBasic.TypeChecker = function(prevChecker, errors) {
    prevChecker = prevChecker || {};
    // map from name to AstDeclare
    this.declaredSubs = prevChecker.declaredSubs || {};
    this.declaredSubs._main = new QBasic.AstDeclareFunction(
        new QBasic.Locus(0, 0), "_main", [], false);

    this.errors = errors;
    this.scopes = prevChecker.scopes || [new TypeScope()];
    this.shared = prevChecker.shared || new TypeScope();

    this.labelsUsed = prevChecker.labelsUsed || [];
    this.labelsDefined = prevChecker.labelsDefined || {};

    this.types = prevChecker.types || {
      INTEGER: new QBasic.IntegerType(),
      SINGLE: new QBasic.SingleType(),
      DOUBLE: new QBasic.DoubleType(),
      STRING: new QBasic.StringType(),
      ANY: new QBasic.AnyType(),
      ":NULL": new QBasic.NullType()
    };

    // Changed to integer if DEFINT is present in the program (hack hack)
    this.defaultType = prevChecker.defaultType || this.types.SINGLE;

    // stack of CheckedLoopContext. Most recent is 0.
    this.loopStack = prevChecker.loopStack || [];
  };

  QBasic.TypeChecker.prototype = {
    /**
      Parameter 1 must be an ast node.
      Parameter 2 is a format string, eg, as in printf
      Parameters 3... depend on the format string.
    */
    sprintf: function () {
      var args = arguments;
      if (args.length == 1 && args[0] instanceof Array) {
        args = args[0];
      }
      var format = args[0];
      var output = "";

      var segments = format.split(/%[^%]/);
      for (var i = 0; i < segments.length; i++) {
        output += segments[i];
        if (args[i + 1] !== undefined) {
          output += args[i + 1];
        }
      }

      return output;
    },
    error: function () {
      var object = arguments[0];
      var args = [];
      for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      var errorStr = "Error at " + object.locus + ": " + this.sprintf(args);
      this.errors.push(errorStr);
      throw new Error(errorStr);
    },

    /**
      If the variable name includes a type suffix, removes it and returns the
      result.
    */
    removeSuffix: function (name) {
      switch (name[name.length - 1]) {
      case '%':
      case '$':
      case '!':
      case '&':
      case '#':
        return name.substr(0, name.length - 1);
      default:
        return name;
      }
    },
    /**
      Using the current scope, or the type suffix, determine the type of the
      variable given its name. Returns the type object.
    */
    getTypeFromVariableName: function (name) {
      var type = this.scopes[0].names[name];
      if (type !== undefined) {
        return type;
      }
      type = this.shared.names[name];
      if (type !== undefined) {
        return type;
      }

      type = QBasic.DeriveTypeNameFromVariable(name);
      if (type !== null) {
        return this.types[type];
      }

      return this.defaultType;
    },
    visitProgram: function (program) {
      var i;
      for (i = 0; i < program.subs.length; i++) {
        program.subs[i].accept(this);
      }

      // for each label used, if it is not defined, then emit an error.
      for (i = 0; i < this.labelsUsed.length; i++) {
        var label = this.labelsUsed[i];
        if (this.labelsDefined[label.name] === undefined) {
          this.error(label.astNode, "Label %s is not defined", label.name);
        }
      }

      // emit an error on any subs not implemented
      for (var name in this.declaredSubs) {
        var func = this.declaredSubs[name];
        if (!func.hasBody && func.used) {
          this.error(func, "SUB or FUNCTION '%s' has no body", name);
        }
      }
    },
    visitDeclareFunction: function (declare) {
      // error if this name is already declared.
      if (this.declaredSubs[declare.name] !== undefined) {
        this.error(declare, "Subroutine %s is already declared on line %s", 
                   declare.name, this.declaredSubs[declare.name].locus.line + 1);
      }

      this.declaredSubs[declare.name] = declare;
      declare.args.accept(this);
      if (declare.isFunction) {
        declare.type = this.getTypeFromVariableName(declare.name);
      }
    },
    visitSubroutine: function (sub) {
      var i;
      var self = this;

      function subError(declare) {
        self.error(sub, "Sub or function %s does not match declaration on " +
                   "line %s", sub.name, declare.locus.line + 1);
      }

      // error if the sub has not been declared.
      if (this.declaredSubs[sub.name] === undefined) {
        this.error(sub, "Subroutine %s is not declared", sub.name);
      } else {
        var declare = this.declaredSubs[sub.name];

        if (declare.isFunction != sub.isFunction) {
          subError(declare);
        }

        if (sub.args.length != declare.args.length) {
          subError(declare);
        } else {
          // error if the declaration does not have the same arguments.
          for (i = 0; i < sub.args.length; i++) {
            // don't compare variable names, it's okay if they differ.
            if ((sub.args[i].typeName != declare.args[i].typeName && 
                 declare.args[i].typeName != "ANY") ||
                sub.args[i].isArray != declare.args[i].isArray) {
              subError(declare);
            }
          }
        }

        declare.hasBody = true;
      }

      this.scopes.unshift(new TypeScope());

      // visit arguments
      for (i = 0; i < sub.args.length; i++) {
        sub.args[i].accept(this);
        this.scopes[0].names[sub.args[i].name] = sub.args[i].type;
      }

      // visit statements
      for (i = 0; i < sub.statements.length; i++) {
        if (!sub.statements[i]) {
          continue;
        }
        //console.log("Try to visit " + /*getObjectClass*/(sub.statements[i]));
        if (sub.statements[i].accept === undefined) {
          console.log("ERROR: Could not visit object of type " +
                      /*getObjectClass*/(sub.statements[i]));
        } else {
          sub.statements[i].accept(this);
        }
      }

      this.scopes.shift();
    },
    /**
      Check that types of arguments match the ones from the AstDeclareStatement.
    */
    checkCallArguments: function (declare, args) {
      declare.used = true;
      if (declare.args.length != args.length) {
        this.error(declare, "Wrong number of arguments");
      } else {
        for (var i = 0; i < args.length; i++) {
          args[i].wantRef = true;
          args[i].accept(this);
          if (!QBasic.AreTypesCompatible(args[i].type, declare.args[i].type)) {
            this.error(args[i], "Type mismatch in argument %d of call to %s." + 
                       " Expected %s but got %s", i + 1, declare.name,
                       declare.args[i].type.name, args[i].type.name);
          }
        }
      }
    },
    visitCallStatement: function (call) {
      if (QBasic.SystemSubroutines[call.name] !== undefined) {
        // TODO(max99x): Check args for system parameters.
        for (var i = 0; i < call.args.length; i++) {
          call.args[i].wantRef = true;
          call.args[i].accept(this);
        }
        return;
      }

      var declare = this.declaredSubs[call.name];
      // sub must exist and argument number and types must be compatible.
      if (declare === undefined) {
        this.error(call, "Call to undefined sub '%s'", call.name);
      } else {
        this.checkCallArguments(declare, call.args);
      }
    },
    visitArgument: function (argument) {
      var type;

      // we are about to enter a function, so add this variable to the scope
      if (argument.typeName) {
        // error if the typeName does not exist.
        type = this.types[argument.typeName];
        if (type === undefined) {
          this.error(argument, "Type %s is not defined", argument.typeName);
          type = new QBasic.UserType(argument.typeName, {});
          this.types[argument.typeName] = type;
        }
      } else {
        type = this.getTypeFromVariableName(argument.name);
      }

      if (argument.isArray) {
        type = new QBasic.ArrayType(type);
      }

      argument.type = type;
    },
    visitPrintStatement: function (print) {
      // all arguments must be convertable to strings or single.
      print.printItems.accept(this);
    },
    visitPrintUsingStatement: function (printUsing) {
      for (var i = 0; i < printUsing.exprList.length; i++) {
        printUsing.exprList[i].wantRef = true;
        printUsing.exprList[i].accept(this);

        if (i === 0 && !QBasic.IsStringType(printUsing.exprList[i].type)) {
          this.error(printUsing.exprList[i],
                     "Format string must be STRING, not %s",
                     printUsing.exprList[i].type.name);
        } else if (i > 0 && !QBasic.IsStringType(printUsing.exprList[i].type) &&
                   !QBasic.IsNumericType(printUsing.exprList[i].type)) {
          this.error(printUsing.exprList[i], "Type Mismatch Error");
        }
      }

      if (printUsing.exprList.length === 0) {
        this.error(printUsing, "PRINT USING requires at least one argument");
      }
    },
    visitPrintItem: function (item) {
      if (item.expr === null) {
        return;
      }
      item.expr.accept(this);
      if (!QBasic.IsNumericType(item.expr.type) && 
          !QBasic.IsStringType(item.expr.type)) {
        this.error(item.expr, "Expected string or number, but got '%s'",
                   item.expr.type.name);
      }
    },
    visitInputStatement: function (input) {
      // prompt must be null or a string.
      if (input.promptExpr) {
        input.promptExpr.accept(this);
        if (!QBasic.IsStringType(input.promptExpr.type)) {
          this.error(input, "Prompt must be a string");
        }
      }

      // identifiers must be strings or numbers.
      for (var i = 0; i < input.identifiers.length; i++) {
        var type = this.getTypeFromVariableName(input.identifiers[i]);
        if (!QBasic.IsNumericType(type) && !QBasic.IsStringType(type)) {
          this.error(input, "Identifier '%s' should be string or numeric.",
                     input.identifiers.type);
        }
      }
    },
    visitNullStatement: function (argument) {
      // Nothing!
    },
    visitEndStatement: function (argument) {
      // Nothing!
    },
    visitForLoop: function (loop) {
      // identifier must be numeric type.
      if (!QBasic.IsNumericType(this.getTypeFromVariableName(loop.identifier))) {
        this.error(loop, "Loop counter must be a number");
      }

      loop.startExpr.wantRef = true;
      loop.startExpr.accept(this);
      loop.endExpr.accept(this);
      loop.stepExpr.accept(this);

      // startExpr and endExpr and stepExpr must be convertible to single.
      if (!QBasic.IsNumericType(loop.startExpr.type) ||
          !QBasic.IsNumericType(loop.endExpr.type) ||
          !QBasic.IsNumericType(loop.stepExpr.type)) {
        this.error(loop, "Loop expression must be a number.");
      }

      this.loopStack.unshift(new CheckedLoopContext("FOR", loop.identifier));
    },
    visitNextStatement: function (next) {
      // pop loops off loopstack in order.
      // identifier must match loops.
      for (var i = 0; i < next.identifiers.length; i++) {
        if (this.loopStack.length === 0) {
          this.error(next, "NEXT without FOR");
          break;
        }
        if (this.loopStack[0].type !== "FOR") {
          // NEXT inside a DO loop?
          this.error(next, "NEXT without FOR");
          break;
        }
        if (next.identifiers[i] != this.loopStack[0].counter) {
          this.error(next, "Mismatched loop counter '%s' in NEXT",
                     next.identifiers[i]);
        }
        this.loopStack.shift();
      }

      if (next.identifiers.length === 0) {
        if (this.loopStack.length === 0) {
          this.error(next, "NEXT without FOR");
        } else {
          this.loopStack.shift();
        }
      }
    },
    visitExitStatement: function (exit) {
      if (exit.what && 
          exit.what != "FOR" &&
          exit.what != "DO" &&
          exit.what != "WHILE") {
        this.error(exit, "EXIT %s not supported", exit.what);
      }
      if (this.loopStack.length === 0) {
        this.error(exit, "EXIT without loop not supported");
      }
      if (exit.what && exit.what != this.loopStack[0].type) {
        this.error(exit, "MISMATCHED EXIT. Expected: '%s'",
                   this.loopStack[0].type);
      }
    },
    visitArrayDeref: function (ref) {
      var i;
      ref.expr.accept(this);

      if (ref.expr instanceof QBasic.AstVariableReference && 
          this.declaredSubs[ref.expr.name]) {
        var declare = this.declaredSubs[ref.expr.name];
        if (!declare.isFunction) {
          this.error(ref, "Tried to call non-function '%s'", ref.expr.name);
        }

        this.checkCallArguments(declare, ref.parameters);
        ref.type = declare.type;
        return;
      }
      if (ref.expr instanceof QBasic.AstVariableReference && 
          QBasic.SystemFunctions[ref.expr.name] !== undefined) {
        var func = QBasic.SystemFunctions[ref.expr.name];
        ref.type = this.types[func.type];
        ref.parameters.accept(this);

        // verify that parameters are correct type.
        if (ref.parameters.length < func.minArgs ||
            ref.parameters.length > func.args.length) {
          this.error(ref, "Function '%s' called with wrong number of " +
                     "arguments", func.name);
        } else {
          for (i = 0; i < ref.parameters.length; i++) {
            if (!QBasic.AreTypesCompatible(ref.parameters[i].type,
                                           this.types[func.args[i]])) {
              this.error(ref, "Argument %d to '%s' function is of " +
                         "type '%s', but '%s' expected", i + 1, func.name, 
                         ref.parameters[i].type.name, func.args[i]);
            }
          }
        }

        return;
      }

      // parameters must convert to integers.
      for (i = 0; i < ref.parameters.length; i++) {
        ref.parameters[i].accept(this);
        if (!QBasic.IsNumericType(ref.parameters[i].type)) {
          this.error(ref.parameters[i], "Array subscript must be numeric type");
        }
      }

      // expr must resolve to an array.
      // type becomes type of array elements.
      if (!QBasic.IsArrayType(ref.expr.type)) {
        this.error(ref, "Subscript used on non-array '%s'", ref.expr.name);
        ref.type = this.types.INTEGER;
      } else if (ref.parameters.length === 0) {
        ref.type = ref.expr.type;
      } else {
        ref.type = ref.expr.type.elementType;
      }
    },
    visitMemberDeref: function (ref) {
      // lhs should resolve to a user type.
      ref.lhs.accept(this);
      if (!QBasic.IsUserType(ref.lhs.type)) {
        this.error(ref, "Tried to dereference non-user-type '%s'",
                   ref.lhs.type.name);
        ref.type = this.types.SINGLE;
      } else {
        // user type should contain the given identifier.
        ref.type = ref.lhs.type.members[ref.identifier];
        if (ref.type === undefined) {
          this.error(ref, "Type '%s' does not contain member '%s'",
                     ref.lhs.type.name, ref.identifier);
          ref.type = this.types.SINGLE;
        }
      }
    },
    visitVariableReference: function (ref) {
      var func;
      if (QBasic.SystemFunctions[ref.name] !== undefined) {
        func = QBasic.SystemFunctions[ref.name];
        ref.type = this.types[func.type];
      } else if (this.declaredSubs[ref.name] !== undefined) {
        func = this.declaredSubs[ref.name];
        if (!func.isFunction) {
          this.error(ref, "SUB '%s' used as a function", func.name);
          ref.type = this.types.SINGLE;
        } else {
          ref.type = func.type;
        }
      } else {
        ref.type = this.getTypeFromVariableName(ref.name);
      }
    },
    visitRange: function (range) {
      range.lowerExpr.accept(this);
      range.upperExpr.accept(this);

      if (!QBasic.IsNumericType(range.lowerExpr.type) ||
          !QBasic.IsNumericType(range.upperExpr.type)) {
        this.error(range, "Expected a number.");
      }
    },
    visitDataStatement: function (argument) {
      // Nothing!
    },
    visitReturnStatement: function (returnStatement) {
      // Nothing!
    },
    visitRestoreStatement: function (restore) {
      if (restore.label) {
        this.labelsUsed.push(new CheckedLabel(restore.label, restore));
      }
    },
    visitConstStatement: function (constStatement) {
      // Ensure it's not double defined.
      if (constStatement.name in this.shared.names) {
        this.error(constStatement, "Redeclared variable '%s'",
                   constStatement.name);
      }

      // TODO(max99x): ensure it's a constant calculable at runtime.
      constStatement.expr.accept(this);

      this.shared.names[constStatement.name] = constStatement.expr.type;
    },
    visitDefTypeStatement: function (def) {
      this.defaultType = this.types[def.typeName];
    },
    visitDimStatement: function (dim) {
      // type, if present, must exist.
      var type;
      if (dim.typeName) {
        type = this.types[dim.typeName];
        if (type === undefined) {
          this.error(dim, "Type '%s' is not defined", dim.typeName);
        }
      }

      if (!type) {
        type = this.getTypeFromVariableName(dim.name);
        dim.typeName = type.name;
      }

      for (var i = 0; i < dim.ranges.length; i++) {
        dim.ranges[i].accept(this);
      }

      if (dim.ranges.length) {
        type = new QBasic.ArrayType(type);
      }

      if (dim.shared) {
        this.shared.names[dim.name] = type;
      } else {
        this.scopes[0].names[dim.name] = type;
      }
    },
    visitDoStatement: function (loop) {
      if (loop.expr) {
        loop.expr.accept(this);
      }
      if (loop.expr !== null && !QBasic.IsNumericType(loop.expr.type)) {
        this.error(loop, "Loop expression must be numeric");
      }

      this.loopStack.unshift(new CheckedLoopContext("DO", null));
      loop.statements.accept(this);
      this.loopStack.shift();
    },
    visitWhileLoop: function (loop) {
      loop.expr.accept(this);
      if (!QBasic.IsNumericType(loop.expr.type)) {
        this.error(loop, "Loop expression must be numeric");
      }

      this.loopStack.unshift(new CheckedLoopContext("WHILE", null));
      loop.statements.accept(this);
      this.loopStack.shift();
    },
    visitIfStatement: function (ifStatement) {
      ifStatement.expr.accept(this);
      if (!QBasic.IsNumericType(ifStatement.expr.type)) {
        this.error(ifStatement, "Expected numeric expression");
      }

      ifStatement.statements.accept(this);
      if (ifStatement.elseStatements) {
        ifStatement.elseStatements.accept(this);
      }
    },
    visitSelectStatement: function (select) {
      // expr must be compatible with that of each case.
      select.expr.accept(this);
      if (!QBasic.IsNumericType(select.expr.type) && 
          !QBasic.IsStringType(select.expr.type)) {
        this.error(select, "Select expression must be numeric or string");
      }

      for (var i = 0; i < select.cases.length; i++) {
        var caseStatement = select.cases[i];
        caseStatement.accept(this);

        for (var j = 0; j < caseStatement.exprList.length; j++) {
          if (!QBasic.AreTypesCompatible(select.expr.type,
                                         caseStatement.exprList[j].type)) {
            this.error(caseStatement,
                       "CASE expression cannot be compared with SELECT");
          }
        }
      }
    },
    visitCaseStatement: function (caseStatement) {
      caseStatement.exprList.accept(this);
      caseStatement.statements.accept(this);
    },
    visitTypeMember: function (member) {
      var type;

      // typename must exist.
      if (member.typeName) {
        type = this.types[member.typeName];
        if (type === undefined) {
          this.error(member, "Undefined type '%s'", member.typeName);
        }
      }

      if (type === undefined) {
        type = this.getTypeFromVariableName(member.name);
      }
      member.type = type;
    },
    visitUserType: function (userType) {
      // must not already be declared.
      if (this.types[userType.name] !== undefined) {
        this.error(userType, "Typename '%s' already defined", userType.name);
      }

      // members should be declared only once.
      var members = {};
      for (var i = 0; i < userType.members.length; i++) {
        userType.members[i].accept(this);
        if (members[userType.members[i].name] !== undefined) {
          this.error(userType.members[i], "Type member '%s' already defined",
                     userType.members[i].name);
        }

        //console.log("Type member name=" + userType.members[i].name +
        //            " has type " + userType.members[i].type.name);
        members[userType.members[i].name] = userType.members[i].type;
      }

      this.types[userType.name] = new QBasic.UserType(userType.name, members);
    },
    visitGotoStatement: function (gotoStatement) {
      this.labelsUsed.push(new CheckedLabel(gotoStatement.label, gotoStatement));
    },
    visitGosub: function (gosub) {
      this.labelsUsed.push(new CheckedLabel(gosub.label, gosub));
    },
    visitLabel: function (label) {
      // label must not already be defined.
      if (this.labelsDefined[label.label] !== undefined) {
        this.error(label, "Label '%s' is already defined", label.label);
      }
      // add to labels declared.
      this.labelsDefined[label.label] = new CheckedLabel(label.label, label);
    },
    visitAssignStatement: function (assign) {
      // rhs must be compatible with rhs.
      assign.lhs.wantRef = true;
      assign.lhs.accept(this);
      assign.expr.accept(this);
      if (!QBasic.AreTypesCompatible(assign.lhs.type, assign.expr.type)) {
        this.error(assign, "Tried to assign type '%s' to type '%s'",
                   assign.expr.type.name, assign.lhs.type.name);
      }
    },
    visitBinaryOp: function (binary) {
      var op = binary.op;
      binary.lhs.accept(this);
      binary.rhs.accept(this);
      var bad = 0;
      var type = binary.lhs.type;

      // types must be compatible
      if (!QBasic.AreTypesCompatible(binary.lhs.type, binary.rhs.type)) {
        bad = 1;
      }

      if (QBasic.IsStringType(binary.lhs.type)) {
        // operator must be +, <, >, <>, '='
        bad |= (op != '+' && op != '<' && op != '>' &&
                op != '<>' && op != '=' && op != '==');
      }

      if (QBasic.IsUserType(binary.lhs.type)) {
        bad |= op != '=' && op != '==';
      }

      if (op == '=' || op == '==' || op == '<>' ||
          op == '<' || op == "<=" || op == ">=") {
        type = this.types.INTEGER;
      }

      if (QBasic.IsArrayType(binary.lhs.type)) {
        bad |= 1;
      }

      // type must support the given operator.
      if (bad) {
        this.error(binary, "Incompatible types for '%s' operator: %s,%s",
                   binary.op, binary.lhs.type.name, binary.rhs.type.name);
      }

      binary.type = type;
    },
    visitUnaryOperator: function (unary) {
      // type must be numeric.
      unary.expr.accept(this);
      if (!QBasic.IsNumericType(unary.expr.type)) {
        this.error(unary, "Incompatible type for '%s' operator", unary.op);
      }
      unary.type = unary.expr.type;
    },
    visitConstantExpr: function (expr) {
      if (expr.value === null) {
        expr.type = this.types[":NULL"];
      } else if (expr.value.constructor == String) {
        expr.type = this.types.STRING;
      } else {
        expr.type = this.types.SINGLE;
      }
    }
  };
})();

/**
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
  Defines:
    QBasic.CodeGenerator
  Uses:
    # TypeChecker.js
    QBasic.IsArrayType
    # VirtualMachine.js
    QBasic.SystemFunctions
    QBasic.SystemSubroutines
    # QBasic.js
    QBasic.AstPrintItem
    QBasic.AstVariableReference
    QBasic.AstDoStatement
*/

(function () {
  /** @constructor */
  function Instruction(instr, arg) {
    this.instr = instr;
    this.arg = arg;
  }

  Instruction.prototype = {
    toString: function () {
      if (this.instr.numArgs === 0) {
        return this.instr.name;
      } else {
        return this.instr.name + " " + this.arg;
      }
    }
  };

  /** @constructor */
  function Label(name, codeOffset, dataOffset) {
    this.name = name;
    this.codeOffset = codeOffset;
    this.dataOffset = dataOffset;
  }

  /** @constructor */
  function LoopContext(counter, forLabel, nextLabel, endLabel) {
    // In a DO or WHILE loop, only endLabel is valid.
    this.counter = counter;
    this.forLabel = forLabel;
    this.nextLabel = nextLabel;
    this.endLabel = endLabel;
  }

  /** @constructor */
  QBasic.CodeGenerator = function(prevGenerator) {
    prevGenerator = prevGenerator || {};
    // Array of Instruction objects
    this.instructions = prevGenerator.instructions || [];
    this.instructions_start = prevGenerator.instructions ?
                              prevGenerator.instructions.length : 0;

    // Array of data from DATA statements.
    this.data = prevGenerator.data || [];

    // Set of shared variable names. If a string is a property of this object,
    // then the variable with that name is shared.
    this.shared = prevGenerator.shared || {};

    // Array of labels.
    this.labels = prevGenerator.labels || [];

    // Map from label name to label id
    this.labelMap = prevGenerator.labelMap || {};

    this.loopStack = prevGenerator.loopStack || [];
    this.selectStack = prevGenerator.selectStack || [];

    // declared functions map to 1. Array accesses are changed to function
    // calls if they are in this map.
    this.functionNames = prevGenerator.functionNames || {};

    // map from bytecode instruction to Locus, so that we can keep track of
    // which source lines led to each instruction.
    this.lineMapping = prevGenerator.lineMapping || [];
    // don't map lines twice in a row
    this.lastLine = prevGenerator.lastLine || -1;
    // Create a label so RESTORE with no label will work.
    if (!prevGenerator) this.getGotoLabel(":top");
  };

  QBasic.CodeGenerator.prototype = {
    link: function () {
      // for each instruction,
      for (var i = this.instructions_start; i < this.instructions.length; i++) {
        var instr = this.instructions[i];
        // if the instruction has a code label for an argument, change its
        // argument to the associated offset.
        if (instr.instr.addrLabel) {
          instr.arg = this.labels[instr.arg].codeOffset;
        } else if (instr.instr.dataLabel) {
          instr.arg = this.labels[instr.arg].dataOffset;
        }
      }
    },
    newLabel: function (basename) {
      var id = this.labels.length;
      var name = basename + "_" + id;
      var label = new Label(name, this.instructions.length, this.data.length);
      this.labels.push(label);
      return id;
    },
    label: function (labelid) {
      this.labels[labelid].codeOffset = this.instructions.length;
      this.labels[labelid].dataOffset = this.data.length;
    },
    map: function (locus) {
      // Keep track of which source line maps to which instruction.
      if (locus.line === this.lastLine) {
        return;
      }
      this.lastLine = locus.line;
      this.lineMapping[this.instructions.length] = locus;
    },
    getGotoLabel: function (name) {
      var labelId;
      if (name in this.labelMap) {
        labelId = this.labelMap[name];
      } else {
        labelId = this.newLabel(name);
        this.labelMap[name] = labelId;
      }
      return labelId;
    },
    write: function (name, arg) {
      var instr = QBasic.Instructions[name];
      if (instr === undefined) throw "Bad instruction: " + name;
      this.instructions.push(new Instruction(instr, arg));
    },
    visitProgram: function (program) {
      for (var i = 0; i < program.subs.length; i++) {
        program.subs[i].accept(this);
      }

      this.link();
    },
    visitDeclareFunction: function (node) {
      this.functionNames[node.name] = true;
    },
    visitSubroutine: function (node) {
      var skipLabel = null;
      this.map(node.locus);
      if (node.name != '_main') {
        skipLabel = this.newLabel("skipsub");
        this.write("JMP", skipLabel);
        this.label(this.getGotoLabel(node.name));
        for (var i = node.args.length - 1; i >= 0; i--) {
          // pop each argument off the stack into a variable. The wantRef
          // parameter of the AST node ensures that these evalauate
          this.write("POPVAR", node.args[i].name);
        }
      }
      node.statements.accept(this);
      if (node.isFunction) {
        // when the function returns, place its return value on the top of
        // the stack.
        this.write("PUSHVALUE", node.name);
      }
      if (skipLabel !== null) {
        this.write("RET", null);
        this.label(skipLabel);
      }
    },
    visitCallStatement: function (node) {
      this.map(node.locus);
      for (var i = 0; i < node.args.length; i++) {
        // This will push references, since wantRef was set by the type
        // checker.
        node.args[i].accept(this);
      }

      if (QBasic.SystemSubroutines[node.name]) {
        // Check if we need to push number of args
        var sub = QBasic.SystemSubroutines[node.name];
        if (sub.args !== undefined && sub.minArgs !== undefined) {
          this.write("PUSHCONST", node.args.length);
        }
        this.write("SYSCALL", node.name);
      } else if (node.name == "PRINT") {
        this.write("PUSHCONST", node.args.length);
        this.write("SYSCALL", node.name);
      } else {
        this.write("CALL", this.getGotoLabel(node.name));
      }
    },
    visitArgument: function (node) {
      // Nothing!
    },
    visitPrintUsingStatement: function (node) {
      // push format string, followed by all expressions, followed by
      // terminator, followed by total number of arguments, then syscall it.
      for (var i = 0; i < node.exprList.length; i++) {
        node.exprList[i].accept(this);
      }
      this.write("PUSHCONST", node.terminator);
      this.write("PUSHCONST", node.exprList.length + 1);
      this.write("SYSCALL", "__print_using");
    },
    visitPrintStatement: function (node) {
      var newline = true;
      this.map(node.locus);
      for (var i = 0; i < node.printItems.length; i++) {
        node.printItems[i].accept(this);
        if (node.printItems[i].type === QBasic.AstPrintItem.TAB) {
          this.write("SYSCALL", "print_tab");
        } else if (node.printItems[i].expr) {
          this.write("SYSCALL", "print");
        }

        if (node.printItems[i].terminator == ',') {
          this.write("SYSCALL", "print_comma");
        } else if (node.printItems[i].terminator == ';') {
          newline = false;
        } else {
          newline = true;
        }
      }

      if (newline) {
        this.write("PUSHCONST", "\n");
        this.write("SYSCALL", "print");
      }
    },
    visitPrintItem: function (node) {
      if (node.expr) {
        node.expr.accept(this);
      }
    },
    visitInputStatement: function (node) {
      this.map(node.locus);
      // print the prompt, if any, and question mark, if required.
      if (node.promptExpr) {
        node.promptExpr.accept(this);
        this.write("SYSCALL", "print");
      }

      if (node.printQuestionMark) {
        this.write("PUSHCONST", "? ");
        this.write("SYSCALL", "print");
      } else {
        this.write("PUSHCONST", " ");
        this.write("SYSCALL", "print");
      }

      // push onto the stack: identifiers
      for (var i = 0; i < node.identifiers.length; i++) {
        this.write("PUSHREF", node.identifiers[i]);
      }

      this.write("PUSHCONST", node.identifiers.length);
      this.write("SYSCALL", "INPUT");
    },
    visitNullStatement: function (node) {
      // Nothing!
    },
    visitEndStatement: function (node) {
      this.map(node.locus);
      this.write("END", null);
    },
    visitForLoop: function (node) {
      this.map(node.locus);
      var forLabel = this.newLabel("for");
      var nextLabel = this.newLabel("next");
      var endLabel = this.newLabel("end_for");
      this.loopStack.push(
          new LoopContext(node.identifier, forLabel, nextLabel, endLabel));
      node.startExpr.accept(this);
      this.write("POPVAR", node.identifier);
      node.endExpr.accept(this);
      node.stepExpr.accept(this);
      this.label(forLabel);
      this.write("PUSHVALUE", node.identifier);
      this.write("FORLOOP", endLabel);
    },
    visitNextStatement: function (node) {
      this.map(node.locus);
      for (var i = 0; i < node.identifiers.length; i++) {
        var ctx = this.loopStack.pop();

        // stack is now:
        // end
        // step
        this.label(ctx.nextLabel);
        this.write("COPYTOP");
        this.write("PUSHVALUE", ctx.counter);
        this.write("+");
        this.write("POPVAL", ctx.counter);
        this.write("JMP", ctx.forLabel);
        this.label(ctx.endLabel);
      }
    },
    visitExitStatement: function (node) {
      // Guaranteed to work due to type checker.
      var context = this.loopStack[this.loopStack.length - 1];

      if (context.counter) {
        // It's a FOR loop. Pop off the step and end value.
        this.write("POP");
        this.write("POP");
      }

      this.write("JMP", context.endLabel);
    },
    visitArrayDeref: function (node) {
      this.map(node.locus);
      // check if it's really a function call.
      if (node.expr instanceof QBasic.AstVariableReference &&
          this.functionNames[node.expr.name]) {
        node.parameters.accept(this);
        this.write("CALL", this.getGotoLabel(node.expr.name));
      } else if (node.expr instanceof QBasic.AstVariableReference && 
                 QBasic.SystemFunctions[node.expr.name]) {
        var func = QBasic.SystemFunctions[node.expr.name];
        node.parameters.accept(this);
        if (func.minArgs < func.args.length) {
          // variable number of arguments.
          this.write("PUSHCONST", node.parameters.length);
        }
        node.expr.accept(this);
      } else {
        node.parameters.accept(this);
        node.expr.accept(this);
        if (node.parameters.length > 0) {
          this.write("ARRAY_DEREF", node.wantRef);
        } else {
          // eg, calling a function with an array as a parameter.
        }
      }
    },
    visitMemberDeref: function (node) {
      this.map(node.locus);
      node.lhs.accept(this);
      if (node.wantRef) {
        this.write("MEMBER_DEREF", node.identifier);
      } else {
        this.write("MEMBER_VALUE", node.identifier);
      }
    },

    visitVariableReference: function (node) {
      this.map(node.locus);
      if (QBasic.SystemFunctions[node.name]) {
        this.write("SYSCALL", node.name);
      } else if (this.functionNames[node.name]) {
        this.write("CALL", this.getGotoLabel(node.name));
        if (node.wantRef) {
          this.write("NEW", node.type.name);
        }
      } else if (node.wantRef || QBasic.IsArrayType(node.type)) {
        this.write("PUSHREF", node.name);
      } else {
        this.write("PUSHVALUE", node.name);
      }
    },
    visitRange: function (node) {
      // Nothing!
    },
    visitDataStatement: function (node) {
      for (var i = 0; i < node.data.length; i++) {
        // type is constantexpr
        this.data.push(node.data[i].value);
      }
    },
    visitReturnStatement: function (node) {
      this.map(node.locus);
      this.write("RET");
    },
    visitRestoreStatement: function (node) {
      this.map(node.locus);
      var where = 0;
      if (node.label) {
        where = this.getGotoLabel(node.label);
      } else {
        where = this.getGotoLabel(":top");
      }
      this.write("RESTORE", where);
    },
    visitConstStatement: function (constStatement) {
      this.shared[constStatement.name] = true;
      constStatement.expr.accept(this);
      this.write("POPVAL", constStatement.name);
    },
    visitDefTypeStatement: function (def) {
      // Nothing!
    },
    visitDimStatement: function (node) {
      this.map(node.locus);
      var typeName;

      // if there is a typename,
      if (node.typeName) {
        typeName = node.typeName;
      } else {
        // use default type (INTEGER)
        typeName = "INTEGER";
      }

      if (node.shared) {
        this.shared[node.name] = true;
      }

      // if there are ranges,
      if (node.ranges.length > 0) {
        // for each range
        for (var i = 0; i < node.ranges.length; i++) {
          node.ranges[i].lowerExpr.accept(this);
          node.ranges[i].upperExpr.accept(this);
        }
        // push number of ranges.
        this.write("PUSHCONST", node.ranges.length);
        // push typename
        this.write("PUSHTYPE", typeName);
        // syscall alloc.
        this.write("SYSCALL", "alloc_array");
        // pop it into the variable name.
        this.write("POPVAR", node.name);
      } else {
        // just create a single instance and pop it into the name.
        this.write("PUSHTYPE", typeName);
        this.write("SYSCALL", "alloc_scalar");
        this.write("POPVAR", node.name);
      }
    },
    visitDoStatement: function (node) {
      this.map(node.locus);
      var top = this.newLabel("do");
      var bottom = this.newLabel("loop");
      this.label(top);

      this.loopStack.push(new LoopContext(null, null, null, bottom));
      node.statements.accept(this);
      this.loopStack.pop();
      switch (node.type) {
      case QBasic.AstDoStatement.UNTIL:
        node.expr.accept(this);
        this.write("BZ", top);
        break;

      case QBasic.AstDoStatement.WHILE_AT_END:
        node.expr.accept(this);
        this.write("BNZ", top);
        break;

      case QBasic.AstDoStatement.INFINITE:
        this.write("JMP", top);
        break;
      }

      this.label(bottom);
    },
    visitWhileLoop: function (node) {
      this.map(node.locus);
      var top = this.newLabel("while");
      var bottom = this.newLabel("wend");
      this.label(top);
      node.expr.accept(this);
      this.write("BZ", bottom);
      this.loopStack.push(new LoopContext(null, null, null, bottom));
      node.statements.accept(this);
      this.loopStack.pop();
      this.write("JMP", top);
      this.label(bottom);
    },
    visitIfStatement: function (node) {
      this.map(node.locus);
      var endLabel = this.newLabel("endif");
      var elseLabel = this.newLabel("else");

      node.expr.accept(this);
      this.write("BZ", elseLabel);
      node.statements.accept(this);
      this.write("JMP", endLabel);

      this.label(elseLabel);

      if (node.elseStatements) {
        node.elseStatements.accept(this);
        this.write("JMP", endLabel);
      }

      this.label(endLabel);
    },
    visitSelectStatement: function (node) {
      this.map(node.locus);
      var endSelect = this.newLabel("end_select");
      this.selectStack.push(endSelect);
      node.expr.accept(this);
      node.cases.accept(this);
      this.write("POP");
      this.label(endSelect);
      this.selectStack.pop();
    },
    visitCaseStatement: function (node) {
      this.map(node.locus);
      if (node.exprList.length > 0) {
        var okayLabel = this.newLabel("case_okay");
        var skipLabel = this.newLabel("case_skip");
        for (var i = 0; i < node.exprList.length; i++) {
          this.write("COPYTOP");
          node.exprList[i].accept(this);
          this.write("=");
          this.write("BNZ", okayLabel);
        }
        this.write("JMP", skipLabel);
        this.label(okayLabel);

        node.statements.accept(this);
        this.write("JMP", this.selectStack[this.selectStack.length - 1]);
        this.label(skipLabel);
      } else {
        // case else.
        node.statements.accept(this);
      }
    },
    visitTypeMember: function (node) {
      // Nothing!
    },
    visitUserType: function (node) {
      // Nothing!
    },
    visitGotoStatement: function (node) {
      this.map(node.locus);
      var labelId = this.getGotoLabel(node.label);
      this.write("JMP", labelId);
    },
    visitGosub: function (node) {
      this.map(node.locus);
      var labelId = this.getGotoLabel(node.label);
      this.write("GOSUB", labelId);
    },
    visitLabel: function (node) {
      this.label(this.getGotoLabel(node.label));
    },
    visitAssignStatement: function (node) {
      this.map(node.locus);
      node.expr.accept(this);

      if (node.lhs instanceof QBasic.AstVariableReference &&
          this.functionNames[node.lhs.name]) {
        // it was actually a function call.
        this.write("POPVAL", node.lhs.name);
      } else {
        node.lhs.accept(this);
        this.write("ASSIGN");
      }
    },
    visitBinaryOp: function (node) {
      this.map(node.locus);
      node.lhs.accept(this);
      node.rhs.accept(this);
      this.write(node.op);
      if (node.wantRef) {
        this.write("NEW", node.type.name);
      }
    },
    visitUnaryOperator: function (node) {
      this.map(node.locus);
      node.expr.accept(this);
      this.write("UNARY_OP", node.op);
      if (node.wantRef) {
        this.write("NEW", node.type.name);
      }
    },
    visitConstantExpr: function (node) {
      this.map(node.locus);
      this.write("PUSHCONST", node.value);
      if (node.wantRef) {
        this.write("NEW", node.type.name);
      }
    }
  };
})();

/**
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
  Defines:
    QBasic.VirtualMachine
    QBasic.SystemFunctions
    QBasic.SystemSubroutines
  Uses:
    # Types.js
    QBasic.ScalarVariable
    QBasic.ArrayVariable
    QBasic.Dimension
    QBasic.IsNumericType
    QBasic.DeriveTypeNameFromVariable
*/

(function () { 
  /** @constructor */
  function StackFrame(pc) {
    // Address to return to when the subroutine has ended.
    this.pc = pc;

    // map from name to the Scalar or Array variable.
    this.variables = {};
  }

  /**
    The VirtualMachine runs the bytecode given to it. It can run in one of two
    modes: Synchronously or Asynchronously.

    In synchronous mode, the program is run to completion before returning from
    the run() function. This can cause a browser window to freeze until
    execution completes.

    In asynchronous mode, a javascript interval is used. Every so often, we run
    some instructions and then stop. That way, the program appears to run while
    letting the user use the browser window.

    @constructor
    @param console A Console object that will be used as the screen.
  */
  QBasic.VirtualMachine = function(console) {
    // Stack
    this.stack = [];

    // program counter.
    this.pc = 0;

    // list of StackFrames. The last one is searched for variable references.
    // Failing that, the first one ( the main procedure ) is searched for any
    // shared variables matching the name.
    this.callstack = [];

    // The console.
    this.cons = console;

    // The bytecode (array of Instruction objects)
    this.instructions = [];

    // Array of user defined times.
    this.types = [];

    // set of names of shared variables.
    this.shared = {};

    // Index of next data statement to be read.
    this.dataPtr = 0;

    // Array of strings or numbers from the data statements.
    this.data = [];

    // True if the virtual machine is suspended for some reason (for example,
    // waiting for user input)
    this.suspended = false;

    // The last random number generated by a RND function. We have to remember
    // it because RND 0 returns the last one generated.
    this.lastRandomNumber = 0;

    // The last program loaded into this VM.
    this.lastProgram = null;
  };

  QBasic.VirtualMachine.prototype = {
    /** Loads a new program into the VM keeping existing state. */
    loadProgram: function (program) {
      this.pc = this.lastProgram ? this.lastProgram.instructions.length : 0;
      this.defaultType = program.defaultType;

      this.instructions = program.instructions;
      this.data = program.data;

      this.shared = program.shared;
      this.types = program.types;

      if (this.callstack.length == 0) {
        this.callstack.push(new StackFrame(this.instructions.length));
      }
      this.frame = this.callstack[0];
      this.suspended = false;

      this.lastProgram = program;
    },
    /** Load and start running a program. */
    run: function (program, callback) {
      if (!(program instanceof QBasic.Program)) {
        program = new QBasic.Program(program, this.lastProgram)
      }
      this.loadProgram(program);
      this.callback = callback;
      this.resume();
    },
    /**
      Suspend the CPU, maintaining all state. This happens when the program
      is waiting for user input.
    */
    suspend: function () {
      this.suspended = true;
    },
    /** Resume the CPU, after previously being suspended. */
    resume: function () {
      this.suspended = false;
      while (this.pc < this.instructions.length && !this.suspended) {
        this.runOneInstruction();
      }
      if (this.pc == this.instructions.length && this.callback) this.callback();
    },
    runOneInstruction: function () {
      var instr = this.instructions[this.pc++];
      instr.instr.execute(this, instr.arg);
    },
    setVariable: function (name, value) {
      if (this.shared[name]) {
        this.callstack[0].variables[name] = value;
      } else {
        this.frame.variables[name] = value;
      }
    },
    getVariable: function (name) {
      var frame;
      if (this.shared[name]) {
        frame = this.callstack[0];
      } else {
        frame = this.frame;
      }

      if (frame.variables[name]) {
        return frame.variables[name];
      } else {
        // must create variable
        var typeName = QBasic.DeriveTypeNameFromVariable(name);
        var type;
        if (typeName === null) {
          type = this.defaultType;
        } else {
          type = this.types[typeName];
        }

        var scalar = new QBasic.ScalarVariable(type, type.createInstance());
        frame.variables[name] = scalar;
        return scalar;
      }
    },
    printStack: function () {
      for (var i = 0; i < this.stack.length; i++) {
        var item = this.stack[i];
        var name = /*getObjectClass*/(item);
        if (name == 'ScalarVariable') {
          name += " " + item.value;
        }
        console.log("TRACE: stack[" + i + "]: " + name);
      }
    },
    pushScalar: function (value, typeName) {
      this.stack.push(new QBasic.ScalarVariable(this.types[typeName], value));
    }
  };

  /**
    Defines the functions that can be called from a BASIC program. Functions
    must return a value. System subs, which do not return a value, are defined
    elsewhere. Some BASIC keywords, such as SCREEN, are both a function and a
    sub, and may do different things in the two contexts.

    Each entry is indexed by function name. The record contains:
      type: The name of the type of the return value of the function.
      args: An array of names of types of each argument.
      minArgs: the number of arguments required.
      action: A function taking the virtual machine as an argument. To implement
        the function, it should pop its arguments off the stack, and push its
        return value onto the stack. If minArgs is not equal to args.length,
        then the top of the stack is an integer variable that indicates how many
        arguments were passed to the function.
  */
  QBasic.SystemFunctions = {
    "RND": {
      type: "SINGLE",
      args: ["INTEGER"],
      minArgs: 0,
      action: function (vm) {
        var numArgs = vm.stack.pop();
        var n = 1;
        if (numArgs == 1) {
          n = vm.stack.pop();
        }
        if (n != 0) {
          vm.lastRandomNumber = Math.random();
        }
        vm.stack.push(vm.lastRandomNumber);
      }
    },
    "CHR$": {
      type: "STRING",
      args: ["INTEGER"],
      minArgs: 1,
      action: function (vm) {
        var num = vm.stack.pop();
        vm.stack.push(String.fromCharCode(num));
      }
    },
    "INKEY$": {
      type: "STRING",
      args: [],
      minArgs: 0,
      action: function(vm) {
        // TODO(max99x): Find out how we can implement this in a REPL context.
        // Here's the original implementation:
        /*
        var code = vm.cons.getKeyFromBuffer();
        var result = "";
        if ( code != -1 ) {
          result = String.fromCharCode(code);
          if ( code === 0 ) {
            result += String.fromCharCode(vm.cons.getKeyFromBuffer());
          }
        }
        vm.stack.push(result);
        */
      }
    },
    "LEN": {
      type: "INTEGER",
      args: ["STRING"],
      minArgs: 1,
      action: function (vm) {
        vm.stack.push(vm.stack.pop().length);
      }
    },
    "MID$": {
      type: "STRING",
      args: ["STRING", "INTEGER", "INTEGER"],
      minArgs: 2,
      action: function (vm) {
        var numArgs = vm.stack.pop();
        var len;
        if (numArgs == 3) {
          len = vm.stack.pop();
        }
        var start = vm.stack.pop();
        var str = vm.stack.pop();
        vm.stack.push(str.substr(start - 1, len));
      }
    },
    "LEFT$": {
      type: "STRING",
      args: ["STRING", "INTEGER"],
      minArgs: 2,
      action: function (vm) {
        var num = vm.stack.pop();
        var str = vm.stack.pop();
        vm.stack.push(str.substr(0, num));
      }
    },
    "RIGHT$": {
      type: "STRING",
      args: ["STRING", "INTEGER"],
      minArgs: 2,
      action: function (vm) {
        var num = vm.stack.pop();
        var str = vm.stack.pop();
        vm.stack.push(str.substr(str.length - num));
      }
    },
    "TIMER": {
      type: "INTEGER",
      args: [],
      minArgs: 0,
      action: function (vm) {
        // return number of seconds since midnight. DEVIATION: We return a
        // floating point value rather than an integer, so that nibbles
        // will work properly when its timing loop returns a value less
        // than one second.
        var date = new Date();
        var result = (date.getMilliseconds() / 1000 +
                      date.getSeconds() + 
                      date.getMinutes() * 60 +
                      date.getHours() * 60 * 60);
        vm.stack.push(result);
      }
    },
    "PEEK": {
      type: "INTEGER",
      args: ["INTEGER"],
      minArgs: 1,
      action: function (vm) {
        // pop one argument off the stack and replace it with 0.
        vm.stack.pop();
        vm.stack.push(0);
      }
    },
    "LCASE$": {
      type: "STRING",
      args: ["STRING"],
      minArgs: 1,
      "action": function (vm) {
        var str = vm.stack.pop();
        vm.stack.push(str.toLowerCase());
      }
    },
    "UCASE$": {
      type: "STRING",
      args: ["STRING"],
      minArgs: 1,
      action: function (vm) {
        vm.stack.push(vm.stack.pop().toUpperCase());
      }
    },
    "STR$": {
      type: "STRING",
      args: ["SINGLE"],
      minArgs: 1,
      action: function (vm) {
        var num = vm.stack.pop();
        vm.stack.push("" + num);
      }
    },
    "SPACE$": {
      type: "STRING",
      args: ["INTEGER"],
      minArgs: 1,
      action: function (vm) {
        var numSpaces = vm.stack.pop();
        var str = "";
        for (var i = 0; i < numSpaces; i++) {
          str += " ";
        }
        vm.stack.push(str);
      }
    },
    "STRING$": {
      type: "STRING",
      args: ["INTEGER", "STRING"],
      minArgs: 2,
      action: function (vm) {
        var chr = vm.stack.pop();
        var numChars = vm.stack.pop();
        var str = "";
        for (var i = 0; i < numChars; i++) {
          str += chr;
        }
        vm.stack.push(str);
      }
    },
    "VAL": {
      type: "SINGLE",
      args: ["STRING"],
      minArgs: 1,
      action: function (vm) {
        vm.stack.push(parseFloat(vm.stack.pop()));
      }
    },
    "INT": {
      type: "INTEGER",
      args: ["SINGLE"],
      minArgs: 1,
      action: function (vm) {
        vm.stack.push(Math.floor(vm.stack.pop()));
      }
    }
  };

  /**
    Defines the system subroutines that can be called from a basic program.
    Subroutines must not return a value. System functions, which return a value,
    are defined elsewhere.

    Each entry is indexed by the name of the subroutine. The record contains:
      args: An array of names of types of each argument.
      minArgs: (optional) the number of arguments required.
      action: A function taking the virtual machine as an argument. To implement
        the function, it should pop its arguments off the stack, and push its
        return value onto the stack. If minArgs is present, and not equal to
        args.length, then the top of the stack is an integer variable that
        indicates how many arguments were passed to the function.
  */
  QBasic.SystemSubroutines = {
    "RANDOMIZE": {
      args: ["INTEGER"],
      minArgs: 0,
      action: function (vm) {
        // Uses the injected Mersenne Twister randomizer.
        var argCount = vm.stack.pop();
        if (argCount == 0) {
          Math.seed();
        } else if (argCount == 1) {
          Math.seed(vm.stack.pop().value);
        } else {
          throw new Error("RANDOMIZE takes at most 1 argument.");
        }
      }
    },
    "CLS": {
      action: function (vm) {
        // TODO(max99x): Implement.
      }
    },
    BEEP: {
      "action": function (vm) {
        // TODO(max99x): Implement.
      }
    },
    "PLAY": {
      args: ["STRING"],
      action: function (vm) {
        // TODO(max99x): Implement.
        vm.stack.pop();
      }
    },
    "SLEEP": {
      args: ["INTEGER"],
      action: function (vm) {
        // TODO(max99x): Implement.
        vm.stack.pop();
      }
    },
    "SYSTEM": {
      args: ["INTEGER"],
      action: function (vm) {
        // TODO(max99x): Implement.
        vm.stack.pop();
      }
    },
    // TODO(max99x): Move this out of system calls and merge with print_*.
    "__print_using": {
      action: function (vm) {
        // pop # args
        var argCount = vm.stack.pop();

        // pop terminator
        var terminator = vm.stack.pop();

        var args = [];
        for (var i = 0; i < argCount - 1; i++) {
          args.unshift(vm.stack.pop());
        }

        var formatString = args.shift().value;

        var curArg = 0;
        var output = "";

        // for each character in the string,
        for (var pos = 0; pos < formatString.length; pos++) {
          var ch = formatString.charAt(pos);

          // if the character is '#',
          if (ch === '#') {
            // if out of arguments, then type mismatch error.
            if (curArg === args.length ||
                !QBasic.IsNumericType(args[curArg].type)) {
              // TODO(max99x): Handle errors.
              throw new Error("Type mismatch error.");
              break;
            }

            // store character position
            var backup_pos = pos;
            var digitCount = 0;
            // for each character of the string,
            for (; pos < formatString.length; pos++) {
              ch = formatString.charAt(pos);
              if (ch === '#') {
                // if the character is '#', increase digit count
                digitCount++;
              } else if (ch === ',') {
                // if the character is ',' do nothing
              } else {
                // break out of loop
                break;
              }
            }

            // convert current arg to a string. Truncate or pad to
            // appropriate number of digits.
            var argAsString = "" + args[curArg].value;
            if (argAsString.length > digitCount) {
              argAsString = argAsString.substr(argAsString.length - digitCount);
            } else {
              while (argAsString.length < digitCount) {
                argAsString = " " + argAsString;
              }
            }

            var curDigit = 0;

            // go back to old character position.
            // for each character of the string,
            for (pos = backup_pos; pos < formatString.length; pos++) {
              ch = formatString.charAt(pos);
              // if the character is a '#'
              if (ch === '#') {
                // output the next digit.
                output += argAsString[curDigit++];
                // if the character is a ',',
              } else if (ch === ',') {
                // output a comma.
                output += ch;
              } else {
                // break out.
                break;
              }
            }

            // increment current argument.
            curArg += 1;
            pos -= 1;
          } else {
            // character was not #. output it verbatim.
            output += ch;
          }
        }
        vm.cons.print(output);
        if (terminator === ',') {
          // This should really align the cursor to the next 14-space boundary
          // but that is not possible with the current API.
          vm.cons.print('\t');
        } else if (terminator !== ';') {
          vm.cons.print("\n");
        }
      }
    },
    "LOCATE": {
      args: ["INTEGER", "INTEGER"],
      action: function (vm) {
        // TODO(max99x): Implement - move cursor.
        vm.stack.pop();
        vm.stack.pop();
      }
    },
    "COLOR": {
      args: ["ANY", "ANY"],
      minArgs: 1,
      action: function (vm) {
        // TODO(max99x): Implement - set background and foreground color.
        vm.stack.pop();
        vm.stack.pop();
      }
    },
    "READ": {
      // Actually, arguments must be STRING or NUMBER, but there is no way to
      // indicate that to the type checker at the moment.
      args: ["ANY", "ANY"],
      minArgs: 1,
      action: function (vm) {
        var argCount = vm.stack.pop();
        var args = [];
        var i;

        for (i = 0; i < argCount; i++) {
          args.unshift(vm.stack.pop());
        }

        // TODO(max99x): Handle out of data error.
        for (i = 0; i < argCount; i++) {
          if (vm.debug) console.log("READ " + vm.data[vm.dataPtr]);
          args[i].value = vm.data[vm.dataPtr++];
          if (args[i].value === null) {
            // user specified ,, in a data statement
            args[i].value = args[i].type.createInstance();
          }
        }
      }
    },
    "SCREEN": {
      action: function (vm) {
        // TODO(max99x): Implement.
        vm.stack.pop();
      }
    },
    "INPUT": {
      action: function (vm) {
        var argCount = vm.stack.pop();
        var args = [];

        for (var i = 0; i < argCount; i++) {
          args.unshift(vm.stack.pop());
        }

        vm.suspend();

        var curArg = 0;
        var callback = function(result) {
          var parts = result.split(/\s*,\s*/);
          for (var i = 0; i < parts.length; i++) {
            var value = parts[i];
            // TODO(max99x): Verify conversion strictness.
            switch (args[curArg].type.name) {
            case 'INTEGER':
            case 'LONG':
              value = parseInt(value, 10) || value;
              break;
            case 'DOUBLE':
            case 'SINGLE':
              value = parseFloat(value) || value;
              break;
            }
            args[curArg++].value = value;
          }
          if (curArg < argCount) {
            vm.cons.input(callback);
          } else {
            vm.resume();
          }
        }
        vm.cons.input(callback);
      }
    },
    "SWAP": {
      action: function (vm) {
        var lhs = vm.stack.pop();
        var rhs = vm.stack.pop();
        var temp = lhs.value;
        lhs.value = rhs.value;
        rhs.value = temp;
        // TODO(max99x): Type checking.
      }
    },
    "WIDTH": {
      args: ["ANY", "ANY"],
      action: function (vm) {
        // TODO(max99x): Implement or remove.
        vm.stack.pop();
        vm.stack.pop();
      }
    }
  };

  /**
    Defines the instruction set of the virtual machine. Each entry is indexed by
    the name of the instruction, and consists of the following fields:
      name: The name of the instruction for display purposes.
      addrLabel: If present, and set to "true", the argument of the instruction
        is interpretted as an address during the linking stage.
      dataLabel: If present, and set to "true", the argument of the instruction
        is the index of a DATA statement.
      numArgs: If present and set to 0, the instruction takes no arguments.
        Otherwise, it is assumed to take 1 argument.
      execute: A function taking as its first argument the virtual machine, and
        as its second argument the parameter of the instruction. It should
        manipulate the virtual machine's stack or program counter to implement
        the instruction.
  */
  QBasic.Instructions = {
    FORLOOP: {
      name: "forloop",
      addrLabel: true,
      execute: function (vm, arg) {
        /**
          For loops are tedious to implement in bytecode, because depending on
          whether STEP is positive or negative we either compare the counter
          with < or >. To simplify things, we create the forloop instruction to
          perform this comparison.
            argument is the address of the end of the for loop.
            stack is:
              end value
              step expression
              loop variable REFERENCE
          If the for loop is ended, then all three of its arguments are popped
          off the stack, and we jump to the end address. Otherwise, only the
          loop variable is popped and no branch is performed.
        */
        var counter = vm.stack[vm.stack.length - 1];
        var step = vm.stack[vm.stack.length - 2];
        var end = vm.stack[vm.stack.length - 3];

        if (step < 0 && counter < end || step > 0 && counter > end) {
          vm.stack.length -= 3;
          vm.pc = arg;
        } else {
          vm.stack.pop();
        }
      }
    },
    COPYTOP: {
      name: "copytop",
      numArgs: 0,
      execute: function (vm, arg) {
        // Duplicates the top of the stack
        vm.stack.push(vm.stack[vm.stack.length - 1]);
      }
    },
    RESTORE: {
      name: "restore",
      dataLabel: true,
      execute: function (vm, arg) {
        // Restore the data pointer to the given value.
        if (vm.debug) console.log("TRACE: RESTORE to " + arg);
        vm.dataPtr = arg;
      }
    },
    POPVAL: {
      name: "popval",
      execute: function (vm, arg) {
        // Argument is the name of the variable. Sets that variable's value
        // to the top of the stack.
        vm.getVariable(arg).value = vm.stack.pop();
      }
    },
    POP: {
      name: "pop",
      numArgs: 0,
      execute: function (vm, arg) {
        vm.stack.pop();
      }
    },
    PUSHREF: {
      name: "pushref",
      execute: function (vm, arg) {
        // The argument is the name of a variable. Push a reference to that
        // variable onto the top of the stack.
        vm.stack.push(vm.getVariable(arg));
      }
    },
    PUSHVALUE: {
      name: "pushvalue",
      execute: function (vm, arg) {
        // The argument is the name of a variable. Push the value of that
        // variable to the top of the stack.
        vm.stack.push(vm.getVariable(arg).value);
      }
    },
    PUSHTYPE: {
      name: "pushtype",
      execute: function (vm, arg) {
        // The argument is the name of a built-in or user defined type.
        // Push the type object onto the stack, for later use in an alloc
        // system call.
        vm.stack.push(vm.types[arg]);
      }
    },
    POPVAR: {
      name: "popvar",
      execute: function (vm, arg) {
        // Sets the given variable to refer to the top of the stack, and
        // pops the top of the stack. The stack top must be a reference.
        vm.setVariable(arg, vm.stack.pop());
      }
    },
    NEW: {
      name: "new",
      execute: function (vm, arg) {
        // The argument is a typename. Replace the top of the stack with a
        // reference to that value, with the given type.
        var type = vm.types[arg];
        vm.stack.push(new QBasic.ScalarVariable(type, type.copy(vm.stack.pop())));
      }
    },
    END: {
      name: "end",
      numArgs: 0,
      execute: function (vm, arg) {
        // End the program. The CPU ends the program when the program counter
        // reaches the end of the instructions, so make that happen now.
        vm.pc = vm.instructions.length;
      }
    },
    UNARY_OP: {
      name: "unary_op",
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var value;
        if (arg == 'NOT') {
          value = ~rhs;
        } else if (arg == '-') {
          value = -rhs;
        } else {
          throw new Error("No such unary operator: " + arg);
        }

        vm.stack.push(value);
      }
    },
    "=": {
      name: "=",
      numArgs: 0,
      execute: function (vm, arg) {
        vm.stack.push(vm.stack.pop() === vm.stack.pop() ? -1 : 0);
      }
    },
    // Special addition to allow comparison in REPL expression context.
    "==": {
      name: "==",
      numArgs: 0,
      execute: function (vm, arg) {
        vm.stack.push(vm.stack.pop() === vm.stack.pop() ? -1 : 0);
      }
    },
    "<": {
      name: "<",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        vm.stack.push(lhs < rhs ? -1 : 0);
      }
    },
    "<=": {
      name: "<=",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        vm.stack.push(lhs <= rhs ? -1 : 0);
      }
    },
    ">": {
      name: ">",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        vm.stack.push(lhs > rhs ? -1 : 0);
      }
    },
    ">=": {
      name: ">=",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        vm.stack.push(lhs >= rhs ? -1 : 0);
      }
    },
    "<>": {
      name: "<>",
      numArgs: 0,
      execute: function (vm, arg) {
        vm.stack.push(vm.stack.pop() !== vm.stack.pop() ? -1 : 0);
      }
    },
    "AND": {
      name: "and",
      numArgs: 0,
      execute: function (vm, arg) {
        vm.stack.push(vm.stack.pop() & vm.stack.pop());
      }
    },
    "OR": {
      name: "or",
      numArgs: 0,
      execute: function (vm, arg) {
        vm.stack.push(vm.stack.pop() | vm.stack.pop());
      }
    },
    "XOR": {
      name: "xor",
      numArgs: 0,
      execute: function (vm, arg) {
        vm.stack.push(vm.stack.pop() ^ vm.stack.pop());
      }
    },
    "+": {
      name: "+",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        vm.stack.push(lhs + rhs);
      }
    },
    "-": {
      name: "-",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        vm.stack.push(lhs - rhs);
      }
    },
    "*": {
      name: "*",
      numArgs: 0,
      execute: function (vm, arg) {
        vm.stack.push(vm.stack.pop() * vm.stack.pop());
      }
    },
    "/": {
      name: "/",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        if (rhs == 0) {
          throw new Error("Division by zero.");
        }
        vm.stack.push(lhs / rhs);
      }
    },
    "\\": {
      name: "\\",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        if (rhs == 0) {
          throw new Error("Division by zero.");
        }
        vm.stack.push(Math.floor(lhs / rhs));
      }
    },
    "^": {
      name: "^",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        vm.stack.push(Math.pow(lhs, rhs));
      }
    },
    "MOD": {
      name: "mod",
      numArgs: 0,
      execute: function (vm, arg) {
        var rhs = vm.stack.pop();
        var lhs = vm.stack.pop();
        if (rhs == 0) {
          throw new Error("Modulus by zero.");
        }
        vm.stack.push(lhs % rhs);
      }
    },
    BZ: {
      name: "bz",
      addrLabel: true,
      execute: function (vm, arg) {
        // Branch on zero. Pop the top of the stack. If zero, jump to
        // the given address.
        var expr = vm.stack.pop();
        if (!expr) {
          vm.pc = arg;
        }
      }
    },
    BNZ: {
      name: "bnz",
      addrLabel: true,
      execute: function (vm, arg) {
        // Branch on non-zero. Pop the top of the stack. If non-zero, jump
        // to the given address.
        var expr = vm.stack.pop();
        if (expr) {
          vm.pc = arg;
        }
      }
    },
    JMP: {
      name: "jmp",
      addrLabel: true,
      execute: function (vm, arg) {
        // Jump to the given address.
        vm.pc = arg;
      }
    },
    CALL: {
      name: "call",
      addrLabel: true,
      execute: function (vm, arg) {
        // Call a function or subroutine. This creates a new stackframe
        // with no variables defined.
        vm.frame = new StackFrame(vm.pc);
        vm.callstack.push(vm.frame);
        vm.pc = arg;
      }
    },
    GOSUB: {
      name: "gosub",
      addrLabel: true,
      execute: function (vm, arg) {
        // like call, but stack frame shares all variables from the old
        // stack frame.
        var oldvariables = vm.frame.variables;
        vm.frame = new StackFrame(vm.pc);
        vm.frame.variables = oldvariables;
        vm.callstack.push(vm.frame);
        vm.pc = arg;
      }
    },
    RET: {
      name: "ret",
      numArgs: 0,
      execute: function (vm, arg) {
        // Return from a gosub, function, or subroutine call.
        vm.pc = vm.callstack.pop().pc;
        vm.frame = vm.callstack[vm.callstack.length - 1];
      }
    },
    PUSHCONST: {
      name: "pushconst",
      execute: function (vm, arg) {
        // Push a constant value onto the stack. The argument is a
        // javascript string or number.
        vm.stack.push(arg);
      }
    },
    ARRAY_DEREF: {
      name: "array_deref",
      numArgs: 1,
      execute: function (vm, arg) {
        // Dereference an array. The top of the stack is the variable
        // reference, followed by an integer for each dimension.
        // Argument is whether we want the reference or value.
        // get the variable
        var variable = vm.stack.pop();

        var indexes = [];

        // for each dimension,
        for (var i = 0; i < variable.dimensions.length; i++) {
          // pop it off the stack in reverse order.
          indexes.unshift(vm.stack.pop());
        }

        // TODO: bounds checking.
        if (arg) {
          vm.stack.push(variable.access(indexes));
        } else {
          vm.stack.push(variable.access(indexes).value);
        }
      }
    },
    MEMBER_DEREF: {
      name: "member_deref",
      execute: function (vm, arg) {
        // Dereference a user defined type member.
        // Argument is the javascript string containing the name of the
        // member. The top of the stack is a reference to the user
        // variable.
        var userVariable = vm.stack.pop();
        var deref = userVariable[arg];

        vm.stack.push(deref);
      }
    },
    MEMBER_VALUE: {
      name: "member_value",
      execute: function (vm, arg) {
        // Dereference a user defined type member.
        // Argument is the javascript string containing the name of the
        // member. The top of the stack is a reference to the user
        // variable.
        var userVariable = vm.stack.pop();
        var deref = userVariable[arg];

        vm.stack.push(deref.value);
      }
    },
    ASSIGN: {
      name: "assign",
      numArgs: 0,
      execute: function (vm, arg) {
        // Copy the value into the variable reference.
        // Stack: left hand side: variable reference
        // right hand side: value to assign.
        var lhs = vm.stack.pop();
        var rhs = vm.stack.pop();

        lhs.value = lhs.type.copy(rhs);
      }
    },
    SYSCALL: {
      name: "syscall",
      execute: function (vm, arg) {
        // Execute a system function or subroutine. The argument is a
        // javascript string containing the name of the routine.
        if (vm.debug) console.log("TRACE: Execute syscall " + arg);
        if (arg == "print") {
          vm.cons.print(vm.stack.pop().toString());
        } else if (arg == 'alloc_array') {
          var type = vm.stack.pop();
          var numDimensions = vm.stack.pop();
          var dimensions = [];
          for (var i = 0; i < numDimensions; i++) {
            var upper = vm.stack.pop();
            var lower = vm.stack.pop();
            dimensions.unshift(new QBasic.Dimension(lower, upper));
          }

          var variable = new QBasic.ArrayVariable(type, dimensions);
          vm.stack.push(variable);
        } else if (arg == 'print_comma') {
          // This should really align the cursor to the next 14-space boundary
          // but that is not possible with the current API.
          vm.cons.print('\t');
        } else if (arg == 'print_tab') {
          // This should really align the cursor to the column given in the
          // argument but that is not possible with the current API.
          var col = vm.stack.pop();
          // Creates a string of (col - 1) spaces.
          var spaces = (new Array(col)).join(' ');
          vm.cons.print(spaces);
        } else if (arg == 'alloc_scalar') {
          var type = vm.stack.pop();
          var variable = new QBasic.ScalarVariable(type, type.createInstance());
          vm.stack.push(variable);
        } else if (QBasic.SystemFunctions[arg]) {
          QBasic.SystemFunctions[arg].action(vm);
        } else if (QBasic.SystemSubroutines[arg]) {
          QBasic.SystemSubroutines[arg].action(vm);
        } else {
          vm.cons.print("Unknown syscall: " + arg);
        }
      }
    }
  };
})();

/**
  Copyright 2010 Steve Hanov

  This file is part of qb.js

  qb.js is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  qb.js is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with qb.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
  Defines:
    QBasic.AstProgram
    QBasic.AstArgument
    QBasic.AstSubroutine
    QBasic.AstDeclareFunction
    QBasic.AstPrintUsingStatement
    QBasic.AstPrintStatement
    QBasic.AstPrintItem
    QBasic.AstInputStatement
    QBasic.AstNullStatement
    QBasic.AstEndStatement
    QBasic.AstNextStatement
    QBasic.AstArrayDeref
    QBasic.AstMemberDeref
    QBasic.AstVariableReference
    QBasic.AstRange
    QBasic.AstDataStatement
    QBasic.AstRestoreStatement
    QBasic.AstDimStatement
    QBasic.AstDefTypeStatement
    QBasic.AstConstStatement
    QBasic.AstDoStatement
    QBasic.AstExitStatement
    QBasic.AstWhileLoop
    QBasic.AstForLoop
    QBasic.AstIfStatement
    QBasic.AstSelectStatement
    QBasic.AstCaseStatement
    QBasic.AstTypeMember
    QBasic.AstUserType
    QBasic.AstGotoStatement
    QBasic.AstGosubStatement
    QBasic.AstLabel
    QBasic.AstCallStatement
    QBasic.AstAssignStatement
    QBasic.AstBinaryOp
    QBasic.AstUnaryOperator
    QBasic.AstConstantExpr
    QBasic.AstReturnStatement
    QBasic.Program
  Uses:
    # EarleyParser.js
    QBasic.EarleyParser
    # TypeChecker.js
    QBasic.TypeChecker
    # CodeGenerator.js
    QBasic.CodeGenerator
    # RuleParser.js
    QBasic.RuleParser
*/

(function () {
  // WARNING: Modifying built-in object!
  Array.prototype.accept = function(visitor) {
    for (var i = 0; i < this.length; i++) {
      if (!this[i]) continue;
      this[i].accept(visitor);
    }
  };

  /** @constructor */
  QBasic.AstProgram = function(locus, mainSub) {
    this.locus = locus;
    this.subs = [mainSub];
  }

  QBasic.AstProgram.prototype.accept = function (visitor) {
    visitor.visitProgram(this);
  };

  /** @constructor */
  QBasic.AstArgument = function(locus, name, typeName, isArray) {
    this.locus = locus;
    // name of declared subroutine argument.
    this.name = name;

    // null, or the typename in AS type
    this.typeName = typeName;

    // is this an open-ended array?
    this.isArray = isArray;

    // filled in during type checking.
    this.type = null;
  }

  QBasic.AstArgument.prototype.accept = function (visitor) {
    visitor.visitArgument(this);
  };

  /** @constructor */
  QBasic.AstSubroutine = function(
      locus, name, args, statementList, isFunction, isStatic) {
    this.locus = locus;
    this.name = name;
    this.args = args;
    this.statements = statementList;
    this.isFunction = isFunction;
    this.isStatic = isStatic;
  }

  QBasic.AstSubroutine.prototype.accept = function (visitor) {
    visitor.visitSubroutine(this);
  };

  /** @constructor */
  QBasic.AstDeclareFunction = function(locus, name, args, isFunction) {
    this.locus = locus;
    this.name = name;
    this.args = args; // array of AstArgument
    this.isFunction = isFunction;
    this.type = null; // calculated later
    this.hasBody = false; // Set to true during type checking if sub is later
    // implemented.
    this.used = false;
  }

  QBasic.AstDeclareFunction.prototype.accept = function (visitor) {
    visitor.visitDeclareFunction(this);
  };

  /** @constructor */
  QBasic.AstPrintUsingStatement = function(locus, exprList, terminator) {
    this.locus = locus;
    this.exprList = exprList; // array of expressions. The first is used as the
    //format string.
    this.terminator = terminator; // literal ';', ',', or null
  }

  QBasic.AstPrintUsingStatement.prototype.accept = function (visitor) {
    visitor.visitPrintUsingStatement(this);
  };

  /** @constructor */
  QBasic.AstPrintStatement = function(locus, printItems) {
    this.locus = locus;
    this.printItems = printItems;
  }

  QBasic.AstPrintStatement.prototype.accept = function (visitor) {
    visitor.visitPrintStatement(this);
  };

  /** @constructor */
  QBasic.AstPrintItem = function(locus, type, expr, terminator) {
    this.locus = locus;
    // Type: 0 for expr, 1 for tab, in which case expr is the argument.
    this.type = type;

    this.expr = expr; // can be null!
    this.terminator = terminator; // comma, semicolon, or nothing.
  }

  QBasic.AstPrintItem.EXPR = 0;
  QBasic.AstPrintItem.TAB = 1;

  QBasic.AstPrintItem.prototype.accept = function (visitor) {
    visitor.visitPrintItem(this);
  };

  /** @constructor */
  QBasic.AstInputStatement = function(
      locus, promptExpr, printQuestionMark, identifiers) {
    this.locus = locus;
    this.promptExpr = promptExpr; // can be null.
    this.printQuestionMark = printQuestionMark;
    this.identifiers = identifiers; // actually we will only use the first one.
  }

  QBasic.AstInputStatement.prototype.accept = function (visitor) {
    visitor.visitInputStatement(this);
  };

  /** @constructor */
  QBasic.AstNullStatement = function(locus) {
    this.locus = locus;
  }

  QBasic.AstNullStatement.prototype.accept = function (visitor) {
    visitor.visitNullStatement(this);
  };

  /** @constructor */
  QBasic.AstEndStatement = function(locus) {
    this.locus = locus;
  }

  QBasic.AstEndStatement.prototype.accept = function (visitor) {
    visitor.visitEndStatement(this);
  };

  /** @constructor */
  QBasic.AstNextStatement = function(locus, identifierList) {
    this.locus = locus;
    this.identifiers = identifierList;
  }

  QBasic.AstNextStatement.prototype.accept = function (visitor) {
    visitor.visitNextStatement(this);
  };

  /** @constructor */
  QBasic.AstArrayDeref = function(locus, expr, parameters) {
    this.locus = locus;
    this.expr = expr;
    this.parameters = parameters;
    this.type = null; // calculated during type checking.
  }

  QBasic.AstArrayDeref.prototype.accept = function (visitor) {
    visitor.visitArrayDeref(this);
  };

  /** @constructor */
  QBasic.AstMemberDeref = function(locus, lhs, identifier) {
    this.locus = locus;
    this.lhs = lhs;
    this.identifier = identifier;
  }

  QBasic.AstMemberDeref.prototype.accept = function (visitor) {
    visitor.visitMemberDeref(this);
  };

  /** @constructor */
  QBasic.AstVariableReference = function(locus, name) {
    this.locus = locus;
    this.name = name;
  }

  QBasic.AstVariableReference.prototype.accept = function (visitor) {
    visitor.visitVariableReference(this);
  };

  /** @constructor */
  QBasic.AstRange = function(locus, lowerExpr, upperExpr) {
    this.locus = locus;
    // lower and upper are possibly equal. in this case, we should avoid
    // evaluating the expression twice.
    this.lowerExpr = lowerExpr;
    this.upperExpr = upperExpr;
  }

  QBasic.AstRange.prototype.accept = function (visitor) {
    visitor.visitRange(this);
  };

  /** @constructor */
  QBasic.AstDataStatement = function(locus, data) {
    this.locus = locus;
    this.data = data;
  }

  QBasic.AstDataStatement.prototype.accept = function (visitor) {
    visitor.visitDataStatement(this);
  };

  /** @constructor */
  QBasic.AstRestoreStatement = function(locus, label) {
    this.locus = locus;
    // label can be null
    this.label = label;
  }

  QBasic.AstRestoreStatement.prototype.accept = function (visitor) {
    visitor.visitRestoreStatement(this);
  };

  /** @constructor */
  QBasic.AstDimStatement = function(locus, identifier, ranges, typeName) {
    this.locus = locus;
    this.name = identifier;
    this.ranges = ranges; // list of AstRange
    this.typeName = typeName; // possibly null
    this.shared = false; // changed to true during parsing.
  }

  QBasic.AstDimStatement.prototype.accept = function (visitor) {
    visitor.visitDimStatement(this);
  };

  /** @constructor */
  QBasic.AstDefTypeStatement = function(locus, typeName) {
    this.locus = locus;
    this.typeName = typeName;
  }

  QBasic.AstDefTypeStatement.prototype.accept = function (visitor) {
    visitor.visitDefTypeStatement(this);
  };

  /** @constructor */
  QBasic.AstConstStatement = function(locus, identifier, expr) {
    this.locus = locus;
    this.name = identifier;
    this.expr = expr;
  }

  QBasic.AstConstStatement.prototype.accept = function (visitor) {
    visitor.visitConstStatement(this);
  };

  /** @constructor */
  QBasic.AstDoStatement = function(locus, statements, expr, type) {
    this.locus = locus;
    this.statements = statements;
    this.expr = expr;
    this.type = type;
  }

  QBasic.AstDoStatement.INFINITE = 1;
  QBasic.AstDoStatement.UNTIL = 2;
  QBasic.AstDoStatement.WHILE_AT_END = 3;

  QBasic.AstDoStatement.prototype.accept = function (visitor) {
    visitor.visitDoStatement(this);
  };

  /** @constructor */
  QBasic.AstExitStatement = function(locus, what) {
    this.locus = locus;
    this.what = what; // "FOR" or "DO"
  }

  QBasic.AstExitStatement.prototype.accept = function (visitor) {
    visitor.visitExitStatement(this);
  };

  /** @constructor */
  QBasic.AstWhileLoop = function(locus, expr, statements) {
    this.locus = locus;
    this.expr = expr;
    this.statements = statements;
  }

  QBasic.AstWhileLoop.prototype.accept = function (visitor) {
    visitor.visitWhileLoop(this);
  };

  /** @constructor */
  QBasic.AstForLoop = function(locus, identifier, startExpr, endExpr, stepExpr) {
    this.locus = locus;
    this.identifier = identifier;
    this.startExpr = startExpr;
    this.endExpr = endExpr;
    this.stepExpr = stepExpr;
  }

  QBasic.AstForLoop.prototype.accept = function (visitor) {
    visitor.visitForLoop(this);
  };

  /** @constructor */
  QBasic.AstIfStatement = function(locus, expr, statements, elseStatements) {
    this.locus = locus;
    this.expr = expr;
    this.statements = statements;
    this.elseStatements = elseStatements;
  }

  QBasic.AstIfStatement.prototype.accept = function (visitor) {
    visitor.visitIfStatement(this);
  };

  /** @constructor */
  QBasic.AstSelectStatement = function(locus, expr, cases) {
    this.locus = locus;
    this.expr = expr;
    this.cases = cases;
  }

  QBasic.AstSelectStatement.prototype.accept = function (visitor) {
    visitor.visitSelectStatement(this);
  };

  /** @constructor */
  QBasic.AstCaseStatement = function(locus, exprList, statements) {
    this.locus = locus;
    // if exprList is empty, this is case Else
    this.exprList = exprList;
    this.statements = statements;
  }

  QBasic.AstCaseStatement.prototype.accept = function (visitor) {
    visitor.visitCaseStatement(this);
  };

  /** @constructor */
  QBasic.AstTypeMember = function(locus, name, typeName) {
    this.locus = locus;
    this.name = name;
    this.typeName = typeName;
  }

  QBasic.AstTypeMember.prototype.accept = function (visitor) {
    visitor.visitTypeMember(this);
  };

  /** @constructor */
  QBasic.AstUserType = function(locus, name, members) {
    this.locus = locus;
    this.name = name;
    this.members = members;
  }

  QBasic.AstUserType.prototype.accept = function (visitor) {
    visitor.visitUserType(this);
  };

  /** @constructor */
  QBasic.AstGotoStatement = function(locus, label) {
    this.locus = locus;
    this.label = label;
  }

  QBasic.AstGotoStatement.prototype.accept = function (visitor) {
    visitor.visitGotoStatement(this);
  };

  /** @constructor */
  QBasic.AstGosubStatement = function(locus, label) {
    this.locus = locus;
    this.label = label;
  }

  QBasic.AstGosubStatement.prototype.accept = function (visitor) {
    visitor.visitGosub(this);
  };

  /** @constructor */
  QBasic.AstLabel = function(locus, label) {
    this.locus = locus;
    this.label = label;
  }

  QBasic.AstLabel.prototype.accept = function (visitor) {
    visitor.visitLabel(this);
  };

  /** @constructor */
  QBasic.AstCallStatement = function(locus, name, args) {
    this.locus = locus;
    this.name = name;
    this.args = args;
  }

  QBasic.AstCallStatement.prototype.accept = function (visitor) {
    visitor.visitCallStatement(this);
  };

  /** @constructor */
  QBasic.AstAssignStatement = function(locus, lhs, expr) {
    this.locus = locus;
    this.lhs = lhs; // could be a referenceList
    this.expr = expr;
  }

  QBasic.AstAssignStatement.prototype.accept = function (visitor) {
    visitor.visitAssignStatement(this);
  };

  /** @constructor */
  QBasic.AstBinaryOp = function(locus, lhs, op, rhs) {
    this.locus = locus;
    this.lhs = lhs;
    this.op = op;
    this.rhs = rhs;
  }

  QBasic.AstBinaryOp.prototype.accept = function (visitor) {
    visitor.visitBinaryOp(this);
  };

  /** @constructor */
  QBasic.AstUnaryOperator = function(locus, op, expr) {
    this.locus = locus;
    this.op = op;
    this.expr = expr;
  }

  QBasic.AstUnaryOperator.prototype.accept = function (visitor) {
    visitor.visitUnaryOperator(this);
  };

  /** @constructor */
  QBasic.AstConstantExpr = function(locus, value) {
    this.locus = locus;
    // value is possibly null, eg. for first parameter of "COLOR , 7"
    this.value = value;
  }

  QBasic.AstConstantExpr.prototype.accept = function (visitor) {
    visitor.visitConstantExpr(this);
  };

  /** @constructor */
  QBasic.AstReturnStatement = function(locus, value) {
    this.locus = locus;
    this.value = value;
  }

  QBasic.AstReturnStatement.prototype.accept = function (visitor) {
    visitor.visitReturnStatement(this);
  };

  function onProgram(symbols, locus) {
    var sub = new QBasic.AstSubroutine(locus, "_main", [], symbols[0], false);
    var program = new QBasic.AstProgram(locus, sub);
    return program;
  }

  function onExpressionProgram(symbols, locus) {
    var sub = new QBasic.AstSubroutine(locus, "_main", [], [symbols[0]], false);
    var program = new QBasic.AstProgram(locus, sub);
    return program;
  }

  function onNumber(symbols, locus) {
    var value = symbols[0];
    if (value.match(/^&H/)) {
      value = parseInt(value.slice(2), 16);
    } else {
      value = parseFloat(value);
    }
    return new QBasic.AstConstantExpr(locus, value);
  }

  function onString(symbols, locus) {
    return new QBasic.AstConstantExpr(
        locus, symbols[0].substr(1, symbols[0].length - 2));
  }

  function onBinaryOp(symbols, locus) {
    return new QBasic.AstBinaryOp(locus, symbols[0], symbols[1], symbols[2]);
  }

  function onParamListInBrackets(symbols, locus) {
    return symbols[1];
  }

  function onBracketExpr(symbols, locus) {
    return symbols[1];
  }

  /** @constructor */
  QBasic.Program = function(input, prevProgram) {
    this.errors = [];

    // Create the parser if one doesn't already exist.
    this.createParser(this.errors);

    input += "\n"; // parse doesn't handle no newline at end of input.
    // Parse the program into abstract syntax tree.
    var astProgram = QBasic.Program.parser.parse(input);
    if (astProgram === null) {
      this.errors = QBasic.Program.parser.errors;
      //console.log(this.errors.join(''));
      throw new Error("Parse failed: " + this.errors[0]);
    }

    prevProgram = prevProgram || {};

    // Perform type checking.
    this.typeChecker = new QBasic.TypeChecker(prevProgram.typeChecker,
                                              this.errors);
    astProgram.accept(this.typeChecker);

    if (this.errors.length > 0) {
      throw new Error("There were errors.");
    }

    // Perform code generation.
    this.codeGenerator = new QBasic.CodeGenerator(prevProgram.codeGenerator);
    astProgram.accept(this.codeGenerator);

    this.sourcecode = input;
    this.instructions = this.codeGenerator.instructions.slice();
    this.types = this.typeChecker.types;
    this.defaultType = this.typeChecker.defaultType;
    this.data = this.codeGenerator.data.slice();
    this.shared = this.codeGenerator.shared;
    this.lineMap = this.codeGenerator.lineMapping;
  }

  QBasic.Program.parser = null;

  QBasic.Program.prototype.getByteCodeAsString = function () {
    if (!this.instructions) return "";
    var source = this.sourcecode.split("\n");
    var lines = [];
    for (var i = 0; i < this.instructions.length; i++) {
      var locus = this.lineMap[i];
      if (locus) {
        lines.push("   ' L" + (locus.line + 1) + " " + source[locus.line]);
      }
      lines.push("[" + i + "] " + this.instructions[i]);
    }
    return lines.join("\n");
  };

  QBasic.Program.prototype.createParser = function(errors) {
    if (QBasic.Program.parser) return;

    function UseSecond(args) {
      return args[1];
    }

    function UseFirst(args) {
      return args[0];
    }

    function JoinListsLR(args) {
      args[0].push(args[1]);
      return args[0];
    }

    function JoinLists(args) {
      args[1].unshift(args[0]);
      return args[1];
    }

    function EmptyList(args) {
      return [];
    }

    var rules = new QBasic.RuleParser();
    rules.addRule("start: program");
    rules.addToken("AND", "AND");
    rules.addToken("AS", "AS");
    rules.addToken("CASE", "CASE");
    rules.addToken("CONST", "CONST");
    rules.addToken("DATA", "DATA");
    rules.addToken("DECLARE", "DECLARE");
    rules.addToken("DEF", "DEF");
    rules.addToken("DEFINT", "DEFINT");
    rules.addToken("DIM", "DIM");
    rules.addToken("DO", "DO");
    rules.addToken("ELSE", "ELSE");
    rules.addToken("END", "END");
    rules.addToken("EXIT", "EXIT");
    rules.addToken("FOR", "FOR");
    rules.addToken("FUNCTION", "FUNCTION");
    rules.addToken("GOSUB", "GOSUB");
    rules.addToken("GOTO", "GOTO");
    rules.addToken("IF", "IF");
    rules.addToken("INPUT", "INPUT");
    rules.addToken("LINE", "LINE");
    rules.addToken("LOOP", "LOOP");
    rules.addToken("MOD", "MOD");
    rules.addToken("NEXT", "NEXT");
    rules.addToken("NOT", "NOT");
    rules.addToken("OR", "OR");
    rules.addToken("POKE", "POKE");
    rules.addToken("PRINT", "PRINT");
    // TODO(max99x): Add support for REDIM.
    rules.addToken("RESTORE", "RESTORE");
    rules.addToken("RETURN", "RETURN");
    rules.addToken("SEG", "SEG");
    rules.addToken("SELECT", "SELECT");
    rules.addToken("SHARED", "SHARED");
    rules.addToken("STATIC", "STATIC");
    rules.addToken("STEP", "STEP");
    rules.addToken("SUB", "SUB");
    rules.addToken("TAB", "TAB");
    rules.addToken("THEN", "THEN");
    rules.addToken("TO", "TO");
    rules.addToken("TYPE", "TYPE");
    rules.addToken("UNTIL", "UNTIL");
    rules.addToken("USING", "USING");
    rules.addToken("VIEW", "VIEW");
    rules.addToken("WEND", "WEND");
    rules.addToken("WHILE", "WHILE");
    rules.addToken("XOR", "XOR");
    rules.addToken("minus", "\\-");
    rules.addToken("endl", "\\n");
    rules.addToken("comment", "'.*$");
    rules.addToken("hexconstant", "\\&H[\\da-fA-F]+");
    rules.addToken("floatconstant", "\\d*\\.\\d+");
    rules.addToken("intconstant", "\\d+");
    rules.addToken("stringconstant", "\"[^\"]*\"");
    rules.addToken("label", "^([a-zA-Z][a-zA-Z0-9_]*:|\\d+)");
    rules.addToken("identifier", "[a-zA-Z_][a-zA-Z0-9_]*(\\$|%|#|&|!)?");

    rules.addRule("program: statements", onProgram);
    rules.addRule("program: repl_expr endl", onExpressionProgram);
    rules.addRule("statements: statement*");
    // Line number:
    //rules.addRule( "statement: intconstant istatement separator" );
    rules.addRule("statement: label istatement separator",
                  function (args, locus) {
      var label = args[0];
      if (label.substr(-1) == ':') {
        label = label.substr(0, label.length - 1);
      }
      return [new QBasic.AstLabel(locus, label), args[1]];
    });
    rules.addRule("statement: label", function (args, locus) {
      var label = args[0];
      if (label.substr(-1) == ':') {
        label = label.substr(0, label.length - 1);
      }
      return new QBasic.AstLabel(locus, label);
    });

    rules.addRule("statement: istatement ? separator");
    rules.addRule("istatement: CONST identifier '=' expr",
                  function (args, locus) {
      return new QBasic.AstConstStatement(locus, args[1], args[3]);
    });
    rules.addRule("istatement: DECLARE FUNCTION identifier ArgList",
                  function (args, locus) {
      return new QBasic.AstDeclareFunction(locus, args[2], args[3], true);
    });
    rules.addRule("istatement: DECLARE SUB identifier ArgList",
                  function (args, locus) {
      return new QBasic.AstDeclareFunction(locus, args[2], args[3], false);
    });
    rules.addRule("istatement: SUB identifier ArgList STATIC? statements END SUB",
                  function (args, locus) {
      return new QBasic.AstSubroutine(
          locus, args[1], args[2], args[4], false, args[3] !== null);
    });
    rules.addRule("istatement: FUNCTION identifier ArgList statements END FUNCTION",
                  function (symbols, locus) {
      return new QBasic.AstSubroutine(
          locus, symbols[1], symbols[2], symbols[3], true);
    });
    rules.addRule("istatement: DEF SEG ('=' expr)?", function (args, locus) {
      return new QBasic.AstNullStatement(locus);
    });
    rules.addRule("istatement: DEF identifier ArgList '=' expr",
                  function (args, locus) {
      return new QBasic.AstNullStatement(locus);
    });
    rules.addRule("istatement: DEFINT identifier minus identifier",
                  function (args, locus) {
      // TODO(max99x): Implement completely.
      return new QBasic.AstDefTypeStatement(locus, "INTEGER");
    });
    rules.addRule("istatement: VIEW PRINT", function (args, locus) {
      return new QBasic.AstNullStatement(locus);
    });
    rules.addRule("istatement: DIM DimList", UseSecond);
    rules.addRule("istatement: DIM SHARED DimList", function (args, locus) {
      for (var i = 0; i < args[2].length; i++) {
        args[2][i].shared = true;
      }
      return args[2];
    });
    rules.addRule("istatement: WHILE expr separator statements WEND",
                  function (args, locus) {
      return new QBasic.AstWhileLoop(locus, args[1], args[3]);
    });
    rules.addRule("istatement: DO separator statements LOOP",
                  function (args, locus) {
      return new QBasic.AstDoStatement(
          locus, args[2], null, QBasic.AstDoStatement.INFINITE);
    });
    rules.addRule("istatement: DO separator statements LOOP WHILE expr", 
                  function (args, locus) {
      return new QBasic.AstDoStatement(
          locus, args[2], args[5], QBasic.AstDoStatement.WHILE_AT_END);
    });
    rules.addRule("istatement: DO separator statements LOOP UNTIL expr",
                  function (args, locus) {
      return new QBasic.AstDoStatement(
          locus, args[2], args[5], QBasic.AstDoStatement.UNTIL);
    });
    rules.addRule("istatement: DO WHILE expr separator statements LOOP",
                  function (args, locus) {
      return new QBasic.AstWhileLoop(locus, args[2], args[4]);
    });
    rules.addRule("istatement: FOR identifier '=' expr TO expr",
                  function (args, locus) {
      return new QBasic.AstForLoop(locus, args[1], args[3], args[5], 
                                   new QBasic.AstConstantExpr(locus, 1));
    });
    rules.addRule("istatement: FOR identifier '=' expr TO expr STEP expr",
                  function (args, locus) {
      return new QBasic.AstForLoop(locus, args[1], args[3], args[5], args[7]);
    });
    rules.addRule("istatement: NEXT identifiers?", function (args, locus) {
      if (args[1] === null) {
        args[1] = [];
      }
      return new QBasic.AstNextStatement(locus, args[1]);
    });
    rules.addRule("istatement: EXIT (FOR|DO)", function (args, locus) {
      return new QBasic.AstExitStatement(locus, args[1]);
    });
    rules.addRule("identifiers: MoreIdentifiers* identifier", JoinListsLR);
    rules.addRule("MoreIdentifiers: identifier ','", UseFirst);
    rules.addRule("istatement: END", function (args, locus) {
      return new QBasic.AstEndStatement(locus);
    });
    rules.addRule("istatement: GOSUB identifier", function (args, locus) {
      return new QBasic.AstGosubStatement(locus, args[1]);
    });
    rules.addRule("istatement: GOTO identifier", function (args, locus) {
      return new QBasic.AstGotoStatement(locus, args[1]);
    });
    rules.addRule("istatement: IF expr THEN istatement", 
                  function (args, locus) {
      return new QBasic.AstIfStatement(locus, args[1], args[3], null);
    });
    rules.addRule("istatement: IF expr THEN separator statements ElseClause END IF",
                  function (args, locus) {
      return new QBasic.AstIfStatement(locus, args[1], args[4], args[5]);
    });
    rules.addRule("ElseClause: ELSE IF expr THEN separator statements ElseClause",
                  function (args, locus) {
      return new QBasic.AstIfStatement(locus, args[2], args[5], args[6]);
    });

    rules.addRule("ElseClause: ELSE statements", UseSecond);

    rules.addRule("ElseClause:", function (args, locus) {
      return new QBasic.AstNullStatement(locus);
    });
    rules.addRule("istatement: SELECT CASE expr separator case* END SELECT", 
                  function (args, locus) {
      return new QBasic.AstSelectStatement(locus, args[2], args[4]);
    });

    rules.addRule("case: CASE exprList separator statements", 
                  function (args, locus) {
      return new QBasic.AstCaseStatement(locus, args[1], args[3]);
    });

    rules.addRule("case: CASE ELSE separator statements",
                  function (args, locus) {
      return new QBasic.AstCaseStatement(locus, [], args[3]);
    });

    rules.addRule("exprList: moreExpr* expr", JoinListsLR);

    rules.addRule("moreExpr: expr ','", UseFirst);

    rules.addRule("istatement: INPUT constant? (';'|',') identifiers",
                  function (args, locus) {
      return new QBasic.AstInputStatement(
          locus, args[1], args[2] == ';', args[3]);
    });
    rules.addRule("istatement: LINE? INPUT identifiers",
                  function (args, locus) {
      return new QBasic.AstInputStatement(locus, null, false, args[2]);
    });
    rules.addRule("istatement: POKE expr ',' expr", function (args, locus) {
      return new QBasic.AstNullStatement(locus);
    });
    rules.addRule("istatement: PRINT", function (args, locus) {
      return new QBasic.AstPrintStatement(locus, []);
    });
    rules.addRule("istatement: PRINT PrintItems", function (args, locus) {
      return new QBasic.AstPrintStatement(locus, args[1]);
    });
    rules.addRule("istatement: PRINT USING [expr,';'] (';'|',')?",
                  function (args, locus) {
      return new QBasic.AstPrintUsingStatement(locus, args[2], args[3]);
    });
    rules.addRule("PrintItems: PrintItem", function (args, locus) {
      return args;
    });
    rules.addRule("PrintItems: MorePrintItems* PrintItem (';'|',')?", 
                  function (args, locus) {
      args[1].terminator = args[2];
      args[0].push(args[1]);
      return args[0];
    });
    rules.addRule("MorePrintItems: PrintItem (';'|',')",
                  function (args, locus) {
      args[0].terminator = args[1];
      return args[0];
    });

    rules.addRule("PrintItem: expr", function (args, locus) {
      return new QBasic.AstPrintItem(
          locus, QBasic.AstPrintItem.EXPR, args[0], null);
    });

    rules.addRule("PrintItem: TAB '\\(' expr '\\)'", function (args, locus) {
      return new QBasic.AstPrintItem(
          locus, QBasic.AstPrintItem.TAB, args[2], null);
    });

    rules.addRule("PrintItem:", function (args, locus) {
      return new QBasic.AstPrintItem(
          locus, QBasic.AstPrintItem.EXPR, null, null);
    });
    rules.addRule("istatement: RESTORE identifier?", function (args, locus) {
      return new QBasic.AstRestoreStatement(locus, args[1]);
    });
    rules.addRule("istatement: RETURN", function (args, locus) {
      return new QBasic.AstReturnStatement(locus);
    });
    rules.addRule("istatement: DATA [DataConstant,',']",
                  function (args, locus) {
      return new QBasic.AstDataStatement(locus, args[1]);
    });
    rules.addRule("DataConstant: identifier", function (args, locus) {
      return new QBasic.AstConstantExpr(locus, args[0]);
    });
    rules.addRule("DataConstant: constant");
    rules.addRule("DataConstant:", function (args, locus) {
      return new QBasic.AstConstantExpr(locus, null);
    });
    rules.addRule("istatement: TYPE identifier separator TypeMembers END TYPE",
                  function (args, locus) {
      return new QBasic.AstUserType(locus, args[1], args[3]);
    });
    rules.addRule("istatement: AssignStatement");
    rules.addRule("AssignStatement: ReferenceList '=' expr2",
                  function (args, locus) {
      return new QBasic.AstAssignStatement(locus, args[0], args[2]);
    });
    rules.addRule("istatement: identifier Parameters",
                  function (args, locus) {
      return new QBasic.AstCallStatement(locus, args[0], args[1]);
    });
    rules.addRule("Parameters: ", EmptyList);
    rules.addRule("Parameters: '\\(' ParameterList '\\)'", UseSecond);
    rules.addRule("Parameters: ParameterList");
    rules.addRule("ParameterList: [Parameter,',']");
    rules.addRule("Parameter: expr");
    rules.addRule("Parameter:", function (args, locus) {
      return new QBasic.AstConstantExpr(locus, null);
    });

    rules.addRule("DimList: Dim MoreDims*", JoinLists);
    rules.addRule("MoreDims: ',' Dim", UseSecond);
    rules.addRule("Dim: identifier AsType?", function (args, locus) {
      return new QBasic.AstDimStatement(locus, args[0], [], args[1]);
    });
    rules.addRule("Dim: identifier '\\(' RangeList '\\)' AsType?",
                  function (args, locus) {
      return new QBasic.AstDimStatement(locus, args[0], args[2], args[4]);
    });
    rules.addRule("AsType: AS identifier", UseSecond);
    rules.addRule("RangeList:", function (args, locus) {
      return null;
    });
    rules.addRule("RangeList: Range MoreRanges*", JoinLists);
    rules.addRule("MoreRanges: ',' Range", UseSecond);
    rules.addRule("Range: expr EndRange?", function (symbols, locus) {
      if (symbols[1]) {
        return new QBasic.AstRange(locus, symbols[0], symbols[1]);
      } else {
        return new QBasic.AstRange(
            locus, new QBasic.AstConstantExpr(locus, 0), symbols[0]);
      }
    });
    rules.addRule("EndRange: TO expr", UseSecond);
    rules.addRule("TypeMembers: TypeMember*");
    rules.addRule("TypeMember: identifier AS identifier separator",
                  function (args, locus) {
      return new QBasic.AstTypeMember(locus, args[0], args[2]);
    });
    rules.addRule("ArgList:", function (args, locus) {
      return [];
    });
    rules.addRule("ArgList: '\\(' [ Argument , ',' ] '\\)'", 
                  function (args, locus) {
      return args[1];
    });
    rules.addRule("Argument: identifier OptParen? AS identifier",
                  function (args, locus) {
      return new QBasic.AstArgument(
          locus, args[0], args[3], args[1] !== null);
    });
    rules.addRule("Argument: identifier OptParen?", function (args, locus) {
      return new QBasic.AstArgument(locus, args[0], null, args[1] !== null);
    });
    rules.addRule("OptParen: '\\(' '\\)'");

    rules.addRule("expr: expr2");
    rules.addRule("expr2: expr2 OR expr3", onBinaryOp);
    rules.addRule("expr2: expr2 XOR expr3", onBinaryOp);
    rules.addRule("expr2: expr3");
    rules.addRule("expr3: expr3 AND expr4", onBinaryOp);
    rules.addRule("expr3: expr4");
    rules.addRule("expr4: expr4 '=' expr5", onBinaryOp);
    rules.addRule("expr4: expr4 '<>' expr5", onBinaryOp);
    rules.addRule("expr4: expr4 '>' expr5", onBinaryOp);
    rules.addRule("expr4: expr4 '<' expr5", onBinaryOp);
    rules.addRule("expr4: expr4 '<=' expr5", onBinaryOp);
    rules.addRule("expr4: expr4 '>=' expr5", onBinaryOp);
    rules.addRule("expr4: expr5");

    rules.addRule("repl_expr: repl_expr2");
    rules.addRule("repl_expr2: repl_expr2 OR repl_expr3", onBinaryOp);
    rules.addRule("repl_expr2: repl_expr2 XOR repl_expr3", onBinaryOp);
    rules.addRule("repl_expr2: repl_expr3");
    rules.addRule("repl_expr3: repl_expr3 AND repl_expr4", onBinaryOp);
    rules.addRule("repl_expr3: repl_expr4");
    rules.addRule("repl_expr4: repl_expr4 '==' expr5", onBinaryOp);
    rules.addRule("repl_expr4: repl_expr4 '<>' expr5", onBinaryOp);
    rules.addRule("repl_expr4: repl_expr4 '>' expr5", onBinaryOp);
    rules.addRule("repl_expr4: repl_expr4 '<' expr5", onBinaryOp);
    rules.addRule("repl_expr4: repl_expr4 '<=' expr5", onBinaryOp);
    rules.addRule("repl_expr4: repl_expr4 '>=' expr5", onBinaryOp);
    rules.addRule("repl_expr4: expr5");

    rules.addRule("expr5: expr5 MOD expr6", onBinaryOp);
    rules.addRule("expr5: expr6");
    rules.addRule("expr6: expr6 '\\+' expr7", onBinaryOp);
    rules.addRule("expr6: expr6 '\\-' expr7", onBinaryOp);
    rules.addRule("expr6: expr7");
    rules.addRule("expr7: expr7 '\\*' expr7b", onBinaryOp);
    rules.addRule("expr7: expr7 '\\/' expr7b", onBinaryOp);
    rules.addRule("expr7: expr7 '\\\\' expr7b", onBinaryOp);
    rules.addRule("expr7: expr7b");
    rules.addRule("expr7b: expr7b '\\^' expr8", onBinaryOp);
    rules.addRule("expr7b: expr8");
    rules.addRule("expr8: '\\(' expr '\\)'", onBracketExpr);
    //rules.addRule( "expr8: expr8 '\\.' expr10", onBinaryOp );
    rules.addRule("expr8: NOT expr9", function (args, locus) {
      return new QBasic.AstUnaryOperator(locus, "NOT", args[1]);
    });
    rules.addRule("expr8: '\\-' expr9", function (args, locus) {
      return new QBasic.AstUnaryOperator(locus, "-", args[1]);
    });
    rules.addRule("expr8: expr9");
    rules.addRule("expr9: constant");
    rules.addRule("expr9: expr10");
    rules.addRule("expr10: ReferenceList");
    rules.addRule("constant: hexconstant", onNumber);
    rules.addRule("constant: intconstant", onNumber);
    rules.addRule("constant: floatconstant", onNumber);
    rules.addRule("constant: stringconstant", onString);
    rules.addRule("ReferenceList: ReferenceList '\\.' identifier",
                  function (args, locus) {
      return new QBasic.AstMemberDeref(locus, args[0], args[2]);
    });

    rules.addRule("ReferenceList: ReferenceList '\\(' ParameterList '\\)'",
                  function (args, locus) {
      return new QBasic.AstArrayDeref(locus, args[0], args[2]);
    });
    rules.addRule("ReferenceList: Reference");
    rules.addRule("Reference: identifier", function (args, locus) {
      return new QBasic.AstVariableReference(locus, args[0]);
    });

    rules.addRule("separator: endl+");
    rules.addRule("separator: comment endl");
    rules.addRule("separator: ':'");

    errors = errors || [];
    rules.buildSet.check(errors);
    for (var i = 0; i < errors.length; i++) {
      console.log(errors[i]);
    }

    rules.buildSet.finalize();

    QBasic.Program.parser = new QBasic.EarleyParser(rules.buildSet);
    //QBasic.Program.parser.debug = true;
  };
})();

module.exports = QBasic;