require('script-loader!../../../vendor/roy');
const webEvaluator = require('../../shared/webEvaluator');
const Messenger = require('../../shared/messenger');

const { roy } = Messenger.global;

// WebEvaluator calls ready.
const evaluate = webEvaluator();

Messenger.on('evaluate', ({ code, infiniteLoopProtection }) => {
  let compiled;
  try {
    compiled = roy.compile(code).output;
  } catch (e) {
    Messenger.result({ error: e.stack });
    return;
  }

  // WebEvaluator takes care of returning the result.
  evaluate(compiled, { infiniteLoopProtection });
});

Messenger.on('checkLine', command => {
  try {
    roy.compile(command);
    return Messenger.checkLineEnd(false);
  } catch (e) {
    if (/[[{(]$/.test(command)) {
      // An opening brace, bracket or paren; indent.
      return Messenger.checkLineEnd(1);
    }
    return Messenger.checkLineEnd(0);
  }
});
