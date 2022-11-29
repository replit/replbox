#!/usr/bin/env node

const util = require('util');

const { ArgumentParser } = require('argparse');

const { prompt } = require('./src/prompt.js');
const asyncPrompt = util.promisify(prompt);
const { stderr } = require('./src/interp.js');

const parser = new ArgumentParser({
  description: 'Replbox is a single frontend to several language interpreters',
  add_help: true,
});

let defaultPrompt = process.env['PS1'];
if (defaultPrompt === undefined) {
  defaultPrompt = '\x1b[0;33m > ';
}

parser.add_argument('-v', '--version', { action: 'version', version: '3.0.0' });
parser.add_argument('--ps1', {
  help: 'The prompt to display',
  default: defaultPrompt,
});
parser.add_argument('--result', {
  help: 'The prompt to display with results',
  default: '\x1b[0;32m=> ',
});
parser.add_argument('-i', {
  help: 'Drop to an interpreter after interpreting files',
  action: 'store_true',
});
parser.add_argument('lang', {
  help: 'The language to interpret',
  choices: ['bloop', 'emoticon', 'qbasic', 'roy', 'scheme', 'unlambda'],
});
parser.add_argument('file', {
  help: 'A file to pass to the interpreter',
  nargs: '?',
});

const args = parser.parse_args();

const { header, evaluate } = require(`./src/languages/${args.lang}`);
const asyncEval = util.promisify(evaluate);
console.log(header);

(async () => {
  if (args.file) {
    const fs = require('fs');
    try {
      const content = fs.readFileSync(args.file, {
        encoding: 'utf8',
        flag: 'r',
      });

      try {
        const result = await asyncEval(content);
        if (result !== undefined) {
          console.log(`${args.result}${result}\x1b[0m`);
        }
      } catch (e) {
        stderr(e);
      }

      if (!args.i) {
        process.exit(0);
      }
    } catch (e) {
      console.error(`Failed to open ${args.file}: ${e.message}`);
      process.exit(1);
    }
  }

  while (1) {
    const code = await asyncPrompt(args.ps1);
    process.stdout.write('\x1b[0m');
    try {
      const result = await asyncEval(code);
      if (result !== undefined) {
        console.log(`${args.result}${result}\x1b[0m`);
      }
    } catch (e) {
      stderr(e);
    }
  }
})();
