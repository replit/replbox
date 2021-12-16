const { Unlambda } = require('../../../vendor/unlambda');
const interp = require('../../interp');

const header = `Unlambda v2.0 (unlambda-coffee)
Copyright (c) 2011 Max Shawabkeh`;

function evaluate(code, callback) {
  let parsed;
  try {
    parsed = Unlambda.parse(code);
  } catch (e) {
    callback(e.message, null);
    return;
  }

  Unlambda.eval(
    parsed,
    data => callback(null, data),
    interp.stdin,
    interp.stdout,
    interp.stderr,
  );
}

function checkLine(command) {
  if (/`$/.test(command)) {
    return 0;
    return Messenger.checkLineEnd(0);
  }

  try {
    Unlambda.parse(command);
    Messenger.checkLineEnd(false);
  } catch (e) {
    Messenger.checkLineEnd(0);
  }

  // ¯\_(ツ)_/¯
  return undefined;
}

module.exports = {
  header,
  evaluate,
  checkLine,
};
