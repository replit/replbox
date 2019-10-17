const Messenger = require('./messenger');
const transform = require('./transforms');
const fetchModules = require('./fetchModules');
const { inspect } = require('./util');
const stackTracer = require('./stackTracer');

function warnOnInfinite(e) {
  if (
    e.name === 'RangeError' &&
    typeof e.message === 'string' &&
    e.message.match(/infinite/i)
  ) {
    Messenger.warn('infinite');
  }
}

module.exports = (code, { context, infiniteLoopProtection }) =>
  new Promise(resolve => {
    let processedCode = code;
    let imports = [];

    try {
      const res = transform(processedCode, {
        jsLoopBreaker: infiniteLoopProtection,
        blockBinding: true,
        checkImports: true,
      });

      imports = res.imports;
      processedCode = res.code;
    } catch (e) {
      if (e.name === 'SyntaxError') {
        let message = e.message;

        // Some browser don't include the name in the message prop.
        if (!message.match(/SyntaxError/)) {
          message = `SyntaxError: ${message}`;
        }

        resolve({
          error: message,
        });
        return;
      }

      // Show this error in the console and report to sentry but continue
      // so that we don't block the functionality.
      console.error(e.stack); // eslint-disable-line
      Messenger.reportError(e);
    }

    let result;

    if (imports.length) {
      Messenger.track('Modules Fetched', {
        language: 'javascript',
      });

      fetchModules(imports).then(
        bundle => {
          try {
            context.evaluate(bundle);
          } catch (e) {
            warnOnInfinite(e);

            resolve({
              error: stackTracer(e, { isIframe: Messenger.isIframe }),
            });

            return;
          }

          try {
            result = context.evaluate(processedCode);
          } catch (e) {
            warnOnInfinite(e);

            resolve({
              error: stackTracer(e, { isIframe: Messenger.isIframe }),
            });

            return;
          }

          resolve({ data: inspect(result) });
        },
        err => {
          Messenger.warn('import-failure');
          resolve({ error: err.stack });
        },
      );
    } else {
      try {
        result = context.evaluate(processedCode);
      } catch (e) {
        resolve({
          error: stackTracer(e, { isIframe: Messenger.isIframe }),
        });
        return;
      }

      resolve({ data: inspect(result) });
    }
  });
