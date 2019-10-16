module.exports = () => ({
  Scope({ scope }) {
    for (const name in scope.bindings) {
      const binding = scope.bindings[name];
      if (binding.kind !== 'const') continue;

      if (binding.constantViolations.length) {
        throw binding.constantViolations[0].buildCodeFrameError(
          `Assignment to constant variable: ${name}`,
        );
      }
    }
  },
  VariableDeclaration(path) {
    // We only care about top-level args.
    if (!path.parentPath.isProgram()) {
      return;
    }

    if (path.node.kind === 'let' || path.node.kind === 'const') {
      path.node.kind = 'var';
    }
  },
});
