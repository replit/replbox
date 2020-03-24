const Basic = require('../../../vendor/pg-basic.js');
const Messenger = require('../../shared/messenger');
const Display = require('./display');

Messenger.on('evaluate', ({ code }) => {
  const el = document.createElement('canvas');
  el.setAttribute('id', 'basic_display');
  el.style.height = '100%';
  el.style.width = '100%';

  document.body.appendChild(el);

  const grid = new Display(el, {
    rows: 25,
    cols: 25,
  });

  grid.draw();

  const cnsle = {
    write: s => {
      Messenger.output(s);
    },
    clear: () => {
      Messenger.output.clear();
    },
    input: callback => {
      // TODO Messenger.on('write)
      setTimeout(() => callback('foo'));
    },
  };

  const interp = new Basic({
    console: cnsle,
    display: grid,
    debugLevel: 9999,
  });

  interp.run(code);
});

Messenger.ready();
