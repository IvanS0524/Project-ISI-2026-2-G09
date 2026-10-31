/* ============================================================
   UniX Driver · Cartagena — cliente de escritorio
   Toda la lógica de negocio vive en el servidor (Node + MySQL).
   ============================================================ */
'use strict';

const API = '';                     // mismo origen
const COMISION_PCT = 0.10;
const ORIGEN = { nombre: 'Universidad de Cartagena · Piedra de Bolívar', lat: 10.401904, lon: -75.508695 };
const ZONA_NOMBRE = { corto: 'Zona corta 🟢', medio: 'Zona media 🟡', largo: 'Zona larga 🔴' };
const ZONA_COLOR = { corto: '#16a34a', medio: '#d97706', largo: '#dc2626' };
const ESTADO_LABEL = { pendiente: 'Pendiente', asignado: 'Asignado', en_curso: 'En curso',
  finalizado: 'Finalizado', cancelado: 'Cancelado', pagado: 'Pagado' };

let CATALOGO = [];
let vehiculoActual = 'moto';
let destinoActual = '', barrioActual = null, zonaActual = null, tarifaBase = 0;
let ofertas = [], ofertaSel = null, viajeId = null;
let fare = 0, comision = 0;
let busy = false, viajeIniciado = false, ofertasMostradas = false;
let timers = [];
let mapaApi = null, capaRuta = null, marcadores = [];
let filtroZona = 'todas', filtroPicker = 'todas';
let pilaPantallas = [], pantallaActual = 1, timerHistorial = null;

const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
function clearTimers() { timers.forEach(t => clearTimeout(t)); timers = []; }

const money = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const vehLabel = () => vehiculoActual === 'moto' ? '🏍️ Moto' : '🚗 Carro';
const vehEmoji = () => vehiculoActual === 'moto' ? '🏍️' : '🚗';
const pick = a => a[Math.floor(Math.random() * a.length)];
const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const $ = id => document.getElementById(id);

/* ===================== API ===================== */
async function api(path, options) {
  const opt = Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {});
  const res = await fetch(API + path, opt);
  let data = {};
  try { data = await res.json(); } catch (_) { data = {}; }
  return { ok: res.ok, status: res.status, data };
}
const apiGet = p => api(p, { method: 'GET' });
const apiJson = (p, m, body) => api(p, { method: m, body: JSON.stringify(body || {}) });

/* ===================== UI ===================== */
function goToScreen(n) {
  const anterior = pantallaActual;
  if (anterior && anterior !== n) {
    if (pilaPantallas[pilaPantallas.length - 1] !== anterior) pilaPantallas.push(anterior);
    if (pilaPantallas.length > 25) pilaPantallas.shift();
  }
  pantallaActual = n;
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const el = $('screen' + n);
  if (el) el.classList.add('active');
  setDesktopNav(n);
  if (n === 1) setTimeout(() => mapaApi && mapaApi.invalidateSize(), 140);
  if (n === 7) cargarHistorial();
  if (n === 8) cargarPanel();
  const cont = document.querySelector('.screen-container');
  if (cont) cont.scrollTop = 0;
}

function setDesktopNav(n) {
  document.querySelectorAll('.side-link').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.screen) === Number(n));
  });
}

function setNotice(id, html, cls) {
  const e = $(id);
  if (!e) return;
  if (!html) { e.classList.add('hidden'); e.innerHTML = ''; return; }
  e.innerHTML = html;
  e.className = 'notice' + (cls ? ' ' + cls : '');
}

function setPlatformStatus(texto, wait) {
  ['uberStatus', 'didiStatus', 'indriveStatus'].forEach(id => {
    const e = $(id);
    if (!e) return;
    e.textContent = texto;
    e.className = 'status' + (wait ? ' wait' : '');
  });
}

