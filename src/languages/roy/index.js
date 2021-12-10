const { roy } = require('../../../vendor/roy');
const interp = require('../../interp');

const header = `Roy 0.1.3
Copyright (C) 2011 Brian McKenna`;

function evaluate(code, callback) {
  let compiled;
  try {
    compiled = roy.compile(code).output;
  } catch (e) {
    callback(e.stack, null);
    return;
  }

  try {
    callback(null, eval(compiled));
  } catch (e) {
    callback(e.message, null);
  }
}

function checkLine(command) {
  try {
    roy.compile(command);
    return false;
  } catch (e) {
    if (/[[{(]$/.test(command)) {
      // An opening brace, bracket or paren; indent.
      return 1;
    }
    return 0;
  }
}

module.exports = {
  header,
  evaluate,
  checkLine,
};
