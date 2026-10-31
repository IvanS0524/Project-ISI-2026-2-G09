'use strict';
/* ============================================================
   UniX Driver · Cartagena — Servidor de escritorio
   Node.js + Express + MySQL/MariaDB (persistente)
   ============================================================ */
const path = require('path');
const fs = require('fs');
const express = require('express');
try { require('dotenv').config(); } catch (_) { /* dotenv opcional */ }
const { conectar } = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const COMISION_PCT = 0.10;
const ESTADOS = ['pendiente', 'asignado', 'en_curso', 'finalizado', 'cancelado', 'pagado'];
const VEHICULOS = ['moto', 'carro'];
const NOMBRES = ['Carlos M.', 'Andrés R.', 'Miguel P.', 'Laura S.', 'David A.', 'Sofía C.', 'Jorge L.', 'Ana G.'];
const VEH_MOTO = ['TVS Raider', 'Boxer CT', 'Pulsar 125', 'Honda CB125', 'Yamaha FZ-S',
  'Suzuki Gixxer', 'Bajaj Dominar', 'KTM Duke', 'Hero Hunk', 'TVS Apache'];
const VEH_CARRO = ['Kia Picanto', 'Renault Logan', 'Chevrolet Onix', 'Toyota Corolla',
  'Ford Fiesta', 'Volkswagen Gol', 'Nissan Versa', 'Mazda 2'];

let db = null;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const ok = (res, data, status = 200) => res.status(status).json(data);
const fallo = (res, status, code, error, extra) =>
  res.status(status).json(Object.assign({ code, error }, extra || {}));

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

async function buscarBarrio(texto) {
  const t = norm(texto);
  if (!t) return null;
  const [exacto] = await db.query('SELECT * FROM barrios WHERE nombre_norm = ? LIMIT 1', [t]);
  if (exacto.length) return exacto[0];
  const [parcial] = await db.query(
    'SELECT * FROM barrios WHERE nombre_norm LIKE ? OR ? LIKE CONCAT("%", nombre_norm, "%") ORDER BY distancia_km LIMIT 1',
    [t + '%', t]
  );
  return parcial.length ? parcial[0] : null;
}

const tarifaDe = (barrio, vehiculo) =>
  vehiculo === 'carro' ? barrio.tarifa_carro : barrio.tarifa_moto;

const folio = prefijo => prefijo + '-' + Date.now().toString(36).toUpperCase().slice(-6) +
  '-' + Math.floor(Math.random() * 900 + 100);

const hora = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

async function evento(viajeId, estado, detalle) {
  await db.query('INSERT INTO eventos (viaje_id, estado, detalle) VALUES (?,?,?)',
    [viajeId, estado, detalle || null]);
}

/* ===================== SALUD ===================== */
app.get('/api/health', async (_req, res) => {
  const [[b]] = await db.query('SELECT COUNT(*) AS n FROM barrios');
  const [[v]] = await db.query('SELECT COUNT(*) AS n FROM viajes');
  const [[p]] = await db.query('SELECT COUNT(*) AS n FROM pagos');
  ok(res, {
    ok: true, barrios: b.n, viajes: v.n, pagos: p.n,
    db: { host: process.env.DB_HOST || '127.0.0.1', database: process.env.DB_NAME || 'unixdriver' },
    origen: { nombre: 'Universidad de Cartagena · Piedra de Bolívar', lat: 10.401904, lon: -75.508695 },
    comision_pct: COMISION_PCT, hora: hora()
  });
});

/* ===================== BARRIOS Y TARIFAS ===================== */
app.get('/api/barrios', async (req, res) => {
  const { zona, q, localidad } = req.query;
  let sql = 'SELECT * FROM barrios WHERE 1=1';
  const p = [];
  if (zona && zona !== 'todas') { sql += ' AND zona = ?'; p.push(zona); }
  if (localidad) { sql += ' AND localidad = ?'; p.push(localidad); }
  if (q) { sql += ' AND nombre_norm LIKE ?'; p.push('%' + norm(q) + '%'); }
  sql += ' ORDER BY FIELD(zona,"corto","medio","largo"), distancia_km, nombre';
  const [rows] = await db.query(sql, p);
  const [tar] = await db.query('SELECT * FROM tarifas');
  ok(res, { total: rows.length, barrios: rows, tarifas: tar });
});

