const http = require('http');
const staticHandler = require('serve-handler');

let server;

const uploadedFiles = [];

function webProjectHandler(request, response) {
  if (request.url.endsWith('upload')) {
    // data/web_project/upload
    let body = '';
    request.on('data', chunk => {
      body += chunk.toString();
    });
    request.on('end', () => {
      body = JSON.parse(body);

      uploadedFiles.push(body);
      const id = uploadedFiles.length - 1;

      response.writeHead(200, {
        'Content-Type': 'text/json',
      });
      response.end(JSON.stringify({ id }));
    });

    return;
  }

  // /data/web_prject/:id/:?file
  const [id, fileName = 'index.html'] = request.url.split('/').slice(-2);
  const projectFiles = uploadedFiles[id];
  const file = projectFiles[fileName];
  response.writeHead(200, {
    'Content-Type': 'text/html',
  });
  response.end(file);
}

function setup(done) {
  server = http.createServer((request, response) => {
    if (request.url.startsWith('/data')) {
      webProjectHandler(request, response);
      return;
    }

    staticHandler(request, response);
  });
  server.listen(5050, done);
}

function teardown(done) {
  if (server) {
    server.close(done);
  } else {
    done();
  }
}

module.exports = {
  setup,
  teardown,
};
