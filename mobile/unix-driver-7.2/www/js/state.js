'use strict';
/* ============================================================
   UniX Driver · Estado centralizado de la solicitud
   ------------------------------------------------------------
   Una máquina de estados + un único resetTripState().
   El origen y el destino son libres: cualquier cambio recalcula
   distancia y precio. Si no hay distancia por carretera, NO hay
   precio (nunca se usa la línea recta como tarifa).
   ============================================================ */

const CFG_TAR = () => (window.UNIX_CONFIG && UNIX_CONFIG.tarifas) || {};
const ORIGEN_SUGERIDO = (window.UNIX_CONFIG && UNIX_CONFIG.origenSugerido) ||
  { nombre: 'Universidad de Cartagena', barrio: 'Zaragocilla', direccion: 'Campus Piedra de Bolívar', lat: 10.401904, lon: -75.508695 };

let COMISION_PCT = 0.10;
const LS_HIST_LEGACY = 'unixdriver.historial.v2';
const LS_HIST_PREFIX = 'unixdriver.historial.v3.';
const LS_SANCIONES_PREFIX = 'unixdriver.sanciones.v1.';

const ESTADOS = {
  INICIAL: 'solicitud_inicial',
  BUSCANDO: 'buscando_conductor',
  ASIGNADO: 'conductor_asignado',
  EN_CAMINO: 'conductor_en_camino',
  LLEGO: 'conductor_ha_llegado',
  EN_CURSO: 'viaje_iniciado',
  COMPLETADO: 'viaje_completado',
  CANCELADO: 'viaje_cancelado'
};

const MOTIVOS = [
  'El conductor está tardando demasiado',
  'Ya conseguí otro medio de transporte',
  'Ya no voy a realizar el viaje',
  'Seleccioné un destino equivocado',
  'El conductor no se encuentra en la ubicación indicada',
  'El conductor me pidió cancelar',
  'Cambié de planes',
  'Otro motivo'
];

/* --- Estado de la solicitud activa --- */
let seqSolicitud = 0;
let trip = null;
const timers = new Set();

function nuevoTrip() {
  seqSolicitud += 1;
  return {
    requestId: seqSolicitud,
    estado: ESTADOS.INICIAL,
    vehiculo: 'moto',
    origen: {
      nombre: ORIGEN_SUGERIDO.nombre || 'Universidad de Cartagena',
      barrio: ORIGEN_SUGERIDO.barrio || 'Universidad de Cartagena',
      direccion: ORIGEN_SUGERIDO.direccion || '',
      lat: Number(ORIGEN_SUGERIDO.lat || 10.401904),
      lon: Number(ORIGEN_SUGERIDO.lon || -75.508695),
      fuente: 'sugerido'
    },
    destino: null,
    rutaKm: null,          // km por carretera (solo si el proveedor respondió)
    rutaMin: null,
    rutaFuente: null,
    rutaError: null,
    rectaKm: null,         // referencia en línea recta (nunca se cobra con esto)
    tarifa: 0,
    tarifaOk: false,
    comision: 0,
    ofertas: [],
    oferta: null,
    etaMin: 0,
    timeoutTipo: null,
    timeoutRestanteSeg: null,
    motivoCancelacion: null,
    pago: null,
    creado: new Date().toISOString()
  };
}
trip = nuevoTrip();

const tripActual = () => trip;
const estadoActual = () => (trip ? trip.estado : null);

/* --- Temporizadores ligados al requestId --- */
function later(fn, ms) {
  const rid = trip.requestId;
  const t = setTimeout(() => {
    timers.delete(t);
    if (!trip || trip.requestId !== rid) return;
    if (trip.estado === ESTADOS.CANCELADO) return;
    fn();
  }, ms);
  timers.add(t);
  return t;
}

function intervalo(fn, ms) {
  const rid = trip.requestId;
  const t = setInterval(() => {
    if (!trip || trip.requestId !== rid || trip.estado === ESTADOS.CANCELADO) {
      clearInterval(t); timers.delete(t); return;
    }
    fn();
  }, ms);
  timers.add(t);
  return t;
}

function limpiarTimers() {
  timers.forEach(t => { clearTimeout(t); clearInterval(t); });
  timers.clear();
}

