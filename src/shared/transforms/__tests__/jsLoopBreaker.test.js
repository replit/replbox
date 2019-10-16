/* eslint-env node, jest */
const transform = require('../');
const assert = require('assert');

const init =
  'var _loopStart = Date.now(),_loopIt = 0;' +
  'setTimeout(function () {_loopStart = Infinity;});';
const ifError =
  'if (++_loopIt > 5000 && Date.now() - _loopStart > 150) ' +
  'throw new RangeError("Potential infinite loop. ' +
  'You can disable this from settings.");';

describe('jsLoopBreaker', () => {
  it('transform breaks while loops', () => {
    const code = `
    while (true) {
      doIt();
    }
    `;

    const expected = `${init}
while (true) {${ifError}
  doIt();
}`;

    const { code: actual } = transform(code, { jsLoopBreaker: true });
    assert.equal(actual, expected);

    assertEval(actual);
  });

  it('transform breaks while loops with no body', () => {
    const code = `
    while (true) doIt();
    `;

    const expected = `${init}
while (true) {${ifError}doIt();}`;

    const { code: actual } = transform(code, { jsLoopBreaker: true });
    assert.equal(actual, expected);

    assertEval(actual);
  });

  it('transform inside functions on same line', () => {
    const code = `
    function x() {while (true)doIt()}
    `;

    const expected = `
function x() {${init}while (true) {${ifError}doIt();}}`;

    const { code: actual } = transform(code, { jsLoopBreaker: true });
    assert.equal(actual, expected);

    assertEval(actual + '\nx();');
  });

  it('transform breaks for loops', () => {
    const code = `
    for (var i = 0; i < 100; i++) {
      doIt();
    }
    `;

    const expected = `${init}
for (var i = 0; i < 100; i++) {${ifError}
  doIt();
}`;

    const { code: actual } = transform(code, { jsLoopBreaker: true });
    assert.equal(actual, expected);
  });

  it('transform breaks do loops', () => {
    const code = `
    do {
      doIt();
    } while (true);
    `;

    const expected = `${init}
do {${ifError}
  doIt();
} while (true);`;

    const { code: actual } = transform(code, { jsLoopBreaker: true });
    assert.equal(actual, expected);
  });
});

function assertEval(code) {
  /* eslint no-unused-vars: off */
  function doIt() {}
  /* eslint no-eval: off */
  const before = Date.now();
  try {
    eval(code);
  } catch (e) {
    assert.equal(e.name, 'RangeError');
    assert(e.message.match(/inf/));
    assert(Date.now() - before < 1000, `failed to break: ${code}`);
  }
}
