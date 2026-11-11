'use strict';
/* ============================================================
   UniX Driver · Pestaña «Viaje»
   ------------------------------------------------------------
   Fuente única: el objeto central `trip` (js/state.js) y el
   historial persistido. No guarda copias propias: si el estado
   cambia (asignado, en camino, llegó, en curso, cancelado,
   completado) esta pantalla se repinta sola.
   ============================================================ */

const VIAJE = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

  const NOMBRE_ESTADO = {
    solicitud_inicial: 'Sin solicitud',
    buscando_conductor: 'Buscando conductor',
    conductor_asignado: 'Conductor asignado',
    conductor_en_camino: 'Conductor en camino',
    conductor_ha_llegado: 'Conductor ha llegado',
    viaje_iniciado: 'Viaje en curso',
    viaje_completado: 'Viaje finalizado',
    viaje_cancelado: 'Viaje cancelado'
  };

  const ACTIVOS = ['buscando_conductor', 'conductor_asignado', 'conductor_en_camino', 'conductor_ha_llegado', 'viaje_iniciado'];

  const fila = (k, v) => `<div class="vj-row"><span>${k}</span><b>${v}</b></div>`;

  function ultimoFinalizado() {
    try {
      const h = leerHistorial() || [];
      return h.find(x => x.estado === 'pagado' || x.estado === 'finalizado') || null;
    } catch (_) { return null; }
  }

  /* ---------- Tarjetas reutilizables ---------- */
  function bloqueConductor(o, veh) {
    if (!o) return '';
    const ini = String(o.conductor || '?').trim().charAt(0).toUpperCase();
    return `<div class="vj-driver">
      <div class="vj-avatar">${esc(ini)}</div>
      <div class="vj-driver-txt">
        <b>${esc(o.conductor)}</b>
        <span>⭐ ${esc(o.rating)} · ${esc(o.plataforma || '')}</span>
        <span>${veh === 'carro' ? '🚗' : '🏍️'} ${esc(o.vehiculo)} · ${esc(o.placa)}</span>
      </div>
    </div>`;
  }

  function bloqueRuta() {
    if (!trip || !trip.origen || !trip.destino) return '';
    return `<div class="vj-card">
      <div class="vj-row"><span>Origen</span><b>${esc(trip.origen.nombre)}</b></div>
      <div class="vj-row"><span>Destino</span><b>${esc(trip.destino.nombre)}</b></div>
      <div class="vj-row"><span>Distancia estimada</span><b>${trip.rutaKm != null ? kmTexto(trip.rutaKm) : 'No disponible'}</b></div>
      <div class="vj-row"><span>Tipo de vehículo</span><b>${vehLabel(trip.vehiculo)}</b></div>
      <div class="vj-row"><span>${trip.estado === 'viaje_iniciado' || trip.estado === 'viaje_completado' ? 'Precio del viaje' : 'Precio aproximado'}</span><b>${trip.tarifaOk ? money(trip.tarifa) : 'No disponible'}</b></div>
    </div>`;
  }

  /* ---------- Render principal ---------- */
  function render() {
    const cont = $('viajeBody');
    if (!cont) return;
    const e = trip ? trip.estado : 'solicitud_inicial';

    if (ACTIVOS.indexOf(e) >= 0) { cont.innerHTML = activo(e); return; }
    if (e === 'viaje_completado' && !trip.pago) { cont.innerHTML = finalizadoActual(); return; }
    if (e === 'pagado') { cont.innerHTML = finalizadoActual(true); return; }
    cont.innerHTML = sinViaje();
  }

  function sinViaje() {
    const fin = ultimoFinalizado();
    const ultimo = fin ? `<div class="vj-card vj-ultimo">
        <small>ÚLTIMO VIAJE · ${esc(fin.fecha || '')}</small>
        <div class="vj-row"><span>Destino</span><b>${esc(fin.destino || '—')}</b></div>
        <div class="vj-row"><span>Distancia</span><b>${fin.km != null ? kmTexto(fin.km) : '—'}</b></div>
        <div class="vj-row"><span>Precio</span><b>${money(fin.tarifa)}</b></div>
      </div>` : '';
    return `<div class="vj-empty">
        <div class="vj-empty-ico">🧭</div>
        <h2>No tienes ningún viaje activo</h2>
        <p>Cuando solicites un conductor verás aquí el estado del servicio.</p>
        <button class="btn btn-primary btn-block" onclick="UI.goToScreen(1)">Volver al inicio para solicitar viaje</button>
      </div>${ultimo}`;
  }

  function activo(e) {
    const o = trip.oferta;
    const titulo = NOMBRE_ESTADO[e] || 'Viaje';
    let extra = '';

    if (e === 'buscando_conductor') {
      extra = `<div class="vj-card"><div class="vj-row"><span>Estado</span><b>Buscando conductor…</b></div>
        <div class="vj-note">Esperando ofertas de conductores para tu solicitud.</div></div>
        <button class="btn btn-ghost btn-block" onclick="UI.goToScreen(2)">Ver ofertas recibidas</button>`;
    }
    if (e === 'conductor_asignado') {
      extra = bloqueConductor(o, trip.vehiculo) +
        `<button class="btn btn-primary btn-block" onclick="UI.goToScreen(3)">Ver conductor asignado</button>`;
    }
    if (e === 'conductor_en_camino') {
      extra = bloqueConductor(o, trip.vehiculo) +
        `<div class="vj-card"><div class="vj-row"><span>Llega en</span><b id="vjEta">${trip.etaMin || '—'} min</b></div>
         <div class="vj-note">Punto de recogida: ${esc((trip.origen && trip.origen.nombre) || '—')}</div></div>
        <button class="btn btn-primary btn-block" onclick="UI.goToScreen(4)">Seguir al conductor</button>`;
    }
    if (e === 'conductor_ha_llegado') {
      extra = bloqueConductor(o, trip.vehiculo) +
        `<div class="vj-card"><div class="vj-row"><span>Estado</span><b>El conductor está en el punto de recogida</b></div></div>
        <button class="btn btn-primary btn-block" onclick="FLOW.iniciarViaje()">▶ Iniciar viaje</button>
        <button class="btn btn-danger btn-block btn-sm" style="margin-top:8px;" onclick="FLOW.abrirCancelacion()">Cancelar viaje</button>`;
    }
    if (e === 'viaje_iniciado') {
      extra = bloqueConductor(o, trip.vehiculo) +
        `<div class="vj-card"><div class="vj-row"><span>Estado</span><b>Recorrido en curso</b></div>
         <div class="vj-note">${esc(trip.rutaMin ? trip.rutaMin + ' min por carretera' : 'En camino al destino')}</div></div>
        <button class="btn btn-primary btn-block" onclick="UI.goToScreen(6)">Ver recorrido</button>
        <button class="btn btn-danger btn-block btn-sm" style="margin-top:8px;" onclick="FLOW.abrirCancelacion()">Cancelar viaje</button>`;
    }

    return `<div class="vj-head">
        <h2>${esc(titulo)}</h2>
        <span class="vj-pill">${esc(e === 'viaje_iniciado' ? 'En curso' : 'Activo')}</span>
      </div>
      ${bloqueRuta()}${extra}`;
  }

  function finalizadoActual(pagado) {
    const o = trip.oferta;
    return `<div class="vj-head">
        <h2>Viaje finalizado</h2>
        <span class="vj-pill ok">${pagado ? 'Finalizado y pagado' : 'Finalizado'}</span>
      </div>
      <div class="vj-card">
        <div class="vj-row"><span>Estado</span><b>Viaje finalizado</b></div>
        <div class="vj-row"><span>Origen</span><b>${esc((trip.origen && trip.origen.nombre) || '—')}</b></div>
        <div class="vj-row"><span>Destino</span><b>${esc((trip.destino && trip.destino.nombre) || '—')}</b></div>
        <div class="vj-row"><span>Distancia recorrida</span><b>${trip.rutaKm != null ? kmTexto(trip.rutaKm) : '—'}</b></div>
        <div class="vj-row"><span>Precio final</span><b>${money(trip.tarifa)}</b></div>
        <div class="vj-row"><span>Tipo de vehículo</span><b>${vehLabel(trip.vehiculo)}</b></div>
        <div class="vj-row"><span>Fecha y hora</span><b>${esc(trip.finalizado || ahoraTexto())}</b></div>
      </div>
      ${bloqueConductor(o, trip.vehiculo)}
      ${pagado ? '' : '<button class="btn btn-primary btn-block" onclick="UI.goToScreen(7)">Ir al pago</button>'}
      <button class="btn btn-ghost btn-block" style="margin-top:8px;" onclick="FLOW.nuevoViaje()">Volver al inicio para solicitar viaje</button>`;
  }

  /* ---------- Resumen de la pantalla principal ---------- */
  function resumen() {
    const ro = $('resOrigen'), rd = $('resDestino');
    if (ro) ro.textContent = (trip && trip.origen && trip.origen.nombre) || '—';
    if (rd) rd.textContent = (trip && trip.destino && trip.destino.nombre) || '—';
  }

  /* ---------- Sincronización automática ---------- */
  function sincronizar() {
    try { resumen(); render(); } catch (_) {}
    const o = trip && trip.oferta;
    const eta = $('vjEta');
    if (eta && o && trip.estado === 'conductor_en_camino') eta.textContent = (trip.etaMin || '—') + ' min';
  }

  function enganchar() {
    if (typeof FLOW === 'undefined' || FLOW.__enganchado) return;
    ['elegirOrigen', 'elegirDestino', 'seleccionarVehiculo', 'actualizarPrecio', 'recalcular',
     'buscarViajes', 'mostrarOfertas', 'seleccionarOferta', 'conductorEnCamino', 'llegarConductor',
     'iniciarViaje', 'finalizarViaje', 'pagar', 'nuevoViaje', 'confirmarCancelacion'].forEach(k => {
      const f = FLOW[k];
      if (typeof f !== 'function') return;
      FLOW[k] = function () {
        const r = f.apply(FLOW, arguments);
        sincronizar();
        return r;
      };
    });
    FLOW.__enganchado = true;
  }

  enganchar();
  sincronizar();

  return { render, resumen, sincronizar, get activo() { return !!(trip && ACTIVOS.indexOf(trip.estado) >= 0); } };
})();