/* --- Única función de limpieza: cierra la solicitud por completo --- */
function resetTripState() {
  limpiarTimers();
  const anterior = trip ? trip.requestId : 0;
  trip = nuevoTrip();
  if (typeof UI !== 'undefined' && UI.limpiarUIviaje) UI.limpiarUIviaje();
  return { anterior, nuevo: trip.requestId };
}

/* --- Historial persistente aislado por id_usuario --- */
let historialMemoria = [];
let historialMemoriaUsuarioId = null;
let ultimoViajeMemoria = null;

function limpiarClaveLegacyHistorial() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(LS_HIST_LEGACY) !== null) {
      localStorage.removeItem(LS_HIST_LEGACY);
    }
  } catch (_) {}
  try {
    if (typeof STORE !== 'undefined' && typeof STORE.remove === 'function') {
      STORE.remove(LS_HIST_LEGACY);
    }
  } catch (_) {}
}
limpiarClaveLegacyHistorial();

function obtenerIdUsuarioAutenticado() {
  try {
    const ses = (typeof AUTH !== 'undefined' && typeof AUTH.sesionActual === 'function')
      ? AUTH.sesionActual()
      : ((typeof AUTH !== 'undefined' && typeof AUTH.sesion === 'function') ? AUTH.sesion() : null);
    if (!ses || ses.invitado || ses.id_usuario == null) return null;
    const n = Number(ses.id_usuario);
    return (Number.isFinite(n) && n > 0) ? n : null;
  } catch (_) {
    return null;
  }
}

