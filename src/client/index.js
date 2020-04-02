// Warning: this is shared with the Embed app. Don't pull in too
// many dependencies.

const { EventEmitter } = require('events');
// const Languages = require('@replit/languages');
// const { track } = require('@replit/tracking/client');

const stuff = require('stuff.js');

const createStuff = (el, origin) =>
  new Promise(resolve => {
    stuff(origin, { el }, context => {
      resolve(context);
    });
  });

// Languages that implement their own reset function.
const selfReset = [
  'html',
  'web_project',
  'coffeescript',
  'javascript',
  'babel',
  'roy',
];

const hasStop = ['basic', 'python_turtle'];

class Replbox extends EventEmitter {
  constructor(
    language,
    { useIframe, timeoutCallback, iframeParent, track } = {},
  ) {
    super();
    this._language = language;
    this._useIframe = !!useIframe;
    this._iframeParent = iframeParent;
    this._timeoutCallback = timeoutCallback;
    this._loadLibraryPromises = {};
    this._track = track;
  }

  load({ iframeOrigin, languageBundleSrc }) {
    // For replbox.reset
    this._lastLoadArgs = { iframeOrigin, languageBundleSrc };

    return new Promise((resolve, reject) => {
      if (this._useIframe) {
        this._el = document.createElement('div');
        if (!this._iframeParent) {
          // We don't care to display the iframe.
          this._el.style.display = 'none';
          document.body.appendChild(this._el);
        } else {
          // Adapt to parent width and height.
          this._el.style.height = '100%';
          this._el.style.width = '100%';
          this._iframeParent.appendChild(this._el);
        }

        createStuff(this._el, iframeOrigin).then(context => {
          this._stuffContext = context;
          context.on('result', data => {
            this._resolve(data);
          });
          context.on('ready', () => resolve());
          context.on('warn', msg => this.emit('warn', msg));
          context.on('checkLine', msg => this.checkLineCb(msg));
          context.on('output', msg => this._stdout(msg));
          context.on('stderr', msg => this._stderr(msg));
          context.on('resetReady', () => this._resetReady());
          context.on('loadedLibrary', name =>
            this._loadLibraryPromises[name].resolve(),
          );
          context.on('loadFailedLibrary', (name, msg) =>
            this._loadLibraryPromises[name].reject(msg),
          );
          context.on('track', ({ eventName, props }) => {
            if (this._track) {
              this._track(eventName, props);
            }
          });
          context.on('error', msg => this._reject(new Error(msg)));
          context.on('input', () => this.emit('input'));
          context.on('clearConsole', () => this.emit('clearConsole'));

          context.load(`<script src=${languageBundleSrc}></script>`);
        });
      } else {
        this._worker = new Worker(languageBundleSrc);
        this._worker.onerror = e => reject(e.data || 'unknown error');
        this._worker.onmessage = e => {
          const message = e.data;
          switch (message.type) {
            case 'result':
              this._resolve({
                data: message.data,
                error: message.error,
              });
              break;
            case 'error':
              this._reject(new Error(message.data));
              break;
            case 'output':
              this._stdout(message.data);
              break;
            case 'stderr':
              this._stderr(message.data);
              break;
            case 'ready':
              resolve();
              break;
            case 'warn':
              this.emit('warn', message.data);
              break;
            case 'checkLine':
              this.checkLineCb(message.data);
              break;
            case 'resetReady':
              this._resetReady();
              break;
            case 'track':
              if (this._track) {
                this._track(message.data.eventName, message.data.props);
              }
              break;
            case 'input':
              this.emit('input');
              break;
            case 'clearConsole':
              this.emit('clearConsole');
              break;
            default:
              throw new Error(`Unkown message type: ${message.type}`);
          }
        };
      }
    });
  }

  runProject(files, { stdout, stderr, infiniteLoopProtection, replId, url }) {
    this._stdout = stdout || function() {};
    this._stderr = stderr || function() {};

    return new Promise((resolve, reject) => {
      this._stuffContext.emit('runProject', {
        files,
        infiniteLoopProtection,
        replId,
        url,
      });
      this._resolve = data => {
        resolve(data);
      };
      this._reject = reject;
    });
  }