app.get('/api/barrios/:id', async (req, res) => {
  const [r] = await db.query('SELECT * FROM barrios WHERE id = ?', [Number(req.params.id)]);
  if (!r.length) return fallo(res, 404, 'BARRIO_NO_ENCONTRADO', 'No existe el barrio ' + req.params.id);
  ok(res, { barrio: r[0] });
});

app.get('/api/price', async (req, res) => {
  const destino = req.query.destino;
  const vehiculo = String(req.query.vehiculo || 'moto').toLowerCase();
  if (!destino || !String(destino).trim()) return fallo(res, 400, 'DESTINO_REQUERIDO', 'Indica el destino.');
  if (!VEHICULOS.includes(vehiculo)) return fallo(res, 400, 'VEHICULO_INVALIDO', 'Vehículo inválido.');
  const b = await buscarBarrio(destino);
  if (!b) return fallo(res, 404, 'BARRIO_NO_ENCONTRADO', 'Barrio no reconocido: ' + destino);
  const tarifa = tarifaDe(b, vehiculo);
  ok(res, {
    id: b.id, barrio: b.nombre, zona: b.zona, zona_nombre: b.zona,
    vehiculo, tarifa, comision: Math.round(tarifa * COMISION_PCT),
    distancia_km: b.distancia_km, localidad: b.localidad,
    coordenadas: { lat: b.lat, lon: b.lon }
  });
});

/* ===================== RUTA (OSRM / estimación local) ===================== */
const ORIGEN = { nombre: 'Universidad de Cartagena · Piedra de Bolívar', lat: 10.401904, lon: -75.508695 };
const OSRM_BASE = 'https://router.project-osrm.org';
const CACHE_RUTAS = new Map();

const haversine = (a, b, c, d) => {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(c - a), dLon = rad(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

async function rutaOsrm(lat, lon) {
  const clave = lat + ',' + lon;
  if (CACHE_RUTAS.has(clave)) return CACHE_RUTAS.get(clave);
  const url = OSRM_BASE + '/route/v1/driving/' + ORIGEN.lon + ',' + ORIGEN.lat + ';' + lon + ',' + lat +
    '?overview=full&geometries=geojson';
  let salida;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'UniX-Driver-Desktop/3.2' } });
    clearTimeout(t);
    const d = await r.json();
    const rt = d && d.routes && d.routes[0];
    if (!r.ok || !rt) throw new Error('OSRM sin rutas');
    salida = {
      ok: true, fuente: 'OSRM · OpenStreetMap',
      distancia_km: Math.round(rt.distance / 100) / 10,
      minutos: Math.max(1, Math.round(rt.duration / 60)),
      geometria: rt.geometry.coordinates
    };
  } catch (e) {
    salida = {
      ok: true, fuente: 'Estimación local (sin conexión)',
      distancia_km: Math.round(haversine(ORIGEN.lat, ORIGEN.lon, lat, lon) * 1.35 * 10) / 10,
      minutos: Math.max(1, Math.round(haversine(ORIGEN.lat, ORIGEN.lon, lat, lon) * 1.35 / 0.32)),
      geometria: [[ORIGEN.lon, ORIGEN.lat], [lon, lat]],
      aviso: 'Sin conexión con OSRM: distancia estimada en línea recta.'
    };
  }
  CACHE_RUTAS.set(clave, salida);
  return salida;
}

app.get('/api/ruta', async (req, res) => {
  let b = null;
  if (req.query.id) {
    const [r] = await db.query('SELECT * FROM barrios WHERE id = ?', [Number(req.query.id)]);
    b = r[0] || null;
  } else if (req.query.destino) {
    b = await buscarBarrio(req.query.destino);
  } else if (req.query.lat && req.query.lon) {
    b = { nombre: req.query.destino || 'Destino', lat: Number(req.query.lat), lon: Number(req.query.lon), zona: null };
  }
  if (!b) return fallo(res, 404, 'DESTINO_REQUERIDO', 'Indica ?id=, ?destino= o ?lat=&lon=.');
  const ruta = await rutaOsrm(Number(b.lat), Number(b.lon));
  ok(res, Object.assign({ barrio: b.nombre, id: b.id || null, origen: ORIGEN,
    destino: { lat: b.lat, lon: b.lon } }, ruta));
});

