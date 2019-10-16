BF = (function (){
  /************************ Utils *************************/
  var Token = function (type, value, number) {
    this.type = type;
    this.value = value;
    this.number = number;
    this.toString = function () {return value};
  };

  var ErrOutOfRange = (function () {
    var msg = "Data pointer out of range.";
    if (RangeError) return new RangeError(msg);
    return new Error(msg);
  })();

  var MAX_DATA_COUNT = 30000;

  /************************ Parser *************************/
  // Class: Parser @arg (String) program code
  //          this.tokenized:  Array of tokens
  var Parser = function (code) {
    var tokenized = [],
        i = 0,
        ch, token, match_stack, prev;
    var tokens = {
      '>': 'increment_pointer',
      '<': 'decrement_pointer',
      '+': 'increment_data',
      '-': 'decrement_data',
      '.': 'output',
      ',': 'input',
      '[': 'jump_forward_if_zero',
      ']': 'jump_backward_if_nonzero'
    };


    match_stack = [];
    code = code.split('');
    while (code.length) {
      ch = code.shift();
      if (tokens[ch]) {
        token = new Token(tokens[ch], ch, i);
        if (ch === '[') {
          match_stack.push(token);
        } else if (ch === ']') {
          prev = match_stack.pop();
          if (!prev) throw new Error("Mismatched Brackets.");
          prev.match = token.number;
          token.match = prev.number;
        }
        tokenized.push(token);
        i++;
      }
      // ignore everything else.
    }
    this.tokenized = tokenized;
  };

  /************************ Interpreter *************************/
  // Interpreter
  var Interpreter = (function () {

    var Interpreter = function (input, output, result) {
      this.user_input = input;
      this.user_output = output;
      this.result = typeof result === "function" ? result : function () {};
      this.reset();
    };

    Interpreter.prototype = {

      reset: function () {
        this.d_ptr = 0;
        this.i_ptr = 0;
        // instead of allocating 30000 bytes, we consider undefined to be 0
        this.data = [];
      },

      evaluate: function (code) {
        this.code = (code instanceof Parser ? code : new Parser(code)).tokenized;
        this.i_ptr = 0;
        this.run();
      },

      run: function () {
        var cont = true,
            instruction, instruction_name;
        var i =0;
        while (typeof cont !== "function") {
          this.instruction = this.code[this.i_ptr];
          if (!this.instruction) {
            cont = this.result;
            continue;
          }
          cont = this[this.instruction.type]();
          this.i_ptr++;
        }
        cont(this.data, this.d_ptr);
      },

      increment_pointer: function () {
        if (this.d_ptr === MAX_DATA_COUNT - 1) throw ErrOutOfRange;
        this.d_ptr++;
      },

      decrement_pointer: function () {
        if (this.d_ptr === 0) throw ErrOutOfRange;
        this.d_ptr--;
      },

      zerofy: function () {
        if (this.data[this.d_ptr] === undefined) this.data[this.d_ptr] = 0
      },

      increment_data: function () {
        this.zerofy();
        this.data[this.d_ptr]++;
      },

      decrement_data: function () {
        this.zerofy();
        this.data[this.d_ptr]--;
      },

      output: function () {
        this.user_output(String.fromCharCode(this.data[this.d_ptr]));
      },

      input: function () {
        var that = this;
        return (function () {
          that.user_input(function (data) {
            data = data.toString();
            that.data[that.d_ptr] = data.charCodeAt(0) || 10;
            that.run();
          });
        });
      },

      jump_forward_if_zero: function () {
        if (!this.data[this.d_ptr])  this.i_ptr = this.instruction.match;
      },

      jump_backward_if_nonzero: function () {
        if (this.data[this.d_ptr]) this.i_ptr = this.instruction.match;
      }

    }
    return Interpreter;
  })();

  return {
    Parser: Parser,
    Interpreter: Interpreter
  };
})();
