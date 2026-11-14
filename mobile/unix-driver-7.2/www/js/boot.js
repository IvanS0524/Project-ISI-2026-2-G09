'use strict';
/* ============================================================
   UniX Driver · Arranque, autenticación en pantalla y botón Atrás
   ============================================================ */

const AUTH_UI = (() => {
  const set = (id, txt, cls) => UI.setNotice(id, txt, cls);

  function tab(nombre) {
    const n = (nombre === 'registro' || nombre === 'recuperar') ? nombre : 'login';
    document.querySelectorAll('#authTabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === n));
    [['tabLogin', 'login'], ['tabRegistro', 'registro'], ['tabRecuperar', 'recuperar']].forEach(([id, k]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', k !== n);
    });
    // Si la pantalla de acceso está oculta, se muestra (p. ej. al tocar "Crear cuenta" desde otro sitio)
    try { if (typeof UI !== 'undefined' && UI.goToScreen) UI.goToScreen(0, false); } catch (_) {}
    const panel = document.getElementById('tab' + n.charAt(0).toUpperCase() + n.slice(1));
    if (panel && panel.scrollIntoView) { try { panel.scrollIntoView({ block: 'nearest' }); } catch (_) {} }
    const first = panel && panel.querySelector('input');
    if (first) setTimeout(() => { try { first.focus(); } catch (_) {} }, 120);
  }

  function entrar(usuario) {
    UI.actualizarBadgeUsuario();
    UI.limpiarUIviaje();
    UI.goToScreen(1, true);
    if (typeof MAPA !== 'undefined') setTimeout(() => { try { MAPA.invalidar(); } catch (_) {} }, 240);
  }

  async function ingresar() {
    const email = document.getElementById('aEmail').value;
    const pass = document.getElementById('aPass').value;
    const rec = document.getElementById('aRecordar').checked;
    set('authNotice', '');
    const btn = document.getElementById('authBtn');
    btn.disabled = true; btn.textContent = 'Verificando…';
    let r;
    try { r = await AUTH.ingresar(email, pass, rec); }
    catch (e) { r = { ok: false, error: 'No se pudo verificar la cuenta. Inténtalo de nuevo.' }; }
    btn.disabled = false; btn.textContent = 'Ingresar';
    if (!r.ok) { set('authNotice', '⚠️ ' + r.error, 'error'); return; }
    document.getElementById('aPass').value = '';
    set('authNotice', '');
    entrar(r.usuario);
  }

  async function registrar() {
    const nombre = (document.getElementById('rNombre').value || '').trim();
    const email = (document.getElementById('rEmail').value || '').trim();
    const pass = document.getElementById('rPass').value;
    const pass2 = document.getElementById('rPass2').value;
    set('regNotice', '');
    // Validaciones en el orden en que el usuario llena el formulario
    if (nombre.length < 2) { set('regNotice', '⚠️ Escribe tu nombre completo.', 'error'); return; }
    if (!AUTH.emailValido(email)) { set('regNotice', '⚠️ El correo no tiene un formato válido (ejemplo: nombre@correo.com).', 'error'); return; }
    if (!pass || String(pass).length < 6) { set('regNotice', '⚠️ La contraseña debe tener al menos 6 caracteres.', 'error'); return; }
    if (pass !== pass2) { set('regNotice', '⚠️ Las contraseñas no coinciden.', 'error'); return; }

    const btn = document.getElementById('regBtn');
    btn.disabled = true; btn.textContent = 'Creando cuenta…';
    let r;
    try { r = await AUTH.registrar({ nombre, email, pass }); }
    catch (e) { r = { ok: false, error: 'No se pudo crear la cuenta. Inténtalo de nuevo.' }; }
    btn.disabled = false; btn.textContent = 'Crear mi cuenta';
    if (!r.ok) {
      const existe = r.code === 'EMAIL_EXISTE' || r.code === 'EMAIL_EXISTS';
      set('regNotice', '⚠️ ' + r.error + (existe ? ' <b>¿Olvidaste tu contraseña?</b>' : ''), 'error');
      return;
    }
    set('regNotice', '✅ Cuenta creada para <b>' + r.usuario.email + '</b>. Ya puedes ingresar.', 'success');
    document.getElementById('aEmail').value = r.usuario.email;
    document.getElementById('aPass').value = '';
    setTimeout(() => { tab('login'); set('authNotice', '✅ Cuenta creada. Escribe tu contraseña para ingresar.', 'success');
      const ap = document.getElementById('aPass'); if (ap) { try { ap.focus(); } catch (_) {} } }, 900);
  }

  async function solicitarCodigo() {
    const email = (document.getElementById('recEmail').value || '').trim();
    set('recNotice', '');
    if (!AUTH.emailValido(email)) { set('recNotice', '⚠️ Escribe un correo válido (ejemplo: nombre@correo.com).', 'error'); return; }
    const btn = document.getElementById('recBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando…'; }
    let r;
    try { r = await AUTH.solicitarCodigo(email); }
    catch (e) { r = { ok: false, error: 'No se pudo procesar la solicitud. Revisa tu conexión.' }; }
    if (btn) { btn.disabled = false; btn.textContent = 'Generar código de recuperación'; }
    if (!r.ok) { set('recNotice', '⚠️ ' + r.error, 'error'); return; }
    if (r.enviado) {
      // Proveedor de correo real (Firebase): el enlace llega al buzón del usuario.
      document.getElementById('recPaso2').classList.add('hidden');
      set('recNotice', '✅ ' + r.mensaje, 'success');
      return;
    }
    document.getElementById('recPaso2').classList.remove('hidden');
    set('recNotice', '🔑 Código de recuperación: <b>' + r.codigo + '</b><br><small>Usa este código para crear tu nueva contraseña.</small>', 'success');
  }

  async function cambiarConCodigo() {
    const r = await AUTH.cambiarConCodigo(
      document.getElementById('recEmail').value,
      document.getElementById('recCode').value,
      document.getElementById('recPass').value,
      document.getElementById('recPass2').value
    );
    if (!r.ok) { set('recNotice', '⚠️ ' + r.error, 'error'); return; }
    set('recNotice', '✅ Contraseña actualizada. Ya puedes ingresar.', 'success');
    document.getElementById('recPaso2').classList.add('hidden');
    tab('login');
  }

  function google() {
    const r = AUTH.google();
    set('googleNotice', '⚠️ ' + r.error, 'error');
  }

  function entrarInvitado() {
    const u = AUTH.invitado();
    entrar(u);
  }

  function salir() {
    AUTH.salir();
    UI.cerrarCuenta();
    resetTripState();
    UI.actualizarBadgeUsuario();
    UI.goToScreen(0, true);
  }

  function borrarCuenta() {
    if (window.confirm && !window.confirm('¿Eliminar tu cuenta y los datos de sesión en este dispositivo? El historial de viajes se conserva.')) return;
    AUTH.eliminarCuenta();
    UI.cerrarCuenta();
    UI.actualizarBadgeUsuario();
    UI.goToScreen(0, true);
  }

  return { tab, ingresar, registrar, solicitarCodigo, cambiarConCodigo, google, entrarInvitado, salir, borrarCuenta, eliminarCuenta: borrarCuenta, entrar };
})();

/* Las pestañas se atienden por delegación desde el documento: si algo falla
   al cargar datos, el botón «Crear cuenta» sigue abriendo su sección. */
document.addEventListener('click', ev => {
  const b = ev.target.closest ? ev.target.closest('#authTabs .tab') : null;
  if (!b || !b.dataset || !b.dataset.tab) return;
  ev.preventDefault();
  const fn = (window.AUTH_UI && window.AUTH_UI.tab) || null;
  if (fn) fn(b.dataset.tab);
}, true);

try { window.AUTH_UI = AUTH_UI; } catch (_) {}

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Datos: destinos + tarifas
  let n = 0;
  try { n = await cargarDestinos(); } catch (e) { console.warn('Destinos:', e); }
  try { UI.renderFrecuentes(); } catch (_) {}

  // 2) Reloj
  try { UI.reloj(); setInterval(UI.reloj, 30000); } catch (_) {}

  // 3) Pestañas de autenticación
  try { AUTH_UI.tab('login'); } catch (_) {}

  // 4) Recuperar datos persistidos (historial, cuentas y sesión)
  try { await hidratarPersistencia(); } catch (_) {}
  try { await AUTH.hidratar(); } catch (_) {}

  // 5) Sesión existente → entrar directo (la barra inferior aparece solo aquí)
  const s = AUTH.sesion();
  UI.actualizarBadgeUsuario();
  if (s && (s.nombre || s.email || s.invitado)) { UI.goToScreen(1, true); } else { UI.goToScreen(0, true); }

  // 6) Selector de vehículo inicial
  if (document.getElementById('btnMoto')) document.getElementById('btnMoto').classList.add('active');

  // 7) Mapa base de la pantalla principal
  if (typeof MAPA !== 'undefined' && MAPA.disponible) {
    setTimeout(() => { try { MAPA.invalidar(); } catch (_) {} }, 320);
  }

  // 8) Botón Atrás de Android
  const onBack = () => UI.atras();
  document.addEventListener('backbutton', onBack, false);
  if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App) {
    try { Capacitor.Plugins.App.addListener('backButton', onBack); } catch (_) {}
  }
  document.body.classList.add('nativo');

  // 9) Aviso de datos cargados
  const sub = document.getElementById('destinoSub');
  if (sub && n) sub.textContent = n + ' lugares · barrios, hoteles, clínicas, centros comerciales…';

  // 10) Errores no controlados visibles en consola
  window.addEventListener('unhandledrejection', ev => { console.error('Promesa rechazada:', ev.reason); });
});

// Pausa/reanudación: el WebView conserva el estado y los mapas se recalculan
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && typeof MAPA !== 'undefined') { try { MAPA.invalidar(); } catch (_) {} }
});
