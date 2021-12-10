const { prompt } = require('./prompt.js');

function stdin(callback) {
  prompt('', (err, text) => {
    callback(text);
  });
}

function stdout(args) {
  if (args) {
    process.stdout.write(`${args}`);
  }
}

function stderr(args) {
  if (args) {
    console.error(`\x1b[0;31m${args}\x1b[0m`);
  }
}

module.exports = {
  stdout,
  stderr,
  stdin,
};
