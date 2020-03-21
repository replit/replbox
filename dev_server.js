const express = require('express');
const midware = require('webpack-dev-middleware');
const webpack = require('webpack');
const config = require('./webpack.config');

const app = express();
console.log(config)
const compiler = webpack(config);
app.use(midware(compiler, {
  publicPath: '/dist',    
}));

const uploadedFiles = [];
app.post('/data/upload', (request, response) => {
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
});

app.get('/data/web_project/:id/:fileName?', (request, response) => {
  const { id, fileName = 'index.htmnl' } = req.params.id;
  const projectFiles = uploadedFiles[id];
  const file = projectFiles[fileName];
  response.writeHead(200, {
    'Content-Type': 'text/html',
  });
  response.end(file);
});

app.use(express.static('dev'));
app.use('/dist', express.static('dist'));
app.use('/codemirror', express.static('node_modules/codemirror'))


app.listen(8000);
