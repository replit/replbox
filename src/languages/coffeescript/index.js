const webEvaluator = require('../../shared/webEvaluator');
const Messenger = require('../../shared/messenger');
const CoffeeScript = require('../../../vendor/coffee-script');

// WebEvaluator calls ready.
const evaluate = webEvaluator();

Messenger.on('evaluate', ({ code, infiniteLoopProtection }) => {
  let compiledCode;

  try {
    compiledCode = CoffeeScript.compile(code, {
      globals: true,
      bare: true,
    });
  } catch (e) {
    Messenger.result({ error: e.stack });
    return;
  }

  // WebEvaluator takes care of returning the result.
  evaluate(compiledCode, { infiniteLoopProtection });
});

const SCOPE_OPENERS = [
  'FOR',
  'WHILE',
  'UNTIL',
  'LOOP',
  'IF',
  'POST_IF',
  'SWITCH',
  'WHEN',
  'CLASS',
  'TRY',
  'CATCH',
  'FINALLY',
];

Messenger.on('checkLine', command =>
  Messenger.checkLineEnd(
    (() => {
      let allTokens;
      let i;
      let index;
      let j;
      let lastLineTokens;
      let len;
      let len1;
      let next;
      let ref;
      let scopes;
      let token;

      const lastLine = command.split('\n').slice(-1)[0];
      if (/([-=]>|[[{(]|\belse)$/.test(lastLine)) {
        return 1;
      }
      try {
        allTokens = CoffeeScript.tokens(command);
        lastLineTokens = CoffeeScript.tokens(lastLine);
      } catch (_error) {
        return 0;
      }
      try {
        CoffeeScript.compile(command);
        if (/^\s+/.test(lastLine)) {
          return 0;
        }
        for (index = 0, i = 0, len = allTokens.length; i < len; index = ++i) {
          token = allTokens[index];
          next = allTokens[index + 1];
          if (
            token[0] === 'REGEX' &&
            token[1] === '/(?:)/' &&
            next[0] === 'MATH' &&
            next[1] === '/'
          ) {
            return 0;
          }
        }
        return false;
      } catch (_error) {
        scopes = 0;
        for (j = 0, len1 = lastLineTokens.length; j < len1; j++) {
          token = lastLineTokens[j];
          ref = token[0];
          if (SCOPE_OPENERS.indexOf(ref) >= 0) {
            scopes++;
          } else if (token.fromThen) {
            scopes--;
          }
        }
        if (scopes > 0) {
          return 1;
        }
        return 0;
      }
    })(),
  ),
);
