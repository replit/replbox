function stdin(args) {
  console.log("asking for stdin", args)
}

function stdout(args) {
  if (args) {
    console.log(`${args}`)
  }
}

function stderr(args) {
  if (args) {
    console.error(`\x1b[0;31m${args}\x1b[0m`)
  }
}

function result(args) {
  if (args) {
    console.log(`\x1b[0;32m=> ${args}\x1b[0m`)
  }
}

module.exports = {
  stdout,
  stderr,
  result,
}
