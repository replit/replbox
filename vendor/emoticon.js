var Instruction, Interpreter, Parser, RuntimeError,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Instruction = (function() {
  function Instruction(value, type) {
    var emoticon;
    this.value = value;
    this.type = type;
    if (this.type === 'emoticon') {
      emoticon = this.value.split('');
      this.mouth = emoticon.pop();
      this.nose = emoticon.pop();
      this.face = emoticon.join('');
      if (this.face === '') {
        this.face = this.nose;
        this.nose = null;
      }
    }
  }

  Instruction.prototype.toString = function() {
    return this.value;
  };

  return Instruction;

})();

RuntimeError = (function(superClass) {
  extend(RuntimeError, superClass);

  function RuntimeError(message) {
    this.message = message;
  }

  RuntimeError.prototype.name = 'RuntimeError';

  return RuntimeError;

})(Error);

Parser = (function() {
  function Parser(code) {
    var bObfuscatedMode, match, rComment, rEmoticon, rMustache, rNewLine, rNumber, rObfusc, rSpace, rWord, source, token;
    bObfuscatedMode = false;
    rEmoticon = /^([^\s]+[OC<>\[\]VD@PQ7L#${}\\\/()|3E*])(\s|$)/;
    rNumber = /^-?\d+/;
    rSpace = /^[ \t\v]+/;
    rNewLine = /^(\n)/;
    rComment = /^\*\*([^*]|\*[^*])*\*\*/;
    rWord = /^([^\s]+)\s*/;
    rObfusc = /^\^_(_)?\^/;
    rMustache = /^[8|B|:][\)|\(|\[|\]][\-|`|~]/;
    source = [];
    while (code) {
      if (match = code.match(rObfusc)) {
        match = match[0];
        bObfuscatedMode = !bObfuscatedMode;
      } else if (match = code.match(rSpace)) {
        match = match[0];
      } else if (match = code.match(rNewLine)) {
        match = match[0];
      } else if (match = code.match(rComment)) {
        match = match[0];
      } else if (match = code.match(rEmoticon)) {
        match = match[1];
        token = new Instruction(match, 'emoticon');
        source.push(token);
      } else if (match = code.match(rMustache)) {
        match = match[0];
        token = new Instruction(match, 'mustache');
        source.push(token);
      } else if (bObfuscatedMode === false) {
        if (match = code.match(rNumber)) {
          match = match[0];
          token = new Instruction(parseInt(match), 'data');
          source.push(token);
        } else if (match = code.match(rWord)) {
          match = match[1];
          token = new Instruction(match, 'data');
          source.push(token);
        }
      } else if (bObfuscatedMode === true) {
        if (match = code.match(rWord)) {
          match = match[1];
        }
      }
      code = code.slice(match.length);
    }
    return source;
  }

  return Parser;

})();

Interpreter = (function() {
  function Interpreter(arg) {
    var source;
    source = arg.source, this.print = arg.print, this.input = arg.input, this.result = arg.result, this.logger = arg.logger;
    source.unshift('START');
    this.lists = {
      X: [1],
      Z: source,
      A: [':'],
      G: [],
      S: [' '],
      E: [],
      ':': []
    };
  }

  Interpreter.prototype.debug = function() {
    var i, log, ref, v;
    if (this.logger == null) {
      return false;
    }
    this.logger("step " + (this.left('X')));
    log = '';
    ref = this.lists;
    for (i in ref) {
      v = ref[i];
      log += ("\n" + i + ": ") + v.toString();
    }
    return this.logger(log);
  };

  Interpreter.prototype.closestDivideOrClose = function(index) {
    var list;
    list = this.lists['Z'];
    while (index < list.length) {
      if (list[index].mouth === ')') {
        return index;
      } else if (list[index].mouth === '|') {
        this.lists['G'][0] = 'IF';
        return index;
      }
      index++;
    }
    return infinity;
  };

  Interpreter.prototype.closestCloser = function(index) {
    var list;
    list = this.lists['Z'];
    while (index < list.length) {
      if (list[index].mouth === ')') {
        return index;
      }
      index++;
    }
    return infinity;
  };

  Interpreter.prototype.left = function(listName) {
    return this.lists[listName][0];
  };

  Interpreter.prototype.right = function(listName) {
    return this.lists[listName][this.lists[listName].length - 1];
  };

  Interpreter.prototype.putRight = function(listName, dataItem) {
    return this.lists[listName].push(dataItem);
  };

  Interpreter.prototype.putLeft = function(listName, dataItem) {
    return this.lists[listName].unshift(dataItem);
  };

  Interpreter.prototype.currentList = function() {
    return this.left('A');
  };

  Interpreter.prototype.clone = function(listName) {
    var j, len, list, results, v;
    list = this.lists[listName];
    if (list.map != null) {
      return list.map(function(x) {
        return x;
      });
    }
    results = [];
    for (j = 0, len = list.length; j < len; j++) {
      v = list[j];
      results.push(v);
    }
    return results;
  };

  Interpreter.prototype.run = function() {
    var cont, i;
    cont = true;
    i = 0;
    while (cont && typeof cont !== "function" && i < 30000) {
      i++;
      this.debug();
      cont = this.step();
    }
    if (typeof cont === "function") {
      cont();
    } else {
      if (typeof this.result === "function") {
        this.result(this.lists);
      }
    }
    return this.lists;
  };

  Interpreter.prototype.step = function() {
    var instruction, ret;
    instruction = this.lists['Z'][this.left('X')];
    if (!instruction) {
      return false;
    }
    if (!(instruction instanceof Instruction)) {
      instruction = new Parser(instruction)[0];
    }
    if (instruction.type === 'data') {
      this.putRight(this.currentList(), instruction.value);
      this.lists['X'][0]++;
    } else if (instruction.type === 'mustache') {
      this.putRight(this.currentList(), this.parseMustache(instruction.value));
      this.lists['X'][0]++;
    } else if (instruction.type === 'emoticon') {
      ret = this.execute(instruction);
      this.lists['X'][0]++;
      return ret;
    }
    return true;
  };

  Interpreter.prototype.parseMustache = function(mustache) {
    switch (mustache) {
      case ':)`':
        return 'a';
      case '8)`':
        return 'b';
      case 'B)`':
        return 'c';
      case ':]`':
        return 'd';
      case '8]`':
        return 'e';
      case 'B]`':
        return 'f';
      case ':[`':
        return 'g';
      case '8[`':
        return 'h';
      case 'B[`':
        return 'i';
      case ':(`':
        return 'j';
      case '8(`':
        return 'k';
      case 'B(`':
        return 'l';
      case ':)-':
        return 'm';
      case '8)-':
        return 'n';
      case 'B)-':
        return 'o';
      case ':]-':
        return 'p';
      case '8]-':
        return 'q';
      case 'B]-':
        return 'r';
      case ':[-':
        return 's';
      case '8[-':
        return 't';
      case 'B[-':
        return 'u';
      case ':(-':
        return 'v';
      case '8(-':
        return 'w';
      case 'B(-':
        return 'x';
      case ':)~':
        return 'y';
      case '8)~':
        return 'z';
      case 'B)~':
        return '0';
      case ':]~':
        return '1';
      case '8]~':
        return '2';
      case 'B]~':
        return '3';
      case ':[~':
        return '4';
      case '8[~':
        return '5';
      case 'B[~':
        return '6';
      case ':(~':
        return '7';
      case '8(~':
        return '8';
      case 'B(~':
        return '9';
    }
    return '';
  };

  Interpreter.prototype.execute = function(instruction) {
    var AssertCount, condition, count, currFace, currList, currentList, face, insertIndex, isReplace, item, j, k, l, len, len1, list, marker, mouth, nextInstruction, nose, numToReplace, numToRotate, operand1, operand2, pull, put, ref, ref1, ref2, replaced, tmp, v, x;
    mouth = instruction.mouth;
    nose = instruction.nose;
    face = instruction.face;
    AssertCount = (function(_this) {
      return function(count, listName) {
        if (_this.lists[listName].length < count) {
          throw new RuntimeError("List '" + listName + "' needs to have at least #" + count + " items to execute " + instruction + " at " + (_this.left('X')));
        }
      };
    })(this);
    if (face.length === 1 && face[0] === ':') {
      list = this.lists[':'];
    } else if (face.length === 2 && face[1] === ':' && face[0] in this.lists) {
      face = face[0];
      list = this.lists[face];
    } else {
      if (!this.lists[face]) {
        list = this.lists[face] = [];
      } else {
        list = this.lists[face];
      }
    }
    currFace = this.currentList();
    currList = this.lists[currFace];
    switch (mouth) {
      case 'O':
        this.lists['A'][0] = face;
        break;
      case 'C':
        currList.unshift(list.length);
        break;
      case '<':
        AssertCount(1, currFace);
        this.putLeft(face, currList.shift());
        break;
      case '>':
        AssertCount(1, currFace);
        this.putRight(face, currList.pop());
        break;
      case '[':
        AssertCount(1, currFace);
        this.putLeft(face, this.left(currFace));
        break;
      case ']':
        AssertCount(1, currFace);
        this.putRight(face, this.right(currFace));
        break;
      case 'V':
        AssertCount(2, ':');
        numToReplace = this.lists[':'].shift();
        insertIndex = this.lists[':'].shift();
        currentList = this.clone(currFace);
        while (currentList.length) {
          item = currentList.shift();
          isReplace = numToReplace > 0 ? 1 : 0;
          numToReplace--;
          replaced = list.splice(insertIndex, isReplace, item);
          insertIndex++;
          if (isReplace) {
            this.putRight(':', replaced[0]);
          }
        }
        break;
      case 'D':
        this.lists[face] = list = this.clone(currFace);
        break;
      case '@':
        AssertCount(1, currFace);
        numToRotate = this.left(currFace);
        for (x = j = ref = numToRotate; ref <= 1 ? j <= 1 : j >= 1; x = ref <= 1 ? ++j : --j) {
          this.putLeft(face, list.pop());
        }
        break;
      case 'P':
        AssertCount(1, face);
        this.print(list[0].toString());
        break;
      case 'Q':
        AssertCount(1, face);
        this.print(list.shift().toString());
        break;
      case '7':
        AssertCount(1, face);
        tmp = [];
        ref1 = list.shift().split('');
        for (k = 0, len = ref1.length; k < len; k++) {
          v = ref1[k];
          tmp.push(v);
        }
        this.lists[face] = list = tmp.concat(list);
        break;
      case 'L':
        AssertCount(1, face);
        tmp = [];
        ref2 = list.pop().split('');
        for (l = 0, len1 = ref2.length; l < len1; l++) {
          v = ref2[l];
          tmp.push(v);
        }
        this.lists[face] = list.concat(tmp);
        break;
      case '#':
        count = this.left(currFace);
        tmp = isNaN(count) ? list.splice(0, list.length) : list.splice(0, count);
        tmp = nose === '~' ? tmp.join(' ') : tmp.join('');
        list.unshift(tmp);
        break;
      case '$':
        count = this.left(currFace);
        tmp = list.splice(-count, count);
        tmp = nose === '~' ? tmp.join(' ') : tmp.join('');
        list.push(tmp);
        break;
      case '{':
      case '}':
        AssertCount(2, face);
        put = function(item) {
          if (mouth === '{') {
            return list.unshift(item);
          } else {
            return list.push(item);
          }
        };
        pull = function() {
          if (mouth === '{') {
            return list.shift();
          } else {
            return list.pop();
          }
        };
        operand1 = pull();
        operand2 = pull();
        switch (nose) {
          case '+':
            put(operand1 + operand2);
            break;
          case '-':
            put(operand1 - operand2);
            break;
          case 'x':
            put(operand1 * operand2);
            break;
          case '/':
            put(operand1 / operand2);
            break;
          case '\\':
            put(operand1 % operand2);
        }
        break;
      case '\\':
      case '/':
        put = (function(_this) {
          return function(item) {
            if (mouth === '\\') {
              return _this.lists[':'].unshift(item.toString().toUpperCase());
            } else {
              return _this.lists[':'].push(item.toString().toUpperCase());
            }
          };
        })(this);
        operand1 = mouth === '\\' ? this.left(currFace) : this.right(currFace);
        operand2 = mouth === '\\' ? this.left(face) : this.right(face);
        switch (nose) {
          case '=':
            put(operand1 === operand2);
            break;
          case '>':
            put(operand1 > operand2);
            break;
          case '<':
            put(operand1 < operand2);
            break;
          case '~':
            put(operand1 !== operand2);
        }
        break;
      case '(':
        this.lists['G'].push(this.left('X'));
        break;
      case ')':
        marker = this.lists['G'].pop();
        nextInstruction = marker === 'IF' ? this.left('X') : marker - 1;
        this.lists['X'][0] = nextInstruction;
        break;
      case '|':
        this.lists['X'][0] = this.closestCloser(this.left('X'));
        break;
      case '3':
      case 'E':
        condition = this.left(':');
        if (condition === 'TRUE') {
          this.lists['X'][0] = this.closestDivideOrClose(this.left('X'));
        }
        if (mouth === 'E' && condition === 'TRUE' || condition === 'FALSE') {
          this.lists[':'].shift();
        }
        break;
      case '*':
        return (function(_this) {
          return function() {
            return _this.input(function(result) {
              var len2, m, word;
              result = result.split(/[ \t\v]+/);
              for (m = 0, len2 = result.length; m < len2; m++) {
                word = result[m];
                _this.putRight(currFace, word);
              }
              return _this.run();
            });
          };
        })(this);
    }
    return true;
  };

  return Interpreter;

})();

window.Emoticon = {
  Parser: Parser,
  Interpreter: Interpreter
};
