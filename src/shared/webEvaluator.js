const Context = require('context-eval');
const Messenger = require('./messenger');
const Console = require('./console');
const webEvaluateInContext = require('./webEvaluateInContext');
const fetchModules = require('./fetchModules');

if (!Messenger.isIframe) {
  throw new Error('Workers are not supported in web');
}

const customConsole = new Console(Messenger.output);

let firstLoad = true;
let context;

Messenger.on('reset', init);

function init() {
  if (context) {
    firstLoad = false;
    context.destroy();
  }

  context = new Context({
    console: customConsole,
    // for babel.
    /* global regeneratorRuntime: false*/
    regeneratorRuntime:
      typeof regeneratorRuntime !== 'undefined'
        ? regeneratorRuntime
        : undefined,
  });
  context.getGlobal().document.write = customConsole.log;

  if (firstLoad) {
    Messenger.ready();
  } else {
    Messenger.resetReady();
  }
}

window.onload = init;

function evaluate(code, { infiniteLoopProtection }) {
  webEvaluateInContext(code, { infiniteLoopProtection, context }).then(
    res => Messenger.result(res),
    err => Messenger.reportError(err),
  );
}

Messenger.on('loadLibrary', name => {
  fetchModules([name]).then(
    () => {
      Messenger.loadedLibrary(name);
    },
    e => {
      Messenger.loadFailedLibrary(name, e.message);
    },
  );
});

Messenger.on('overridePrompt', () => {
  const buf = [];

  Messenger.on('write', str => {
    buf.push(str);
  });

  context.getGlobal().prompt = () => buf.shift();

  context.getGlobal().alert = str => {
    customConsole.log(str);
  };
});

module.exports = () => evaluate;