/* ===================== VIAJES ===================== */
app.get('/api/viajes', async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100) || 100, 500);
  const { estado, vehiculo, zona, q, desde, hasta } = req.query;
  let sql = 'SELECT * FROM viajes WHERE 1=1';
  const p = [];
  if (estado && estado !== 'todos') { sql += ' AND estado = ?'; p.push(estado); }
  if (vehiculo && vehiculo !== 'todos') { sql += ' AND vehiculo = ?'; p.push(vehiculo); }
  if (zona && zona !== 'todas') { sql += ' AND zona = ?'; p.push(zona); }
  if (q) { sql += ' AND barrio_destino LIKE ?'; p.push('%' + q + '%'); }
  if (desde) { sql += ' AND creado_en >= ?'; p.push(desde + ' 00:00:00'); }
  if (hasta) { sql += ' AND creado_en <= ?'; p.push(hasta + ' 23:59:59'); }
  sql += ' ORDER BY id DESC LIMIT ?';
  p.push(limit);
  const [rows] = await db.query(sql, p);
  const [[t]] = await db.query('SELECT COUNT(*) AS total FROM viajes');
  ok(res, { total: t.total, viajes: rows });
});

app.get('/api/viajes/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [v] = await db.query('SELECT * FROM viajes WHERE id = ?', [id]);
  if (!v.length) return fallo(res, 404, 'VIAJE_NO_ENCONTRADO', 'No existe el viaje ' + id);
  const [ofertas] = await db.query('SELECT * FROM ofertas WHERE viaje_id = ? ORDER BY id', [id]);
  const [pagos] = await db.query('SELECT * FROM pagos WHERE viaje_id = ? ORDER BY id', [id]);
  const [ev] = await db.query('SELECT * FROM eventos WHERE viaje_id = ? ORDER BY id', [id]);
  ok(res, { viaje: v[0], ofertas, pagos, eventos: ev });
});

app.post('/api/viajes', async (req, res) => {
  const { barrio_destino, destino, vehiculo } = req.body || {};
  const nombre = barrio_destino || destino;
  const veh = String(vehiculo || 'moto').toLowerCase();
  if (!nombre || !String(nombre).trim()) return fallo(res, 400, 'DESTINO_REQUERIDO', 'Indica el destino.');
  if (!VEHICULOS.includes(veh)) return fallo(res, 400, 'VEHICULO_INVALIDO', 'Vehículo inválido: ' + veh);
  const b = await buscarBarrio(nombre);
  if (!b) return fallo(res, 404, 'BARRIO_NO_ENCONTRADO', 'Barrio no reconocido: ' + nombre);
  const tarifa = tarifaDe(b, veh);
  const comision = Math.round(tarifa * COMISION_PCT);
  const [r] = await db.query(
    `INSERT INTO viajes (folio, barrio_id, barrio_destino, localidad, zona, vehiculo, tarifa, comision, estado, distancia_km)
     VALUES (?,?,?,?,?,?,?,?,'pendiente',?)`,
    [folio('V'), b.id, b.nombre, b.localidad, b.zona, veh, tarifa, comision, b.distancia_km]
  );
  await evento(r.insertId, 'pendiente', 'Solicitud creada hacia ' + b.nombre);
  const [v] = await db.query('SELECT * FROM viajes WHERE id = ?', [r.insertId]);
  ok(res, { viaje: v[0] }, 201);
});

