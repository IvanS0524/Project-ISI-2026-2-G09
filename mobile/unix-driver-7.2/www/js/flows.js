'use strict';
/* ============================================================
   UniX Driver · Flujos del viaje
   origen + destino libres → ruta por carretera → precio por km
   → solicitud → asignación → en camino → llegó → en curso →
   completado / cancelado.

   Reglas de precio:
   · El precio SOLO existe si hay distancia por carretera.
   · Si la tarifa no está configurada, no se muestra precio y no
     se permite solicitar el viaje.
   · Cada cambio de origen, destino o vehículo recalcula todo.
   ============================================================ */

const PLATAFORMAS = [
  { id: 'uber', nombre: 'Uber', factor: 1.05, eta: 5 },
  { id: 'didi', nombre: 'DiDi', factor: 0.98, eta: 4 },
  { id: 'indrive', nombre: 'inDrive', factor: 0.92, eta: 7 }
];
const CONDUCTORES = ['Carlos M.', 'Andrés R.', 'Miguel P.', 'Laura S.', 'David A.', 'Sofía C.', 'Jorge L.', 'Ana G.'];
const VEH_MOTO = ['TVS Raider', 'Boxer CT', 'Pulsar 125', 'Honda CB125', 'Yamaha FZ-S', 'Suzuki Gixxer'];
const VEH_CARRO = ['Kia Picanto', 'Renault Logan', 'Chevrolet Onix', 'Toyota Corolla', 'Mazda 2', 'Nissan Versa'];

