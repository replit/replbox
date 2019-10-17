const server = require('./jest_server');

module.exports = async function teardiwb() {
  await new Promise(r => {
    server.teardown(r);
  });
};
