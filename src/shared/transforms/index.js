const traverse = require('babel-traverse').default;
const { parse } = require('babylon');
const generate = require('babel-generator').default;
const jsLoopBreakerVisitor = require('./jsLoopBreaker');
const blockBindingVisitor = require('./blockBinding');
const importsVisitor = require('./imports');

module.exports = (code, { jsLoopBreaker, blockBinding, checkImports }) => {
  const visitors = [];
  const state = { imports: [] };

  if (checkImports) {
    visitors.push(importsVisitor(state));
  }

  if (jsLoopBreaker) {
    visitors.push(jsLoopBreakerVisitor(state));
  }

  if (blockBinding) {
    visitors.push(blockBindingVisitor(state));
  }

  if (!visitors.length) {
    return code;
  }

  const ast = parse(code, {
    allowImportExportEverywhere: true,
    plugins: ['objectRestSpread'],
  });

  const visitor = traverse.visitors.merge(visitors);
  const file = new File({ ast, code });

  traverse(ast, visitor, file.scope);

  const retCode = generate(
    ast,
    {
      sourceMaps: false,
      retainLines: true,
    },
    code,
  ).code;

  return { imports: state.imports, code: retCode };
};

// A lightweight version of Babel files so we don't take on a lot more
// dependencies.
// This was missing and throwing an error:
// see https://sentry.io/replit/frontend/issues/208243524/
class File {
  constructor({ ast, code }) {
    this.ast = ast;
    this.code = code;
    this.hub = new traverse.Hub(this);
    this.path = traverse.NodePath.get({
      hub: this.hub,
      parentPath: null,
      parent: ast,
      container: ast,
      key: 'program',
    }).setContext();
    this.scope = this.path.scope;

    this.metadata = {
      marked: [],
    };
  }

  buildCodeFrameError(node, msg) {
    const loc = node && (node.loc || node._loc);

    if (loc) {
      msg += ` at ${loc.start.line}:${loc.start.column}`;
    }

    // WebEvaluator expects a syntax error (otherwise it'll think something
    // wen't wrong with the transform itself).
    const err = new SyntaxError(msg);

    if (loc) {
      err.loc = loc.start;
    }
    return err;
  }

  getMetadata() {}
  getModuleName() {
    return '<eval>';
  }
}
