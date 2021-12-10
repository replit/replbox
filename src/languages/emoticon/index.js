const Emoticon = require('../../../vendor/emoticon');
const interp = require('../../interp');

const header = `Emoticon v1.5 (emoticoffee)
Copyright (c) 2011 Amjad Masad`

const interpreter = new Emoticon.Interpreter({
  source: [],
  input: interp.stdin,
  print: interp.stdout,
});

function evaluate(code, callback) {
  interpreter.result = (env) => {
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
    callback(null, resultEnv);
  }

  try {
    const parsed = new Emoticon.Parser(code);
    interpreter.lists.Z = interpreter.lists.Z.concat(parsed);
    interpreter.run();
  } catch (e) {
    callback(e.message, null)
  }
}

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

function checkLine(code) {
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
}

module.exports = {
  header,
  evaluate,
  checkLine,
};
