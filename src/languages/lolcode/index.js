const LOLCode = require('../../../vendor/lolcode');
const Messenger = require('../../shared/messenger');
const InputBuffer = require('../../shared/InputBuffer');

const inputBuffer = new InputBuffer(Messenger, { shouldNewLine: false });
const context = new LOLCode.CodeGenContext();
const machine = new LOLCode.Machine(
  context,
  () => inputBuffer.onInput(machine.resume.bind(machine)),
  output,
  error,
  result,
  true,
);

let lastIt = null;

function output(text) {
  Messenger.output(text);
  return machine.resume();
}

function error(e) {
  Messenger.result({ error: e.message });
  machine.reset();
  machine.halted = true;
  machine.instruction_ptr = machine.instructions.length;
}

function result() {
  const it = machine.frames[0].variables.IT;
  if (it === lastIt) {
    return Messenger.result('');
  }

  lastIt = it;
  return Messenger.result(it.value === null ? '' : String(it.value));
}

Messenger.on('evaluate', ({ code }) => {
  try {
    const tokenized = new LOLCode.Tokenizer(code).tokenize();
    const parsed = new LOLCode.Parser(tokenized).parseProgram();
    parsed.codegen(context);
  } catch (e) {
    Messenger.result({ error: e.message });
    return;
  }

  machine.run();
});

Messenger.on('checkLine', command =>
  Messenger.checkLineEnd(
    (() => {
      let countBlocks;
      let currentLine;
      let i;
      let len;
      let lines;
      let token;
      let tokenized;

      if (/\.\.\.\s*$/.test(command)) {
        return 0;
      }
      try {
        tokenized = new LOLCode.Tokenizer(command).tokenize();
      } catch (_error) {
        return false;
      }
      try {
        new LOLCode.Parser(tokenized.slice(0)).parseProgram();
        return false;
      } catch (_error) {
        lines = [];
        currentLine = [];
        for (i = 0, len = tokenized.length; i < len; i++) {
          token = tokenized[i];
          if (token.type === 'endline') {
            lines.push(currentLine);
            currentLine = [];
          } else {
            currentLine.push(token);
          }
        }
        countBlocks = function(lines2, partial) {
          let j;
          let len1;
          let line;
          if (partial == null) {
            partial = false;
          }

          const openBlocks = [];

          for (j = 0, len1 = lines2.length; j < len1; j++) {
            line = lines2[j];

            // ???
            // openBlocks[openBlocks.length - 1];

            switch (line[0].text) {
              case 'HAI':
                openBlocks.push('KTHXBYE');
                break;
              case 'HOW DUZ I':
                openBlocks.push('IF U SAY SO');
                break;
              case 'IM IN YR':
                openBlocks.push('IM OUTTA YR');
                break;
              case 'O RLY?':
              case 'WTF?':
                openBlocks.push('OIC');
                break;
              case 'YA RLY':
              case 'NO WAI':
              case 'MEBBE':
                if (partial && openBlocks.length === 0) {
                  openBlocks.push('OIC');
                } else if (openBlocks[openBlocks.length - 1] !== 'OIC') {
                  return -1;
                }
                break;
              case 'KTHXBYE':
              case 'IF U SAY SO':
              case 'IM OUTTA YR':
              case 'OIC':
                if (openBlocks[openBlocks.length - 1] === line[0].text) {
                  openBlocks.pop();
                } else {
                  return -1;
                }
            }
          }
          return openBlocks.length;
        };
        if (countBlocks(lines) <= 0) {
          return false;
        } else if (countBlocks([lines.slice(-1)[0]], true) > 0) {
          return 1;
        }
        return 0;
      }
    })(),
  ),
);

Messenger.ready();
