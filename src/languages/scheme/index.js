require('script-loader!biwascheme/src/version.js');

// This is a dependency of the biwascheme but we install them as a direct
// dependency for reliability and convenience.
require('script-loader!underscore');
require('script-loader!underscore.string');

require('script-loader!biwascheme/src/header.js');
require('script-loader!biwascheme/src/system/class.js');
require('script-loader!biwascheme/src/system/_writer.js');
require('script-loader!biwascheme/src/system/_types.js');
require('script-loader!biwascheme/src/system/error.js');
require('script-loader!biwascheme/src/system/set.js');
require('script-loader!biwascheme/src/system/values.js');
require('script-loader!biwascheme/src/system/pair.js');
require('script-loader!biwascheme/src/system/symbol.js');
require('script-loader!biwascheme/src/system/char.js');
require('script-loader!biwascheme/src/system/number.js');
require('script-loader!biwascheme/src/system/port.js');
require('script-loader!biwascheme/src/system/record.js');
require('script-loader!biwascheme/src/system/enumeration.js');
require('script-loader!biwascheme/src/system/hashtable.js');
require('script-loader!biwascheme/src/system/syntax.js');
require('script-loader!biwascheme/src/system/parser.js');
require('script-loader!biwascheme/src/system/compiler.js');
require('script-loader!biwascheme/src/system/pause.js');
require('script-loader!biwascheme/src/system/call.js');
require('script-loader!biwascheme/src/system/interpreter.js');
require('script-loader!biwascheme/src/library/infra.js');
require('script-loader!biwascheme/src/library/r6rs_lib.js');
require('script-loader!biwascheme/src/library/js_interface.js');
require('script-loader!biwascheme/src/library/webscheme_lib.js');
require('script-loader!biwascheme/src/library/extra_lib.js');
require('script-loader!biwascheme/src/library/node_functions.js');
require('script-loader!biwascheme/src/library/srfi.js');
require('script-loader!biwascheme/src/platforms/browser/dumper.js');
require('script-loader!biwascheme/src/platforms/browser/console.js');
const Messenger = require('../../shared/messenger');
const InputBuffer = require('../../shared/InputBuffer');

const inputBuffer = new InputBuffer(Messenger);
const { BiwaScheme } = Messenger.global;
const Port = BiwaScheme.Port;

Port.current_input = new Port.CustomInput(inputBuffer.onInput);
Port.current_output = new Port.CustomOutput(Messenger.output);
Port.current_error = Port.current_output;
const interpreter = new BiwaScheme.Interpreter(error =>
  Messenger.result({ error: error.message }),
);

Messenger.on('evaluate', ({ code }) => {
  try {
    interpreter.evaluate(code, newState => {
      // When the result is JS undefined then this eval was an error and the
      // error callback has been already called.
      // Scheme seems to return a result even on error.
      if (newState !== undefined) {
        let result = '';

        if (newState !== null && newState !== BiwaScheme.undef) {
          result = BiwaScheme.to_write(newState);
        }

        Messenger.result({ data: result });
      }
    });
  } catch (e) {
    interpreter.on_error(e.message);
  }
});

Messenger.on('checkLine', command => {
  function countParens(str) {
    const { tokens } = new BiwaScheme.Parser(str);
    let parens = 0;
    for (const token of tokens) {
      switch (token) {
        case '[':
        case '(':
          parens++;
          break;
        case ']':
        case ')':
          parens--;
          break;
      }
    }
    return parens;
  }

  if (countParens(command) <= 0) {
    // All S-exps closed or extra closing parens; don't continue.
    return Messenger.checkLineEnd(false);
  }

  const parensLastLine = countParens(command.split('\n').pop());
  if (parensLastLine > 0) {
    // A new S-exp opened on the last line; indent one level.
    return Messenger.checkLineEnd(1);
  } else if (parensLastLine < 0) {
    // Some S-exps were closed; realign with the outermost closed S-exp.
    return Messenger.checkLineEnd(parensLastLine);
  }
  return Messenger.checkLineEnd(0);
});

Messenger.ready();
