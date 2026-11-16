'use strict';
/* ============================================================
   UniX Driver · Flujos del viaje (Conectado a AWS EC2 + S3 + RDS)
   origen + destino libres → ruta por carretera (OSRM) →
   búsqueda unificada en AWS (POST /busquedas/) →
   solicitud en RDS (POST /viajes/solicitar) →
   estados y liquidación de comisión (PATCH /viajes/{id}/estado).
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
  let comisionActivaPct = COMISION_PCT;
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
  const SVG_SEARCH_ICON = '<svg class="ico-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg>';
  const SVG_STAR_SM = '<svg class="ico-svg" viewBox="0 0 24 24" width="13" height="13" fill="#F59E0B" stroke="#F59E0B" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  const SVG_CAR_ROAD = '<svg class="ico-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14v-5l-2-5H7l-2 5v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>';
  const SVG_MOTO_ROAD = '<svg class="ico-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M15 6h3l2 5h-5l-3-5H8l-2 5h9"/></svg>';
  const REGEX_CARRO = /\b(renault|logan|sandero|kwid|stepway|chevrolet|spark|onix|sail|beat|aveo|kia|picanto|rio|soluto|toyota|corolla|hilux|yaris|mazda|nissan|versa|march|hyundai|i10|i20|accent|tucson|swift|celerio|dzire|volkswagen|gol|virtus|jetta|ford|fiesta|chery|byd|autom[oó]vil|carro|sed[aá]n|suv|camioneta)\b/i;
  const REGEX_MOTO = /\b(moto|motocicleta|tvs|raider|boxer|bajaj|pulsar|discover|platino|honda\s+cb|cb\s?125|xr\s?150|nkd|akt|yamaha|fz|sz|nmax|crypton|libero|gixxer|gn\s?125|hero|eco|victory|apache|auteco|kymco|benelli|ktm|dominar|scooter)\b/i;

  function resolverModeloCoherente(vehObj, tipoSel, seed = 0) {
    const esCarro = tipoSel === 'carro';
    const raw = vehObj
      ? (typeof vehObj === 'string' ? vehObj.trim() : `${vehObj.marca || ''} ${vehObj.modelo || ''}`.trim())
      : '';
    const tipoObj = (vehObj && typeof vehObj === 'object' && vehObj.tipo) ? String(vehObj.tipo).toLowerCase() : '';
    const idx = Math.abs(Number(seed) || 0);

    if (esCarro) {
      if (tipoObj.includes('moto') || (!tipoObj.includes('carro') && REGEX_MOTO.test(raw) && !REGEX_CARRO.test(raw))) {
        return VEH_CARRO[idx % VEH_CARRO.length];
      }
      return raw || VEH_CARRO[idx % VEH_CARRO.length];
    }

    if (tipoObj.includes('carro') || tipoObj.includes('auto') || tipoObj.includes('sedan') || REGEX_CARRO.test(raw) || (raw && !REGEX_MOTO.test(raw))) {
      return VEH_MOTO[idx % VEH_MOTO.length];
    }
    return raw || VEH_MOTO[idx % VEH_MOTO.length];
  }

  function textoPorcentajeComision() {
    const pct = (typeof comisionActivaPct === 'number' && isFinite(comisionActivaPct)) ? comisionActivaPct : COMISION_PCT;
    return (pct * 100).toFixed(1).replace(/\.0$/, '');
  }
  const setBtnBuscar = (btn, disabled, label = 'Buscar opciones') => {
    if (!btn) return;
    btn.disabled = !!disabled;
    btn.innerHTML = `${SVG_SEARCH_ICON}<span>${label}</span>`;
  };

  /* Sincroniza el porcentaje de comisión vigente en AWS RDS (GET /comisiones/configuracion/activa) */
  async function sincronizarComisionVigente() {
    if (typeof window === 'undefined' || !window.apiService || typeof window.apiService.obtenerComisionActiva !== 'function') return;
    try {
      const cfg = await window.apiService.obtenerComisionActiva();
      const pct = Number(cfg && cfg.porcentaje);
      if (isFinite(pct) && pct >= 0 && pct <= 100) {
        comisionActivaPct = pct / 100;
        setText('commissionLabel', 'Comisión UniX Driver (' + textoPorcentajeComision() + '%)');
      }
    } catch (_) { }
  }
  setTimeout(sincronizarComisionVigente, 400);

  /* Helper para obtener el id_usuario autenticado en RDS (o 1 por defecto) */
  function obtenerIdUsuarioActivo() {
    try {
      const s = (typeof AUTH !== 'undefined' && AUTH.sesion) ? AUTH.sesion() : null;
      if (s && s.id_usuario) return Number(s.id_usuario);
    } catch (_) { }
    return 1;
  }

  /* Helper para sincronizar el estado del viaje en AWS RDS (PATCH /viajes/{id}/estado) */
  async function actualizarEstadoViajeBackend(idViaje, nuevoEstado, precioFinal = null) {
    if (!idViaje) return;
    try {
      if (typeof window !== 'undefined' && window.apiService && typeof window.apiService.actualizarEstadoViaje === 'function') {
        await window.apiService.actualizarEstadoViaje(idViaje, nuevoEstado, precioFinal);
        return;
      }
      const apiUrl = (window.UNIX_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const body = { estado: nuevoEstado };
      if (precioFinal != null) body.precio_final = Number(precioFinal);
      await fetch(`${apiUrl}/viajes/${idViaje}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (_) { }
  }

  /* ============ 1. Origen y destino ============ */
  function coordsValidas(p) {
    if (!p) return false;
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    return p.lat != null && p.lon != null && Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
  }

  function elegirOrigen(o) {
    if (!trip || !o) return;
    if (!coordsValidas(o)) {
      UI.setNotice('searchNotice', 'No se encontraron coordenadas válidas para ese origen. Elige otro punto.', 'error');
      return;
    }
    trip.origen = {
      nombre: o.nombre || 'Punto de origen',
      barrio: o.barrio || o.nombre || 'Cartagena',
      direccion: o.direccion || '',
      lat: Number(o.lat), lon: Number(o.lon), fuente: o.fuente || 'manual'
    };
    setText('origenLabel', trip.origen.nombre);
    setText('resOrigen', trip.origen.nombre);
    setText('origenSub', [trip.origen.direccion, trip.origen.fuente === 'gps' ? 'ubicación actual' : null]
      .filter(Boolean).join(' · ') || 'Origen seleccionado');
    UI.setNotice('searchNotice', '');
    recalcular();
  }

  function elegirDestino(d) {
    if (!trip || !d) return;
    if (!coordsValidas(d)) {
      UI.setNotice('searchNotice', 'No se encontraron coordenadas válidas para «' + (d.nombre || 'ese destino') + '». Elige otro destino.', 'error');
      return;
    }
    trip.destino = Object.assign({}, d, { lat: Number(d.lat), lon: Number(d.lon) });
    const dl = $('destinoLabel');
    if (dl) {
      dl.textContent = d.nombre;
      dl.classList.remove('is-placeholder');
    }
    setText('resDestino', d.nombre);
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
      setBtnBuscar(btn, true, 'Buscar opciones');
    };

    if (!trip.origen || !trip.destino) {
      chip.className = 'zone-chip hidden';
      chip.textContent = '';
      if (precio) precio.textContent = '—';
      trip.tarifa = 0; trip.tarifaOk = false;
      setBtnBuscar(btn, true, 'Buscar opciones');
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
    trip.comision = Math.round(r.precio * comisionActivaPct);
    chip.className = 'zone-chip';
    chip.classList.remove('hidden');
    chip.textContent = vehLabel(trip.vehiculo) + ' · ' + money(r.precio);
    if (precio) precio.textContent = money(r.precio);
    setBtnBuscar(btn, false, 'Buscar opciones');
  }

  /* ============ 3. Buscar conductores (Conectado a POST /busquedas/ en AWS) ============ */
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
    setBtnBuscar(btn, true, 'Buscando…');
    setText('ofertasSub', 'Comparando tarifas para ' + nombreOrigen() + ' → ' + nombreDestino());
    const off = $('offers');
    if (off) { off.innerHTML = ''; off.classList.add('hidden'); }
    const radar = $('radarPanel');
    if (radar) radar.classList.remove('hidden');
    setText('radarText', 'Buscando conductores cerca de ' + (trip.origen.direccion || nombreOrigen()) + '…');
    UI.setNotice('offersNotice', '');

    const aviso = $('offersSimBadge');
    if (aviso) {
      aviso.classList.add('hidden');
      aviso.textContent = '';
    }
    UI.goToScreen(2);

    const rid = trip.requestId;
    later(() => { if (trip.requestId === rid && trip.estado === ESTADOS.BUSCANDO) mostrarOfertas(); }, 900);
  }

  async function mostrarOfertas() {
    if (!trip || trip.estado !== ESTADOS.BUSCANDO || !trip.tarifaOk) return;
    const rid = trip.requestId;
    const esMoto = trip.vehiculo === 'moto';
    let ofertasCargadas = null;

    // 1. Consultar motor de búsqueda unificada en AWS EC2 (POST /busquedas/) vía apiService
    try {
      const textoOrigen = (trip.origen.barrio || trip.origen.nombre || 'Centro').trim();
      const textoDestino = (trip.destino.barrio || trip.destino.nombre || 'Bocagrande').trim();
      const origenFinal = textoOrigen.toLowerCase() === textoDestino.toLowerCase()
        ? textoOrigen + ' (Origen)'
        : textoOrigen;

      let data = null;
      if (typeof window !== 'undefined' && window.apiService && typeof window.apiService.buscarOfertas === 'function') {
        data = await window.apiService.buscarOfertas(origenFinal, textoDestino, obtenerIdUsuarioActivo());
      } else {
        const apiUrl = (window.UNIX_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
        const resp = await fetch(`${apiUrl}/busquedas/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origen: origenFinal,
            destino: textoDestino,
            id_usuario: obtenerIdUsuarioActivo()
          })
        });
        if (resp.ok) data = await resp.json();
      }

      if (data && Array.isArray(data.ofertas) && data.ofertas.length > 0) {
        trip.id_busqueda = data.id_busqueda;
        ofertasCargadas = data.ofertas.map((of, idx) => {
          const nombrePlat = (of.plataforma && of.plataforma.nombre) ? of.plataforma.nombre : 'Uber';
          const platId = nombrePlat.toLowerCase().includes('didi')
            ? 'didi'
            : (nombrePlat.toLowerCase().includes('indrive') ? 'indrive' : 'uber');
          const precioApi = Number(of.precio_estimado) || trip.tarifa;
          const precioAjustado = esMoto ? Math.max(5000, r2(precioApi * 0.45)) : r2(precioApi);
          const vehTexto = resolverModeloCoherente(of.vehiculo, trip.vehiculo, (of.id_oferta || 0) + idx);

          return {
            id_oferta: of.id_oferta,
            plataforma: nombrePlat,
            plataformaId: platId,
            precio: precioAjustado,
            etaMin: Number(of.tiempo_estimado) || 5,
            conductor: (of.conductor && of.conductor.nombre) ? of.conductor.nombre : 'Conductor verificado',
            vehiculo: vehTexto,
            placa: (of.vehiculo && of.vehiculo.placa) ? of.vehiculo.placa : '---',
            rating: (of.conductor && of.conductor.calificacion)
              ? Number(of.conductor.calificacion).toFixed(1)
              : '4.8'
          };
        });
      }
    } catch (_) {
      ofertasCargadas = null;
    }

    if (trip.requestId !== rid || trip.estado !== ESTADOS.BUSCANDO) return;

    const cont = $('offers');
    const radar = $('radarPanel');
    const btn = $('btnBuscar');

    // Si falla la petición a POST /busquedas/ o no devuelve ofertas
    if (!ofertasCargadas || !ofertasCargadas.length) {
      if (radar) radar.classList.add('hidden');
      if (cont) {
        cont.classList.add('hidden');
        cont.innerHTML = '';
      }
      setBtnBuscar(btn, false, 'Buscar opciones');
      trip.estado = ESTADOS.INICIAL;
      UI.setNotice(
        'offersNotice',
        'No se pudo conectar con el servidor de UniX Driver. Verifica tu conexión e inténtalo de nuevo.',
        'error'
      );
      return;
    }

    trip.ofertas = ofertasCargadas;
    // La primera oferta de la API ya viene recomendada por el ranking multicriterio
    const mejor = trip.ofertas[0];

    if (radar) radar.classList.add('hidden');
    cont.classList.remove('hidden');
    cont.innerHTML = trip.ofertas.map((o, i) => `
      <div class="offer ${o === mejor ? 'recommended' : ''}" onclick="FLOW.seleccionarOferta(${i})">
        <div class="offer-left">
          <div class="p-badge ${o.plataformaId}"><img src="img/${o.plataformaId}.png" alt="${o.plataforma}"></div>
          <div class="offer-info">
            <div class="offer-title">${o.plataforma} · ${o.conductor}</div>
            <div class="offer-meta">${vehLabel(trip.vehiculo)} · ${o.vehiculo} · ${o.placa} · ${SVG_STAR_SM} ${o.rating} · llega en ${o.etaMin} min</div>
          </div>
        </div>
        <div class="offer-right">
          <div class="price">${money(o.precio)}</div>
          ${o === mejor ? '<span class="recommend">RECOMENDADA</span>' : ''}
        </div>
      </div>`).join('');
    UI.setNotice('offersNotice', trip.ofertas.length + ' ofertas disponibles para ' + kmTexto(trip.rutaKm) + '. Toca una para continuar.', 'success');
    setBtnBuscar(btn, false, 'Buscar opciones');
  }

  /* ============ 4. Conductor asignado (Conectado a POST /viajes/solicitar) ============ */
  async function seleccionarOferta(i) {
    if (!trip || trip.estado !== ESTADOS.BUSCANDO) return;
    const o = trip.ofertas && trip.ofertas[i];
    if (!o || !o.id_oferta) {
      UI.setNotice(
        'offersNotice',
        'La oferta seleccionada ya no está disponible. Realiza una nueva búsqueda.',
        'error'
      );
      return;
    }

    // Exigir registro exitoso del viaje (POST /viajes/solicitar) antes de avanzar
    let idViajeReal = null;
    try {
      if (typeof window !== 'undefined' && window.apiService && typeof window.apiService.solicitarViaje === 'function') {
        const dataViaje = await window.apiService.solicitarViaje(o.id_oferta);
        if (dataViaje && dataViaje.id_viaje) idViajeReal = dataViaje.id_viaje;
      } else {
        const apiUrl = (window.UNIX_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
        const resp = await fetch(`${apiUrl}/viajes/solicitar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_oferta: o.id_oferta })
        });
        if (resp.ok) {
          const dataViaje = await resp.json();
          if (dataViaje && dataViaje.id_viaje) idViajeReal = dataViaje.id_viaje;
        }
      }
    } catch (_) {
      idViajeReal = null;
    }

    if (!idViajeReal) {
      UI.setNotice(
        'offersNotice',
        'No se pudo conectar con el servidor de UniX Driver. Verifica tu conexión e inténtalo de nuevo.',
        'error'
      );
      return;
    }

    o.vehiculo = resolverModeloCoherente(o.vehiculo, trip.vehiculo, o.id_oferta || i);
    trip.oferta = o;
    trip.tarifa = o.precio;
    trip.comision = Math.round(o.precio * comisionActivaPct);
    trip.etaMin = o.etaMin;
    trip.id_viaje = idViajeReal;
    trip.estado = ESTADOS.ASIGNADO;

    setText('aNombre', o.conductor);
    setText('aRating', o.rating + ' / 5.0');
    setText('aVehiculo', vehLabel(trip.vehiculo) + ' · ' + o.vehiculo);
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
    if (trip.id_viaje) actualizarEstadoViajeBackend(trip.id_viaje, 'ACEPTADO');

    const o = trip.oferta;
    setText('cNombre', o.conductor);
    setText('cVehiculo', (trip.vehiculo === 'carro' ? 'Carro · ' : 'Moto · ') + o.vehiculo);
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
    setText('lVehiculo', (trip.vehiculo === 'carro' ? 'Carro · ' : 'Moto · ') + o.vehiculo);
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
    if (trip.id_viaje) actualizarEstadoViajeBackend(trip.id_viaje, 'EN_CURSO');

    setText('tDestino', nombreOrigen() + ' → ' + nombreDestino());
    setText('tConductor', trip.oferta.conductor);
    setText('tVehiculo', (trip.vehiculo === 'carro' ? 'Carro · ' : 'Moto · ') + trip.oferta.vehiculo + ' · ' + trip.oferta.placa);
    const kmRuta = Number(trip.rutaKm || 0);
    const dur = Math.max(12, Math.min(30, Math.round(kmRuta * 2) || 12));
    setText('tEta', (trip.rutaMin ? trip.rutaMin + ' min por carretera' : Math.round(kmRuta / 0.32) + ' min aprox.'));
    if (typeof MAPA !== 'undefined') {
      setTimeout(() => { try { MAPA.mostrarRuta('mapaViaje', 'rutaBarViaje', trip.origen, trip.destino); } catch (_) { } }, 160);
    }
    setText('tEstado', 'Recorrido en progreso…');
    const ve = $('vehicleEmoji');
    if (ve) ve.innerHTML = trip.vehiculo === 'carro' ? SVG_CAR_ROAD : SVG_MOTO_ROAD;
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

  /* ============ 7. Cobro (Liquida comisión automáticamente en AWS RDS) ============ */
  function finalizarViaje() {
    if (!trip || trip.estado !== ESTADOS.EN_CURSO) return;
    trip.estado = ESTADOS.COMPLETADO;
    limpiarTimers();
    const road = $('road');
    if (road) road.classList.remove('running');
    const tarifa = trip.tarifa;
    if (trip.id_viaje) actualizarEstadoViajeBackend(trip.id_viaje, 'COMPLETADO', tarifa);

    const pctAplicado = (typeof comisionActivaPct === 'number' && isFinite(comisionActivaPct)) ? comisionActivaPct : COMISION_PCT;
    const comision = Math.round(tarifa * pctAplicado);
    const pctTexto = (pctAplicado * 100).toFixed(1).replace(/\.0$/, '');
    setText('fareBig', money(tarifa));
    setText('fareRoute', nombreOrigen() + ' → ' + nombreDestino() + ' · ' + kmTexto(trip.rutaKm));
    setText('fare', money(tarifa));
    setText('commissionLabel', 'Comisión UniX Driver (' + pctTexto + '%)');
    setText('commission', '-' + money(comision));
    setText('net', money(tarifa - comision));
    UI.setNotice('paymentNotice', '');
    UI.goToScreen(7);
  }

  function pagar() {
    if (!trip || trip.estado !== ESTADOS.COMPLETADO) return;
    const metodo = ($('metodoPago') || {}).value || 'tarjeta';
    const tarifa = trip.tarifa;
    const pctAplicado = (typeof comisionActivaPct === 'number' && isFinite(comisionActivaPct)) ? comisionActivaPct : COMISION_PCT;
    const comision = Math.round(tarifa * pctAplicado);
    const pctTexto = textoPorcentajeComision();
    const recibo = 'REC-' + Date.now().toString(36).toUpperCase().slice(-6);
    trip.pago = { metodo, monto: tarifa, comision, neto: tarifa - comision, folio: recibo };
    trip.estado = 'pagado';

    guardarEnHistorial({
      id: trip.id_viaje ? ('V-' + trip.id_viaje) : ('V-' + Date.now().toString(36).toUpperCase()),
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
        <div class="row row-total"><span class="label">Tarifa</span><span class="value">${money(tarifa)}</span></div>
        <div class="row"><span class="label">Comisión UniX (${pctTexto}%)</span><span class="value">${money(comision)}</span></div>
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
    if (trip.id_viaje) actualizarEstadoViajeBackend(trip.id_viaje, 'CANCELADO', 0);

    const motivoTexto = motivoSel === 'Otro motivo'
      ? 'Otro motivo: ' + ($('cancelOtro').value.trim() || 'sin detalle')
      : (motivoSel || 'Sin motivo indicado');

    guardarEnHistorial({
      id: trip.id_viaje ? ('V-' + trip.id_viaje) : ('V-' + Date.now().toString(36).toUpperCase()),
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
    UI.setNotice('searchNotice', 'Viaje cancelado. Puedes elegir un nuevo origen y destino.', 'success');
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