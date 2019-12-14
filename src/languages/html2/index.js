// @flow

const Messenger = require('../../shared/messenger');
const stackTracer = require('../../shared/stackTracer');
const { inspect } = require('../../shared/util');
const { Hook } = require('console-feed');

let contentWindow;

// TODO: infiniteLoopProtection
Messenger.on('runProject', ({ url }) => {
  buildIframe({ url })
    .then(() => Messenger.result({ error: null }))
    .catch(Messenger.error);
});

Messenger.on('reset', () => {
  const el = document.getElementById('web_target');

  if (document.body && el) {
    document.body.removeChild(el);
  }

  Messenger.resetReady();
});

Messenger.on('refresh', () => {
  const target = document.getElementById('web_target');

  if (target) {
    // $FlowFixMe: how do you cast to iframe?
    target.src += '';
  }
});

Messenger.on('evaluate', ({ code }) => {
  if (!contentWindow) {
    // Delegate to the hook
    contentWindow.console.error(
      stackTracer(e, { isIframe: Messenger.isIframe }),
    );
    Messenger.result({});

    return;
  }

  let result;
  try {
    result = contentWindow.eval(code);
  } catch (e) {
    // Delegate to the hook
    contentWindow.console.error(
      stackTracer(e, { isIframe: Messenger.isIframe }),
    );
    Messenger.result({});

    return;
  }

  Messenger.result({});
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

function buildIframe({ url }) {
  return new Promise(resolve => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('id', 'web_target');
    iframe.style.height = '100%';
    iframe.style.width = '100%';

    iframe.src = url;
    iframe.setAttribute(
      'sandbox',
      'allow-forms allow-pointer-lock allow-popups ' +
        'allow-same-origin allow-scripts allow-modals',
    );
    iframe.setAttribute('frameborder', '0');

    if (!document.body) {
      throw new Error('Unexpected no body');
    }

    document.body.appendChild(iframe);

    contentWindow = iframe.contentWindow;
    Hook(iframe.contentWindow.console, encodedLog => {
      window.parent.stuffEmit('cf-output', encodedLog);
    });

    iframe.contentWindow.onerror = (msg, fileUrl, lineNo, colNo, e) => {
      if (e && e.stack) {
        // If the last line doesn't have line information then this is a syntax error
        // which window.onerror doesn't give us adequate stack traces on.
        const baseUrl = window.location.origin;
        const lastLine = e.stack.split('\n').pop();

        if (!lastLine.match(/^\s*at\s+.*\d+:\d+/) && fileUrl) {
          let l = `    at ${fileUrl}`;

          if (lineNo) l += `:${lineNo}`;
          if (colNo) l += `:${colNo}`;

          e.stack += `\n${l}`;
        }

        // Remove the url so that the stack trace points directly to file.
        e.stack = e.stack.replace(
          new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          '',
        );

        // Delegate to the hook
        iframe.contentWindow.console.error(
          stackTracer(e, {
            isIframe: Messenger.isIframe,
            lineNo,
            colNo,
            fileUrl,
          }),
        );

        return;
      }

      iframe.contentWindow.console.error(msg);
    };

    iframe.addEventListener('load', () => {
      resolve(iframe);
    });
  });
}

Messenger.ready();
