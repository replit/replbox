const Basic = require('../../../vendor/pg-basic.js');
const Messenger = require('../../shared/messenger');
const Display = require('./display');
const sound = require('./sound');

let basic;

Messenger.on('stop', () => {
  if (basic) basic.end();
  sound.close();  
});

Messenger.on('evaluate', ({ code }) => {
  const wrapper = document.createElement('div');
  wrapper.style.height = '100%';
  wrapper.style.width = '100%';
  wrapper.setAttribute('id', 'basic_display');
  wrapper.setAttribute('tabindex', '0');
  document.body.appendChild(wrapper);

  function createDisplay({
    rows = 50,
    columns = 50,
    borderWidth = 1,
    borderColor = 'black',
    defaultBg = 'white',
  } = {}) {
    while (wrapper.firstChild) {
      wrapper.removeChild(wrapper.firstChild);
    }
    
    return new Display({
      wrapper,
      rows,
      columns,
      defaultBg,
      borderWidth,
      borderColor,
    });
  }

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
        // remove new-line
        callback(input.replace(/\n$/, ''));
      });
    },
  };

  basic = new Basic({
    console: cnsle,
    createDisplay,
    sound,
    // debugLevel: 9999,
    constants: {
      LEVEL: 1,
      PI: Math.PI,
    },
  });

  // Focus after run. Added delay to make sure everything is rendered
  // and program is running; janky but no good hooks right now. 
  setTimeout(() => {
    wrapper.focus();
  }, 100);

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
