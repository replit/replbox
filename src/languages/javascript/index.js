const webEvaluator = require('../../shared/webEvaluator');
const Messenger = require('../../shared/messenger');
const Jasmine = require('jasmine-core/lib/jasmine-core/jasmine.js');
const Context = require('context-eval');
const webEvaluateInContext = require('../../shared/webEvaluateInContext');

// WebEvaluator calls ready.
const evaluate = webEvaluator();

Messenger.on('evaluate', ({ code, infiniteLoopProtection }) => {
  // WebEvaluator takes care of returning the result.
  evaluate(code, { infiniteLoopProtection });
});

Messenger.on('checkLine', command =>
  Messenger.checkLineEnd(
    (() => {
      try {
        /* eslint no-new:0*/
        new Messenger.global.Function(command);
        return false;
      } catch (e) {
        if (/[[{(]$/.test(command)) {
          return 1;
        } else if (/[\]})]$/.test(command)) {
          return -1;
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
        const { stack, message } = spec.failedExpectations[0];

        ret.push({
          name: spec.description,
          message,
          stack,
        });
      }
    }
    return ret;
  }
}

Messenger.on(
  'runSingleUnitTests',
  ({ code, suiteCode, infiniteLoopProtection }) => {
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

    try {
      webEvaluateInContext(code, { context, infiniteLoopProtection });
      webEvaluateInContext(suiteCode, { context, infiniteLoopProtection });
    } catch (e) {
      Messenger.result({ error: e.stack });
      return;
    }

    env.execute();
  },
);
