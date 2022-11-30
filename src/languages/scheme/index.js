const BiwaScheme = require('biwascheme');

const interp = require('../../interp');

const Port = BiwaScheme.Port;

Port.current_input = new Port.CustomInput(interp.stdin);
Port.current_output = new Port.CustomOutput(interp.stdout);
Port.current_error = new Port.CustomOutput(interp.stderr);
const interpreter = new BiwaScheme.Interpreter();

const header = `BiwaScheme Interpreter version ${BiwaScheme.VERSION}
Copyright (C) 2007-2014 Yutaka HARA and the BiwaScheme team`;

function evaluate(code, callback) {
  try {
    interpreter.on_error = error => callback(error.message, null);
    interpreter.evaluate(code, newState => {
      // When the result is JS undefined then this eval was an error and the
      // error callback has been already called.
      // Scheme seems to return a result even on error.
      if (newState !== undefined) {
        let result = '';

        if (newState !== null && newState !== BiwaScheme.undef) {
          result = BiwaScheme.to_write(newState);
        }

        callback(null, result);
      }
    });
  } catch (e) {
    callback(e.message, null);
  }
}

function checkLine(command) {
  function countParens(str) {
    const { tokens } = new BiwaScheme.Parser(str);
    let parens = 0;
    for (const token of tokens) {
      switch (token) {
        case '[':
        case '(':
          parens++;
          break;
        case ']':
        case ')':
          parens--;
          break;
      }
    }
    return parens;
  }

  if (countParens(command) <= 0) {
    // All S-exps closed or extra closing parens; don't continue.
    return false;
  }

  const parensLastLine = countParens(command.split('\n').pop());
  if (parensLastLine > 0) {
    // A new S-exp opened on the last line; indent one level.
    return 1;
  } else if (parensLastLine < 0) {
    // Some S-exps were closed; realign with the outermost closed S-exp.
    return parensLastLine;
  }
  return 0;
}

module.exports = {
  header,
  evaluate,
  checkLine,
};
