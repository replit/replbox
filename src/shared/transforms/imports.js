const template = require('babel-template');

const bareRequire = template('require($0)');

const defaultRequire = template(`
  const $0 = require($1) && require($1).__esModule ? require($1).default : require($1);
`);

const namedRequire = template(`
  const $0 = require($1).$2;
`);

const namespaceRequire = template(`
  const $0 = $1(require($2));
`);

const interopWildcard = template(`
function $0(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};
    if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key))
          newObj[key] = obj[key];
      }
    }
    newObj.default = obj;
    return newObj;
  }
}
`);

module.exports = state => ({
  Program(path) {
    state.program = path;
  },

  CallExpression({ scope, node }) {
    if (node.callee.name === 'require') {
      while (scope) {
        if (scope.bindings.require) {
          return;
        }

        scope = scope.parent;
      }

      const module = node.arguments[0];
      if (module.type === 'StringLiteral') {
        if (state.imports.indexOf(module.value) === -1) {
          state.imports.push(module.value);
        }

        // Strip version because the bundle comes down without it.
        module.value = module.value.replace(/@\d(\.\d)*$/, '');
      }
    }
  },

  ImportDeclaration(path) {
    const { node } = path;
    const packageName = node.source;

    if (node.specifiers.length === 0) {
      path.replaceWith(bareRequire(packageName));
      return;
    }

    const replacement = [];
    for (const specifier of node.specifiers) {
      switch (specifier.type) {
        case 'ImportNamespaceSpecifier':
          if (!state.helperName) {
            const helperName = path.scope.generateUidIdentifier(
              'interopRequireWildcard',
            );
            const helper = interopWildcard(helperName);
            state.program.unshiftContainer('body', helper);
            state.helperName = helperName;
          }

          replacement.push(
            namespaceRequire(specifier.local, state.helperName, packageName),
          );
          break;
        case 'ImportDefaultSpecifier':
          replacement.push(defaultRequire(specifier.local, packageName));
          break;
        case 'ImportSpecifier':
          replacement.push(
            namedRequire(specifier.local, packageName, specifier.imported),
          );
          break;
        default:
          throw new Error('Unknown specifier type: ' + specifier.type);
      }
    }

    path.replaceWithMultiple(replacement);
  },
});
