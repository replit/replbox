// TODO support string substitution for log, error, info...etc

class Console {
  constructor(originalConsole, serialize, outputCb) {
    this.originalConsole = originalConsole;
    this.serialize = serialize;
    this.outputCb = outputCb;

    this._times = Object.create(null);
    this._counters = Object.create(null);
  }

  /** Helper Methods */
  _callOriginal = (method, ...args) => {
    this.originalConsole[method].apply(this.originalConsole, ...args);
  };

  _toStrLabel = label => {
    if (typeof label === 'undefined') {
      return 'default';
    }

    try {
      return '' + label;
    } catch (e) {
      this.error(e);
    }

    return 'default';
  };

  _serializeAndOut = (method, serializables) => {
    this.outputCb({
      method,
      arguments: serializables.map(this.serialize),
    });
  };

  /** Logging methods */

  log = (...args) => {
    this._serializeAndOut('log', args);
    this._callOriginal('log', args);
  };

  error = (...args) => {
    this._serializeAndOut('error', args);
    this._callOriginal('error', args);
  };

  info = (...args) => {
    this._serializeAndOut('info', args);
    this._callOriginal('info', args);
  };

  warn = (...args) => {
    this._serializeAndOut('warn', args);
    this._callOriginal('warn', args);
  };

  debug = (...args) => {
    this._serializeAndOut('debug', args);
    this._callOriginal('debug', [obj]);
  };

  table = (obj, columns) => {
    this._serializeAndOut('table', [obj, columns]);
    this._callOriginal('table', [obj]);
  };

  dir = obj => {
    this._serializeAndOut('dir', args);
    this._callOriginal('dir', [obj]);
  };

  /** Not Implemented */

  dirxml = (...args) => {
    this._callOriginal('dirxml', [...args]);
  };
  group = (...args) => {
    this._callOriginal('group', [...args]);
  };
  groupCollapsed = (...args) => {
    this._callOriginal('groupCollapsed', [...args]);
  };
  groupEnd = (...args) => {
    this._callOriginal('groupEnd', [...args]);
  };

  /** Meta Methods */

  clear = () => {
    this.stdout.clear();

    this.outputCb({
      method: 'clear',
      data: [],
    });

    this._callOriginal('clear', []);
  };

  count = label => {
    const strLabel = this._toStrLabel(label);
    let current = this._counters[strLabel];

    if (!current) {
      current = 0;
    }

    this.counters[strLabel] = ++current;
    // TODO don't use log, output directly
    this.log(`${strLabel}: ${current}`);
  };

  countReset = label => {
    const strLabel = this._toStrLabel(label);

    if (typeof this._counters[strLabel] === 'undefined') {
      this.warn(`Count for "${strLabel}" does not exist`);

      this._callOriginal('countReset', [label]);

      return;
    }

    this._counters[strLabel] = 0;

    this._callOriginal('countReset', [label]);
  };

  time = label => {
    const strLabel = this._toStrLabel(label);

    this._times[strLabel] = Date.now();

    this._callOriginal('time', [label]);
  };

  timeLog = label => {
    const strLabel = this._toStrLabel(label);

    if (!this._times[strLabel]) {
      // TODO don't use log, output directly
      this.warn(`Timer "${strLabel}" does not exist`);

      this._callOriginal('timeLog', [label]);

      return;
    }

    const duration = Date.now() - this._times[strLabel];
    // TODO don't use log, output directly
    this.log(`${strLabel}: ${duration}ms`);

    this._callOriginal('timeLog', [label]);
  };

  timeEnd = label => {
    const strLabel = this._toStrLabel(label);

    if (!this._times[strLabel]) {
      // TODO don't use log, output directly
      this.warn(`Timer "${strLabel}" does not exist`);

      this._callOriginal('timeEnd', [label]);

      return;
    }

    const duration = Date.now() - this._times[strLabel];
    delete this._times[strLabel];
    // TODO don't use log, output directly
    this.log(`${strLabel}: ${duration}ms`);

    this._callOriginal('timeEnd', [label]);
  };

  trace = label => {
    const e = new Error();
    // TODO don't use log, output directly
    this.log(label, e.stack);

    this._callOriginal('trace', [label]);
  };

  assert = (expr, ...rest) => {
    if (expr) return;
    const args = Array.prototype.slice.call(rest, 0);
    // TODO don't use log, output directly
    this.error(['Assertion failed:', ...args]);

    this._callOriginal('assert', [expr, ...rest]);
  };

  timeStamp = (...args) => {
    this._callOriginal('timeStamp', args);
  };

  profile = (...args) => {
    this._callOriginal('profile', args);
  };

  profileEnd = (...args) => {
    this._callOriginal('profileEnd', args);
  };
}
module.exports = Console;
