'use strict';
const fs = require('fs'), path = require('path');

// Asegurar que www/config/api-env.js esté sincronizado con .env antes de empaquetar
require('./sync-env.js');

const raiz = path.join(__dirname, '..', 'www');
let html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, f) =>
  '<style>\n' + fs.readFileSync(path.join(raiz, f), 'utf8') + '\n</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) =>
  '<script>\n' + fs.readFileSync(path.join(raiz, f), 'utf8') + '\n</script>');
const salida = path.join(__dirname, '..', 'UniX-Driver.html');
fs.writeFileSync(salida, html);
console.log('HTML único generado:', salida, (html.length / 1024).toFixed(0) + ' KB');
