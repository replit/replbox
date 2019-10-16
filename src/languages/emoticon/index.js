const Messenger = require('../../shared/messenger');
const InputBuffer = require('../../shared/InputBuffer');
require('script-loader!../../../vendor/emoticon');

const { Emoticon } = Messenger.global;

function result(env) {
  let resultEnv = '';
  for (const listName in env) {
    const list = env[listName];
    let listStr = list.toString();
    let len = listStr.length - 74;
    len = len > 0 ? len : 0;
    listStr = listStr.slice(len);
    if (len > 0) {
      listStr = `...${listStr}`;
    }
    resultEnv += `\n${listName}: ${listStr}`;
  }
  Messenger.result({ data: resultEnv });
}

const inputBuffer = new InputBuffer(Messenger);
const interpreter = new Emoticon.Interpreter({
  source: [],
  input: inputBuffer.onInput,
  print: Messenger.output,
  result,
});

Messenger.on('evaluate', ({ code }) => {
  try {
    const parsed = new Emoticon.Parser(code);
    interpreter.lists.Z = interpreter.lists.Z.concat(parsed);
    interpreter.run();
  } catch (e) {
    Messenger.result({ error: e.message });
  }
});

function countParens(str) {
  const tokens = new Emoticon.Parser(str);
  let parens = 0;

  for (const token of tokens) {
    if (token.mouth) {
      if (token.mouth === '(') {
        parens++;
      } else if (token.mouth === ')') {
        parens--;
      }
    }
  }

  return parens;
}

Messenger.on('checkLine', code => {
  const ret = r => Messenger.checkLineEnd(r);

  if (countParens(code) <= 0) {
    return ret(false);
  }
  const lastLinesParens = countParens(code.split('\n').pop());
  if (lastLinesParens > 0) {
    return ret(1);
  } else if (lastLinesParens > 0) {
    return ret(lastLinesParens);
  }

  return ret(0);
});

Messenger.ready();
