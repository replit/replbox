const lang = process.argv[2]
const { evaluate } = require(`./src/languages/${lang}`);
const prompt = require('prompt-sync')({sigint: true});

(async ()=>{
  console.log(lang)
  while (1) {
    const code = await prompt("\x1b[0;33m > ")
    evaluate(code)
  }
})()
