const path = require('path');
const webpack = require('webpack');
const HappyPack = require('happypack');
const fs = require('fs');
const os = require('os');

const threadPool = HappyPack.ThreadPool({
  size: os.cpus().length,
});

if (
  ['production', 'development', 'test'].indexOf(process.env.NODE_ENV) === -1
) {
  throw new Error('NODE_ENV is not set');
}

const prod = process.env.NODE_ENV === 'production';

function createConfig(name, entryPath) {
  const plugins = [
    function() {
      this.plugin('done', stats => {
        // For some reason happypack + --bail doesn't produce the correct exit code
        // when uglify fails. This makes sure it happens.
        if (stats.compilation.errors && stats.compilation.errors.length) {
          console.error(stats.compilation.errors.join('\n'));
          process.on('beforeExit', () => {
            process.exit(1);
          });
        }
      });
    },
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    }),
  ];

  if (prod && name === 'replbox_babel') {
    // It hangs on the babel bundle. TODO: try updating webpack
    plugins.push(
      new webpack.optimize.UglifyJsPlugin({
        sourceMap: true,
        compress: false,
      }),
    );
  } else if (prod) {
    plugins.push(
      new webpack.optimize.UglifyJsPlugin({
        sourceMap: true,
        compress: {
          warnings: true,
        },
      }),
    );
  }

  plugins.push(
    new HappyPack({
      loaders: [
        {
          path: 'babel-loader',
          query: {
            presets: [
              ['env', { targets: { browsers: ['ie > 10'] } }],
              'stage-2',
            ],
            babelrc: false,
            cacheDirectory: true,
          },
        },
      ],
      id: name,
      threadPool,
      verbose: process.env.LOG_LEVEL === '0',
    }),
  );

  return {
    watchOptions: {
      aggregateTimeout: 300,
      poll: 500,
    },
    entry: entryPath,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: name + '.js',
    },
    devtool: 'source-map',
    resolve: {
      alias: {
        // Chalk is required by babel-code-frame which is required by babel-traverse
        // but it's actually useless for us
        chalk: 'empty-module',
      },
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: [
            path.resolve(__dirname, 'src'),
            path.resolve(__dirname, 'integration_tests'),
          ],
          use: 'happypack/loader?id=' + name,
        },
      ],
    },
    plugins,
  };
}

const configs = [];

// replbox bundle
const clientConfig = createConfig(
  'index',
  path.resolve(__dirname, 'src', 'client', 'index.js'),
);
clientConfig.output.library = 'Replbox';
clientConfig.output.libraryTarget = 'umd';
configs.push(clientConfig);

// language bundles
const langs = fs.readdirSync(path.resolve(__dirname, 'src', 'languages'));
for (const lang of langs) {
  const dir = path.resolve(__dirname, 'src', 'languages', lang);
  if (fs.statSync(dir).isDirectory()) {
    configs.push(createConfig(lang, path.join(dir, 'index.js')));
  }
}

module.exports = configs;
