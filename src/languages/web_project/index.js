const Messenger = require('../../shared/messenger');
const Console = require('../../shared/console');
const fetchModules = require('../../shared/fetchModules');
const path = require('path');
const stackTracer = require('../../shared/stackTracer');
const { fetch } = require('whatwg-fetch');
const { inspect } = require('util');
const Jasmine = require('jasmine-core/lib/jasmine-core/jasmine.js');
const jasmineDomMatchersCode = require('raw-loader!jasmine_dom_matchers/matchers');

let contentWindow;

// TODO: infiniteLoopProtection
Messenger.on('runProject', ({ files, replId }) => {
  (replId ? uploadWebProject({ files, replId }) : uploadLegacyWebProject(files))
    .then(url => buildIframe({ url }))
    .then(() => Messenger.result({ error: null }))
    .catch(Messenger.error);
});

Messenger.on('reset', () => {
  const el = document.getElementById('web_target');
  if (el) {
    document.body.removeChild(el);
  }

  Messenger.resetReady();
});

Messenger.on('refresh', () => {
  document.getElementById('web_target').src += '';
});

Messenger.on('evaluate', ({ code }) => {
  if (!contentWindow) {
    Messenger.result({
      error: 'Please run your project before using the console.',
    });
    return;
  }

  let result;
  try {
    result = contentWindow.eval(code);
  } catch (e) {
    Messenger.result({
      error: stackTracer(e, { isIframe: Messenger.isIframe }),
    });

    return;
  }

  Messenger.result({ data: inspect(result) });
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
  suiteDone() {}
  error() {}

  specDone(result) {
    this._specs.push(result);
  }

  jasmineDone() {
    this._onDone(this);
  }

  passed() {
    for (let i = 0; i < this._specs.length; i++) {
      const spec = this._specs[i];
      if (spec.status !== 'passed') {
        return false;
      }
    }
    return true;
  }

  failures() {
    const ret = [];
    for (let i = 0; i < this._specs.length; i++) {
      const spec = this._specs[i];
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

Messenger.on('runUnitTests', ({ files, suiteCode }) => {
  uploadLegacyWebProject(files)
    .then(url => buildIframe({ url, hidden: true }))
    .then(iframe => {
      const jasmine = Jasmine.core(Jasmine);
      const env = jasmine.getEnv();

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

      const jasmineInterface = Jasmine.interface(jasmine, env);

      const global = iframe.contentWindow;
      Object.keys(jasmineInterface).forEach(key => {
        global[key] = jasmineInterface[key];
      });

      // We need to eval the matchers in the realm of the inner iframe
      // so that document and window will be bound correctly.
      const matchers = global.eval(
        `
      (function(module) {
        ${jasmineDomMatchersCode}

        return module.exports;
      }).call(null, { exports: {} });
    `,
      );

      jasmineInterface.beforeEach(() => {
        jasmineInterface.jasmine.addMatchers(matchers);
      });

      try {
        global.eval(suiteCode);
      } catch (e) {
        Messenger.result({ error: e.stack });
        return;
      }

      env.execute();
    })
    .catch(Messenger.error);
});

function buildIframe({ url, hidden }) {
  return new Promise(resolve => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('id', 'web_target');
    iframe.style.height = '100%';
    iframe.style.width = '100%';

    if (hidden) {
      iframe.style.display = 'none';
    }

    iframe.src = url;
    iframe.setAttribute(
      'sandbox',
      'allow-forms allow-pointer-lock allow-popups ' +
        'allow-same-origin allow-scripts allow-modals',
    );
    iframe.setAttribute('frameborder', '0');

    document.body.appendChild(iframe);

    contentWindow = iframe.contentWindow;
    iframe.contentWindow.console = new Console(Messenger.output);

    iframe.contentWindow.onerror = (msg, urlError, lineNo, colNo, e) => {
      if (e && e.stack) {
        return Messenger.stderr(
          stackTracer(e, { isIframe: Messenger.isIframe }),
        );
      }

      return Messenger.stderr(msg);
    };

    iframe.addEventListener('load', () => {
      resolve(iframe);
    });
  });
}

// Use a regexp for requires because the alternative is loading Babel
// and that's a bit too much.
// TODO(amasad): move this to the server, which will be done on the fly with no
// additional cost to bundle size. Also unlocks the ability to do transformations
// like the jsLoopBreaker on our web project JS.
const requireRe = /\brequire\s*?\(\s*?(['"])([^"']+)\1\s*?\)/g;

function uploadWebProject({ files, replId }) {
  const jsRequires = [];
  let indexHtml;

  files.forEach(file => {
    if (file.name === 'index.html') {
      indexHtml = file;
      return;
    }

    const ext = path.extname(file.name);

    // Extract requires
    if (ext === '.js') {
      // Reset regexp state just to be safe.
      requireRe.lastIndex = 0;
      let m;
      do {
        m = requireRe.exec(file.content);
        // matches = [full, "|', module]
        if (m && m[2]) {
          jsRequires.push(m[2]);
        }
      } while (m);
    }
  });

  let html;
  if (indexHtml && jsRequires.length) {
    html = indexHtml.content;

    jsRequires.reverse().forEach(require => {
      const script = `<script src="https://wzrd.repl.it/bundle/${require}"></script>`;

      // Add it before the first <script> tag to setup dependencies.
      let i = html.indexOf('<script');
      // No script tag, just add it before the end of body.
      if (i === -1) i = html.indexOf('</body>');

      if (i === -1) {
        // No script tag just add it to the end
        html += script;
      } else {
        // Splice it in
        html = html.slice(0, i) + script + html.slice(i);
      }
    });

    indexHtml.content = html;
  }

  const body = { replId };

  if (html) {
    body.indexHtml = html;
  }

  return fetch('/data/web_project/host_repl', {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },

    body: JSON.stringify(body),
    method: 'POST',
  })
    .then(r => {
      if (r.status !== 200) {
        throw new Error(`Error ${r.status}: ${r.statusText}`);
      }

      return r.json();
    })
    .then(({ url }) => url);
}

function uploadLegacyWebProject(files) {
  const filesByName = Object.create(null);
  const jsRequires = [];
  let firstHtml;
  files.forEach(file => {
    const ext = path.extname(file.name);

    // Extract requires
    if (ext === '.js') {
      // Reset regexp state just to be safe.
      requireRe.lastIndex = 0;
      let m;
      do {
        m = requireRe.exec(file.content);
        // matches = [full, "|', module]
        if (m && m[2]) {
          jsRequires.push(m[2]);
        }
      } while (m);
    }

    if (!firstHtml && ext === '.html') {
      firstHtml = file.content;
    }

    filesByName[file.name] = file.content;
  });

  // Legacy compat: we used to include all the JS and CSS files
  // into index.html. We now don't have to do that since we're trying
  // to make this an honest implementation (loading from the server)
  // we're going to include index.js and index.css (if they're not
  // included) which will support most of the existing cases.
  if (!filesByName['index.html']) {
    filesByName['index.html'] = firstHtml;
  }

  let indexHtml = filesByName['index.html'];
  const indexCss = filesByName['index.css'];
  const indexJs = filesByName['index.js'];
  if (indexHtml) {
    if (indexCss && indexHtml.indexOf('index.css') === -1) {
      const style = `<style>${indexCss}</style>`;
      const i = indexHtml.indexOf('</head>');
      if (i !== -1) {
        indexHtml = indexHtml.slice(0, i) + style + indexHtml.slice(i);
      } else {
        indexHtml += style;
      }
    }

    if (indexJs && indexHtml.indexOf('index.js') === -1) {
      const script = `<script>${indexJs}</script>`;
      const i = indexHtml.indexOf('</body>');
      if (i !== -1) {
        indexHtml = indexHtml.slice(0, i) + script + indexHtml.slice(i);
      } else {
        indexHtml += script;
      }
    }
    filesByName['index.html'] = indexHtml;
  }

  if (jsRequires.length) {
    Messenger.track('Modules Fetched', {
      language: 'web_project',
    });
  }

  const fetchingModules = !jsRequires.length
    ? Promise.resolve()
    : fetchModules(jsRequires).then(bundle => {
        const script = `<script>${bundle}</script>`;
        let html = filesByName['index.html'];

        // Add it before the first <script> tag to setup dependencies.
        let i = html.indexOf('<script');
        // No script tag, just add it before the end of body.
        if (i === -1) i = html.indexOf('</body>');

        if (i === -1) {
          // No script tag just add it to the end
          html += script;
        } else {
          // Splice it in
          html = html.slice(0, i) + script + html.slice(i);
        }

        filesByName['index.html'] = html;
      });

  return fetchingModules.then(() =>
    fetch('/data/web_project/upload', {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(filesByName),
      method: 'POST',
    })
      .then(r => {
        if (r.status === 409) {
          throw new Error('Code has changed, please run again');
        }

        if (r.status !== 200) {
          throw new Error(`Error ${r.status}: ${r.statusText}`);
        }

        return r.json();
      })
      .then(({ id }) => `/data/web_project/${id}/index.html`),
  );
}

Messenger.ready();
