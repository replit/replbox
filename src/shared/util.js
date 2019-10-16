const _inspect = require('inspect-x');

// This `format` code is copied almost verbatim from node.js.
// https://github.com/nodejs/node/blob/d15a5c0fe1380bc33368d08f3cf4564a60146243/lib/util.js
let CIRCULAR_ERROR_MESSAGE;

function tryStringify(arg) {
  try {
    return JSON.stringify(arg);
  } catch (err) {
    // Populate the circular error message lazily
    if (!CIRCULAR_ERROR_MESSAGE) {
      try {
        const a = {};
        a.a = a;
        JSON.stringify(a);
      } catch (err2) {
        CIRCULAR_ERROR_MESSAGE = err2.message;
      }
    }

    if (err.name === 'TypeError' && err.message === CIRCULAR_ERROR_MESSAGE) {
      return '[Circular]';
    }

    throw err;
  }
}

/* eslint space-in-parens: off */
/* eslint prefer-rest-params: off */
function format(f) {
  if (typeof f !== 'string') {
    const objects = new Array(arguments.length);
    for (let index = 0; index < arguments.length; index++) {
      objects[index] = inspect(arguments[index]);
    }
    return objects.join(' ');
  }

  if (arguments.length === 1) return f;

  let str = '';
  let a = 1;
  let lastPos = 0;

  for (let i = 0; i < f.length; ) {
    // 37 = '%'
    if (f.charCodeAt(i) === 37 && i + 1 < f.length) {
      if (f.charCodeAt(i + 1) !== 37 && a >= arguments.length) {
        ++i;
        continue;
      }
      switch (f.charCodeAt(i + 1)) {
        // 'd'
        case 100:
          if (lastPos < i) str += f.slice(lastPos, i);
          str += Number(arguments[a++]);
          break;
        // 'i'
        case 105:
          if (lastPos < i) str += f.slice(lastPos, i);
          str += parseInt(arguments[a++], 10);
          break;
        // 'f'
        case 102:
          if (lastPos < i) str += f.slice(lastPos, i);
          str += parseFloat(arguments[a++], 10);
          break;
        // 'j'
        case 106:
          if (lastPos < i) str += f.slice(lastPos, i);
          str += tryStringify(arguments[a++]);
          break;
        // 's'
        case 115:
          if (lastPos < i) str += f.slice(lastPos, i);
          str += String(arguments[a++]);
          break;
        // 'O'
        case 79:
          if (lastPos < i) str += f.slice(lastPos, i);
          str += inspect(arguments[a++]);
          break;
        // 'o'
        case 111:
          if (lastPos < i) str += f.slice(lastPos, i);
          str += inspect(arguments[a++], {
            showHidden: true,
            depth: 4,
            showProxy: true,
          });
          break;
        // '%'
        case 37:
          if (lastPos < i) str += f.slice(lastPos, i);
          str += '%';
          break;
        default:
          // any other character is not a correct placeholder
          if (lastPos < i) str += f.slice(lastPos, i);
          str += '%';
          i += 1;
          lastPos = i;
          continue;
      }
      i += 2;
      lastPos = i;
      continue;
    }
    ++i;
  }
  if (lastPos === 0) str = f;
  else if (lastPos < f.length) str += f.slice(lastPos);
  while (a < arguments.length) {
    const x = arguments[a++];
    if (x === null || (typeof x !== 'object' && typeof x !== 'symbol')) {
      str += ` ${x}`;
    } else {
      str += ` ${inspect(x)}`;
    }
  }
  return str;
}

function inspect(obj) {
  try {
    return _inspect(obj);
  } catch (e) {
    // When an iframe with a parent that's from a different origin it can't
    // touch, simply enumerating over it will give us a security error.
    // This means in HTML you can't evaluate `window`. This will try to handle it.
    if (e && e.message.match(/blocked a frame/i)) {
      return _inspect(cleanUpWindow(obj));
    } else {
      throw e;
    }
  }
}

function cleanUpWindow(obj) {
  const clean = {};

  for (const k in obj) {
    // All the different ways `window` refers to itself, its children, and its
    // parents. What a degenerate family.
    if (
      k === 'global' ||
      k === 'parent' ||
      k === 'top' ||
      k === 'frames' ||
      k === 'self' ||
      k === 'window'
    ) {
      continue;
    }

    clean[k] = obj[k];
  }

  return clean;
}

module.exports = {
  format,
  inspect,
};
