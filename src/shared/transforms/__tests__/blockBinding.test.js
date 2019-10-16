/* eslint-env node, jest */
const transform = require('../');
const assert = require('assert');

describe('blockBinding', () => {
  it('should throw on constant violation', () => {
    const code = `
      const x = 1;
      x = 2;
    `;

    try {
      transform(code, { blockBinding: true });
    } catch (e) {
      assert(
        e.message.match(/constant/i),
        `constant violation msg, but got ${e.message}`,
      );
    }
  });

  it('should throw on constant violation 2', () => {
    const code = `
      const x = 1;
      function y() {
        x = 2;
      }
    `;

    try {
      transform(code, { blockBinding: true });
    } catch (e) {
      assert(
        e.message.match(/constant/i),
        `constant violation msg, but got ${e.message}`,
      );
    }
  });

  it('should throw on constant violation 3', () => {
    const code = `
      const x = 1;
      let x = 2;
    `;

    try {
      transform(code, { blockBinding: true });
    } catch (e) {
      assert(
        e.message.match(/duplicate/i),
        `duplicate decl msg, but got ${e.message}`,
      );
    }
  });

  it('different scopes must not be constant violation', () => {
    const code = `
      const x = 1;
      function y() { let x = 2; }
    `;

    transform(code, { blockBinding: true });
  });
});
