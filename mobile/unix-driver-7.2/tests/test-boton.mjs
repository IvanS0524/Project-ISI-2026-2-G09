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
// Pre-sembrar administrador en memoria (id_rol = 2)
dbUsuarios.set('jorge.herrera@unixdriver.com', {
  id_usuario: 99,
  nombre: 'Jorge Herrera',
  correo: 'jorge.herrera@unixdriver.com',
  contrasena: 'admin123',
  id_rol: 2,
  estado: 'ACTIVO'
});
let configComisionHist = [
  { id_configuracion: 1, porcentaje: 10, fecha_inicio: '2026-10-01T00:00:00', estado: 'ACTIVA', id_administrador: 99 }
];
const mockViajes = [
  {
    id_viaje: 101,
    estado: 'COMPLETADO',
    precio_final: 12000,
    fecha_hora_inicio: '2026-11-16T14:20:00',
    oferta: {
      precio_estimado: 12000,
      plataforma: { nombre: 'Uber' },
      busqueda: { origen: 'Manga', destino: 'Bocagrande', id_usuario: 1 }
    }
  },
  {
    id_viaje: 102,
    estado: 'CANCELADO',
    precio_final: 0,
    fecha_hora_inicio: '2026-11-17T09:10:00',
    oferta: {
      precio_estimado: 8500,
      plataforma: { nombre: 'DiDi' },
      busqueda: { origen: 'Centro', destino: 'Crespo', id_usuario: 1 }
    }
  }
];
w.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.endsWith('/usuarios/registro')) {
    const body = JSON.parse(opts.body || '{}');
    const correo = String(body.correo || '').toLowerCase();
    if (dbUsuarios.has(correo)) return { ok: false, status: 400, json: async () => ({ detail: 'Ya existe una cuenta con ese correo.' }) };
    const nuevo = { id_usuario: seqUsuario++, nombre: body.nombre, correo, contrasena: body.contrasena, id_rol: 1, estado: 'ACTIVO' };
    dbUsuarios.set(correo, nuevo);
    return { ok: true, status: 201, json: async () => ({ id_usuario: nuevo.id_usuario, nombre: nuevo.nombre, correo: nuevo.correo, id_rol: 1, estado: 'ACTIVO' }) };
  }
  if (u.endsWith('/usuarios/login')) {
    const body = JSON.parse(opts.body || '{}');
    const correo = String(body.correo || '').toLowerCase();
    const usr = dbUsuarios.get(correo);
    if (!usr) return { ok: false, status: 404, json: async () => ({ detail: 'No hay ninguna cuenta con ese correo.' }) };
    if (body.contrasena !== usr.contrasena) return { ok: false, status: 401, json: async () => ({ detail: 'Contraseña incorrecta.' }) };
    return { ok: true, status: 200, json: async () => ({ id_usuario: usr.id_usuario, nombre: usr.nombre, correo: usr.correo, id_rol: usr.id_rol || 1, estado: usr.estado || 'ACTIVO' }) };
  }
  if (/\/usuarios\/(\?|$)/.test(u)) {
    return { ok: true, status: 200, json: async () => [...dbUsuarios.values()] };
  }
  const mEst = u.match(/\/usuarios\/(\d+)\/estado$/);
  if (mEst && (opts.method || 'GET').toUpperCase() === 'PATCH') {
    const id = Number(mEst[1]);
    const usr = [...dbUsuarios.values()].find(x => x.id_usuario === id);
    if (!usr) return { ok: false, status: 404, json: async () => ({ detail: 'No encontrado' }) };
    const body = JSON.parse(opts.body || '{}');
    usr.estado = body.estado;
    return { ok: true, status: 200, json: async () => usr };
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
      telefono: usr.telefono || null, fecha_nacimiento: usr.fecha_nacimiento || null,
      id_rol: usr.id_rol || 1, estado: usr.estado || 'ACTIVO'
    }) };
  }
  if (/\/viajes\/(\?|$)/.test(u)) {
    return { ok: true, status: 200, json: async () => mockViajes };
  }
  if (u.endsWith('/comisiones/configuracion/activa')) {
    return { ok: true, status: 200, json: async () => configComisionHist[0] };
  }
  if (u.endsWith('/comisiones/configuracion/historial')) {
    return { ok: true, status: 200, json: async () => configComisionHist };
  }
  if (u.endsWith('/comisiones/configuracion') && (opts.method || 'GET').toUpperCase() === 'POST') {
    const body = JSON.parse(opts.body || '{}');
    configComisionHist.forEach(c => { c.estado = 'INACTIVA'; });
    const nueva = {
      id_configuracion: configComisionHist.length + 1,
      porcentaje: Number(body.porcentaje),
      fecha_inicio: body.fecha_inicio || new Date().toISOString(),
      estado: 'ACTIVA',
      id_administrador: body.id_administrador || 99
    };
    configComisionHist.unshift(nueva);
    return { ok: true, status: 201, json: async () => nueva };
  }
  if (u.endsWith('/comisiones/')) {
    const pct = configComisionHist[0].porcentaje;
    return {
      ok: true,
      status: 200,
      json: async () => [
        {
          id_comision: 1,
          id_viaje: 101,
          porcentaje_aplicado: pct,
          fecha_generacion: '2026-11-16T14:40:00',
          estado: 'GENERADA',
          monto_calculado: (12000 * pct) / 100,
          viaje: mockViajes[0]
        }
      ]
    };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};
