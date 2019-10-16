// Warning: this is shared with the Embed app. Don't pull in too
// many dependencies.

const Promise = require('bluebird');
const { EventEmitter } = require('events');
const Languages = require('@replit/languages');
const fetch = require('isomorphic-fetch');
const { track } = require('@replit/tracking/client');

const stuff = require('stuff.js');

// Use a domain that is not the current domain so that x-domain rules
// apply. Only time we don't use the default origin is in HTML laguage (repl.co)
const defaultOrigin =
  process.env.NODE_ENV !== 'production' || process.env.STAGING === 'true'
    ? '/public/secure/'
    : 'https://replbox.repl.it/public/secure/';

const createStuff = (el, origin) =>
  new Promise(resolve => {
    stuff(origin, { el }, context => {
      resolve(context);
    });
  });

// TODO timeoutcallback
class ReplBox extends EventEmitter {
  constructor(language, { useIframe, timeoutCallback, iframeParent } = {}) {
    super();
    this._language = language;
    this._useIframe = !!useIframe;
    this._iframeParent = iframeParent;
    this._timeoutCallback = timeoutCallback;
    this._loadLibraryPromises = {};
  }

  load(stuffOrigin = defaultOrigin) {
    return fetchLangSrc(this._language).then(
      langSrc =>
        new Promise((resolve, reject) => {
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

            createStuff(this._el, stuffOrigin)
              .then(context => {
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
                context.on('track', ({ eventName, props }) =>
                  track(eventName, props),
                );
                context.on('error', msg => this._reject(new Error(msg)));
                context.on('input', () => this.emit('input'));
                context.on('clearConsole', () => this.emit('clearConsole'));

                context.load(`<script src=${langSrc}></script>`);
              })
              .done();
          } else {
            this._worker = new Worker(langSrc);
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
                  track(message.data.eventName, message.data.props);
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
        }),
    );
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

  reset() {
    if (Languages.get(this._language).category === 'Web') {
      return this._resetWeb();
    }

    this.destroy();
    return this.load();
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

const langSrcs = Object.create(null);
function fetchLangSrc(lang) {
  if (langSrcs[lang]) {
    return Promise.resolve(langSrcs[lang]);
  }

  return fetch(`/data/replbox_src/${lang}`)
    .then(r => r.text())
    .then(src => {
      const source = `${window.location.origin}/public/${src}`;
      langSrcs[lang] = source;
      return source;
    });
}

module.exports = ReplBox;
