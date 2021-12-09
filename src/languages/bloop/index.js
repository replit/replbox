const BFloop = require('../../../vendor/bloop');
const interp = require('../../interp');

BFloop.init(interp.stdout);

function evaluate(code) {
  try {
    const compiledCode = BFloop.compile(code);
    const result = eval(compiledCode);
    interp.result(result)
  } catch (e) {
    interp.stderr(e.message)
  }
};

function checkLine(command) {
  console.log("Checkline ", command)
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
}

module.exports = {
  evaluate,
  checkLine,
}