function claveHistorialUsuario(idUsuario) {
  const idRaw = (idUsuario === undefined) ? obtenerIdUsuarioAutenticado() : idUsuario;
  if (idRaw == null || idRaw === '') return null;
  const n = Number(idRaw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return LS_HIST_PREFIX + n;
}

function limpiarHistorialEnMemoria() {
  historialMemoria = [];
  historialMemoriaUsuarioId = null;
  ultimoViajeMemoria = null;
  limpiarTimers();
  trip = nuevoTrip();
}

function leerHistorial(idUsuario) {
  limpiarClaveLegacyHistorial();
  const id = (idUsuario === undefined) ? obtenerIdUsuarioAutenticado() : idUsuario;
  const clave = claveHistorialUsuario(id);
  if (!clave) {
    historialMemoria = [];
    historialMemoriaUsuarioId = null;
    ultimoViajeMemoria = null;
    return [];
  }
  const idNum = Number(id);
  try {
    const raw = localStorage.getItem(clave);
    if (raw != null) {
      const v = JSON.parse(raw);
      const lista = Array.isArray(v) ? v : [];
      historialMemoria = lista;
      historialMemoriaUsuarioId = idNum;
      ultimoViajeMemoria = lista.find(x => x && (x.estado === 'pagado' || x.estado === 'finalizado')) || null;
      return lista.slice();
    }
  } catch (_) {}
  if (historialMemoriaUsuarioId === idNum && Array.isArray(historialMemoria)) {
    return historialMemoria.slice();
  }
  historialMemoria = [];
  historialMemoriaUsuarioId = idNum;
  ultimoViajeMemoria = null;
  return [];
}

function reemplazarHistorial(lista, idUsuario) {
  limpiarClaveLegacyHistorial();
  const id = (idUsuario === undefined) ? obtenerIdUsuarioAutenticado() : idUsuario;
  const clave = claveHistorialUsuario(id);
  if (!clave) {
    historialMemoria = [];
    historialMemoriaUsuarioId = null;
    ultimoViajeMemoria = null;
    return [];
  }
  const idNum = Number(id);
  const recorte = (Array.isArray(lista) ? lista : []).slice(0, 300);
  historialMemoria = recorte;
  historialMemoriaUsuarioId = idNum;
  ultimoViajeMemoria = recorte.find(x => x && (x.estado === 'pagado' || x.estado === 'finalizado')) || null;
  try { localStorage.setItem(clave, JSON.stringify(recorte)); } catch (_) {}
  try { if (typeof STORE !== 'undefined' && typeof STORE.setJSON === 'function') STORE.setJSON(clave, recorte); } catch (_) {}
  return recorte.slice();
}

function guardarEnHistorial(registro, idUsuario) {
  limpiarClaveLegacyHistorial();
  const id = (idUsuario === undefined) ? obtenerIdUsuarioAutenticado() : idUsuario;
  const clave = claveHistorialUsuario(id);
  if (!clave || !registro) return [];
  const idNum = Number(id);
  const item = Object.assign({}, registro, { id_usuario: idNum });
  const lista = leerHistorial(idNum).filter(x => !(item.id && x && String(x.id) === String(item.id)));
  lista.unshift(item);
  return reemplazarHistorial(lista, idNum);
}

function borrarHistorial(idUsuario) {
  limpiarClaveLegacyHistorial();
  const id = (idUsuario === undefined) ? obtenerIdUsuarioAutenticado() : idUsuario;
  const clave = claveHistorialUsuario(id);
  historialMemoria = [];
  historialMemoriaUsuarioId = null;
  ultimoViajeMemoria = null;
  if (!clave) return;
  try { localStorage.removeItem(clave); } catch (_) {}
  try { if (typeof STORE !== 'undefined' && typeof STORE.remove === 'function') STORE.remove(clave); } catch (_) {}
}

async function hidratarPersistencia() {
  limpiarClaveLegacyHistorial();
  if (typeof STORE === 'undefined') return false;
  const id = obtenerIdUsuarioAutenticado();
  const clave = claveHistorialUsuario(id);
  if (!clave) return false;
  try {
    const guardado = await STORE.getJSON(clave, null);
    if (!Array.isArray(guardado)) return false;
    const rawLocal = localStorage.getItem(clave);
    if (rawLocal == null && guardado.length) {
      reemplazarHistorial(guardado, id);
      return true;
    }
  } catch (_) {}
  return false;
}

if (typeof window !== 'undefined') {
  window.claveHistorialUsuario = claveHistorialUsuario;
  window.limpiarHistorialEnMemoria = limpiarHistorialEnMemoria;
  window.reemplazarHistorial = reemplazarHistorial;
}

/* --- Sanciones / Strikes por No-Show aislados por id_usuario --- */
function claveSancionesUsuario(idUsuario) {
  const idRaw = (idUsuario === undefined) ? obtenerIdUsuarioAutenticado() : idUsuario;
  if (idRaw == null || idRaw === '') return null;
  const n = Number(idRaw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return LS_SANCIONES_PREFIX + n;
}

function leerSancionesUsuario(idUsuario) {
  const clave = claveSancionesUsuario(idUsuario);
  if (!clave) return { strikes: 0, bloqueadoHasta: null };
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) return { strikes: 0, bloqueadoHasta: null };
    const parsed = JSON.parse(raw);
    const strikes = Number(parsed && parsed.strikes) || 0;
    const bloqueadoHasta = (parsed && parsed.bloqueadoHasta != null && Number.isFinite(Number(parsed.bloqueadoHasta)))
      ? Number(parsed.bloqueadoHasta)
      : null;
    return { strikes, bloqueadoHasta };
  } catch (_) {
    return { strikes: 0, bloqueadoHasta: null };
  }
}

function guardarSancionesUsuario(datos, idUsuario) {
  const clave = claveSancionesUsuario(idUsuario);
  if (!clave) return null;
  const limpio = {
    strikes: Math.max(0, Number(datos && datos.strikes) || 0),
    bloqueadoHasta: (datos && datos.bloqueadoHasta != null && Number.isFinite(Number(datos.bloqueadoHasta)))
      ? Number(datos.bloqueadoHasta)
      : null
  };
  try { localStorage.setItem(clave, JSON.stringify(limpio)); } catch (_) {}
  try { if (typeof STORE !== 'undefined' && typeof STORE.setJSON === 'function') STORE.setJSON(clave, limpio); } catch (_) {}
  return limpio;
}

