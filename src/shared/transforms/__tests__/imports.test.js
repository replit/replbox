/* eslint-env node, jest */
const transform = require('../');
const assert = require('assert');

describe('checkImports', () => {
  it('regular code', () => {
    const code = `
      const x = 1;
      console.log(x);
    `;

    const { imports } = transform(code, { checkImports: true });
    assert(!imports.length, 'Does not have imports');
  });

  it('has imports', () => {
    const code = `
      require('x');
    `;

    const { imports } = transform(code, { checkImports: true });
    assert.deepEqual(imports, ['x']);
  });

  it('rewrites versioned imports', () => {
    const code = `
      require('x@1.2.3');
    `;

    const { imports, code: code2 } = transform(code, { checkImports: true });
    assert.deepEqual(imports, ['x@1.2.3']);

    const { imports: imports2 } = transform(code2, { checkImports: true });
    assert.deepEqual(imports2, ['x']);
  });

  it('should not have imports if require is local', () => {
    const code = `
      function require(){}
      require('x');
    `;

    const { imports } = transform(code, { checkImports: true });
    assert(!imports.length, 'should not have imports');
  });

  it('require inside functions', () => {
    const code = `
      function x() {
        require('wow');
      }
    `;

    const { imports } = transform(code, { checkImports: true });
    assert.deepEqual(imports, ['wow']);
  });

  it('nested and shadowed', () => {
    const code = `
      var require = 1;

      function x() {
        require('wow');
      }
    `;

    const { imports } = transform(code, { checkImports: true });
    assert(!imports.length, 'should not have imports');
  });

  it('not shadowed', () => {
    const code = `
      function y() {
        var require = 1;
      }

      function x() {
        require('wow');
      }
    `;

    const { imports } = transform(code, { checkImports: true });
    assert.deepEqual(imports, ['wow']);
  });

  it('supports es6 imports (bare)', () => {
    const code = "import 'foo'";

    const expected = "require('foo');";

    const { code: actual, imports } = transform(code, { checkImports: true });
    assert.equal(actual, expected);
    assert.deepEqual(imports, ['foo']);
  });

  it('supports es6 imports (default)', () => {
    const code = "import foo from 'foo'";

    const expected =
      "const foo = require('foo') && require('foo').__esModule ?" +
      " require('foo').default : require('foo');";

    const { code: actual, imports } = transform(code, { checkImports: true });
    assert.equal(actual, expected);
    assert.deepEqual(imports, ['foo']);
  });

  it('es6 imports works with blockBinding transform', () => {
    const code = "import foo from 'foo'";

    const expected =
      "var foo = require('foo') && require('foo').__esModule ?" +
      " require('foo').default : require('foo');";

    const { code: actual, imports } = transform(code, {
      checkImports: true,
      blockBinding: true,
    });
    assert.equal(actual, expected);
    assert.deepEqual(imports, ['foo']);
  });

  it('es6 imports as immutable binding', () => {
    const code = `
    import foo from 'foo'
    var foo = 1;
    `;

    try {
      transform(code, { blockBinding: true });
    } catch (e) {
      assert(
        e.message.match(/duplicate/i),
        `duplicate msg, but got ${e.message}`,
      );
    }
  });

  it('supports es6 imports (destructering)', () => {
    const code = "import { foo, bar, baz as baz2 } from 'foo'";

    const expected =
      "const foo = require('foo').foo;const bar = require('foo').bar;const baz2 = require('foo').baz;";

    const { code: actual, imports } = transform(code, { checkImports: true });
    assert.equal(actual, expected);
    assert.deepEqual(imports, ['foo']);
  });

  it('supports es6 imports (compound)', () => {
    const code = "import foo, { bar } from 'foo'";

    const expected =
      "const foo = require('foo') && require('foo').__esModule ?" +
      " require('foo').default : require('foo')" +
      ";const bar = require('foo').bar;";

    const { code: actual, imports } = transform(code, { checkImports: true });
    assert.equal(actual, expected);
    assert.deepEqual(imports, ['foo']);
  });

  it('supports es6 imports (namespace)', () => {
    const code = "import * as foo from 'foo'";
    const expected =
      'function _interopRequireWildcard(obj) {if (obj && obj' +
      '.__esModule) {return obj;} else {var newObj = {};if (obj != null)' +
      ' {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj,' +
      ' key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}' +
      "const foo = _interopRequireWildcard(require('foo'));";

    const { code: actual, imports } = transform(code, { checkImports: true });
    assert.equal(actual, expected);
    assert.deepEqual(imports, ['foo']);
  });

  it('should insert helper once', () => {
    const code = "import * as foo from 'foo'\nimport * as bar from 'bar'";
    const expected =
      'function _interopRequireWildcard(obj) {if (obj && obj' +
      '.__esModule) {return obj;} else {var newObj = {};if (obj != null)' +
      ' {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj,' +
      ' key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}' +
      "const foo = _interopRequireWildcard(require('foo'));const\n" +
      "bar = _interopRequireWildcard(require('bar'));";

    const { code: actual, imports } = transform(code, { checkImports: true });
    assert.equal(actual, expected);
    assert.deepEqual(imports, ['foo', 'bar']);
  });
});
