require('../../../vendor/skulpt.min.js');
const files = require('./files.json');
const Messenger = require('../../shared/messenger');

let halted = false;
const Skulpt = window.Sk;

Messenger.on('stop', () => {
  Sk.execLimit = 1;
  halted = true;
  Sk.timeoutMsg = function() {
    Skulpt.execLimit = Number.MAX_VALUE;
    return 'Stopped by user';
  };
});

Messenger.on('evaluate', ({ code }) => {
  const el = document.createElement('div');
  el.setAttribute('id', 'skulpt_target');

  // Disable moving scrolling using keydown (make sure that
  // all key events are handled by the turtle).
  el.onkeypress = e => e.preventDefault();
  el.onkeydown = e => e.preventDefault();

  document.body.appendChild(el);

  const builtinRead = file => {
    if (!files[file]) {
      throw new Error(`File not found: ${file} `);
    }
    return files[file];
  };

  // Using yieldLimit and execLimit together is tricky. One is for yielding
  // to the event loop every Xms and the other is halting the execution
  // after Xms. What we want is to yeild but if we other got into an execution
  // path that doesn't yield (this seems to happen) then we want to halt
  // altogther.
  // This is why we implement the `resetLimit` function which allows us
  // to reset the execution limit `execStart` on every yield.
  Skulpt.configure({
    read: builtinRead,
    output: Messenger.output,
    height: 300,
    yieldLimit: 100,
    // Removed execLimit for users with blase computers hitting timeout errors
  });

  // Set context funtion setTimeout to prevent error `TypeError: Illegal invocation` when call in promise
  Skulpt.setTimeout = window.setTimeout.bind(window);

  Skulpt.onAfterImport = function(library) {
    if (library === 'turtle') {
      const _listen = Skulpt.TurtleGraphics.raw.Screen.prototype.$listen;
      // When turtle want listen keypress
      Skulpt.TurtleGraphics.raw.Screen.prototype.$listen = function() {
        // force made outputInterruptTest false;
        Skulpt.execLimit = Number.MAX_VALUE;
        _listen.apply(this);
      };
    }
  };

  function resetLimit() {
    if (halted) {
      return;
    }

    Skulpt.execStart = Date.now();
    setTimeout(resetLimit);
  }

  Skulpt.TurtleGraphics = {
    target: 'skulpt_target',
    width: Math.max(el.clientWidth * 2.5, 2000),
    height: Math.max(el.clientHeight * 2.5, 2000),
  };

  Skulpt.inputfun = function(prompt) {
    Skulpt.execLimit = Number.MAX_VALUE;

    if (prompt) {
      Messenger.output(prompt);
    }

    Messenger.inputEvent();

    return new Promise(resolve => {
      Messenger.once('write', s => {
        resolve(s[s.length - 1] === '\n' ? s.slice(0, -1) : s);
        resetLimit();
      });
    });
  };

  function center() {
    // If size is 0 then the element must be hidden (say we're on the console)
    // the best way to handle this is keep trying until it could actually
    // work (when the user switches to the result view).
    if (
      el.clientHeight === 0 ||
      el.clientHeight === 0 ||
      (el.scrollHeight === el.clientHeight && el.scrollWidth === el.clientWidth)
    ) {
      setTimeout(center, 300);
    }

    el.scrollTop = el.scrollHeight / 2 - el.clientHeight / 2;
    el.scrollLeft = el.scrollWidth / 2 - el.clientWidth / 2;
  }

  setTimeout(() => {
    const span = document.createElement('span');
    span.innerText = 'center';

    span.style.left = '5px';
    span.style.top = '0';
    span.style.position = 'fixed';
    span.style.color = 'grey';
    span.style.cursor = 'pointer';
    span.style.zIndex = '9999';
    span.style.display = 'flex';

    span.onclick = center;

    document.body.appendChild(span);
    center();
  }, 300);

  // Focus on the turtle target so that if the user can send it
  // keypress action.
  setTimeout(() => el.focus(), 100);
  try {
    Skulpt.misceval
      .asyncToPromise(() =>
        Skulpt.importMainWithBody('<stdin>', false, code, true),
      )
      .then(
        () => {
          halted = true;
          Messenger.result({ data: '' });
        },
        err => {
          halted = true;

          if (err.nativeError) {
            console.error(err.nativeError); // eslint-disable-line
          }

          // Todo handle skulpt error object to get proper traceback.
          Messenger.result({ error: err.toString() });
        },
      );
    resetLimit();
  } catch (err) {
    // Some errors are sync.
    Messenger.result({ error: err.toString() });
  }
});

Messenger.ready();