app.patch('/api/viajes/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [v] = await db.query('SELECT * FROM viajes WHERE id = ?', [id]);
  if (!v.length) return fallo(res, 404, 'VIAJE_NO_ENCONTRADO', 'No existe el viaje ' + id);
  const cuerpo = req.body || {};
  if (cuerpo.estado && !ESTADOS.includes(cuerpo.estado))
    return fallo(res, 400, 'ESTADO_INVALIDO', 'Estado inválido: ' + cuerpo.estado);

  const campos = [];
  const valores = [];
  const permitidos = ['estado', 'plataforma', 'conductor_nombre', 'conductor_vehiculo',
    'conductor_placa', 'conductor_rating', 'tarifa', 'comision', 'distancia_km'];
  for (const k of permitidos) {
    if (Object.prototype.hasOwnProperty.call(cuerpo, k)) { campos.push(k + ' = ?'); valores.push(cuerpo[k]); }
  }
  if (cuerpo.estado === 'en_curso') { campos.push('iniciado_en = COALESCE(iniciado_en, NOW())'); }
  if (cuerpo.estado === 'finalizado') { campos.push('finalizado_en = COALESCE(finalizado_en, NOW())'); }
  if (cuerpo.estado === 'cancelado') { campos.push('cancelado_en = NOW()'); }
  if (cuerpo.estado === 'pagado') { campos.push('pagado_en = COALESCE(pagado_en, NOW())'); }
  if (!campos.length) return fallo(res, 400, 'SIN_CAMBIOS', 'Nada que actualizar.');
  valores.push(id);
  await db.query('UPDATE viajes SET ' + campos.join(', ') + ' WHERE id = ?', valores);
  if (cuerpo.estado) await evento(id, cuerpo.estado, 'Estado actualizado a ' + cuerpo.estado);
  const [nuevo] = await db.query('SELECT * FROM viajes WHERE id = ?', [id]);
  ok(res, { viaje: nuevo[0] });
});

app.delete('/api/viajes/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [r] = await db.query('DELETE FROM viajes WHERE id = ?', [id]);
  if (!r.affectedRows) return fallo(res, 404, 'VIAJE_NO_ENCONTRADO', 'No existe el viaje ' + id);
  ok(res, { eliminado: id });
});

/* ===================== OFERTAS ===================== */
app.post('/api/viajes/:id/ofertas', async (req, res) => {
  const id = Number(req.params.id);
  const [v] = await db.query('SELECT * FROM viajes WHERE id = ?', [id]);
  if (!v.length) return fallo(res, 404, 'VIAJE_NO_ENCONTRADO', 'No existe el viaje ' + id);
  const viaje = v[0];
  const [ya] = await db.query('SELECT * FROM ofertas WHERE viaje_id = ? ORDER BY id', [id]);
  if (ya.length) return ok(res, { ofertas: ya, reutilizadas: true });

  const base = viaje.tarifa;
  const listaVeh = viaje.vehiculo === 'carro' ? VEH_CARRO : VEH_MOTO;
  const plantilla = [
    { plataforma: 'Uber', factor: 1.05, eta: 5 },
    { plataforma: 'DiDi', factor: 0.98, eta: 4 },
    { plataforma: 'inDrive', factor: 0.92, eta: 7 }
  ];
  const creadas = [];
  for (const p of plantilla) {
    const variacion = 1 + (Math.random() * 0.06 - 0.03);
    const precio = Math.max(1000, Math.round((base * p.factor * variacion) / 100) * 100);
    const conductor = pick(NOMBRES);
    const veh = pick(listaVeh);
    const placa = Array.from({ length: 3 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]).join('') +
      '-' + (100 + Math.floor(Math.random() * 900));
    const rating = (4 + Math.random() * 0.9).toFixed(1);
    const [r] = await db.query(
      `INSERT INTO ofertas (viaje_id, plataforma, precio, eta_min, conductor_nombre,
        conductor_vehiculo, conductor_placa, conductor_rating) VALUES (?,?,?,?,?,?,?,?)`,
      [id, p.plataforma, precio, p.eta, conductor, veh, placa, rating]
    );
    creadas.push({ id: r.insertId, viaje_id: id, plataforma: p.plataforma, precio, eta_min: p.eta,
      conductor_nombre: conductor, conductor_vehiculo: veh, conductor_placa: placa,
      conductor_rating: Number(rating), seleccionada: 0 });
  }
  await evento(id, 'pendiente', 'Se recibieron ' + creadas.length + ' ofertas');
  ok(res, { ofertas: creadas, reutilizadas: false }, 201);
});

