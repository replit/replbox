// commit: 46d247ad22720cbc9b79757b9762eeeae80a222a
var CALL_LIMIT, call, call_current, parse, runEval, unparse;

CALL_LIMIT = 500;

call_current = 0;

call = function(target, arg) {
  if (call_current >= CALL_LIMIT) {
    call_current = 0;
    setTimeout((function() {
      return target(arg);
    }), 0);
  } else {
    call_current++;
    target(arg);
  }
  return null;
};

runEval = function(program, result, input, output, error) {
  var Eval, apply, register;
  register = void 0;
  apply = function(arg1, arg, continuation) {
    var action, closure, f1, f2, func;
    func = arg1[0], closure = arg1[1];
    switch (func) {
      case '.':
        output(closure);
        call(continuation, arg);
        break;
      case 'r':
        output('\n');
        call(continuation, arg);
        break;
      case 'i':
        call(continuation, arg);
        break;
      case 'k':
        call(continuation, ['k1', arg]);
        break;
      case 'k1':
        call(continuation, closure);
        break;
      case 's':
        call(continuation, ['s1', arg]);
        break;
      case 's1':
        call(continuation, ['s2', [closure, arg]]);
        break;
      case 's2':
        f1 = closure[0], f2 = closure[1];
        apply(f1, arg, function(r1) {
          return apply(f2, arg, function(r2) {
            return apply(r1, r2, continuation);
          });
        });
        break;
      case 'v':
        call(continuation, ['v', null]);
        break;
      case 'd1':
        Eval(['`', [closure, arg]], function(value) {
          return call(continuation, value);
        });
        break;
      case 'e':
        result(arg);
        break;
      case '@':
        input(function(value_read) {
          var action;
          register = value_read != null ? value_read[0] : void 0;
          action = register != null ? 'i' : 'v';
          return Eval(['`', [arg, [action, null]]], continuation);
        });
        break;
      case '|':
        if (register != null) {
          Eval(['`', [arg, ['.', register]]], continuation);
        } else {
          Eval(['`', [arg, ['v', null]]], continuation);
        }
        break;
      case '?':
        action = register === closure ? 'i' : 'v';
        Eval(['`', [arg, [action, null]]], continuation);
        break;
      case 'c':
        Eval(['`', [arg, ['c1', continuation]]], continuation);
        break;
      case 'c1':
        call(closure, arg);
        break;
      default:
        error(new Error('Unknown function: ' + func));
    }
    return null;
  };
  Eval = function(arg1, continuation) {
    var arg, closure, func;
    func = arg1[0], closure = arg1[1];
    if (func === '`') {
      func = closure[0], arg = closure[1];
      Eval(func, function(evaled_func) {
        if (evaled_func[0] === 'd') {
          return call(continuation, ['d1', arg]);
        } else {
          return Eval(arg, function(evaled_arg) {
            return apply(evaled_func, evaled_arg, function(res) {
              return call(continuation, res);
            });
          });
        }
      });
    } else {
      call(continuation, [func, closure]);
    }
    return null;
  };
  Eval(program, function(value) {
    return result(value);
  });
  return null;
};

parse = function(program) {
  var doParse;
  doParse = function() {
    var match, result;
    if (program.length === 0) {
      throw Error('Unexpected end of input.');
    }
    if (program[0] === '`') {
      program = program.slice(1);
      result = ['`', [doParse(), doParse()]];
    } else if (/^[rksivdce@|]/.test(program)) {
      result = [program[0], null];
      program = program.slice(1);
    } else if (/^[.?]./.test(program)) {
      result = [program[0], program[1]];
      program = program.slice(2);
    } else if (match = program.match(/^(\s+|#.*)/)) {
      program = program.slice(match[0].length);
      result = doParse();
    } else {
      throw new Error('Invalid character at: ' + program);
    }
    return result;
  };
  return doParse();
};

unparse = function(arg1) {
  var closure, op;
  op = arg1[0], closure = arg1[1];
  switch (op) {
    case 'r':
    case 'i':
    case 'k':
    case 's':
    case 'v':
    case 'd':
    case 'c':
    case 'e':
    case '@':
    case '|':
      return op;
    case 'c1':
      return '<cont>';
    case '.':
    case '?':
      return op + closure;
    case 'k1':
    case 's1':
    case 'd1':
      return '`' + op[0] + unparse(closure);
    case '`':
      return '`' + unparse(closure[0]) + unparse(closure[1]);
    case 's2':
      return '``s' + unparse(closure[0]) + unparse(closure[1]);
    default:
      throw new Error('Unparse: unknown function: ' + op);
  }
};

this.Unlambda = {
  parse: parse,
  unparse: unparse,
  "eval": runEval
};