  evaluate(code, { stdout, stderr, infiniteLoopProtection }) {
    return new Promise((resolve, reject) => {
      this._stdout = stdout || function() {};
      this._stderr = stderr || function() {};
      this._reject = reject;

      if (this._useIframe) {
        this._stuffContext.emit('evaluate', {
          code,
          infiniteLoopProtection,
        });
        this._resolve = data => {
          resolve(data);
        };
      } else {
        this._worker.postMessage({
          type: 'evaluate',
          data: code,
        });
        this._resolve = data => {
          resolve(data);
        };
      }
    });
  }

  destroy() {
    if (this._useIframe) {
      if (!this._el) {
        return;
      }

      if (!this._el.parentNode) {
        this._el = null;
        return;
      }

      this._el.parentNode.removeChild(this._el);
      this._el = null;
    } else {
      this._worker.terminate();
    }
  }

  write(str) {
    if (this._useIframe) {
      this._stuffContext.emit('write', str);
    } else {
      this._worker.postMessage({
        type: 'write',
        data: str,
      });
    }
  }

  _resetWeb() {
    return new Promise(resolve => {
      if (!this._useIframe) {
        throw new Error('Not supported in worker mode');
      }

      // If the context hasn't loaded or it was unloaded (say via a page transition)
      // then we just resolve() since there is nothing to reset.
      if (
        !(
          this._stuffContext &&
          this._stuffContext.iframe &&
          this._stuffContext.iframe.contentWindow
        )
      ) {
        resolve();
        return;
      }

      this._resetReady = () => {
        this._resetReady = null;
        resolve();
      };
      this._stuffContext.emit('reset');
    });
  }

  stop() {
    if (hasStop.includes(this._language)) {
      this._stuffContext.emit('stop');
    } else {
      this.reset();
    }
  }

  reset() {
    if (selfReset.includes(this._language)) {
      return this._resetWeb();
    }

    this.destroy();
    return this.load(this._lastLoadArgs);
  }

  checkLineEnd(command, callback) {
    this.checkLineCb = callback;
    if (this._useIframe) {
      this._stuffContext.emit('checkLine', command);
    } else {
      this._worker.postMessage({
        type: 'checkLine',
        data: command,
      });
    }
  }

  runSingleUnitTests({ code, suiteCode, infiniteLoopProtection }) {
    return new Promise((resolve, reject) => {
      this._stdout = console.log.bind(console); // eslint-disable-line
      this._stderr = console.error.bind(console); // eslint-disable-line
      this._resolve = resolve;
      this._reject = reject;

      if (this._useIframe) {
        this._stuffContext.emit('runSingleUnitTests', {
          code,
          suiteCode,
          infiniteLoopProtection,
        });
      } else {
        this._worker.postMessage({
          type: 'runSingleUnitTests',
          data: { code, suiteCode, infiniteLoopProtection },
        });
      }
    });
  }

  runUnitTests({ suiteCode, files, infiniteLoopProtection }) {
    return new Promise((resolve, reject) => {
      this._stdout = console.log.bind(console); // eslint-disable-line
      this._stderr = console.error.bind(console); // eslint-disable-line
      this._resolve = resolve;
      this._reject = reject;
      this._stuffContext.emit('runUnitTests', {
        files,
        suiteCode,
        infiniteLoopProtection,
      });
    });
  }

  // very specific call to override window.prompt to talk to the 'write' message
  // as opposed to a UI prompt.
  overridePrompt() {
    if (this._useIframe) {
      this._stuffContext.emit('overridePrompt');
      return true;
    }
    return false;
  }

  loadLibrary(name) {
    return new Promise((resolve, reject) => {
      if (this._useIframe) {
        this._stuffContext.emit('loadLibrary', name);
        this._loadLibraryPromises[name] = { resolve, reject };
      }
    });
  }

  refreshWebProject() {
    if (this._language !== 'web_project' && this._language !== 'html') {
      throw new Error('Only web_project accepts refresh message');
    }

    this._stuffContext.emit('refresh');
  }
}

module.exports = Replbox;
