#!/usr/bin/env node
/* Convierte www/data/destinos.json en www/data/destinos.js (script que usa el WebView offline). */
const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..', 'www', 'data');
const json = JSON.parse(fs.readFileSync(path.join(base, 'destinos.json'), 'utf8'));
json.destinos = (json.destinos || []).filter(d => {
  if (!d || d.estado === 'no verificado') return false;
  const lat = Number(d.lat);
  const lon = Number(d.lon);
  return d.lat != null && d.lon != null && Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
});
if (json.meta) json.meta.total_destinos = json.destinos.length;
fs.writeFileSync(path.join(base, 'destinos.js'),
  'window.UNIX_DESTINOS = ' + JSON.stringify(json) + ';\n', 'utf8');
console.log('✔ destinos.js regenerado · ' + json.destinos.length + ' destinos');
