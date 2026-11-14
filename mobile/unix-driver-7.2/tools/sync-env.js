'use strict';
/**
 * UniX Driver · Inyector de variables de entorno (.env -> www/config/api-env.js)
 * Lee UNIX_API_BASE_URL desde mobile/unix-driver-7.2/.env y genera www/config/api-env.js
 * para exponer window.UNIX_API_URL sin quemar direcciones IP en el código fuente.
 */
const fs = require('fs');
const path = require('path');

const raizProyecto = path.resolve(__dirname, '..');
const rutaEnv = path.join(raizProyecto, '.env');
const rutaSalida = path.join(raizProyecto, 'www', 'config', 'api-env.js');
const DEFAULT_URL = 'http://localhost:8000';

function leerUrlDesdeEnv() {
  if (!fs.existsSync(rutaEnv)) {
    return DEFAULT_URL;
  }
  const contenido = fs.readFileSync(rutaEnv, 'utf8');
  const lineas = contenido.split(/\r?\n/);
  for (const linea of lineas) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const match = limpia.match(/^UNIX_API_BASE_URL\s*=\s*(.+)$/);
    if (match) {
      const valor = match[1]
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/^(https?):\/(?!\/)/i, '$1://')
        .replace(/\/+$/, '');
      if (valor) return valor;
    }
  }
  return DEFAULT_URL;
}

const apiUrl = leerUrlDesdeEnv();
const jsGenerado = `'use strict';
/* Archivo autogenerado por tools/sync-env.js a partir de .env */
window.UNIX_API_URL = ${JSON.stringify(apiUrl)};
`;

fs.mkdirSync(path.dirname(rutaSalida), { recursive: true });
fs.writeFileSync(rutaSalida, jsGenerado, 'utf8');
console.log('[env:sync] window.UNIX_API_URL ->', apiUrl, '(', path.relative(raizProyecto, rutaSalida), ')');

