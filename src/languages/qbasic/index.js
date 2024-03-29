const QBasic = require('../../../vendor/qb');
const interp = require('../../interp');

const virtual_machine = new QBasic.VirtualMachine({
  print: interp.stdout,
  // remove the ending \n
  input: interp.stdin,
  error: interp.stderr,
});

const header = `QBasic (qb.js)
Copyright (c) 2010 Steve Hanov`;

function evaluate(code, callback) {
  return virtual_machine.run(code, () => {
    if (virtual_machine.stack.length) {
      return callback(null, virtual_machine.stack.pop().toString());
    }
    return callback(null, undefined);
  });
}

function checkLine(command) {
  let i;

  QBasic.Program.prototype.createParser();

  const parser = QBasic.Program.parser;
  if (parser.parse(`${command}\n`) === !null) {
    return false;
  }

  const tokenizer = parser.tokenizer;

  const lines = (function() {
    let j;
    let len;

    const ref = command.split('\n');

    const results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      i = ref[j];
      results.push(`${i}\n`);
    }
    return results;
  })();

  const countBlocks = function(lines2, partial) {
    let firstToken;
    let j;
    let len;
    let line;
    let secondToken;
    let token;
    let topBlock;

    if (partial == null) {
      partial = false;
    }

    const openBlocks = [];

    for (j = 0, len = lines2.length; j < len; j++) {
      line = lines2[j];
      if (parser.parse(line)) {
        continue;
      }
      tokenizer.setText(line);
      token = tokenizer.nextToken(0, 0);
      if (!token) {
        continue;
      }
      firstToken = token.text;
      token = tokenizer.nextToken(0, token.locus.position + token.text.length);
      if (!token) {
        continue;
      }
      secondToken = token.text;
      topBlock = openBlocks[openBlocks.length - 1];
      switch (firstToken) {
        case 'SUB':
        case 'FUNCTION':
        case 'FOR':
        case 'IF':
        case 'SELECT':
        case 'WHILE':
          openBlocks.push(firstToken);
          break;
        case 'DO':
          openBlocks.push(secondToken === 'WHILE' ? 'DOWHILE' : 'DO');
          break;
        case 'ELSE':
          if (partial && openBlocks.length === 0) {
            openBlocks.push('IF');
          } else if (topBlock !== 'IF') {
            return -1;
          }
          break;
        case 'WEND':
          if (topBlock === 'WHILE') {
            openBlocks.pop();
          } else {
            return -1;
          }
          break;
        // this should never be reached because of the previous 'FOR' case
        // case 'FOR':
        //   if (topBlock === 'NEXT') {
        //     openBlocks.pop();
        //   } else {
        //     return -1;
        //   }
        //   break;
        case 'LOOP':
          if (secondToken === 'WHILE' || secondToken === 'UNTIL') {
            if (topBlock === 'DO') {
              openBlocks.pop();
            } else {
              return -1;
            }
          } else if (topBlock === 'DOWHILE') {
            openBlocks.pop();
          } else {
            return -1;
          }
          break;
        case 'END':
          if (topBlock === secondToken) {
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

module.exports = {
  header,
  evaluate,
  checkLine,
};
