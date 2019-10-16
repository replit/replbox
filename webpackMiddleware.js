module.exports = () => {
  const webpack = require('webpack');
  const middleware = require('webpack-dev-middleware');
  const config = require('./webpack.config');
  const compiler = webpack(config);

  return middleware(compiler, {
    publicPath: '/public',
    noInfo: true,
    stats:
      process.env.LOG_LEVEL === '0'
        ? {
            chunks: false,
            colors: true,
            version: false,
          }
        : 'minimal',
  });
};