function verificarBloqueoUsuario(idUsuario) {
  const id = (idUsuario === undefined) ? obtenerIdUsuarioAutenticado() : idUsuario;
  const s = leerSancionesUsuario(id);
  const ahora = Date.now();
  if (s.bloqueadoHasta && s.bloqueadoHasta > ahora) {
    return { bloqueado: true, restanteMs: s.bloqueadoHasta - ahora, strikes: s.strikes, bloqueadoHasta: s.bloqueadoHasta };
  }
  if (s.bloqueadoHasta && s.bloqueadoHasta <= ahora) {
    guardarSancionesUsuario({ strikes: 0, bloqueadoHasta: null }, id);
    return { bloqueado: false, restanteMs: 0, strikes: 0, bloqueadoHasta: null };
  }
  return { bloqueado: false, restanteMs: 0, strikes: s.strikes, bloqueadoHasta: null };
}

function registrarStrikeNoShow(idUsuario, maxStrikes = 3, bloqueoMin = 5) {
  const id = (idUsuario === undefined) ? obtenerIdUsuarioAutenticado() : idUsuario;
  const actual = leerSancionesUsuario(id);
  const ahora = Date.now();
  const baseStrikes = (actual.bloqueadoHasta && actual.bloqueadoHasta <= ahora) ? 0 : actual.strikes;
  const nuevosStrikes = baseStrikes + 1;
  const bloqueado = nuevosStrikes >= Number(maxStrikes || 3);
  const bloqueadoHasta = bloqueado ? (ahora + Number(bloqueoMin || 5) * 60 * 1000) : null;
  guardarSancionesUsuario({ strikes: nuevosStrikes, bloqueadoHasta }, id);
  return {
    strikes: nuevosStrikes,
    maxStrikes: Number(maxStrikes || 3),
    bloqueado,
    bloqueadoHasta
  };
}

if (typeof window !== 'undefined') {
  window.claveSancionesUsuario = claveSancionesUsuario;
  window.leerSancionesUsuario = leerSancionesUsuario;
  window.registrarStrikeNoShow = registrarStrikeNoShow;
  window.verificarBloqueoUsuario = verificarBloqueoUsuario;
}

/* --- Dinero y formato --- */
const money = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const vehLabel = v => (v === 'carro' ? 'Carro' : 'Moto');
const vehEmoji = v => (v === 'carro' ? 'Carro' : 'Moto');
const ahoraTexto = () => new Date().toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const kmTexto = n => (n == null ? '—' : String(Number(n)).replace('.', ',') + ' km');

/* ============================================================
   TARIFAS · modelo por kilómetro
   ------------------------------------------------------------
   Fuente única: config/tarifas.js (UNIX_CONFIG.tarifas).
   Regla: precio = base + (km × precio_km), recargo opcional,
   redondeo y mínimo. Si un parámetro es null o no existe, el
   resultado es null → la app muestra «Tarifa no configurada».
   ============================================================ */
function parametrosTarifa() {
  const t = CFG_TAR();
  return (t && t.parametros) || {};
}

/** ¿La configuración tiene los valores necesarios? */
function tarifaConfigurada(vehiculo) {
  const p = parametrosTarifa();
  const v = vehiculo === 'carro' ? 'carro' : 'moto';
  const n = x => typeof x === 'number' && isFinite(x) && x >= 0;
  if (v === 'moto' && !tarifaConfigurada('carro')) return false;
  const central = v === 'carro' ? (p.primerKm && p.primerKm.carro) : (p.primerKm && p.primerKm.moto);
  return n(central) && n(p.porKm && p.porKm[v]) && n(p.minimo && p.minimo[v]);
}

/** Kilómetros que se cobran: mínimo 1 y redondeo hacia arriba al km completo. */
function kmCobrable(km) {
  const d = Number(km);
  if (!isFinite(d) || d <= 0) return null;
  return Math.max(1, Math.ceil(d - 1e-9));
}

/** Mínimos por vehículo (COP) tomados de la configuración central. */
function minimoDe(v) {
  const p = parametrosTarifa();
  const m = p.minimo && p.minimo[v];
  return (typeof m === 'number' && isFinite(m) && m > 0) ? m : null;
}

/**
 * Precio del automóvil: base por tramos según la distancia, con su mínimo.
 * Es la ÚNICA función que aplica la fórmula; la moto deriva de este resultado.
 */
