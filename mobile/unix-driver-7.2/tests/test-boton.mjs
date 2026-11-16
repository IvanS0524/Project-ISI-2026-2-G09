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
  const mUsr = u.match(/\/usuarios\/(\d+)$/);
  if (mUsr) {
    const id = Number(mUsr[1]);
    const usr = [...dbUsuarios.values()].find(x => x.id_usuario === id);
    if (!usr) return { ok: false, status: 404, json: async () => ({ detail: 'Usuario no encontrado' }) };
    if ((opts.method || 'GET').toUpperCase() === 'PUT') {
      const body = JSON.parse(opts.body || '{}');
      if (body.nombre) usr.nombre = body.nombre;
      if (body.telefono !== undefined) usr.telefono = body.telefono;
      if (body.fecha_nacimiento !== undefined) usr.fecha_nacimiento = body.fecha_nacimiento;
    }
    return { ok: true, status: 200, json: async () => ({
      id_usuario: usr.id_usuario, nombre: usr.nombre, correo: usr.correo,
      telefono: usr.telefono || null, fecha_nacimiento: usr.fecha_nacimiento || null
    }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};
for (const f of ['config/api-env.js','config/tarifas.js','js/storage.js','js/apiService.js','js/auth.js','js/mapa.js',
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
// 5) abrir Perfil a pantalla completa, editar perfil (PUT /usuarios/{id}) y cerrar sesión con #btnLogout
w.eval('UI.abrirCuenta()'); await new Promise(r => setTimeout(r, 80));
t('pantalla Perfil se abre y oculta inicio', !$('cuentaOverlay').classList.contains('hidden') && $('cuentaOverlay').classList.contains('active') && !$('screen1').classList.contains('active'));
t('en Perfil se oculta vista de viaje inactivo', !$('screen11').classList.contains('active') && ($('viajeBody').classList.contains('hidden')));
t('tab Perfil queda activo en barra inferior', d.querySelector('.nav-btn[data-cuenta="1"]').classList.contains('active'));
t('formulario de perfil precarga nombre y correo', $('perfilNombre').value === 'Luis Perez' && $('perfilEmail').value === 'luis@correo.com');
$('perfilNombre').value = 'Luis Fernando Perez';
$('perfilTelefono').value = '3001234567';
$('perfilNacimiento').value = '2001-05-14';
click($('btnGuardarPerfil')); await new Promise(r => setTimeout(r, 120));
t('guardar perfil actualiza datos en RDS y sesión', /actualizado correctamente/i.test($('perfilNotice').textContent) && $('cuentaNombre').textContent === 'Luis Fernando Perez');
click($('btnLogout')); await new Promise(r => setTimeout(r, 60));
t('cerrar sesión cierra vista Perfil', $('cuentaOverlay').classList.contains('hidden'));
t('cerrar sesión oculta barra inferior y activa login', !d.body.classList.contains('auth-ok') && $('screen0').classList.contains('active') && !$('screen1').classList.contains('active'));
t('cerrar sesión limpia campos de login', $('aEmail').value === '' && $('aPass').value === '');

// 6) pestaña "Más": menú dedicado, sin prototipo, modales informativos y cerrar sesión
$('aEmail').value = 'luis@correo.com'; $('aPass').value = 'clave123'; click($('authBtn'));
await new Promise(r => setTimeout(r, 200));
const btnMas = d.querySelector('.nav-btn[data-screen="13"]');
t('botón Más en barra inferior apunta a pantalla 13', !!btnMas);
click(btnMas); await new Promise(r => setTimeout(r, 60));
t('pestaña Más abre #screen13 y oculta #screen11', $('screen13').classList.contains('active') && !$('screen11').classList.contains('active') && $('viajeBody').classList.contains('hidden'));
t('tab Más queda activo en barra inferior', btnMas.classList.contains('active'));
const masTxt = $('screen13').textContent;
t('pestaña Más contiene los 4 ítems requeridos', ['Acerca de UniX Driver', 'Términos y condiciones', 'Ayuda y soporte', 'Cerrar sesión'].every(x => masTxt.includes(x)));
t('pestaña Más sin texto de prototipo y con pie limpio', !/prototipo|simulaci/i.test(masTxt) && /UniX Driver · Cartagena/.test(masTxt));
click($('btnMasAcerca')); await new Promise(r => setTimeout(r, 40));
t('Acerca de UniX Driver abre modal con Uber, DiDi e inDrive', !$('masInfoOverlay').classList.contains('hidden') && /Uber.*DiDi.*inDrive/i.test($('masModalBody').textContent));
click($('btnMasTerminos')); await new Promise(r => setTimeout(r, 40));
t('Términos y condiciones actualiza el modal', $('masModalTitle').textContent.includes('Términos') && /datos personales/i.test($('masModalBody').textContent));
click($('btnMasSoporte')); await new Promise(r => setTimeout(r, 40));
t('Ayuda y soporte actualiza el modal', $('masModalTitle').textContent.includes('Ayuda') && /Cartagena/i.test($('masModalBody').textContent));
click(d.querySelector('.mas-modal-btn')); await new Promise(r => setTimeout(r, 40));
t('botón Entendido cierra el modal de Más', $('masInfoOverlay').classList.contains('hidden'));
click($('btnMasLogout')); await new Promise(r => setTimeout(r, 60));
t('Cerrar sesión desde Más cierra sesión y vuelve a Login', !w.localStorage.getItem('unixdriver.sesion.v2') && !d.body.classList.contains('auth-ok') && $('screen0').classList.contains('active'));
t('errores JS: ' + errs.length, errs.length === 0, errs.slice(0,2).join(' | '));
console.log(`TOTAL ${pass}/${pass+fail} PASS`);
process.exit(fail ? 1 : 0);
