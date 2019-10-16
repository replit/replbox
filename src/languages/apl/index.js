require('script-loader!apl/lib/apl.js');
const Messenger = require('../../shared/messenger');

const { apl } = Messenger.global;
const io = () => {
  throw new Error('I/O is not supported');
};
const ws = apl.ws({ in: io, out: io });

Messenger.on('evaluate', ({ code }) => {
  let result;
  try {
    result = ws(code);
  } catch (e) {
    Messenger.result({ error: e.stack });
    return;
  }

  if (result) {
    result = result.toString();
  }
  Messenger.result({ data: result || '' });
});

Messenger.ready();
