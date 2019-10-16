const BFloop = require('../../../vendor/bloop');
const Messenger = require('../../shared/messenger');
const { inspect } = require('util');

Messenger.BFloop = BFloop;
Messenger.global.BFloop = BFloop;
Messenger.BFloop.init(Messenger.output);

Messenger.on('evaluate', ({ code }) => {
  try {
    const compiledCode = Messenger.BFloop.compile(code);
    const result = Messenger.global.eval(compiledCode);
    Messenger.result({ data: inspect(result) });
  } catch (e) {
    Messenger.result({ error: e.message });
  }
});

Messenger.on('checkLine', command =>
  Messenger.checkLineEnd(
    (() => {
      const rOpen = /BLOCK\s+(\d+)\s*:\s*BEGIN/gi;
      const rClose = /BLOCK\s+(\d+)\s*:\s*END/gi;

      const match = function(code) {
        const opens = code.match(rOpen) || [];
        const closes = code.match(rClose) || [];
        return opens.length - closes.length;
      };

      if (match(command) <= 0) {
        return false;
      }

      const count = match(command.split('\n').slice(-1)[0]);

      if (count > 0) {
        return 1;
      }

      return 0;
    })(),
  ),
);

Messenger.ready();
