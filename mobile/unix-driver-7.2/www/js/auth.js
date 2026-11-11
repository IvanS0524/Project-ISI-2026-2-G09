'use strict';
/* ============================================================
   UniX Driver · Autenticación LOCAL del dispositivo
   ------------------------------------------------------------
   - Correo + contraseña con hash (SHA-256 vía WebCrypto).
   - Sesión persistente ("recordar sesión").
   - Recuperación por código generado en el dispositivo.
   - Google: SOLO funciona si se configura Firebase. Sin credenciales
     devuelve GOOGLE_NO_CONFIGURADO y nunca simula un ingreso.
   ============================================================ */

const AUTH = (() => {
  const K_USERS = 'unixdriver.users.v2';
  const K_SES   = 'unixdriver.sesion.v2';
  const K_RESET = 'unixdriver.reset.v2';

  const leer = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (_) { return def; } };
  const escribir = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
    try { if (typeof STORE !== 'undefined') STORE.setJSON(k, v); } catch (_) {}
  };
  const borrar = k => {
    try { localStorage.removeItem(k); } catch (_) {}
    try { if (typeof STORE !== 'undefined') STORE.remove(k); } catch (_) {}
  };

  /** Reconstruye cuentas y sesión desde el almacenamiento nativo. */
  async function hidratar() {
    if (typeof STORE === 'undefined') return false;
    try {
      if (!localStorage.getItem(K_SES)) {
        const s = await STORE.getJSON(K_SES, null);
        if (s) localStorage.setItem(K_SES, JSON.stringify(s));
      }
      if (!localStorage.getItem(K_USERS)) {
        const u = await STORE.getJSON(K_USERS, null);
        if (Array.isArray(u) && u.length) localStorage.setItem(K_USERS, JSON.stringify(u));
      }
    } catch (_) { return false; }
    return true;
  }

  const mail = e => String(e || '').trim().toLowerCase();
  const emailValido = e => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail(e));

  function hash(pass, salt) {
    const txt = salt + '|' + pass;
    if (window.crypto && crypto.subtle && crypto.subtle.digest && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(buf => {
        let h = '';
        new Uint8Array(buf).forEach(b => { h += b.toString(16).padStart(2, '0'); });
        return 'sha256:' + h;
      }).catch(() => 'djb2:' + djb2(txt));
    }
    return Promise.resolve('djb2:' + djb2(txt));
  }
  function djb2(t) { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; return h.toString(16); }
  const salt = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const usuarios = () => leer(K_USERS, []);
  const buscar = e => usuarios().find(u => u.email === mail(e)) || null;

  async function registrar({ nombre, email, pass }) {
    if (!nombre || nombre.trim().length < 2) return { ok: false, code: 'NOMBRE_INVALIDO', error: 'Escribe tu nombre.' };
    if (!emailValido(email)) return { ok: false, code: 'EMAIL_INVALIDO', error: 'El correo no tiene un formato válido.' };
    if (!pass || String(pass).length < 6) return { ok: false, code: 'PASS_CORTA', error: 'La contraseña debe tener al menos 6 caracteres.' };
    if (buscar(email)) return { ok: false, code: 'EMAIL_EXISTE', error: 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.' };
    if (nube()) {
      const r = await postNube('accounts:signUp', { email: mail(email), password: String(pass), returnSecureToken: true });
      if (!r.ok) return { ok: false, code: r.code, error: r.error };
      const u = await guardarLocal(nombre, email, pass);
      return { ok: true, nube: true, usuario: { email: u.email, nombre: u.nombre } };
    }
    const s = salt();
    const u = { email: mail(email), nombre: nombre.trim(), salt: s, hash: await hash(pass, s), creado: new Date().toISOString(), origen: 'local' };
    const lista = usuarios(); lista.push(u); escribir(K_USERS, lista);
    return { ok: true, nube: false, usuario: { email: u.email, nombre: u.nombre } };
  }

  async function ingresar(email, pass, recordar) {
    if (!emailValido(email)) return { ok: false, code: 'EMAIL_INVALIDO', error: 'El correo no tiene un formato válido.' };
    if (!pass) return { ok: false, code: 'PASS_VACIA', error: 'Escribe tu contraseña.' };
    const u = buscar(email);
    if (u) {
      const h = await hash(pass, u.salt);
      if (h !== u.hash) return { ok: false, code: 'PASS_INCORRECTA', error: 'Contraseña incorrecta. Inténtalo de nuevo.' };
      escribir(K_SES, { email: u.email, nombre: u.nombre, desde: new Date().toISOString(), recordar: !!recordar });
      return { ok: true, usuario: { email: u.email, nombre: u.nombre } };
    }
    if (nube()) {
      const r = await postNube('accounts:signInWithPassword', { email: mail(email), password: String(pass), returnSecureToken: true });
      if (!r.ok) return { ok: false, code: r.code, error: r.error };
      const g = await guardarLocal(null, email, pass);
      escribir(K_SES, { email: g.email, nombre: g.nombre, desde: new Date().toISOString(), recordar: !!recordar });
      return { ok: true, usuario: { email: g.email, nombre: g.nombre } };
    }
    return { ok: false, code: 'NO_EXISTE', error: 'No hay ninguna cuenta con ese correo. Crea una cuenta nueva.' };
  }

  function sesion() { return leer(K_SES, null); }
  function salir() { borrar(K_SES); }
  function invitado() {
    escribir(K_SES, { email: null, nombre: 'Invitado', invitado: true, desde: new Date().toISOString(), recordar: false });
    return { nombre: 'Invitado', email: null, invitado: true };
  }

  async function solicitarCodigo(email) {
    if (!emailValido(email)) return { ok: false, code: 'EMAIL_INVALIDO', error: 'Escribe un correo válido, por ejemplo nombre@correo.com.' };
    if (nube()) {
      const r = await postNube('accounts:sendOobCode', { requestType: 'PASSWORD_RESET', email: mail(email) });
      if (!r.ok) return { ok: false, code: r.code, error: r.error };
      return { ok: true, enviado: true,
        mensaje: 'Solicitud procesada. Revisa la bandeja de entrada de ' + mail(email) + ' (y la carpeta de spam) y abre el enlace para crear una nueva contraseña.' };
    }
    const u = buscar(email);
    if (!u) return { ok: false, code: 'NO_EXISTE', error: 'Ese correo no está registrado en este dispositivo.' };
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    escribir(K_RESET, { email: u.email, codigo, expira: Date.now() + 15 * 60 * 1000 });
    // No hay servidor de correo: el código se muestra aquí mismo (documentado en el README).
    return { ok: true, codigo, enviado: false };
  }

  async function cambiarConCodigo(email, codigo, pass, pass2) {
    const r = leer(K_RESET, null);
    if (!r) return { ok: false, code: 'SIN_SOLICITUD', error: 'Primero genera un código de recuperación.' };
    if (r.email !== mail(email)) return { ok: false, code: 'EMAIL_DISTINTO', error: 'El correo no coincide con la solicitud.' };
    if (Date.now() > r.expira) return { ok: false, code: 'CODIGO_EXPIRADO', error: 'El código expiró. Genera uno nuevo.' };
    if (String(codigo).trim() !== r.codigo) return { ok: false, code: 'CODIGO_INVALIDO', error: 'El código no es correcto.' };
    if (!pass || String(pass).length < 6) return { ok: false, code: 'PASS_CORTA', error: 'La contraseña debe tener al menos 6 caracteres.' };
    if (pass !== pass2) return { ok: false, code: 'PASS_DISTINTA', error: 'Las contraseñas no coinciden.' };
    const lista = usuarios();
    const u = lista.find(x => x.email === mail(email));
    if (!u) return { ok: false, code: 'NO_EXISTE', error: 'La cuenta ya no existe.' };
    const s = salt();
    u.salt = s; u.hash = await hash(pass, s);
    escribir(K_USERS, lista);
    borrar(K_RESET);
    return { ok: true };
  }

  /* ============ Nube opcional (Firebase Authentication REST) ============ */
  function nube() {
    const c = window.UNIX_FIREBASE;
    return (c && c.apiKey && c.projectId && !/TU_|XXXX/i.test(c.apiKey)) ? c : null;
  }
  const MSG = {
    EMAIL_EXISTS: 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
    EMAIL_NOT_FOUND: 'No hay ninguna cuenta con ese correo.',
    INVALID_EMAIL: 'El correo no tiene un formato válido.',
    INVALID_PASSWORD: 'Contraseña incorrecta. Inténtalo de nuevo.',
    WEAK_PASSWORD: 'La contraseña es demasiado débil: usa al menos 6 caracteres.',
    MISSING_PASSWORD: 'Escribe una contraseña.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    USER_DISABLED: 'Esta cuenta está deshabilitada.',
    OPERATION_NOT_ALLOWED: 'El registro con correo no está habilitado en el servicio de autenticación.',
    NETWORK_REQUEST_FAILED: 'Sin conexión con el servicio de autenticación. Revisa tu internet.'
  };
  async function postNube(ruta, cuerpo) {
    const c = nube();
    const url = 'https://identitytoolkit.googleapis.com/v1/' + ruta + '?key=' + encodeURIComponent(c.apiKey);
    let resp;
    try {
      resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    } catch (e) {
      return { ok: false, code: 'NETWORK_REQUEST_FAILED', error: MSG.NETWORK_REQUEST_FAILED };
    }
    let data = {};
    try { data = await resp.json(); } catch (_) {}
    if (resp.ok) return { ok: true, data };
    const code = (data && data.error && data.error.message || 'ERROR').split(' ')[0];
    return { ok: false, code, error: MSG[code] || 'No se pudo completar la operación (' + code + ').' };
  }

  /* Guarda la cuenta también en el dispositivo: permite ingresar sin conexión. */
  async function guardarLocal(nombre, email, pass) {
    const s = salt();
    const u = { email: mail(email), nombre: (nombre || '').trim() || mail(email).split('@')[0],
      salt: s, hash: await hash(pass, s), creado: new Date().toISOString(), origen: 'firebase' };
    const lista = usuarios().filter(x => x.email !== u.email);
    lista.push(u); escribir(K_USERS, lista);
    return u;
  }

  function google() {
    const cfg = window.UNIX_FIREBASE || null;
    if (!cfg || !cfg.apiKey || !cfg.projectId || /TU_|XXXX/.test(cfg.apiKey)) {
      return { ok: false, code: 'GOOGLE_NO_CONFIGURADO',
        error: 'Google necesita Firebase configurado (config/firebase-config.js). Mientras tanto usa correo y contraseña.' };
    }
    return { ok: false, code: 'GOOGLE_PENDIENTE',
      error: 'La configuración de Firebase está presente, pero el inicio con Google requiere habilitar el proveedor y el SHA-1 del APK en la consola de Firebase.' };
  }

  function eliminarCuenta() {
    const s = sesion();
    if (!s || !s.email) { salir(); return { ok: true }; }
    escribir(K_USERS, usuarios().filter(u => u.email !== s.email));
    salir();
    return { ok: true };
  }

  return { registrar, ingresar, sesion, salir, invitado, solicitarCodigo, cambiarConCodigo, google,
    eliminarCuenta, emailValido, hidratar, get nubeActiva() { return !!nube(); } };
})();