app.patch('/api/ofertas/:id/seleccionar', async (req, res) => {
  const id = Number(req.params.id);
  const [o] = await db.query('SELECT * FROM ofertas WHERE id = ?', [id]);
  if (!o.length) return fallo(res, 404, 'OFERTA_NO_ENCONTRADA', 'No existe la oferta ' + id);
  const oferta = o[0];
  await db.query('UPDATE ofertas SET seleccionada = 0 WHERE viaje_id = ?', [oferta.viaje_id]);
  await db.query('UPDATE ofertas SET seleccionada = 1 WHERE id = ?', [id]);
  await db.query(
    `UPDATE viajes SET plataforma = ?, conductor_nombre = ?, conductor_vehiculo = ?,
      conductor_placa = ?, conductor_rating = ?, tarifa = ?, comision = ?, estado = 'asignado'
     WHERE id = ?`,
    [oferta.plataforma, oferta.conductor_nombre, oferta.conductor_vehiculo, oferta.conductor_placa,
      oferta.conductor_rating, oferta.precio, Math.round(oferta.precio * COMISION_PCT), oferta.viaje_id]
  );
  await evento(oferta.viaje_id, 'asignado', 'Oferta de ' + oferta.plataforma + ' seleccionada');
  const [v] = await db.query('SELECT * FROM viajes WHERE id = ?', [oferta.viaje_id]);
  ok(res, { viaje: v[0], oferta });
});

/* ===================== PAGOS ===================== */
app.post('/api/viajes/:id/pago', async (req, res) => {
  const id = Number(req.params.id);
  const [v] = await db.query('SELECT * FROM viajes WHERE id = ?', [id]);
  if (!v.length) return fallo(res, 404, 'VIAJE_NO_ENCONTRADO', 'No existe el viaje ' + id);
  const viaje = v[0];
  if (viaje.estado === 'cancelado') return fallo(res, 409, 'VIAJE_CANCELADO', 'No se puede cobrar un viaje cancelado.');
  const metodo = ['efectivo', 'tarjeta', 'nequi', 'daviplata', 'pse'].includes(req.body && req.body.metodo)
    ? req.body.metodo : 'tarjeta';
  const monto = Number(viaje.tarifa);
  const comision = Math.round(monto * COMISION_PCT);
  const neto = monto - comision;
  const f = folio('REC');
  const [r] = await db.query(
    `INSERT INTO pagos (viaje_id, folio, monto, comision, neto, metodo, estado, referencia)
     VALUES (?,?,?,?,?,?,'aprobado',?)`,
    [id, f, monto, comision, neto, metodo, 'REF-' + Math.floor(Math.random() * 900000 + 100000)]
  );
  if (!['pagado', 'cancelado'].includes(viaje.estado))
    await db.query("UPDATE viajes SET estado = 'pagado', pagado_en = NOW() WHERE id = ?", [id]);
  await evento(id, 'pagado', 'Pago ' + f + ' por ' + monto + ' COP (' + metodo + ')');
  const [p] = await db.query('SELECT * FROM pagos WHERE id = ?', [r.insertId]);
  ok(res, { pago: p[0], comprobante: '/api/viajes/' + id + '/comprobante' }, 201);
});

app.get('/api/pagos', async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100) || 100, 500);
  const [rows] = await db.query(
    `SELECT p.*, v.barrio_destino, v.vehiculo, v.plataforma
     FROM pagos p JOIN viajes v ON v.id = p.viaje_id ORDER BY p.id DESC LIMIT ?`, [limit]);
  const [[t]] = await db.query('SELECT COALESCE(SUM(monto),0) AS cobrado, COALESCE(SUM(comision),0) AS comisiones, COUNT(*) AS n FROM pagos');
  ok(res, { total: t.n, cobrado: t.cobrado, comisiones: t.comisiones, pagos: rows });
});