const FLOW = (() => {
  let motivoSel = null;
  const pasoMinMs = 1000;      // 1 s = 1 min en la cuenta regresiva
  let rutaSeq = 0;             // evita resultados de peticiones antiguas

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const r2 = n => Math.round(n / 100) * 100;
  const placa = () => {
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let s = ''; for (let i = 0; i < 3; i++) s += L[Math.floor(Math.random() * 26)];
    return s + '-' + (100 + Math.floor(Math.random() * 900));
  };
  const $ = id => document.getElementById(id);
  const setText = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  const nombreOrigen = () => (trip && trip.origen ? trip.origen.nombre : 'Origen');
  const nombreDestino = () => (trip && trip.destino ? trip.destino.nombre : 'Destino');

  /* ============ 1. Origen y destino ============ */
  function elegirOrigen(o) {
    if (!trip || !o) return;
    if (o.lat == null || o.lon == null) {
      UI.setNotice('searchNotice', 'Ese origen no tiene coordenadas. Elige otro punto.', 'error');
      return;
    }
    trip.origen = {
      nombre: o.nombre || 'Punto de origen',
      direccion: o.direccion || '',
      lat: Number(o.lat), lon: Number(o.lon), fuente: o.fuente || 'manual'
    };
    setText('origenLabel', trip.origen.nombre);
    setText('origenSub', [trip.origen.direccion, trip.origen.fuente === 'gps' ? 'ubicación actual' : null]
      .filter(Boolean).join(' · ') || 'Origen seleccionado');
    UI.setNotice('searchNotice', '');
    recalcular();
  }

  function elegirDestino(d) {
    if (!trip || !d) return;
    if (d.lat == null || d.lon == null) {
      UI.setNotice('searchNotice', '⚠️ «' + d.nombre + '» todavía no tiene ubicación verificada, así que no se puede calcular la ruta. Elige otro destino.', 'error');
      return;
    }
    trip.destino = d;
    setText('destinoLabel', d.nombre);
    setText('destinoSub', [d.categoria, d.barrio && d.barrio !== d.nombre ? d.barrio : null]
      .filter(Boolean).join(' · '));
    UI.setNotice('searchNotice', '');
    recalcular();
  }

  function seleccionarVehiculo(v) {
    if (!trip) return;
    trip.vehiculo = v === 'carro' ? 'carro' : 'moto';
    $('btnMoto').classList.toggle('active', trip.vehiculo === 'moto');
    $('btnCarro').classList.toggle('active', trip.vehiculo === 'carro');
    actualizarPrecio();          // la tarifa cambia, la distancia es la misma
  }

  /* ============ 2. Ruta por carretera + precio ============ */
  async function recalcular() {
    const secuencia = ++rutaSeq;
    if (!trip) return;

    // Sin origen o sin destino no hay ruta ni precio
    if (!trip.origen || !trip.destino) {
      trip.rutaKm = null; trip.rutaMin = null; trip.rutaFuente = null; trip.rutaError = null;
      const barra = $('rutaBarInicio');
      if (barra) barra.innerHTML = '<span>Elige origen y destino para ver la ruta</span><span class="badge-osrm">OSRM · OSM</span>';
      actualizarPrecio();
      return;
    }

    trip.rutaKm = null; trip.rutaMin = null; trip.rutaError = null;
    const chip = $('zoneChip');
    if (chip) { chip.className = 'zone-chip'; chip.textContent = 'Calculando distancia por carretera…'; }

    let ruta = null;
    try {
      ruta = await MAPA.mostrarRuta('mapaInicio', 'rutaBarInicio', trip.origen, trip.destino);
    } catch (e) {
      ruta = null;
    }
    if (secuencia !== rutaSeq) return;   // llegó tarde: ya hay otra selección
    if (!trip || !trip.origen || !trip.destino) return;

    if (ruta && ruta.ok && ruta.km) {
      trip.rutaKm = Number(ruta.km);
      trip.rutaMin = ruta.minutos;
      trip.rutaFuente = ruta.proveedor;
      trip.rectaKm = ruta.lineaRectaKm != null ? ruta.lineaRectaKm : null;
      trip.rutaError = null;
      UI.setNotice('searchNotice', '');
    } else {
      trip.rutaKm = null; trip.rutaMin = null; trip.rutaFuente = null;
      trip.rectaKm = ruta ? ruta.lineaRectaKm : null;
      trip.rutaError = (ruta && ruta.aviso) || 'No se pudo calcular la distancia por carretera.';
    }
    actualizarPrecio();
  }

  function actualizarPrecio() {
    const chip = $('zoneChip');
    const precio = $('precioEstimado');
    const btn = $('btnBuscar');
    if (!trip || !chip) return;

    const sinPrecio = (clase) => {
      chip.className = 'zone-chip ' + (clase || '');
      chip.classList.remove('hidden');
      if (precio) precio.textContent = '—';
      trip.tarifa = 0; trip.tarifaOk = false;
      if (btn) { btn.disabled = true; btn.textContent = '🔍 Buscar conductor'; }
    };

    if (!trip.origen || !trip.destino) {
      chip.className = 'zone-chip hidden';
      chip.textContent = '';
      if (precio) precio.textContent = '—';
      trip.tarifa = 0; trip.tarifaOk = false;
      if (btn) { btn.disabled = true; btn.textContent = '🔍 Buscar conductor'; }
      return;
    }

    if (trip.rutaKm == null) {
      chip.textContent = 'No se pudo calcular el precio de este recorrido';
      sinPrecio('restrict');
      return;
    }

    const r = calcularTarifa(trip.rutaKm, trip.vehiculo);
    if (!r.ok) {
      chip.textContent = r.motivo === 'TARIFA_NO_CONFIGURADA'
        ? 'Tarifa no configurada para ' + (trip.vehiculo === 'carro' ? 'automóvil' : 'motocicleta')
        : 'No se pudo calcular el precio de este recorrido';
      trip.tarifaDetalle = r.detalle;
      sinPrecio('restrict');
      return;
    }

    trip.tarifa = r.precio;
    trip.tarifaOk = true;
    trip.tarifaDetalle = r.detalle;
    trip.comision = Math.round(r.precio * COMISION_PCT);
    chip.className = 'zone-chip';
    chip.classList.remove('hidden');
    chip.textContent = vehLabel(trip.vehiculo) + ' · ' + money(r.precio);
    if (precio) precio.textContent = money(r.precio);
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Buscar conductor'; }
  }

  /* ============ 3. Buscar conductores ============ */
  function buscarViajes() {
    const s = estadoActual();
    if (!trip || ![ESTADOS.INICIAL, ESTADOS.CANCELADO].includes(s)) {
      UI.setNotice('searchNotice', 'Hay una solicitud en curso. Termínala o cancélala antes de crear otra.', 'error');
      return;
    }
    if (!trip.origen) { UI.setNotice('searchNotice', 'Elige el origen del viaje.', 'error'); return; }
    if (!trip.destino) { UI.setNotice('searchNotice', 'Elige el destino del viaje.', 'error'); return; }
    if (trip.rutaKm == null) {
      UI.setNotice('searchNotice', trip.rutaError || 'No se pudo calcular la distancia por carretera.', 'error');
      return;
    }
    if (!trip.tarifaOk) {
      UI.setNotice('searchNotice', 'No hay una tarifa válida para este recorrido. Revisa la configuración de precios.', 'error');
      return;
    }

    UI.setNotice('searchNotice', '');
    trip.estado = ESTADOS.BUSCANDO;
    const btn = $('btnBuscar');
    if (btn) { btn.disabled = true; btn.textContent = 'Buscando…'; }
    setText('ofertasSub', 'Comparando tarifas para ' + nombreOrigen() + ' → ' + nombreDestino());
    const off = $('offers');
    if (off) { off.innerHTML = ''; off.classList.add('hidden'); }
    const radar = $('radarPanel');
    if (radar) radar.classList.remove('hidden');
    setText('radarText', 'Buscando conductores cerca de ' + (trip.origen.direccion || nombreOrigen()) + '…');
    UI.setNotice('offersNotice', '');

    const aviso = $('offersSimBadge');
    const noIntegrado = (window.UNIX_CONFIG && UNIX_CONFIG.integraciones && UNIX_CONFIG.integraciones.plataformas) === 'no_integrado';
    if (aviso) {
      aviso.classList.toggle('hidden', !noIntegrado);
      aviso.textContent = noIntegrado ? 'Tarifas de referencia · la reserva se confirma dentro de UniX Driver.' : '';
    }
    UI.goToScreen(2);

    const rid = trip.requestId;
    later(() => { if (trip.requestId === rid && trip.estado === ESTADOS.BUSCANDO) mostrarOfertas(); }, 2200);
    later(() => {
      const cont = $('offers');
      if (trip.requestId === rid && trip.estado === ESTADOS.BUSCANDO && cont && !cont.innerHTML) mostrarOfertas();
    }, 6000);
  }

  function mostrarOfertas() {
    if (!trip || trip.estado !== ESTADOS.BUSCANDO || !trip.tarifaOk) return;
    const base = trip.tarifa;
    const esMoto = trip.vehiculo === 'moto';
    trip.ofertas = PLATAFORMAS.map(p => {
      const variacion = 0.97 + ((trip.requestId * 7 + p.eta) % 7) / 100;
      return {
        plataforma: p.nombre,
        plataformaId: p.id,
        precio: Math.max(1000, r2(base * p.factor * variacion)),
        etaMin: p.eta,
        conductor: pick(CONDUCTORES),
        vehiculo: pick(esMoto ? VEH_MOTO : VEH_CARRO),
        placa: placa(),
        rating: (4 + ((trip.requestId + p.eta) % 9) / 10).toFixed(1)
      };
    });
    const mejor = trip.ofertas.reduce((a, b) => (b.precio < a.precio ? b : a), trip.ofertas[0]);
    const cont = $('offers');
    const radar = $('radarPanel');
    if (radar) radar.classList.add('hidden');
    cont.classList.remove('hidden');
    cont.innerHTML = trip.ofertas.map((o, i) => `
      <div class="offer ${o === mejor ? 'recommended' : ''}" onclick="FLOW.seleccionarOferta(${i})">
        <div class="offer-left">
          <div class="p-badge ${o.plataformaId}"><img src="img/${o.plataformaId}.png" alt="${o.plataforma}"></div>
          <div>
            <div class="offer-title">${o.plataforma} · ${o.conductor}</div>
            <div class="offer-meta">${o.vehiculo} · ${o.placa} · ⭐ ${o.rating} · llega en ${o.etaMin} min</div>
          </div>
        </div>
        <div class="offer-right">
          <div class="price">${money(o.precio)}</div>
          ${o === mejor ? '<span class="recommend">MEJOR PRECIO</span>' : ''}
        </div>
      </div>`).join('');
    UI.setNotice('offersNotice', '✅ ' + trip.ofertas.length + ' ofertas disponibles para ' + kmTexto(trip.rutaKm) + '. Toca una para continuar.', 'success');
    const btn = $('btnBuscar');
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Buscar conductor'; }
  }

  /* ============ 4. Conductor asignado ============ */
  function seleccionarOferta(i) {
    if (!trip || trip.estado !== ESTADOS.BUSCANDO) return;
    const o = trip.ofertas[i];
    if (!o) return;
    trip.oferta = o;
    trip.tarifa = o.precio;
    trip.comision = Math.round(o.precio * COMISION_PCT);
    trip.etaMin = o.etaMin;
    trip.estado = ESTADOS.ASIGNADO;

    setText('aNombre', o.conductor);
    setText('aRating', '⭐ ' + o.rating);
    setText('aVehiculo', (trip.vehiculo === 'carro' ? '🚗 ' : '🏍️ ') + o.vehiculo);
    setText('aPlaca', o.placa);
    setText('aPlataforma', o.plataforma);
    setText('aDestino', nombreOrigen() + ' → ' + nombreDestino() + ' · ' + kmTexto(trip.rutaKm));
    setText('aEta', o.etaMin + ' min');
    setText('aPrecio', money(o.precio));
    UI.setNotice('assignedNotice', '');
    UI.goToScreen(3);
  }

  /* ============ 5. Conductor en camino ============ */
  function conductorEnCamino() {
    if (!trip || trip.estado !== ESTADOS.ASIGNADO) return;
    trip.estado = ESTADOS.EN_CAMINO;
    const o = trip.oferta;
    setText('cNombre', o.conductor);
    setText('cVehiculo', (trip.vehiculo === 'carro' ? '🚗 ' : '🏍️ ') + o.vehiculo);
    setText('cPlaca', o.placa);
    setText('cEstado', 'Llegará a ' + (trip.origen.direccion || nombreOrigen()) + ' en ' + o.etaMin + ' min');
    UI.goToScreen(4);

    const rid = trip.requestId;
    let restante = o.etaMin * 60;
    const total = restante;
    const pintar = () => {
      const mm = String(Math.floor(Math.max(0, restante) / 60)).padStart(2, '0');
      const ss = String(Math.max(0, restante) % 60).padStart(2, '0');
      setText('cCountdown', mm + ':' + ss);
      const p = $('cProgress');
      if (p) p.style.width = Math.min(100, Math.round(((total - restante) / total) * 100)) + '%';
    };
    pintar();
    intervalo(() => {
      if (trip.requestId !== rid || trip.estado !== ESTADOS.EN_CAMINO) return;
      restante -= 60;
      pintar();
      if (restante <= 0) llegarConductor();
    }, pasoMinMs);
  }

  function llegarConductor() {
    if (!trip || trip.estado !== ESTADOS.EN_CAMINO) return;
    trip.estado = ESTADOS.LLEGO;
    limpiarTimers();
    const o = trip.oferta;
    setText('lNombre', o.conductor);
    setText('lVehiculo', (trip.vehiculo === 'carro' ? '🚗 ' : '🏍️ ') + o.vehiculo);
    setText('lPlaca', o.placa);
    setText('lDestino', nombreDestino());
    setText('lPrecio', money(trip.tarifa));
    setText('lugarTexto', 'Está esperando en ' + (trip.origen.direccion || nombreOrigen()));
    UI.goToScreen(5);
  }

  /* ============ 6. Viaje en curso ============ */
  function iniciarViaje() {
    if (!trip || trip.estado !== ESTADOS.LLEGO) {
      UI.setNotice('arrivedNotice', 'El viaje solo puede iniciarse cuando el conductor ha llegado.', 'error');
      return;
    }
    trip.estado = ESTADOS.EN_CURSO;
    setText('tDestino', nombreOrigen() + ' → ' + nombreDestino());
    setText('tConductor', trip.oferta.conductor);
    setText('tVehiculo', (trip.vehiculo === 'carro' ? '🚗 ' : '🏍️ ') + trip.oferta.vehiculo + ' · ' + trip.oferta.placa);
    const kmRuta = Number(trip.rutaKm || 0);
    const dur = Math.max(12, Math.min(30, Math.round(kmRuta * 2) || 12));
    setText('tEta', (trip.rutaMin ? trip.rutaMin + ' min por carretera' : Math.round(kmRuta / 0.32) + ' min aprox.'));
    if (typeof MAPA !== 'undefined') {
      setTimeout(() => { try { MAPA.mostrarRuta('mapaViaje', 'rutaBarViaje', trip.origen, trip.destino); } catch (_) {} }, 160);
    }
    setText('tEstado', 'Recorrido en progreso…');
    const ve = $('vehicleEmoji');
    if (ve) ve.textContent = vehEmoji(trip.vehiculo);
    const road = $('road');
    if (road) road.classList.add('running');
    UI.goToScreen(6);

    const rid = trip.requestId;
    let paso = 0;
    intervalo(() => {
      if (trip.requestId !== rid || trip.estado !== ESTADOS.EN_CURSO) return;
      paso += 1;
      const pct = Math.min(100, Math.round((paso / dur) * 100));
      const p = $('tProgreso');
      if (p) p.style.width = pct + '%';
      setText('tEstado', pct < 100 ? 'Avanzando hacia el destino · ' + pct + '%' : 'Llegando al destino…');
      if (pct >= 100) finalizarViaje();
    }, 1000);
  }

  /* ============ 7. Cobro ============ */
  function finalizarViaje() {
    if (!trip || trip.estado !== ESTADOS.EN_CURSO) return;
    trip.estado = ESTADOS.COMPLETADO;
    limpiarTimers();
    const road = $('road');
    if (road) road.classList.remove('running');
    const tarifa = trip.tarifa;
    const comision = Math.round(tarifa * COMISION_PCT);
    setText('fareBig', money(tarifa));
    setText('fareRoute', nombreOrigen() + ' → ' + nombreDestino() + ' · ' + kmTexto(trip.rutaKm));
    setText('fare', money(tarifa));
    setText('commission', '-' + money(comision));
    setText('net', money(tarifa - comision));
    UI.setNotice('paymentNotice', '');
    UI.goToScreen(7);
  }

  function pagar() {
    if (!trip || trip.estado !== ESTADOS.COMPLETADO) return;
    const metodo = ($('metodoPago') || {}).value || 'tarjeta';
    const tarifa = trip.tarifa;
    const comision = Math.round(tarifa * COMISION_PCT);
    const recibo = 'REC-' + Date.now().toString(36).toUpperCase().slice(-6);
    trip.pago = { metodo, monto: tarifa, comision, neto: tarifa - comision, folio: recibo };
    trip.estado = 'pagado';

    guardarEnHistorial({
      id: 'V-' + Date.now().toString(36).toUpperCase(),
      fecha: ahoraTexto(),
      origen: nombreOrigen(),
      origen_direccion: trip.origen.direccion || '',
      origen_lat: trip.origen.lat,
      origen_lon: trip.origen.lon,
      destino: nombreDestino(),
      destinoId: trip.destino.id,
      categoria: trip.destino.categoria,
      vehiculo: trip.vehiculo,
      tarifa, comision,
      estado: 'pagado',
      conductor: trip.oferta.conductor,
      plataforma: trip.oferta.plataforma,
      metodo,
      folio: recibo,
      motivo: null,
      km: trip.rutaKm,
      duracionMin: trip.rutaMin || null,
      rutaFuente: trip.rutaFuente || null
    });

    setText('successText', 'Tu viaje a ' + nombreDestino() + ' se completó y el pago quedó registrado.');
    const box = $('receiptBox');
    if (box) {
      box.innerHTML = `
        <div class="row"><span class="label">Comprobante</span><span class="value">${recibo}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${ahoraTexto()}</span></div>
        <div class="row"><span class="label">Origen</span><span class="value">${nombreOrigen()}</span></div>
        <div class="row"><span class="label">Destino</span><span class="value">${nombreDestino()}</span></div>
        <div class="row"><span class="label">Distancia</span><span class="value">${kmTexto(trip.rutaKm)}</span></div>
        <div class="row"><span class="label">Conductor</span><span class="value">${trip.oferta.conductor}</span></div>
        <div class="row"><span class="label">Vehículo</span><span class="value">${vehLabel(trip.vehiculo)} · ${trip.oferta.vehiculo} · ${trip.oferta.placa}</span></div>
        <div class="row"><span class="label">Plataforma</span><span class="value">${trip.oferta.plataforma}</span></div>
        <div class="row"><span class="label">Método de pago</span><span class="value">${metodo}</span></div>
        <div class="row"><span class="label">Tarifa</span><span class="value">${money(tarifa)}</span></div>
        <div class="row"><span class="label">Comisión UniX 10%</span><span class="value">${money(comision)}</span></div>
        <div class="row"><span class="label">Neto conductor</span><span class="value">${money(tarifa - comision)}</span></div>`;
    }
    UI.goToScreen(8);
  }

  function nuevoViaje() {
    resetTripState();
    UI.goToScreen(1);
  }

  /* ============ 8. Cancelación ============ */
  function abrirCancelacion() {
    const s = estadoActual();
    if (![ESTADOS.BUSCANDO, ESTADOS.ASIGNADO, ESTADOS.EN_CAMINO, ESTADOS.LLEGO, ESTADOS.EN_CURSO].includes(s)) return;
    motivoSel = null;
    const cont = $('cancelMotivos');
    cont.innerHTML = MOTIVOS.map((m, i) =>
      `<button class="motivo" data-i="${i}" onclick="FLOW.elegirMotivo(${i})"><span class="m-radio"></span><span>${m}</span></button>`
    ).join('');
    $('cancelOtroWrap').classList.add('hidden');
    $('cancelOtro').value = '';
    $('cancelConfirm').classList.add('hidden');
    $('btnConfirmarCancel').classList.remove('hidden');
    UI.setNotice('cancelNotice', '');
    UI.mostrar('cancelOverlay');
  }

  function elegirMotivo(i) {
    motivoSel = MOTIVOS[i];
    document.querySelectorAll('#cancelMotivos .motivo').forEach(b => {
      b.classList.toggle('sel', Number(b.dataset.i) === i);
    });
    $('cancelOtroWrap').classList.toggle('hidden', motivoSel !== 'Otro motivo');
  }

  function pedirConfirmacionCancelacion() {
    if (!motivoSel) { UI.setNotice('cancelNotice', 'Elige un motivo para continuar.', 'error'); return; }
    if (motivoSel === 'Otro motivo') {
      const t = $('cancelOtro').value.trim();
      if (t.length < 3) { UI.setNotice('cancelNotice', 'Cuéntanos brevemente el motivo (mínimo 3 caracteres).', 'error'); return; }
    }
    UI.setNotice('cancelNotice', '');
    $('cancelConfirm').classList.remove('hidden');
    $('btnConfirmarCancel').classList.add('hidden');
  }

  function volverAlViaje() {
    $('cancelConfirm').classList.add('hidden');
    $('btnConfirmarCancel').classList.remove('hidden');
    UI.ocultar('cancelOverlay');
    const s = estadoActual();
    if (s === ESTADOS.BUSCANDO) UI.goToScreen(2);
    else if (s === ESTADOS.ASIGNADO) UI.goToScreen(3);
    else if (s === ESTADOS.EN_CAMINO) UI.goToScreen(4);
    else if (s === ESTADOS.LLEGO) UI.goToScreen(5);
  }

  function cerrarCancelacion() { UI.ocultar('cancelOverlay'); }

  function confirmarCancelacion() {
    const s = estadoActual();
    if (!trip || ![ESTADOS.BUSCANDO, ESTADOS.ASIGNADO, ESTADOS.EN_CAMINO, ESTADOS.LLEGO, ESTADOS.EN_CURSO].includes(s)) {
      UI.ocultar('cancelOverlay');
      return;
    }
    const motivoTexto = motivoSel === 'Otro motivo'
      ? 'Otro motivo: ' + ($('cancelOtro').value.trim() || 'sin detalle')
      : (motivoSel || 'Sin motivo indicado');

    guardarEnHistorial({
      id: 'V-' + Date.now().toString(36).toUpperCase(),
      fecha: ahoraTexto(),
      origen: nombreOrigen(),
      origen_direccion: trip.origen ? (trip.origen.direccion || '') : '',
      origen_lat: trip.origen ? trip.origen.lat : null,
      origen_lon: trip.origen ? trip.origen.lon : null,
      destino: nombreDestino(),
      destinoId: trip.destino ? trip.destino.id : null,
      categoria: trip.destino ? trip.destino.categoria : null,
      vehiculo: trip.vehiculo,
      tarifa: trip.tarifa,
      comision: 0,
      estado: 'cancelado',
      conductor: trip.oferta ? trip.oferta.conductor : null,
      plataforma: trip.oferta ? trip.oferta.plataforma : null,
      metodo: null,
      folio: null,
      motivo: motivoTexto,
      estadoAnterior: s,
      km: trip.rutaKm,
      duracionMin: trip.rutaMin || null,
      rutaFuente: trip.rutaFuente || null
    });

    trip.estado = ESTADOS.CANCELADO;
    UI.ocultar('cancelOverlay');
    resetTripState();   // origen, destino, km y precio vuelven a cero
    UI.goToScreen(1);
    UI.setNotice('searchNotice', '✅ Viaje cancelado. Puedes elegir un nuevo origen y destino.', 'success');
  }

  return {
    elegirOrigen, elegirDestino, seleccionarVehiculo, recalcular, actualizarPrecio,
    buscarViajes, mostrarOfertas, seleccionarOferta, conductorEnCamino, llegarConductor,
    iniciarViaje, finalizarViaje, pagar, nuevoViaje,
    abrirCancelacion, elegirMotivo, pedirConfirmacionCancelacion, volverAlViaje,
    cerrarCancelacion, confirmarCancelacion,
    get motivo() { return motivoSel; }
  };
})();
