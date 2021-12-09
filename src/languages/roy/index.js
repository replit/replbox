const { roy } = require('../../../vendor/roy');
const interp = require('../../interp');

function evaluate(code) {
  let compiled;
  try {
    compiled = roy.compile(code).output;
  } catch (e) {
    interp.stderr(e.stack)
    return;
  }

  try {
    eval(compiled)
  } catch (e) {
    interp.stderr(e.message)
  }
}

function checkLine(command) {
  try {
    roy.compile(command);
    return false
  } catch (e) {
    if (/[[{(]$/.test(command)) {
      // An opening brace, bracket or paren; indent.
      return 1
    }
    return 0
  }
}

module.exports = {
  evaluate,
  checkLine,
};