/* ===================== COMPROBANTE (imprimible) ===================== */
app.get('/api/viajes/:id/comprobante', async (req, res) => {
  const id = Number(req.params.id);
  const [v] = await db.query('SELECT * FROM viajes WHERE id = ?', [id]);
  if (!v.length) return fallo(res, 404, 'VIAJE_NO_ENCONTRADO', 'No existe el viaje ' + id);
  const viaje = v[0];
  const [p] = await db.query('SELECT * FROM pagos WHERE viaje_id = ? ORDER BY id DESC LIMIT 1', [id]);
  const pago = p[0] || null;
  const money = n => '$ ' + Number(n || 0).toLocaleString('es-CO');
  const fmt = d => (d ? new Date(d).toLocaleString('es-CO') : '—');
  res.type('html').send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Comprobante ${viaje.folio || viaje.id} · UniX Driver</title>
<style>
 body{font-family:Segoe UI,Roboto,Arial,sans-serif;background:#eef3f9;padding:26px;color:#0b1a2e}
 .ticket{max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:26px;box-shadow:0 14px 34px rgba(10,25,55,.12)}
 .top{display:flex;justify-content:space-between;align-items:center;border-bottom:2px dashed #dfe8f3;padding-bottom:14px}
 .logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#1d4fd7,#0f38a8);color:#fff;
   display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px}
 h1{font-size:17px;margin:0}.muted{color:#5b6f88;font-size:12px}
 table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}
 td{padding:7px 0;border-bottom:1px solid #eef3f9}td:last-child{text-align:right;font-weight:700}
 .tot{font-size:16px;color:#1d4fd7}
 .chip{display:inline-block;background:#e6f7ec;color:#116a34;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px}
 .foot{margin-top:18px;font-size:11px;color:#5b6f88;text-align:center;line-height:1.6}
 .btn{display:block;width:100%;margin-top:16px;padding:12px;border:0;border-radius:12px;background:#1d4fd7;color:#fff;
   font-weight:800;font-size:14px;cursor:pointer}
 @media print{body{background:#fff;padding:0}.ticket{box-shadow:none}.btn{display:none}}
</style></head><body>
<div class="ticket">
 <div class="top"><div style="display:flex;gap:11px;align-items:center">
   <div class="logo">U</div><div><h1>UniX Driver · Cartagena</h1>
   <div class="muted">Comprobante de servicio de transporte</div></div></div>
   <span class="chip">${pago ? 'APROBADO' : 'SIN PAGO'}</span></div>
 <table>
  <tr><td>Folio del viaje</td><td>${viaje.folio || '#' + viaje.id}</td></tr>
  <tr><td>Folio del pago</td><td>${pago ? pago.folio : '—'}</td></tr>
  <tr><td>Fecha del servicio</td><td>${fmt(viaje.creado_en)}</td></tr>
  <tr><td>Origen</td><td>Piedra de Bolívar</td></tr>
  <tr><td>Destino</td><td>${viaje.barrio_destino}</td></tr>
  <tr><td>Localidad</td><td>${viaje.localidad || '—'}</td></tr>
  <tr><td>Zona tarifaria</td><td>${viaje.zona}</td></tr>
  <tr><td>Vehículo</td><td>${viaje.vehiculo === 'carro' ? '🚗 Carro' : '🏍️ Moto'}</td></tr>
  <tr><td>Distancia</td><td>${viaje.distancia_km || '—'} km</td></tr>
  <tr><td>Plataforma</td><td>${viaje.plataforma || '—'}</td></tr>
  <tr><td>Conductor</td><td>${viaje.conductor_nombre || '—'} ${viaje.conductor_placa ? '· ' + viaje.conductor_placa : ''}</td></tr>
  <tr><td>Método de pago</td><td>${pago ? pago.metodo : '—'}</td></tr>
  <tr><td>Referencia</td><td>${pago ? pago.referencia : '—'}</td></tr>
  <tr><td>Tarifa</td><td>${money(viaje.tarifa)}</td></tr>
  <tr><td>Comisión UniX (10%)</td><td>-${money(viaje.comision)}</td></tr>
  <tr><td class="tot">Ingreso neto conductor</td><td class="tot">${money(viaje.tarifa - viaje.comision)}</td></tr>
 </table>
 <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
 <div class="foot">Simulación académica · UniX Driver no es un operador real.<br>
 Generado el ${fmt(new Date())} · Documento sin validez fiscal.</div>
</div></body></html>`);
});

/* ===================== ESTADÍSTICAS ===================== */
app.get('/api/estadisticas', async (_req, res) => {
  const [[t]] = await db.query(`SELECT COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN estado='pagado' THEN 1 ELSE 0 END),0) AS pagados,
      COALESCE(SUM(CASE WHEN estado='cancelado' THEN 1 ELSE 0 END),0) AS cancelados,
      COALESCE(SUM(CASE WHEN estado='pagado' THEN tarifa ELSE 0 END),0) AS facturado,
      COALESCE(SUM(CASE WHEN estado='pagado' THEN comision ELSE 0 END),0) AS comisiones
    FROM viajes`);
  const [porZona] = await db.query(`SELECT zona, COUNT(*) AS viajes, COALESCE(SUM(tarifa),0) AS total
    FROM viajes GROUP BY zona`);
  const [porEstado] = await db.query('SELECT estado, COUNT(*) AS viajes FROM viajes GROUP BY estado');
  const [porDia] = await db.query(`SELECT DATE(creado_en) AS dia, COUNT(*) AS viajes,
    COALESCE(SUM(tarifa),0) AS total FROM viajes GROUP BY DATE(creado_en) ORDER BY dia DESC LIMIT 14`);
  const [topBarrios] = await db.query(`SELECT barrio_destino, COUNT(*) AS viajes FROM viajes
    GROUP BY barrio_destino ORDER BY viajes DESC LIMIT 8`);
  ok(res, { resumen: t, por_zona: porZona, por_estado: porEstado, por_dia: porDia, top_barrios: topBarrios });
});

/* ===================== ERRORES ===================== */
app.use((err, _req, res, _next) => {
  console.error('ERROR:', err.message);
  res.status(500).json({ code: 'ERROR_INTERNO', error: err.message });
});

/* ===================== ARRANQUE ===================== */
async function main() {
  const info = await conectar();
  db = info.pool;
  const [b] = await db.query('SELECT COUNT(*) AS n FROM barrios');
  console.log('✔ MySQL conectado:', info.cfg.user + '@' + info.cfg.host + ':' + info.cfg.port + '/' + info.cfg.database);
  console.log('✔ Semilla: ' + b[0].n + ' barrios · ' + info.info.tarifas + ' zonas tarifarias');
  if (process.argv.includes('--seed-only')) {
    console.log('✔ Semilla aplicada. Saliendo (--seed-only).');
    process.exit(0);
  }
  app.listen(PORT, () => {
    console.log('✔ UniX Driver · Cartagena escuchando en http://localhost:' + PORT);
  });
}

main().catch(err => {
  const msg = String(err && err.message || err);
  console.error('');
  console.error('✖ No se pudo iniciar la aplicación: ' + msg);
  console.error('');
  if (/ECONNREFUSED/.test(msg)) {
    console.error('  MySQL no está escuchando. En XAMPP abre el Panel de Control y pulsa');
    console.error('  "Start" en MySQL (debe quedar verde). Comprueba DB_PORT en .env (3306).');
  } else if (/ER_ACCESS_DENIED_ERROR|Access denied/.test(msg)) {
    console.error('  Usuario o contraseña incorrectos. Abre .env y ajusta DB_USER / DB_PASSWORD.');
    console.error('  En una instalación XAMPP nueva suele ser: DB_USER=root y DB_PASSWORD=');
  } else if (/ER_BAD_DB_ERROR/.test(msg)) {
    console.error('  La base no existe y no se pudo crear. Impórtala en phpMyAdmin');
    console.error('  (http://localhost/phpmyadmin) usando el archivo database.sql.');
  }
  console.error('');
  console.error('  Puerto de la app: ' + PORT + '  ->  http://localhost:' + PORT);
  process.exit(1);
});
