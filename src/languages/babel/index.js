const webEvaluator = require('../../shared/webEvaluator');
const Messenger = require('../../shared/messenger');
const Babel = require('../../../vendor/babel');
const Jasmine = require('jasmine-core/lib/jasmine-core/jasmine.js');
const Context = require('context-eval');

// WebEvaluator calls ready.
const evaluate = webEvaluator();

Messenger.on('evaluate', ({ code, infiniteLoopProtection }) => {
  let compiledCode;

  try {
    // maybe remove
    // jspm had transpiler
    compiledCode = compile(code);
  } catch (e) {
    Messenger.result({ error: e.message });
    return;
  }

  evaluate(compiledCode, { infiniteLoopProtection });
});

Messenger.on('checkLine', command =>
  Messenger.checkLineEnd(
    (() => {
      let lastLine;
      try {
        compile(command);
        lastLine = command.split('\n').slice(-1)[0];
        if (/^\s+/.test(lastLine)) {
          return 0;
        }

        return false;
      } catch (e) {
        if (/[[{(]$/.test(command)) {
          return 1;
        }

        return 0;
      }
    })(),
  ),
);

class Reporter {
  constructor(onDone) {
    this._specs = [];
    this._onDone = onDone;
  }

  jasmineStarted() {}

  suiteStarted() {}

  specStarted() {}

  specDone(result) {
    this._specs.push(result);
  }

  suiteDone() {}

  jasmineDone() {
    this._onDone(this);
  }

  passed() {
    for (const spec of this._specs) {
      if (spec.status !== 'passed') {
        return false;
      }
    }
    return true;
  }

  error() {}

  failures() {
    const ret = [];
    for (const spec of this._specs) {
      if (spec.status === 'failed') {
        ret.push({
          name: spec.description,
          stack: spec.failedExpectations[0].stack,
        });
      }
    }
    return ret;
  }
}

Messenger.on('runSingleUnitTests', ({ code, suiteCode }) => {
  const jasmine = Jasmine.core(Jasmine);
  const env = jasmine.getEnv();
  const jasmineInterface = Jasmine.interface(jasmine, env);
  const context = new Context(jasmineInterface);

  env.addReporter(
    new Reporter(reporter => {
      // On complete
      Messenger.result({
        error: reporter.error(),
        passed: reporter.passed(),
        failures: reporter.failures(),
      });
    }),
  );

  let compiledCode;
  let compiledSuiteCode;
  try {
    compiledCode = compile(code);
    compiledSuiteCode = compile(suiteCode);
  } catch (e) {
    Messenger.result({ error: e.message });
    return;
  }

  try {
    context.evaluate(compiledCode);
    context.evaluate(compiledSuiteCode);
  } catch (e) {
    Messenger.result({ error: e.stack });
    return;
  }

  env.execute();
});

function compile(code) {
  return Babel.transform(code, {
    presets: ['es2015-no-commonjs', 'stage-0'],
  }).code;
}
