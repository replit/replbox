const Messenger = require('../../shared/messenger');
const InputBuffer = require('../../shared/InputBuffer');
require('script-loader!../../../vendor/bfjs');

const { BF } = window;

function result(data, index) {
  const epi = '...';
  // copy
  const cells = data.map(x => x);
  cells.length = cells.length < index ? index + 1 : cells.length;

  for (let i = 0; i < cells.length; ++i) {
    if (!cells[i]) {
      cells[i] = 0;
    }
  }

  let lower;
  if (index < 10) {
    lower = 0;
  } else {
    lower = index - 10;
    cells[lower] = epi + cells[lower];
  }

  if (!cells[index]) {
    cells[index] = 0;
  }

  const before = cells.slice(lower, index);
  if (cells[index + 10] != null) {
    cells[index + 10] += epi;
  }
  const after = cells.slice(index + 1, +(index + 10) + 1 || 9e9);

  return Messenger.result({
    data: before
      .concat([`[${cells[index]}]`])
      .concat(after)
      .join(' '),
  });
}

const inputBuffer = new InputBuffer(Messenger);

const BFI = new BF.Interpreter(inputBuffer.onInput, Messenger.output, result);

Messenger.on('evaluate', ({ code }) => {
  try {
    BFI.evaluate(code);
  } catch (e) {
    Messenger.result({ error: e.message });
  }
});

Messenger.on('checkLine', command =>
  Messenger.checkLineEnd(
    (() => {
      const countParens = function(str) {
        let j;
        let len;
        let parens;
        let token;

        const tokens = str.split('');
        parens = 0;
        for (j = 0, len = tokens.length; j < len; j++) {
          token = tokens[j];
          switch (token) {
            case '[':
              ++parens;
              break;
            case ']':
              --parens;
          }
        }
        return parens;
      };

      if (countParens(command) <= 0) {
        return false;
      }

      const lastLineParens = countParens(command.split('\n').slice(-1)[0]);

      if (lastLineParens > 0) {
        return 1;
      } else if (lastLineParens < 0) {
        return lastLineParens;
      }

      return 0;
    })(),
  ),
);

Messenger.ready();
