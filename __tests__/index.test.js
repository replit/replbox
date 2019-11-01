const puppeteer = require('puppeteer');

jest.setTimeout(30000);

let server;
let browser;
beforeAll(async () => {
  browser = await puppeteer.launch({
    // This means we have pre-installed chromium
    executablePath: 'chromium-browser',

    // Enabling sandbox takes a lot more setup.
    // See https://github.com/GoogleChrome/puppeteer/issues/290
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
});

afterAll(async () => {
  await browser.close();
});

let page;
beforeEach(async () => {
  page = await browser.newPage();

  await page.goto('http://localhost:5050/__tests__/index.html', {
    waitUntil: 'networkidle0',
  });
});

afterEach(async () => {
  await page.close();
});

describe('javascript in iframe', () => {
  beforeEach(async () => {
    const bundleSrc = getLanguageBundle('javascript');
    await page.evaluate(async bundleSrc => {
      window.jsbox = new Replbox('javascript', {
        useIframe: true,
      });
      await window.jsbox.load({
        iframeOrigin: '/stuffjschild',
        languageBundleSrc: bundleSrc,
      });
    }, bundleSrc);
  });
  it('should run some code', async () => {
    const result = await page.evaluate(() => {
      return window.jsbox.evaluate('1 + 1', {});
    });
    expect(Number(result.data)).toEqual(2);
  });
  it('should maintain state', async () => {
    const result = await page.evaluate(async () => {
      await window.jsbox.evaluate('var x = 23', {});
      return jsbox.evaluate('x + 1', {});
    });
    expect(Number(result.data)).toEqual(24);
  });
  it('should stdout', async () => {
    const result = await page.evaluate(async () => {
      let str = '';
      function stdout(s) {
        str += s;
      }
      await window.jsbox.evaluate('console.log("foo")', { stdout });
      return str;
    });
    expect(result).toEqual('foo\n');
  });
  it('should reset', async () => {
    const result = await page.evaluate(async () => {
      await window.jsbox.evaluate('var x = 23', {});
      return await window.jsbox.evaluate('x', {});
    });
    expect(Number(result.data)).toEqual(23);
    const result2 = await page.evaluate(async () => {
      await window.jsbox.reset();
      return await window.jsbox.evaluate('x', {});
    });
    expect(result2.error).toMatch(/referenceerror/i);
  });
  it('should override prompt', async () => {
    const result = await page.evaluate(async () => {
      window.jsbox.overridePrompt();
      window.jsbox.write('hai');
      return window.jsbox.evaluate('prompt("s")', {});
    });
    expect(result.data).toEqual("'hai'");
  });
});

describe('infite loop protection', () => {
  it('should not block forever', async () => {
    const bundleSrc = getLanguageBundle('javascript');
    const result = await page.evaluate(async bundleSrc => {
      const replbox = new Replbox('javascript', { useIframe: true });
      await replbox.load({
        iframeOrigin: '/stuffjschild',
        languageBundleSrc: bundleSrc,
      });

      return replbox.evaluate('while (true) 1;', {
        infiniteLoopProtection: true,
      });
    }, bundleSrc);

    expect(result.error).toMatch(/range/i);
  });

  it('should not block forever', async () => {
    const bundleSrc = getLanguageBundle('babel');
    const result = await page.evaluate(async bundleSrc => {
      const replbox = new Replbox('babel', { useIframe: true });
      await replbox.load({
        iframeOrigin: '/stuffjschild',
        languageBundleSrc: bundleSrc,
      });

      return replbox.evaluate('while (true) 1;', {
        infiniteLoopProtection: true,
      });
    }, bundleSrc);

    expect(result.error).toMatch(/range/i);
  });

  it('should not block forever', async () => {
    const bundleSrc = getLanguageBundle('coffeescript');
    const result = await page.evaluate(async bundleSrc => {
      const replbox = new Replbox('coffeescript', { useIframe: true });
      await replbox.load({
        iframeOrigin: '/stuffjschild',
        languageBundleSrc: bundleSrc,
      });

      return replbox.evaluate('console.log 1 while 1', {
        infiniteLoopProtection: true,
      });
    }, bundleSrc);

    expect(result.error).toMatch(/range/i);
  });
});

describe('scheme in worker', () => {
  beforeEach(async () => {
    const bundleSrc = getLanguageBundle('scheme');
    await page.evaluate(async bundleSrc => {
      window.scbox = new Replbox('scheme');
      await window.scbox.load({ languageBundleSrc: bundleSrc });
    }, bundleSrc);
  });

  it('should run some code', async () => {
    const result = await page.evaluate(async () => {
      return window.scbox.evaluate('(+ 1 1)', {});
    });

    expect(Number(result.data)).toEqual(2);
  });

  it('should maintain state', async () => {
    const result = await page.evaluate(async () => {
      await window.scbox.evaluate('(define x 23)', {});
      return window.scbox.evaluate('x', {});
    });

    expect(Number(result.data)).toEqual(23);
  });

  it('should stdout', async () => {
    const result = await page.evaluate(async () => {
      let str = '';
      function stdout(s) {
        str += s;
      }

      await window.scbox.evaluate('(display "foo")', { stdout });
      return str;
    });

    expect(result).toEqual('foo');
  });

  it('should reset', async () => {
    const result = await page.evaluate(async () => {
      await window.scbox.evaluate('(define x 23)', {});
      return await window.scbox.evaluate('x', {});
    });
    expect(Number(result.data)).toEqual(23);

    const result2 = await page.evaluate(async () => {
      await window.scbox.reset();
      return await window.scbox.evaluate('x', {});
    });

    expect(result2.error).toMatch(/unbound/i);
  });
});

describe('web_project', () => {
  const FILES = [
    {
      name: 'index.html',
      content: `
        <!doctype html>
        <html>
          <body>
            <script src="index.js"></script>
            <div class="foo"></div>
          </body>
        </html>`,
    },
    {
      name: 'index.js',
      content: `
        function add(a, b) {
          return a + b;
        }`,
    },
  ];

  beforeEach(async () => {
    const bundleSrc = getLanguageBundle('web_project');
    await page.evaluate(async bundleSrc => {
      window.wpbox = new Replbox('web_project', { useIframe: true });
      await window.wpbox.load({
        iframeOrigin: '/stuffjschild',
        languageBundleSrc: bundleSrc,
      });
    }, bundleSrc);
  });

  it('should run jasmine test successfully', async () => {
    const result = await page.evaluate(
      async (files, suiteCode) => {
        return window.wpbox.runUnitTests({
          files,
          suiteCode,
        });
      },
      FILES,
      `
      describe('add', function() {
        it('should add', function() {
          expect(add(1, 3)).toBe(4);
        });
      });
      `,
    );

    expect(result).toEqual({
      passed: true,
      failures: [],
    });
  });

  it('should run jasmine test with failure', async () => {
    const result = await page.evaluate(
      async (files, suiteCode) => {
        return window.wpbox.runUnitTests({
          files,
          suiteCode,
        });
      },
      FILES,
      `
      describe('add', function() {
        it('should add', function() {
          expect(add(1, 3)).toBe(5);
        });
      });
    `,
    );

    expect(result.passed).toBeFalsy();
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].name).toEqual('should add');
    expect(result.failures[0].stack.length).toBeTruthy();
  });

  it('should run find foo', async () => {
    const result = await page.evaluate(
      async (files, suiteCode) => {
        return window.wpbox.runUnitTests({
          files,
          suiteCode,
        });
      },
      FILES,
      `
        describe('foo', function() {
          it('should find foo', function() {
            expect('.foo').toExist();
          });
        });
      `,
    );

    expect(result).toEqual({
      passed: true,
      failures: [],
    });
  });
});

function getLanguageBundle(language) {
  return `/dist/${language}.js`;
}