for (const f of ['config/api-env.js','config/tarifas.js','js/storage.js','js/apiService.js','js/auth.js','js/mapa.js',
  'data/destinos.js','js/state.js','js/destinos.js','js/origen.js','js/ui.js','js/flows.js','js/viaje.js','js/admin.js','js/boot.js']) {
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

// 7) Login como Administrador (id_rol === 2) -> Panel de Administrador (#adminAppView)
$('aEmail').value = 'jorge.herrera@unixdriver.com'; $('aPass').value = 'admin123'; click($('authBtn'));
await new Promise(r => setTimeout(r, 250));
const sesAdmin = JSON.parse(w.localStorage.getItem('unixdriver.sesion.v2') || '{}');
t('sesión de administrador guarda id_rol=2 y estado=ACTIVO', sesAdmin.id_rol === 2 && sesAdmin.estado === 'ACTIVO');
t('login de administrador abre #adminAppView y activa admin-mode', !$('adminAppView').classList.contains('hidden') && d.body.classList.contains('admin-mode'));
t('KPIs de Panel se calculan desde la API', $('kpiPasajerosActivos').textContent === '1' && $('kpiViajesFinalizados').textContent === '1' && $('kpiComisionVigente').textContent === '10%');
t('Viajes recientes muestra destino de busqueda y plataforma', /Bocagrande/.test($('adminRecentTripsList').textContent) && /Uber/.test($('adminRecentTripsList').textContent));
click($('btnQuickUsuarios')); await new Promise(r => setTimeout(r, 40));
t('botón rápido Usuarios abre pestaña Usuarios', !$('adminTabUsuarios').classList.contains('hidden') && /Luis Fernando Perez/.test($('adminUsersList').textContent));
t('enmascararCorreo y enmascararTelefono cumplen formato de privacidad',
  w.eval("ADMIN.enmascararCorreo('carlos.mendoza@unicartagena.edu.co')") === 'car•••@unicartagena.edu.co' &&
  w.eval("ADMIN.enmascararTelefono('3001234567')") === '300 •••• 67');
const usersTxtDefault = $('adminUsersList').textContent;
t('tarjetas de usuario muestran ID y enmascaran correo y teléfono por defecto',
  /ID #1/.test(usersTxtDefault) && /lui•••@correo\.com/.test(usersTxtDefault) && /300 •••• 67 · Pasajero/.test(usersTxtDefault) && !/luis@correo\.com/.test(usersTxtDefault));
const btnEyeLuis = d.querySelector('#adminUsersList .admin-user-card[data-user-id="1"] .admin-eye-btn[title="Mostrar/ocultar datos de contacto"]');
t('existe botón ojo para mostrar/ocultar datos de contacto', !!btnEyeLuis);
click(btnEyeLuis); await new Promise(r => setTimeout(r, 30));
t('botón ojo revela correo y teléfono del usuario seleccionado manteniendo otros enmascarados',
  /luis@correo\.com/.test($('adminUsersList').textContent) && /3001234567 · Pasajero/.test($('adminUsersList').textContent) && /jor•••@unixdriver\.com/.test($('adminUsersList').textContent));
click(d.querySelector('#adminUsersList .admin-user-card[data-user-id="1"] .admin-eye-btn[title="Mostrar/ocultar datos de contacto"]')); await new Promise(r => setTimeout(r, 30));
$('adminUserSearch').value = 'luis@correo.com'; w.eval('ADMIN.filtrarUsuarios()');
t('buscador superior de usuarios filtra por correo completo aunque esté enmascarado', /Luis Fernando Perez/.test($('adminUsersList').textContent) && !/Jorge Herrera/.test($('adminUsersList').textContent));
$('adminUserSearch').value = ''; w.eval('ADMIN.filtrarUsuarios()');
click(d.querySelector('.admin-toggle-user-btn')); await new Promise(r => setTimeout(r, 120));
t('inactivar pasajero vía PATCH actualiza KPI en tiempo real', $('kpiPasajerosActivos').textContent === '0');
w.eval("ADMIN.irATab('comision')"); await new Promise(r => setTimeout(r, 40));
$('adminNuevoPorcentaje').value = '12.5'; w.eval('ADMIN.actualizarPreviewComision()');
click($('btnGuardarComision')); await new Promise(r => setTimeout(r, 160));
t('actualizar comisión vía POST actualiza KPI y COMISION_PCT', $('kpiComisionVigente').textContent === '12.5%' && w.eval('COMISION_PCT') === 0.125);
const btnActivarHist = d.querySelector('#adminHistConfigList .btn-activar-config');
t('historial de configuraciones muestra botón Activar en reglas inactivas', !!btnActivarHist && btnActivarHist.textContent.trim() === 'Activar');
click(btnActivarHist); await new Promise(r => setTimeout(r, 160));
t('activar configuración histórica con un clic restaura 10% en KPI y COMISION_PCT', $('kpiComisionVigente').textContent === '10%' && w.eval('COMISION_PCT') === 0.10 && /10%/.test($('adminComisionNotice').textContent));
const comViajesTxt = $('adminComisionesViajesList').textContent;
t('comisiones generadas por viaje aplica minimización de datos (sin origen/destino)', /Comisión #1 · Viaje #101/.test(comViajesTxt) && /Tarifa base:/.test(comViajesTxt) && !/Bocagrande|Centro/.test(comViajesTxt));
click($('btnAdminPerfil')); await new Promise(r => setTimeout(r, 120));
t('botón perfil admin abre #adminPerfilOverlay con rol y Ley 1581 de 2012', !$('adminPerfilOverlay').classList.contains('hidden') && /ID #99/.test($('adminPerfilRolBadge').textContent) && /Ley 1581 de 2012/.test($('adminPerfilOverlay').textContent));
$('adminPerfilNombre').value = 'Jorge Herrera Admin'; $('adminPerfilTelefono').value = '3159998877';
click($('btnGuardarPerfilAdmin')); await new Promise(r => setTimeout(r, 150));
const sesAdminUpd = JSON.parse(w.localStorage.getItem('unixdriver.sesion.v2') || '{}');
t('guardar perfil admin actualiza datos vía PUT /usuarios/99 y sesión activa', sesAdminUpd.nombre === 'Jorge Herrera Admin' && /actualizado correctamente/i.test($('adminPerfilNotice').textContent));
click($('btnCerrarPerfilAdmin')); await new Promise(r => setTimeout(r, 40));
t('cerrar modal de perfil admin oculta #adminPerfilOverlay', $('adminPerfilOverlay').classList.contains('hidden'));
w.eval("ADMIN.irATab('reportes')"); await new Promise(r => setTimeout(r, 40));
t('pestaña Reportes muestra plataformas, Top destinos y resumen operativo', /Uber/.test($('adminRepPlataformas').textContent) && /Bocagrande/.test($('adminRepDestinos').textContent) && $('repTotalFinalizados').textContent === '1');
click($('btnAdminLogout')); await new Promise(r => setTimeout(r, 60));
t('cerrar sesión desde Admin oculta #adminAppView y regresa a Login', $('adminAppView').classList.contains('hidden') && !d.body.classList.contains('admin-mode') && $('screen0').classList.contains('active'));

t('errores JS: ' + errs.length, errs.length === 0, errs.slice(0,2).join(' | '));
console.log(`TOTAL ${pass}/${pass+fail} PASS`);
process.exit(fail ? 1 : 0);
