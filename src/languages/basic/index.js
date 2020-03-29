const Basic = require('../../../vendor/pg-basic.js');
const Messenger = require('../../shared/messenger');
const Display = require('pg-basic-table').default;

let basic;

Messenger.on('stop', () => {  
  if (basic) basic.end();
});

Messenger.on('evaluate', ({ code }) => {
  const wrapper = document.createElement('div');
  wrapper.style.height = '100%';
  wrapper.style.width = '100%';
  wrapper.setAttribute('id', 'basic_display');
  document.body.appendChild(wrapper);

  const columns = 50;
  const rows = 50;

  const grid = new Display({
    wrapper,
    rows,
    columns,
    defaultBg: 'white',
    borderWidth: 1,
    borderColor: 'black',
  });

  let inputCallback = null;
  const cnsle = {
    write: s => {
      Messenger.output(s);
    },
    clear: () => {
      Messenger.output.clear();
    },
    input: callback => {
      Messenger.inputEvent();

      Messenger.once('write', input => {
        console.log(input);
        // remove new-line
        callback(input.replace(/\n$/, ''));
      });
    },
  };

  basic = new Basic({
    console: cnsle,
    display: grid,
    //debugLevel: 9999,
    constants: {
      LEVEL: 1,
      PI: Math.PI,
      COLUMNS: columns,
      ROWS: rows,
    },
  });

  basic
    .run(code)
    .then(() => {
      Messenger.result({ data: '' });
    })
    .catch(e => {
      Messenger.result({ error: e.toString() });
    });
});

document.addEventListener(
  'DOMContentLoaded',
  function() {
    Messenger.ready();
  },
  false,
);
