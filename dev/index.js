const $ = document.querySelector.bind(document);

let cm = CodeMirror($('#editor'), {
  value: `
import turtle

t = turtle.Turtle()

for c in ['red', 'green', 'yellow', 'blue']:
    t.color(c)
    t.forward(75)
    t.left(90)
  `,
});

const opts = { useIframe: true, iframeParent: $('#output') };
let replbox = new Replbox('python_turtle', opts);

replbox.load({
  iframeOrigin: '/iframe.html',
  languageBundleSrc: '/dist/python_turtle.js'
}).then(() => {
  console.log('loaded');
}).catch(console.error);

$('button').onclick = () => {  
  replbox.evaluate(cm.getValue(), {
    stdout: (str) => $('#console').append(str),
  });
}
