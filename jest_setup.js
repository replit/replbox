const server = require('./jest_server');

module.exports = async function setup() {
  await new Promise(r => {
    server.setup(r);
  });
};