function tarifaCarro(km) {
  const p = parametrosTarifa();
  const cob = kmCobrable(km);
  if (cob == null) return { ok: false, precio: null, motivo: 'SIN_DISTANCIA',
    detalle: 'Falta la distancia por carretera para calcular el precio.' };
  if (!tarifaConfigurada('carro')) return { ok: false, precio: null, motivo: 'TARIFA_NO_CONFIGURADA',
    detalle: 'La tarifa de automóvil aún no está configurada.' };

  const tramos = (p.modo || 'tramos') === 'tramos';
  const inicial = tramos ? p.primerKm.carro : p.base.carro;
  const porKm = p.porKm.carro;
  let bruto = tramos ? inicial + (cob - 1) * porKm : inicial + Number(km) * porKm;

  const recargos = (p.recargos || []).filter(r => r && r.activo !== false && typeof r.pct === 'number' && r.pct > 0);
  const aplicados = [];
  recargos.forEach(r => {
    if (r.desde_km == null || cob > Number(r.desde_km)) { bruto *= 1 + Number(r.pct); aplicados.push(r.nombre || r.id); }
  });

  const paso = Number(p.redondeo) > 0 ? Number(p.redondeo) : 1;
  let precio = Math.round(bruto / paso) * paso;
  const minimo = minimoDe('carro');
  const bajoMinimo = minimo != null && precio < minimo;
  if (bajoMinimo) precio = minimo;

  return { ok: true, precio, km: Number(km), kmCobrable: cob, minimo, minimoAplicado: bajoMinimo,
    recargos: aplicados, vehiculo: 'carro', modo: tramos ? 'tramos' : 'lineal' };
}

/**
 * Precio de la motocicleta: 45 % del precio del automóvil, con mínimo propio.
 * El porcentaje se aplica UNA sola vez, sobre el precio final del automóvil.
 */
function tarifaMoto(km) {
  const p = parametrosTarifa();
  const auto = tarifaCarro(km);
  if (!auto.ok) return auto;
  if (!tarifaConfigurada('moto')) return { ok: false, precio: null, motivo: 'TARIFA_NO_CONFIGURADA',
    detalle: 'La tarifa de motocicleta aún no está configurada.' };
  const pct = (typeof p.motoPct === 'number' && p.motoPct > 0) ? p.motoPct : 0.45;
  let precio = Math.round(auto.precio * pct);           // redondeo al peso más cercano
  const minimo = minimoDe('moto');
  const bajoMinimo = minimo != null && precio < minimo;
  if (bajoMinimo) precio = minimo;
  return { ok: true, precio, km: Number(km), kmCobrable: auto.kmCobrable, minimo, minimoAplicado: bajoMinimo,
    baseCarro: auto.precio, pct, vehiculo: 'moto', recargos: auto.recargos };
}

/**
 * Punto de entrada único. Devuelve { ok, precio, detalle, ... }.
 * `km` debe ser la distancia POR CARRETERA; si es null no hay precio.
 */
function calcularTarifa(km, vehiculo) {
  const v = vehiculo === 'carro' ? 'carro' : 'moto';
  const r = v === 'carro' ? tarifaCarro(km) : tarifaMoto(km);
  if (!r.ok) return r;
  const dinero = n => money(n);
  r.detalle = v === 'carro'
    ? (r.minimoAplicado ? 'Tarifa mínima de automóvil ' + dinero(r.minimo)
       : dinero(r.precio) + ' por ' + r.kmCobrable + ' km')
    : (r.minimoAplicado ? 'Tarifa mínima de moto ' + dinero(r.minimo)
       : dinero(r.precio) + ' por ' + r.kmCobrable + ' km');
  return r;
}

/** Compatibilidad: precio numérico o null. */
function precioPorKm(km, vehiculo) {
  const r = calcularTarifa(km, vehiculo);
  return r.ok ? r.precio : null;
}

/** Km del viaje en curso, solo si son km por carretera verificados. */
function kmActual() {
  if (!trip) return null;
  return trip.rutaKm != null ? Number(trip.rutaKm) : null;
}
function tarifaActual() {
  if (!trip) return null;
  return calcularTarifa(kmActual(), trip.vehiculo);
}

/* Compatibilidad con llamadas antiguas: exige ruta calculada. */
function tarifaDe(_destino, vehiculo) {
  const r = calcularTarifa(kmActual(), vehiculo || (trip ? trip.vehiculo : 'moto'));
  return r.ok ? r.precio : null;
}
function zonaDisponible() { return true; }
