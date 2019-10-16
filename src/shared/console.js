const { inspect, format } = require('./util');

function _console(method, args) {
  if (typeof console !== 'undefined') {
    // eslint-disable-next-line
    console[method].apply(console, args);
  }
}

class Console {
  constructor(stdout) {
    this.stdout = stdout;
    this._times = Object.create(null);
  }

  log = (...args) => {
    this.stdout(`${format(...args)}\n`);
    _console('log', args);
  };

  error = (...args) => {
    this.log(...args);
    _console('error', args);
  };

  info = (...args) => {
    this.log(...args);
    _console('info', args);
  };

  warn = (...args) => {
    this.log(...args);
    _console('warn', args);
  };

  dir = obj => {
    this.stdout(`${inspect(obj)}\n`);
    _console('dir', [obj]);
  };

  time = label => {
    this._times[label] = Date.now();
    _console('time', [label]);
  };

  timeEnd = label => {
    const duration = Date.now() - this._times[label];
    this.log('%s: %dms', label, duration);
    _console('timeEnd', [label]);
  };

  trace = label => {
    const e = new Error();
    this.log(`${label}:${e.stack}`);
    _console('trace', [label]);
  };

  assert = (expr, ...rest) => {
    if (expr) return;
    const args = Array.prototype.slice.call(rest, 0);
    this.error(['Assertion failed:'].concat(args));
    _console('assert', [expr].concat(rest));
  };

  clear = () => {
    this.stdout.clear();
    _console('clear', []);
  };
}

module.exports = Console;
