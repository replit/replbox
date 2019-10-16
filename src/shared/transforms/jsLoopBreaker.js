const t = require('babel-types');

const maxLoopTimeMs = 150;
const maxIteration = 5000;

module.exports = () => ({
  'WhileStatement|ForStatement|DoWhileStatement': path => {
    const loopStart = path.scope.parent.generateUidIdentifier('loopStart');
    const loopStartInit = dateNow();
    path.scope.parent.push({
      id: loopStart,
      init: loopStartInit,
    });

    const iterator = path.scope.parent.generateUidIdentifier('loopIt');
    const iteratorInit = t.numericLiteral(0);
    path.scope.parent.push({
      id: iterator,
      init: iteratorInit,
    });

    // setTimeout to protect against breaking async and generator funcs.
    path.insertBefore(
      t.expressionStatement(
        t.callExpression(t.identifier('setTimeout'), [
          t.functionExpression(
            null,
            [],
            t.blockStatement([
              t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  loopStart,
                  t.identifier('Infinity'),
                ),
              ),
            ]),
          ),
        ]),
      ),
    );

    const guard = t.ifStatement(
      t.logicalExpression(
        '&&',
        t.binaryExpression(
          '>',
          t.updateExpression('++', iterator, true),
          t.numericLiteral(maxIteration),
        ),
        t.binaryExpression(
          '>',
          t.binaryExpression('-', dateNow(), loopStart),
          t.numericLiteral(maxLoopTimeMs),
        ),
      ),
      t.throwStatement(
        t.newExpression(t.identifier('RangeError'), [
          t.stringLiteral(
            'Potential infinite loop. You can disable this from settings.',
          ),
        ]),
      ),
    );

    // No block statment e.g. `while (1) 1;`
    if (!path.get('body').isBlockStatement()) {
      const statement = path.get('body').node;
      path.get('body').replaceWith(t.blockStatement([guard, statement]));
    } else {
      path.get('body').unshiftContainer('body', guard);
    }
  },
});

function dateNow() {
  return t.callExpression(
    t.memberExpression(t.identifier('Date'), t.identifier('now')),
    [],
  );
}
