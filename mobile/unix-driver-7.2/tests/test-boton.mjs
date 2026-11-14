import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import { fileURLToPath } from 'url';
const www = fileURLToPath(new URL('../www', import.meta.url)).replace(/\/+$/, '');
const vc = new VirtualConsole(); const errs = [];
vc.on('jsdomError', e => { const m = String(e.message || e);
  if (!/getContext|not implemented|Could not parse CSS|canvas|Could not load|Viewport/i.test(m)) errs.push(m); });
const dom = new JSDOM(fs.readFileSync(www + '/index.html', 'utf8'),
  { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc, pretendToBeVisual: true });
const w = dom.window, d = w.document;
const L = () => { const o = { setView(){return o}, fitBounds(){return o}, addLayer(){return o}, removeLayer(){return o}, remove(){}, on(){return o}, invalidateSize(){return o} }; return o; };
w.L = { map: L, tileLayer: () => ({ addTo(){return this}, on(){return this} }), marker: () => ({ addTo(){return this}, bindPopup(){return this}, setLatLng(){return this} }),
  polyline: () => ({ addTo(){return this} }), latLngBounds: () => ({}), divIcon: () => ({}), icon: () => ({}) };
const dbUsuarios = new Map();
let seqUsuario = 1;
w.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.endsWith('/usuarios/registro')) {
    const body = JSON.parse(opts.body || '{}');
    const correo = String(body.correo || '').toLowerCase();
    if (dbUsuarios.has(correo)) return { ok: false, status: 400, json: async () => ({ detail: 'Ya existe una cuenta con ese correo.' }) };
    const nuevo = { id_usuario: seqUsuario++, nombre: body.nombre, correo, contrasena: body.contrasena };
    dbUsuarios.set(correo, nuevo);
    return { ok: true, status: 201, json: async () => ({ id_usuario: nuevo.id_usuario, nombre: nuevo.nombre, correo: nuevo.correo }) };
  }
  if (u.endsWith('/usuarios/login')) {
    const body = JSON.parse(opts.body || '{}');
    const correo = String(body.correo || '').toLowerCase();
    const usr = dbUsuarios.get(correo);
    if (!usr) return { ok: false, status: 404, json: async () => ({ detail: 'No hay ninguna cuenta con ese correo.' }) };
    if (body.contrasena !== usr.contrasena) return { ok: false, status: 401, json: async () => ({ detail: 'Contraseña incorrecta.' }) };
    return { ok: true, status: 200, json: async () => ({ id_usuario: usr.id_usuario, nombre: usr.nombre, correo: usr.correo }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};
for (const f of ['config/api-env.js','config/firebase-config.js','config/tarifas.js','js/config-tarifas.js','js/storage.js','js/apiService.js','js/auth.js','js/mapa.js',
  'data/destinos.js','js/state.js','js/destinos.js','js/origen.js','js/ui.js','js/flows.js','js/viaje.js','js/boot.js']) {
  if (!fs.existsSync(www + '/' + f)) continue;
  const c = d.createElement('script'); c.textContent = fs.readFileSync(www + '/' + f, 'utf8'); d.body.appendChild(c);
}
d.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
await new Promise(r => setTimeout(r, 300));
let pass = 0, fail = 0;
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const t = (n, c, x = '') => { c ? (pass++, console.log('PASS · ' + n + (x ? ' → ' + x : ''))) : (fail++, console.log('FAIL · ' + n + (x ? ' → ' + x : ''))); };
const $ = id => d.getElementById(id);
const vis = id => { const e = $(id); if (!e) return false;
  for (let n = e; n && n.classList; n = n.parentElement) if (n.classList.contains('hidden')) return false;
  return !!(e.offsetParent !== null || e.getBoundingClientRect().width > 0 || true); };

// 1) clic en la pestaña "Crear cuenta"
const tabReg = [...d.querySelectorAll('#authTabs .tab')].find(b => b.dataset.tab === 'registro');
t('existe la pestaña Crear cuenta', !!tabReg, tabReg && tabReg.textContent.trim());
click(tabReg); await new Promise(r => setTimeout(r, 60));
t('la sección de registro se abre', !$('tabRegistro').classList.contains('hidden'));
t('la de login se oculta', $('tabLogin').classList.contains('hidden'));
t('la pestaña queda activa', tabReg.classList.contains('active'));
t('campos de registro presentes', ['rNombre','rEmail','rPass','rPass2'].every(id => !!$(id)));
// 2) clic sobre un hijo del botón (el texto interno) → delegación
click(d.querySelector('#authTabs .tab[data-tab="login"]')); await new Promise(r => setTimeout(r, 40));
const reg2 = d.querySelector('#authTabs .tab[data-tab="registro"]');
click(reg2.firstChild || reg2); await new Promise(r => setTimeout(r, 40));
t('clic sobre el texto interno también abre registro', !$('tabRegistro').classList.contains('hidden'));
// 3) enlace "Iniciar sesión" dentro de registro
const back = [...d.querySelectorAll('#tabRegistro .auth-switch a')][0];
t('existe enlace Iniciar sesión en registro', !!back);
if (back) { click(back); await new Promise(r => setTimeout(r, 40)); }
t('enlace vuelve al login', !$('tabLogin').classList.contains('hidden') && $('tabRegistro').classList.contains('hidden'));
// 4) formulario: crear cuenta real y entrar
click(d.querySelector('#authTabs .tab[data-tab="registro"]')); await new Promise(r => setTimeout(r, 40));
$('rNombre').value = 'Luis Perez'; $('rEmail').value = 'luis@correo.com'; $('rPass').value = 'clave123'; $('rPass2').value = 'clave123';
click($('regBtn')); await new Promise(r => setTimeout(r, 400));
t('cuenta creada tras el arreglo', /Cuenta creada/i.test($('regNotice').textContent), $('regNotice').textContent.replace(/<[^>]+>/g,'').slice(0,70));
await new Promise(r => setTimeout(r, 900));
t('tras crearla, vuelve al login', $('tabLogin').classList.contains('hidden') === false);
$('aEmail').value = 'luis@correo.com'; $('aPass').value = 'clave123'; click($('authBtn'));
await new Promise(r => setTimeout(r, 300));
t('ingreso con la cuenta recién creada', $('screen1').classList.contains('active'));
t('errores JS: ' + errs.length, errs.length === 0, errs.slice(0,2).join(' | '));
console.log(`TOTAL ${pass}/${pass+fail} PASS`);
process.exit(fail ? 1 : 0);
