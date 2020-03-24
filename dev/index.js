let cm = CodeMirror($('#editor').get(0), {
  lineWrapping: true,
  lineNumbers: true,
  styleActiveLine: true,
  value: `
  import turtle

  t = turtle.Turtle()
  
  for c in ['red', 'green', 'yellow', 'blue']:
      t.color(c)
      t.forward(75)
      t.left(90)
    `,
});

// TODO populate languages in select from /data/languages

const jqconsole = $('#console').jqconsole('Hi\n', '>>>');

const iframeParent = $('#output').get(0);
const opts = { useIframe: true, iframeParent };

$('#run').click(async () => {
  while (iframeParent.firstChild) {
    iframeParent.removeChild(iframeParent.firstChild);
  }

  jqconsole.Clear();

  if (jqconsole.GetState() !== 'output') {
    jqconsole.AbortPrompt();
  }

  const replbox = await loadReplbox();

  const result = await replbox.evaluate(cm.getValue(), {
    stdout: str => {
      jqconsole.Write(str, '');
    },
    stderr: err => {
      jqconsole.Write(err, 'error');
    },
  });

  if (result.error) {
    jqconsole.Write(result.error, 'error');
  } else {
    jqconsole.Write('=> ' + result.data);
  }
});

async function loadReplbox() {
  const language = $('#language').val();
  console.log(language);
  const replbox = new Replbox(language, opts);

  await replbox.load({
    iframeOrigin: '/iframe.html',
    languageBundleSrc: `/dist/${language}.js`,
  });

  return replbox;
}