function tic() {
  const d = new Date();
  $('clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
tic(); setInterval(tic, 20000);

/* ===================== CATÁLOGO ===================== */
async function cargarCatalogo() {
  const r = await apiGet('/api/barrios');
  if (!r.ok) { console.error('catálogo:', r.data); return; }
  CATALOGO = r.data.barrios || [];
  $('pickerSub').textContent = CATALOGO.length + ' barrios oficiales del Distrito';
  renderTabla(); renderChips(); pintarMapaBase();
}

function barrioPorTexto(texto) {
  const t = norm(texto);
  if (!t) return null;
  return CATALOGO.find(b => b.nombre_norm === t)
    || CATALOGO.find(b => norm(b.nombre) === t)
    || CATALOGO.find(b => b.nombre_norm.startsWith(t))
    || CATALOGO.find(b => b.nombre_norm.includes(t)) || null;
}

/* ===================== SELECTOR DE BARRIOS ===================== */
function abrirSelector() {
  $('pickerOverlay').classList.remove('hidden');
  document.body.classList.add('con-modal');
  $('pickerBuscar').value = '';
  filtroPicker = 'todas';
  document.querySelectorAll('#pickerChips .chip-btn').forEach(b => b.classList.toggle('on', b.dataset.z === 'todas'));
  filtrarBarrios();
  setTimeout(() => { try { $('pickerBuscar').focus(); } catch (_) {} }, 120);
}

function cerrarSelector() {
  $('pickerOverlay').classList.add('hidden');
  document.body.classList.remove('con-modal');
}

function setFiltroPicker(z) {
  filtroPicker = z;
  document.querySelectorAll('#pickerChips .chip-btn').forEach(b => b.classList.toggle('on', b.dataset.z === z));
  filtrarBarrios();
}

function filtrarBarrios() {
  const texto = norm($('pickerBuscar').value);
  const lista = CATALOGO.filter(b =>
    (filtroPicker === 'todas' || b.zona === filtroPicker) &&
    (!texto || b.nombre_norm.includes(texto) || norm(b.localidad).includes(texto))
  );
  $('pickerCount').textContent = lista.length + ' de ' + CATALOGO.length + ' barrios';
  if (!lista.length) { $('pickerList').innerHTML = '<div class="picker-vacio">Sin resultados. Prueba con otro nombre.</div>'; return; }
  let html = '';
  for (const zona of ['corto', 'medio', 'largo']) {
    const items = lista.filter(b => b.zona === zona);
    if (!items.length) continue;
    html += '<div class="picker-sep"><span class="zdot ' + zona + '"></span>Zona ' +
      (zona === 'corto' ? 'corta' : zona === 'medio' ? 'media' : 'larga') +
      ' <small>(' + items.length + ')</small></div>';
    for (const b of items) {
      html += '<button class="picker-item" onclick="elegirBarrio(' + b.id + ')">' +
        '<span class="zdot ' + zona + '"></span>' +
        '<span class="pi-txt"><b>' + b.nombre + '</b><small>' + (b.localidad || '') + '</small></span>' +
        '<span class="pi-meta">' + (b.distancia_km != null ? b.distancia_km : '—') + ' km<br><b>' +
        money(vehiculoActual === 'moto' ? b.tarifa_moto : b.tarifa_carro) + '</b></span></button>';
    }
  }
  $('pickerList').innerHTML = html;
}

function elegirBarrio(id) {
  const b = CATALOGO.find(x => x.id === id);
  if (!b) return;
  cerrarSelector();
  $('destination').value = b.nombre;
  barrioActual = b;
  zonaActual = b.zona;
  actualizarChip();
  dibujarRuta(b);
}

function setDest(nombre) {
  const b = typeof nombre === 'number' ? CATALOGO.find(x => x.id === nombre) : barrioPorTexto(nombre);
  if (!b) return;
  elegirBarrio(b.id);
}

/* ===================== CHIP Y FICHA ===================== */
function actualizarChip() {
  const chip = $('zoneChip'), ficha = $('fichaBarrio');
  const b = barrioActual;
  if (!b) { chip.classList.add('hidden'); ficha.classList.add('hidden'); return; }
  chip.className = 'zone-chip z-' + b.zona;
  chip.innerHTML = '<span class="dot"></span> ' + ZONA_NOMBRE[b.zona] + ' · ' + vehLabel() +
    ': <b>' + money(vehiculoActual === 'moto' ? b.tarifa_moto : b.tarifa_carro) + '</b>';
  ficha.classList.remove('hidden');
  ficha.innerHTML =
    '<div class="full"><span>LOCALIDAD</span><b style="font-size:11.5px;">' + (b.localidad || '—') + '</b></div>' +
    '<div><span>DISTANCIA</span><b>' + (b.distancia_km != null ? b.distancia_km : '—') + ' km</b></div>' +
    '<div><span>ZONA TARIFARIA</span><b>' + ZONA_NOMBRE[b.zona].replace(/ [🟢🟡🔴]/g, '') + '</b></div>' +
    '<div><span>🏍️ MOTO</span><b>' + money(b.tarifa_moto) + '</b></div>' +
    '<div><span>🚗 CARRO</span><b>' + money(b.tarifa_carro) + '</b></div>';
}

function seleccionarVehiculo(tipo) {
  vehiculoActual = tipo;
  $('btnMoto').className = tipo === 'moto' ? 'active' : '';
  $('btnCarro').className = tipo === 'carro' ? 'active' : '';
  actualizarChip();
}

/* ===================== MAPA Y RUTA (OSRM) ===================== */
function pintarMapaBase() {
  if (typeof L === 'undefined' || mapaApi) return;
  mapaApi = L.map('mapa', { zoomControl: true, scrollWheelZoom: false })
    .setView([ORIGEN.lat, ORIGEN.lon], 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap · OSRM'
  }).addTo(mapaApi);
  L.circleMarker([ORIGEN.lat, ORIGEN.lon], { radius: 8, color: '#1d4fd7', fillColor: '#1d4fd7', fillOpacity: 1 })
    .addTo(mapaApi).bindPopup('<b>Origen</b><br>' + ORIGEN.nombre);
  setTimeout(() => mapaApi && mapaApi.invalidateSize(), 240);
}

async function dibujarRuta(b) {
  if (!mapaApi || !b) return;
  try {
    const r = await apiGet('/api/ruta?id=' + b.id);
    const d = r.ok ? r.data : null;
    if (capaRuta) { mapaApi.removeLayer(capaRuta); capaRuta = null; }
    marcadores.forEach(m => mapaApi.removeLayer(m)); marcadores = [];
    if (!d) return;
    const pts = (d.geometria || []).map(p => [p[1], p[0]]);
    if (pts.length > 1) {
      capaRuta = L.polyline(pts, { color: '#1d4fd7', weight: 5, opacity: .85 }).addTo(mapaApi);
      mapaApi.fitBounds(capaRuta.getBounds(), { padding: [24, 24] });
    } else {
      mapaApi.setView([b.lat, b.lon], 14);
    }
    marcadores.push(L.marker([b.lat, b.lon]).addTo(mapaApi)
      .bindPopup('<b>' + b.nombre + '</b><br>' + (b.localidad || '') + '<br>' +
        (d.distancia_km || b.distancia_km) + ' km · ' + (d.duracion_min || '—') + ' min'));
    const badge = $('rutaSrc');
    badge.textContent = d.fuente;
    badge.className = 'badge-src' + (d.aviso ? ' off' : '');
    setNotice('rutaInfo',
      '🛣️ <b>' + b.nombre + '</b> · ' + (d.distancia_km || '—') + ' km por carretera · ~' +
      (d.duracion_min || '—') + ' min · tarifa ' + vehLabel() + ' <b>' +
      money(vehiculoActual === 'moto' ? b.tarifa_moto : b.tarifa_carro) + '</b>' +
      (d.aviso ? '<br><small>' + d.aviso + '</small>' : ''), d.aviso ? 'error' : 'success');
  } catch (err) { console.warn('ruta:', err); }
}

/* ===================== 1) BUSCAR ===================== */
function ejemplo() {
  const b = barrioPorTexto('Bocagrande');
  if (b) { elegirBarrio(b.id); buscarViajes(); }
}

async function buscarViajes() {
  if (busy) return;
  if (!barrioActual) {
    setNotice('searchNotice', '⚠️ <b>Elige un destino.</b> Toca el campo de destino para ver los 212 barrios.', 'error');
    return;
  }
  const btn = $('btnBuscar');
  busy = true; btn.disabled = true; btn.textContent = '⏳ Buscando…';

  try {
    const r = await apiGet('/api/price?destino=' + encodeURIComponent(barrioActual.nombre) +
      '&vehiculo=' + encodeURIComponent(vehiculoActual));
    if (!r.ok) {
      busy = false; btn.disabled = false; btn.textContent = '🔍 Buscar conductor';
      setNotice('searchNotice', '⚠️ <b>Barrio no reconocido.</b> Elige uno de los 212 barrios oficiales.', 'error');
      return;
    }
    const d = r.data;
    destinoActual = d.barrio; zonaActual = d.zona; tarifaBase = d.tarifa;

    setNotice('searchNotice', '');
    setPlatformStatus('Buscando…', true);
    $('s1').classList.add('done');
    $('radarPanel').classList.remove('hidden');
    $('offers').classList.add('hidden');
    $('offers').innerHTML = '';
    setNotice('offersNotice', '');
    goToScreen(2);

    clearTimers();
    ofertasMostradas = false;
    later(() => mostrarOfertas(), 2200);
    later(() => { if (!ofertasMostradas) mostrarOfertas(); }, 6500);   // red de seguridad

    const c = await apiJson('/api/viajes', 'POST', { barrio_destino: destinoActual, vehiculo: vehiculoActual });
    if (c.ok) viajeId = c.data.viaje.id;
    else console.warn('registro del viaje:', c.status, c.data);
  } catch (err) {
    console.error('buscarViajes:', err);
    busy = false; btn.disabled = false; btn.textContent = '🔍 Buscar conductor';
    setNotice('searchNotice', '⚠️ No se pudo cotizar el destino. Revisa la conexión con el servidor.', 'error');
  }
}

function cancelarBusqueda() {
  clearTimers();
  ofertasMostradas = false; busy = false;
  const btn = $('btnBuscar');
  if (btn) { btn.disabled = false; btn.textContent = '🔍 Buscar conductor'; }
  $('radarPanel').classList.add('hidden');
  $('offers').classList.add('hidden');
  setPlatformStatus('Disponible', false);
  goToScreen(1);
}

/* ===================== 2) OFERTAS (desde MySQL) ===================== */
async function mostrarOfertas() {
  if (ofertasMostradas) return;
  ofertasMostradas = true;
  const cont = $('offers');

  if (viajeId == null) {          // sin viaje registrado: se generan ofertas locales
    ofertas = ['Uber', 'DiDi', 'inDrive'].map((p, i) => {
      const factor = [1.05, 0.98, 0.92][i];
      const precio = Math.max(1000, Math.round(tarifaBase * factor / 100) * 100);
      return { plataforma: p, precio, eta_min: [5, 4, 7][i],
        conductor_nombre: pick(['Carlos M.', 'Andrés R.', 'Miguel P.', 'Laura S.', 'David A.', 'Sofía C.']),
        conductor_rating: (4 + Math.random() * 0.9).toFixed(1),
        conductor_vehiculo: vehiculoActual === 'moto' ? 'TVS Raider' : 'Kia Picanto',
        conductor_placa: 'ABC-123', id: null };
    });
  } else {
    const r = await apiJson('/api/viajes/' + viajeId + '/ofertas', 'POST', {});
    if (r.ok) ofertas = r.data.ofertas;
    else { ofertas = []; }
  }

  setPlatformStatus('Respondió', false);
  $('radarPanel').classList.add('hidden');
  if (!ofertas.length) {
    setNotice('offersNotice', '⚠️ No se pudieron obtener ofertas. Intenta de nuevo.', 'error');
    busy = false; $('btnBuscar').disabled = false; $('btnBuscar').textContent = '🔍 Buscar conductor';
    return;
  }
  const min = Math.min(...ofertas.map(o => o.precio));
  const cls = p => p === 'Uber' ? 'uber' : p === 'DiDi' ? 'didi' : 'indrive';

  cont.innerHTML = ofertas.map((o, i) => {
    const best = o.precio === min;
    return '<div class="offer ' + (best ? 'recommended' : '') + '" data-idx="' + i + '" style="animation-delay:' + (i * 0.14) + 's">' +
      '<div class="offer-left"><div class="p-badge ' + cls(o.plataforma) + '"><img src="img/' + cls(o.plataforma) + '.png" alt="' + o.plataforma + '"></div>' +
      '<div><div class="offer-title">' + o.plataforma + ' ' + (best ? '⭐' : '') + '</div>' +
      '<div class="offer-meta">👤 ' + o.conductor_nombre + ' · ⭐ ' + o.conductor_rating + '</div>' +
      '<div class="offer-meta">' + vehEmoji() + ' ' + (o.conductor_vehiculo || vehLabel()) + ' · llega en ' + o.eta_min + ' min</div></div></div>' +
      '<div class="offer-right"><div class="price">' + money(o.precio) + '</div>' +
      (best ? '<div class="recommend">MEJOR PRECIO</div>' : '<div class="pick">Toca para elegir</div>') + '</div></div>';
  }).join('');
  cont.classList.remove('hidden');

  const fila = barrioActual && barrioActual.distancia_km != null ? barrioActual.distancia_km : '—';
  setNotice('offersNotice', '📍 Destino: <b>' + destinoActual + '</b> · ' + vehLabel() + ' · ' + fila +
    ' km. Tarifa base ' + money(tarifaBase) + '. Toca una oferta para ver el conductor.' +
    (viajeId == null ? '<br><small>⚠️ Este viaje no se pudo registrar en la base de datos.</small>' : ''), 'success');
  $('s2').classList.add('done');

  busy = false;
  $('btnBuscar').disabled = false;
  $('btnBuscar').textContent = '🔍 Buscar conductor';
}

document.getElementById('offers').addEventListener('click', e => {
  const card = e.target.closest('.offer');
  if (!card) return;
  seleccionarOferta(Number(card.dataset.idx));
});

/* ===================== 3) CONDUCTOR ===================== */
async function seleccionarOferta(idx) {
  ofertaSel = ofertas[idx];
  if (!ofertaSel) return;
  fare = ofertaSel.precio;
  comision = Math.round(fare * COMISION_PCT);

  $('condNombre').textContent = ofertaSel.conductor_nombre || '—';
  $('condVehiculo').textContent = ofertaSel.conductor_vehiculo || '—';
  $('condPlaca').textContent = ofertaSel.conductor_placa || '—';
  $('condRating').textContent = '⭐ ' + (ofertaSel.conductor_rating || '—');
  $('condPlataforma').textContent = ofertaSel.plataforma;
  $('conductorInfo').classList.remove('hidden');

  const km = barrioActual && barrioActual.distancia_km != null ? barrioActual.distancia_km : '—';
  $('tripSummary').innerHTML = '<div class="notice success"><b>' + ofertaSel.plataforma + ' asignó un conductor.</b><br>' +
    'Destino: <b>' + destinoActual + '</b> · ' + vehLabel() + ' · ' + km + ' km<br>' +
    'Tarifa acordada: <b>' + money(fare) + '</b> · Llega en ' + ofertaSel.eta_min + ' min</div>';

  $('vehicleEmoji').textContent = vehEmoji();
  $('s3').classList.add('done');
  goToScreen(3);

  if (ofertaSel.id) {
    try { await apiJson('/api/ofertas/' + ofertaSel.id + '/seleccionar', 'PATCH', {}); }
    catch (err) { console.warn('seleccionar oferta:', err); }
  } else if (viajeId != null) {
    try {
      await apiJson('/api/viajes/' + viajeId, 'PATCH', {
        plataforma: ofertaSel.plataforma, conductor_nombre: ofertaSel.conductor_nombre,
        conductor_vehiculo: ofertaSel.conductor_vehiculo, conductor_placa: ofertaSel.conductor_placa,
        conductor_rating: ofertaSel.conductor_rating, tarifa: fare, comision: comision
      });
    } catch (err) { console.warn('asignar conductor:', err); }
  }
}

/* ===================== 4) VIAJE ===================== */
function iniciarViaje() {
  if (!ofertaSel || viajeIniciado) return;
  viajeIniciado = true;
  $('startBtn').disabled = true;
  $('startBtn').textContent = '🛣️ En curso…';
  $('s4').classList.add('done');
  setNotice('tripNotice', 'Viaje iniciado hacia <b>' + destinoActual + '</b>. Sigue el recorrido…', 'success');

  const road = $('road'), fill = $('progressFill');
  $('speedlines').style.display = 'block';
  road.classList.remove('running');
  fill.style.animation = 'none';
  void road.offsetWidth;
  road.classList.add('running');
  fill.style.animation = 'relleno 6s linear forwards';

  if (viajeId != null) apiJson('/api/viajes/' + viajeId, 'PATCH', { estado: 'en_curso' }).catch(() => {});

  let rest = 6;
  const st = $('tripStatus');
  st.textContent = '🛣️ Viaje en curso… llegando a ' + destinoActual + ' en ' + rest + ' s';
  const iv = setInterval(() => { rest--; if (rest > 0) st.textContent = '🛣️ Viaje en curso… llegando a ' + destinoActual + ' en ' + rest + ' s'; }, 1000);
  timers.push(iv);
  later(() => finalizarViaje(), 6000);
}

async function finalizarViaje() {
  viajeIniciado = false;
  $('road').classList.remove('running');
  $('speedlines').style.display = 'none';
  $('tripStatus').textContent = '✅ Viaje finalizado. Consulta el resumen de pago.';
  $('s5').classList.add('done');

  $('fareBig').textContent = money(fare);
  $('fareRoute').textContent = 'Piedra de Bolívar → ' + destinoActual + ' · ' + vehLabel() + ' · ' + ofertaSel.plataforma;
  $('fare').textContent = money(fare);
  $('commission').textContent = '-' + money(comision);
  $('net').textContent = money(fare - comision);
  setNotice('tripNotice', '✅ Viaje finalizado. Se calculó la comisión de UniX Driver (10%).', 'success');
  goToScreen(4);

  if (viajeId != null) {
    try { await apiJson('/api/viajes/' + viajeId, 'PATCH', { estado: 'finalizado' }); }
    catch (err) { console.warn('finalizar:', err); }
  }
}

function cancelarViaje() {
  if (viajeIniciado) return;
  clearTimers();
  ofertaSel = null;
  $('conductorInfo').classList.add('hidden');
  setNotice('tripNotice', 'Viaje cancelado. No se realizó ningún cobro.');
  if (viajeId != null) apiJson('/api/viajes/' + viajeId, 'PATCH', { estado: 'cancelado' }).catch(() => {});
  goToScreen(1);
}

/* ===================== 5) PAGO Y COMPROBANTE ===================== */
async function pagar() {
  if (!ofertaSel) return;
  $('s6').classList.add('done');
  $('payBtn').disabled = true;
  setNotice('paymentNotice', '💳 Procesando pago simulado…', '');
  let pago = null;

  if (viajeId != null) {
    const r = await apiJson('/api/viajes/' + viajeId + '/pago', 'POST', { metodo: 'tarjeta' });
    if (r.ok) pago = r.data.pago;
    else setNotice('paymentNotice', '⚠️ El pago se mostró localmente, pero no se pudo registrar en MySQL.', 'error');
  }

  setNotice('paymentNotice', '💳 Pago simulado exitoso: ' + money(fare) + ' cobrados · comisión UniX ' + money(comision) + '.', 'success');
  $('successText').innerHTML = 'Pago de <b>' + money(fare) + '</b> procesado con <b>' + ofertaSel.plataforma + '</b>.<br>' +
    'Comisión de UniX Driver (10%): <b>' + money(comision) + '</b>.';

  $('receiptBox').innerHTML =
    '<div class="row"><span>Folio del viaje</span><b>' + (pago ? '#' + viajeId : 'sin registro') + '</b></div>' +
    '<div class="row"><span>Folio del pago</span><b>' + (pago ? pago.folio : '—') + '</b></div>' +
    '<div class="row"><span>Plataforma</span><b>' + ofertaSel.plataforma + '</b></div>' +
    '<div class="row"><span>Conductor</span><b>' + ofertaSel.conductor_nombre + ' · ⭐ ' + ofertaSel.conductor_rating + '</b></div>' +
    '<div class="row"><span>Ruta</span><b>Piedra de Bolívar → ' + destinoActual + '</b></div>' +
    '<div class="row"><span>Vehículo</span><b>' + vehLabel() + '</b></div>' +
    '<div class="row"><span>Tarifa pagada</span><b>' + money(fare) + '</b></div>' +
    '<div class="row"><span>Comisión UniX (10%)</span><b>' + money(comision) + '</b></div>' +
    '<div class="row"><span>Ingreso neto conductor</span><b>' + money(fare - comision) + '</b></div>' +
    (viajeId != null ? '<button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="verComprobante(' + viajeId + ')">🧾 Ver comprobante imprimible</button>' : '');

  goToScreen(5);
}

function verComprobante(id) {
  window.open(API + '/api/viajes/' + id + '/comprobante', '_blank');
}

/* ===================== 6) NUEVO VIAJE ===================== */
function nuevoViaje() {
  clearTimers();
  ofertaSel = null; ofertas = []; destinoActual = '';
  zonaActual = null; fare = 0; comision = 0;
  busy = false; viajeIniciado = false; ofertasMostradas = false; viajeId = null; tarifaBase = 0;

  seleccionarVehiculo('moto');
  barrioActual = null;
  $('destination').value = '';
  $('zoneChip').classList.add('hidden');
  $('fichaBarrio').classList.add('hidden');
  setNotice('searchNotice', ''); setNotice('offersNotice', ''); setNotice('tripNotice', ''); setNotice('paymentNotice', '');
  $('offers').innerHTML = ''; $('offers').classList.add('hidden');
  $('radarPanel').classList.remove('hidden');
  $('conductorInfo').classList.add('hidden');
  setPlatformStatus('Disponible', false);

  $('startBtn').disabled = false; $('startBtn').textContent = '▶ Iniciar viaje';
  $('payBtn').disabled = false;
  $('road').classList.remove('running');
  $('speedlines').style.display = 'none';
  $('progressFill').style.animation = '';
  $('tripStatus').textContent = 'Toca «Iniciar viaje» para comenzar el recorrido.';
  $('vehicleEmoji').textContent = '🏍️';
  ['s1', 's2', 's3', 's4', 's5', 's6'].forEach(id => $(id) && $(id).classList.remove('done'));
  goToScreen(1);
}

/* ===================== 7) TABLA DE PRECIOS ===================== */
function renderChips() {
  const zonas = [['todas', 'Todas'], ['corto', '🟢 Corta'], ['medio', '🟡 Media'], ['largo', '🔴 Larga']];
  const el = $('chipZonas');
  if (!el) return;
  el.innerHTML = zonas.map(([k, t]) =>
    '<button class="chip-btn ' + (filtroZona === k ? 'on' : '') + '" onclick="setFiltroZona(\'' + k + '\')">' + t + '</button>').join('');
}
function setFiltroZona(z) { filtroZona = z; renderChips(); renderTabla(); }

function renderTabla() {
  const input = $('tablaFiltro');
  const texto = norm(input ? input.value : '');
  const lista = CATALOGO.filter(b =>
    (filtroZona === 'todas' || b.zona === filtroZona) &&
    (!texto || b.nombre_norm.includes(texto) || norm(b.localidad).includes(texto)));
  let html = '';
  for (const zona of ['corto', 'medio', 'largo']) {
    const items = lista.filter(b => b.zona === zona);
    if (!items.length) continue;
    html += '<tr class="group"><td colspan="3"><span class="zdot ' + zona + '"></span>' +
      (zona === 'corto' ? 'Zona corta' : zona === 'medio' ? 'Zona media' : 'Zona larga') +
      ' <small>(' + items.length + ' barrios)</small></td></tr>';
    for (const b of items) {
      html += '<tr><td><span class="zdot ' + zona + '"></span>' + b.nombre +
        '<br><small style="color:#5b6f88;">' + (b.localidad || '') + '</small></td>' +
        '<td class="num">' + money(b.tarifa_moto) + '</td><td class="num">' + money(b.tarifa_carro) + '</td></tr>';
    }
  }
  $('priceTableBody').innerHTML = html || '<tr><td colspan="3" style="text-align:center;color:#5b6f88;padding:18px;">Sin resultados</td></tr>';
}

/* ===================== 8) HISTORIAL ===================== */
function debounceHistorial() {
  clearTimeout(timerHistorial);
  timerHistorial = setTimeout(cargarHistorial, 320);
}

async function cargarHistorial() {
  const cont = $('historialLista');
  if (!cont) return;
  const p = new URLSearchParams({ limit: '200' });
  const t = $('hTexto').value.trim(); if (t) p.set('q', t);
  const e = $('hEstado').value; if (e !== 'todos') p.set('estado', e);
  const v = $('hVehiculo').value; if (v !== 'todos') p.set('vehiculo', v);
  if ($('hDesde').value) p.set('desde', $('hDesde').value);
  if ($('hHasta').value) p.set('hasta', $('hHasta').value);

  cont.innerHTML = '<div class="hist-vacio">Cargando historial desde MySQL…</div>';
  const r = await apiGet('/api/viajes?' + p.toString());
  if (!r.ok) { cont.innerHTML = '<div class="hist-vacio">⚠️ No se pudo leer el historial. ¿Está corriendo MySQL?</div>'; return; }
  const lista = r.data.viajes || [];
  const filtrados = lista.length, total = r.data.total || 0;
  const cobrado = lista.filter(x => x.estado === 'pagado').reduce((s, x) => s + Number(x.tarifa || 0), 0);
  const comisiones = lista.filter(x => x.estado === 'pagado').reduce((s, x) => s + Number(x.comision || 0), 0);

  $('historialResumen').innerHTML =
    '<div class="hist-kpi"><small>VIAJES LISTADOS</small><b>' + filtrados + '</b></div>' +
    '<div class="hist-kpi"><small>TOTAL EN LA BASE</small><b>' + total + '</b></div>' +
    '<div class="hist-kpi"><small>COBRADO</small><b>' + money(cobrado) + '</b></div>' +
    '<div class="hist-kpi"><small>COMISIONES</small><b>' + money(comisiones) + '</b></div>';

  if (!lista.length) { cont.innerHTML = '<div class="hist-vacio">No hay viajes con estos filtros.<br>Solicita un viaje y aparecerá aquí.</div>'; return; }

  cont.innerHTML = lista.map(x => {
    const f = x.creado_en ? new Date(x.creado_en).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
    const con = x.conductor_nombre ? ' · ' + x.conductor_nombre : '';
    return '<div class="hist-item">' +
      '<div class="hist-top"><b>' + x.barrio_destino + '</b>' +
      '<span class="hist-estado ' + x.estado + '">' + (ESTADO_LABEL[x.estado] || x.estado) + '</span></div>' +
      '<div class="hist-meta">' + (x.vehiculo === 'carro' ? '🚗' : '🏍️') + ' ' + x.vehiculo + ' · ' +
      (x.distancia_km != null ? x.distancia_km : '—') + ' km · ' + (x.plataforma || 'sin plataforma') + con + '</div>' +
      '<div class="hist-meta">📅 ' + f + ' · Folio ' + (x.folio || '#' + x.id) +
      ' · <span class="zdot ' + x.zona + '" style="display:inline-block;vertical-align:-1px;"></span> ' + x.zona + '</div>' +
      '<div class="hist-pago"><span>Tarifa ' + money(x.tarifa) + '</span>' +
      '<span class="hist-com">Comisión ' + money(x.comision) + '</span></div>' +
      '<div class="hist-acc">' +
      '<a class="mini-btn" href="/api/viajes/' + x.id + '/comprobante" target="_blank">🧾 Comprobante</a>' +
      (x.estado !== 'pagado' && x.estado !== 'cancelado'
        ? '<button class="mini-btn" onclick="cobrarDesdeHistorial(' + x.id + ')">💳 Cobrar</button>' : '') +
      (x.estado !== 'pagado' && x.estado !== 'cancelado'
        ? '<button class="mini-btn danger" onclick="cancelarDesdeHistorial(' + x.id + ')">✕ Cancelar</button>' : '') +
      '</div></div>';
  }).join('');
}

async function cobrarDesdeHistorial(id) {
  const r = await apiJson('/api/viajes/' + id + '/pago', 'POST', { metodo: 'tarjeta' });
  if (r.ok) { await cargarHistorial(); window.open('/api/viajes/' + id + '/comprobante', '_blank'); }
  else alert('No se pudo registrar el pago: ' + (r.data.error || r.status));
}

async function cancelarDesdeHistorial(id) {
  if (!confirm('¿Cancelar el viaje #' + id + '?')) return;
  await apiJson('/api/viajes/' + id, 'PATCH', { estado: 'cancelado' });
  cargarHistorial();
}

/* ===================== 9) PANEL Y PAGOS ===================== */
function filaBarra(nombre, valor, max, color) {
  const pct = max ? Math.max(4, Math.round((valor / max) * 100)) : 0;
  return '<div class="bar-row"><span class="bar-lab">' + nombre + '</span>' +
    '<span class="bar-track"><i style="width:' + pct + '%;background:' + color + '"></i></span>' +
    '<b class="bar-val">' + valor + '</b></div>';
}

async function cargarPanel() {
  const kpi = $('kpiBox');
  if (!kpi) return;
  kpi.innerHTML = '<div class="kpi"><small>…</small><b>—</b></div>';

  const e = await apiGet('/api/estadisticas');
  if (e.ok) {
    const r = e.data.resumen;
    kpi.innerHTML =
      '<div class="kpi"><small>VIAJES</small><b>' + r.total + '</b></div>' +
      '<div class="kpi"><small>PAGADOS</small><b>' + r.pagados + '</b></div>' +
      '<div class="kpi"><small>CANCELADOS</small><b>' + r.cancelados + '</b></div>' +
      '<div class="kpi"><small>FACTURADO</small><b>' + money(r.facturado) + '</b></div>' +
      '<div class="kpi"><small>COMISIONES 10%</small><b>' + money(r.comisiones) + '</b></div>';
    const maxZ = Math.max(1, ...e.data.por_zona.map(x => x.viajes));
    $('barsZona').innerHTML = e.data.por_zona.length
      ? e.data.por_zona.map(x => filaBarra(ZONA_NOMBRE[x.zona] || x.zona, x.viajes, maxZ, ZONA_COLOR[x.zona] || '#1d4fd7')).join('')
      : '<div class="hist-vacio">Aún no hay viajes.</div>';
    const maxB = Math.max(1, ...e.data.top_barrios.map(x => x.viajes));
    $('barsBarrios').innerHTML = e.data.top_barrios.length
      ? e.data.top_barrios.map(x => filaBarra(x.barrio_destino, x.viajes, maxB, '#1d4fd7')).join('')
      : '<div class="hist-vacio">Aún no hay viajes.</div>';
  }

  const p = await apiGet('/api/pagos?limit=100');
  if (p.ok) {
    $('pagosTotales').textContent = p.data.total + ' pagos · ' + money(p.data.cobrado) + ' cobrado';
    $('pagosBody').innerHTML = (p.data.pagos || []).map(x =>
      '<tr><td><b>' + x.folio + '</b></td><td>' + x.barrio_destino + '</td><td>' + x.metodo + '</td>' +
      '<td class="num">' + money(x.monto) + '</td><td class="num">' + money(x.comision) + '</td>' +
      '<td><a class="mini-btn" href="/api/viajes/' + x.viaje_id + '/comprobante" target="_blank">Ver</a></td></tr>').join('')
      || '<tr><td colspan="6" style="text-align:center;color:#5b6f88;padding:16px;">Todavía no hay pagos registrados.</td></tr>';
  }

  const h = await apiGet('/api/health');
  if (h.ok) {
    $('dbInfo').innerHTML =
      '<div class="db-row"><span>Servidor</span><b>✔ Express en línea</b></div>' +
      '<div class="db-row"><span>Motor</span><b>MySQL / MariaDB · ' + h.data.db.database + '</b></div>' +
      '<div class="db-row"><span>Host</span><b>' + h.data.db.host + '</b></div>' +
      '<div class="db-row"><span>Barrios cargados</span><b>' + h.data.barrios + '</b></div>' +
      '<div class="db-row"><span>Viajes guardados</span><b>' + h.data.viajes + '</b></div>' +
      '<div class="db-row"><span>Pagos guardados</span><b>' + h.data.pagos + '</b></div>' +
      '<div class="db-row"><span>Última consulta</span><b>' + new Date().toLocaleString('es-CO') + '</b></div>';
  }
}

/* ===================== NAVEGACIÓN / ATAJOS ===================== */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('pickerOverlay').classList.contains('hidden')) cerrarSelector();
});

/* ===================== ARRANQUE ===================== */
window.addEventListener('load', async () => {
  try { await cargarCatalogo(); }
  catch (err) { console.error('No se pudo cargar el catálogo:', err); }
  pintarMapaBase();
  const b = barrioPorTexto('Bocagrande');
  if (b) { $('destination').value = b.nombre; barrioActual = b; zonaActual = b.zona; actualizarChip(); dibujarRuta(b); }
  if (window.Capacitor === undefined) document.body.classList.add('escritorio');
});
