module.exports = (e, { isIframe }) => {
  let error = e.message;

  if (e.stack) {
    let lines = e.stack.trim().split('\n');
    const message = `${e.name}: ${e.message}`;
    if (lines[0] !== message) {
      lines.unshift(message);
    }

    if (e.stack.indexOf('<anonymous>') !== -1) {
      // Chrome
      lines = lines.slice(0, isIframe ? -4 : -3);
      // line format: at {name} ({context}, <anonymous>:line:col)
      lines = lines
        .map((line, i) => {
          // 0 is the message
          if (i === 0) {
            return line;
          }

          if (!line.match(/<anonymous>/)) {
            return null;
          }

          let m;
          m = line.trim().match(/^at ([^(]+) \(/);
          const name = (m && m[1]) || 'eval';

          m = line.match(/<anonymous>:(\d+):(\d+)/);
          const lineNo = (m && m[1]) || undefined;
          const columnNo = (m && m[2]) || undefined;

          return formatLine(name, lineNo, columnNo);
        })
        .filter(line => line != null);
    } else if (e.stack.indexOf('> eval') !== -1) {
      // Firefox
      // The message is not part of the stack in FF
      lines = lines.slice(0, isIframe ? -4 : -3);

      // line format: {name}@{context} > eval:line:col
      lines = lines
        .map((line, i) => {
          // 0 is the message
          if (i === 0) {
            return line;
          }

          if (!line.match(/> eval/)) {
            return null;
          }

          let m;
          m = line.trim().match(/^([^@]*)@/);
          const name = (m && m[1]) || 'eval';

          m = line.match(/> eval:(\d+):(\d+)/);
          const lineNo = (m && m[1]) || undefined;
          const columnNo = (m && m[2]) || undefined;

          return formatLine(name, lineNo, columnNo);
        })
        .filter(line => line != null);
    } else if (e.stack.indexOf('eval@[native code]') !== -1) {
      // Safari
      lines = lines.slice(0, isIframe ? -5 : -4);

      lines = lines.map((line, i) => {
        if (i === 0) {
          return line;
        }

        let name = line;

        if (name === 'eval code') {
          name = 'eval';
        }

        if (i === 1) {
          return formatLine(name, e.line, e.column);
        }

        return formatLine(name);
      });
    }

    // TODO: IE

    error = lines.join('\n');
  }

  return error;
};

function formatLine(name, lineNo, columnNo) {
  let ret = `    at ${name}`;
  if (typeof lineNo !== 'undefined') {
    ret += `:${lineNo}:${columnNo}`;
  }
  return ret;
}
