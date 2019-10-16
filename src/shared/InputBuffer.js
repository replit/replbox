// For language that can't handle their own buffers.
// Languages that have an event-based input system.
class InputBuffer {
  constructor(messenger, { shouldNewLine = true } = {}) {
    this._data = [];
    this._shouldNewLine = shouldNewLine;

    messenger.on('write', d => {
      // Slice off the trailing \n.
      this._data = this._data.concat(d.slice(0, -1).split('\n'));
      this._dispatch();
    });
  }

  _dispatch() {
    if (this._callback && this._data.length) {
      const cb = this._callback;
      this._callback = null;
      // Buffer line delimited so we re-add the \n.
      cb(this._data.shift() + (this._shouldNewLine ? '\n' : ''));
    }
  }

  onInput = cb => {
    if (this._callback) {
      throw new Error(
        'Unexpected input event when there is an existing unprocessed input',
      );
    }

    this._callback = cb;
    this._dispatch();
  };
}

module.exports = InputBuffer;
