const path = require("path");
const webpack = require("webpack");
const HappyPack = require("happypack");
const fs = require("fs");
const os = require("os");

const threadPool = HappyPack.ThreadPool({
  size: os.cpus().length
});

if (
  ["production", "development", "test"].indexOf(process.env.NODE_ENV) === -1
) {
  throw new Error("NODE_ENV is not set");
}

const prod = process.env.NODE_ENV === "production";
const bundleNamesFile = path.join(__dirname, ".webpack_bundle_names.json");
const bundleNames = fs.existsSync(bundleNamesFile)
  ? JSON.parse(fs.readFileSync(bundleNamesFile))
  : {};
process.on("exit", () => {
  fs.writeFileSync(bundleNamesFile, JSON.stringify(bundleNames));
});

function createConfig(name, entryPath) {
  const plugins = [
    function() {
      this.plugin("done", stats => {
        // For some reason happypack + --bail doesn't produce the correct exit code
        // when uglify fails. This makes sure it happens.
        if (
          prod &&
          stats.compilation.errors &&
          stats.compilation.errors.length
        ) {
          console.error(stats.compilation.errors.join("\n"));
          process.on("beforeExit", () => {
            process.exit(1);
          });
        }

        if (!stats.toJson().assetsByChunkName.main) {
          console.error("Error getting main chunk for", name, entryPath);
          console.error(stats.toJson().errors.join("\n"));
          process.exit(1);
        }

        const fileName = stats.toJson().assetsByChunkName.main[0];
        bundleNames[name] = fileName;
      });
    },
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
        // TODO
        SENTRY_DSN: JSON.stringify(process.env.SENTRY_DSN),
        // TODO
        STAGING: JSON.stringify(process.env.STAGING)
      }
    })
  ];

  if (prod && name === "replbox_babel") {
    // It hangs on the babel bundle. TODO: try updating webpack
    plugins.push(
      new webpack.optimize.UglifyJsPlugin({
        sourceMap: true,
        compress: false
      })
    );
  } else if (prod) {
    plugins.push(
      new webpack.optimize.UglifyJsPlugin({
        sourceMap: true,
        compress: {
          warnings: true
        }
      })
    );
  }

  plugins.push(
    new HappyPack({
      loaders: [
        {
          path: "babel-loader",
          query: {
            presets: ["env", "stage-2"],
            babelrc: false,
            cacheDirectory: true
          }
        }
      ],
      id: name,
      threadPool,
      verbose: process.env.LOG_LEVEL === "0"
    })
  );

  return {
    watchOptions: {
      aggregateTimeout: 300,
      poll: 500
    },
    entry: entryPath,
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: name + ".bundle.js",
      chunkFilename: prod
        ? name + ".[chunkhash].[id].chunk.js"
        : name + ".[id].chunk.js",
      publicPath: "/public/"
    },
    devtool: "source-map",
    resolveLoader: {
      modules: [path.resolve(__dirname, "node_modules"), "node_modules"]
    },
    resolve: {
      modules: [path.resolve(__dirname, "node_modules"), "node_modules"]
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: [
            path.resolve(__dirname, "src"),
            path.resolve(__dirname, "integration_tests")
          ],
          use: "happypack/loader?id=" + name
        }
      ]
    },
    plugins
  };
}

const configs = [];

const langs = fs.readdirSync(path.resolve(__dirname, "src", "languages"));
for (const lang of langs) {
  const dir = path.resolve(__dirname, "src", "languages", lang);
  if (fs.statSync(dir).isDirectory()) {
    configs.push(createConfig("replbox_" + lang, path.join(dir, "index.js")));
  }
}

if (!prod) {
  configs.push(
    createConfig(
      "replbox_window",
      path.join(__dirname, "integration_tests", "replbox_window.js")
    )
  );
}

module.exports = configs;
