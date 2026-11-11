#!/usr/bin/env node
/* Convierte www/data/destinos.json en www/data/destinos.js (script que usa el WebView offline). */
const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..', 'www', 'data');
const json = JSON.parse(fs.readFileSync(path.join(base, 'destinos.json'), 'utf8'));
fs.writeFileSync(path.join(base, 'destinos.js'),
  'window.UNIX_DESTINOS = ' + JSON.stringify(json) + ';\n', 'utf8');
console.log('✔ destinos.js regenerado · ' + json.destinos.length + ' destinos');
