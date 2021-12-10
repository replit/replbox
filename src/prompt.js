const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function prompt(prefix, callback) {
  process.stdout.write(prefix);
  const cb = line => {
    callback(null, line);
    rl.removeListener('line', cb);
  };
  rl.on('line', cb);
}

module.exports = {
  prompt,
};
