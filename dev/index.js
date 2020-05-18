$.get('/data/languages').then(r => {
  r.forEach(lang => {
    $('#language').append(`<option value="${lang}">${lang}</option>`);
  });
  $('#language').val('basic')
});

let cm = CodeMirror($('#editor').get(0), {
  lineWrapping: true,
  lineNumbers: true,
  styleActiveLine: true,
  value: '',
});
// TODO populate languages in select from /data/languages


const jqconsole = $('#console').jqconsole('', '   ', '.. ', true);

const iframeParent = $('#output').get(0);
const opts = { useIframe: true, iframeParent };

function startPrompt() {
  if (jqconsole.GetState() === 'input') {
    jqconsole.AbortPrompt();
  }

  jqconsole.Prompt(
    true,
    input => {
      jqconsole.Write('Please hit run, or implement this ;)');
    },
    undefined,
    true,
  );
}

startPrompt();
let replbox;

$('#language').change(() => {
  // hard reset
  while (iframeParent.firstChild) {
    iframeParent.removeChild(iframeParent.firstChild);
  }
  replbox = null;
});

$('#run').click(async () => {
  if (replbox) await replbox.reset();
  if (!replbox) replbox = await loadReplbox();

  jqconsole.Clear();

  if (jqconsole.GetState() !== 'output') {
    jqconsole.AbortPrompt();
  }

  $('#stop').click(() => replbox.stop());

  const resP = replbox.evaluate(cm.getValue(), {
    stdout: str => {
      jqconsole.Write(str, '');
    },
    stderr: err => {
      jqconsole.Write(err, 'error');
    },
  });

  jqconsole.Input(str => {
    replbox.write(`${str}\n`);
  });

  const result = await resP;

  if (result.error) {
    jqconsole.Write(result.error, 'error');
  } else {
    jqconsole.Write('=> ' + result.data);
  }

  jqconsole.Write('\n');

  startPrompt();
});

async function loadReplbox() {
  const language = $('#language').val();
  const replbox = new Replbox(language, opts);

  await replbox.load({
    iframeOrigin: '/iframe.html',
    languageBundleSrc: `/dist/${language}.js`,
  });

  return replbox;
}

$('#save').click(() => {
  location.hash = encodeURIComponent(cm.getValue());
});

$(document).ready(() => {
  if (location.hash) {
    cm.setValue(decodeURIComponent(location.hash.slice(1)));
  }
});