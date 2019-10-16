const { Unlambda } = require('../../../vendor/unlambda');
const Messenger = require('../../shared/messenger');
const InputBuffer = require('../../shared/InputBuffer');

const inputBuffer = new InputBuffer(Messenger);

Messenger.on('evaluate', ({ code }) => {
  let parsed;
  try {
    parsed = Unlambda.parse(code);
  } catch (e) {
    Messenger.result({ error: e.message });
    return;
  }

  Unlambda.eval(
    parsed,
    data => Messenger.result({ data }),
    inputBuffer.onInput,
    Messenger.output,
    error => Messenger.result({ error }),
  );
});

Messenger.on('checkLine', command => {
  if (/`$/.test(command)) {
    return Messenger.checkLineEnd(0);
  }

  try {
    Unlambda.parse(command);
    Messenger.checkLineEnd(false);
  } catch (e) {
    Messenger.checkLineEnd(0);
  }

  // ¯\_(ツ)_/¯
  return undefined;
});

Messenger.ready();
