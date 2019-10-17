const { fetch } = require('whatwg-fetch');

const _cache = Object.create(null);

module.exports = modules => {
  let bundle = '';
  const dependencies = normalize(modules);
  for (const module in dependencies) {
    if (_cache[module + '@' + dependencies[module]]) {
      bundle += _cache[module + '@' + dependencies[module]];
      delete dependencies[module];
    }
  }

  if (!Object.keys(dependencies).length) {
    return Promise.resolve(bundle);
  }

  return fetch('https://wzrd.repl.it/multi', {
    mode: 'cors',
    method: 'post',
    body: JSON.stringify({
      options: {},
      dependencies,
    }),
  })
    .then(r => {
      if (r.status !== 200) {
        return r.text().then(text => {
          // It may say something about the npm registery saying 404.
          if (text.match(/404/g)) {
            throw new Error('Package not found');
          }

          throw new Error(
            `Failed with status ${r.status} to get packages ${modules.join(
              ',',
            )}`,
          );
        });
      }

      return r.json();
    })
    .then(result => {
      // "package-name": {
      //   bundle: "code",
      //   package: {
      //     version: "1.2.3"
      //   }
      // }

      for (const module in result) {
        // Scoped module name will be encoded in the bundle.
        const code = result[module].bundle.replace(
          module,
          decodeURIComponent(module),
        );

        _cache[module + '@' + dependencies[module]] = code;
        bundle += code;
      }
      return bundle;
    });
};

function normalize(modules) {
  const dependencies = {};

  modules.forEach(module => {
    // 1. Take out the version and make it the value
    // 2. Support for scoped modules by encoding `/`

    const m = module.match(/@(\d(\.\d)*)$/);
    const version = (m && m[1]) || 'latest';
    module = module
      .replace(/@\d(\.\d)*$/, '')
      .split('/')
      .join('%2F');
    dependencies[module] = version;
  });

  return dependencies;
}
