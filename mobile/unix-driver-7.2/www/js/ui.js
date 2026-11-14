'use strict';
/* ============================================================
   UniX Driver · Navegación, avisos, listado de precios e historial
   ============================================================ */

const UI = (() => {
  let pantalla = 0;
  const pila = [];

  function mostrar(id) { const e = document.getElementById(id); if (e) e.classList.remove('hidden'); }
  function ocultar(id) { const e = document.getElementById(id); if (e) e.classList.add('hidden'); }

  function goToScreen(n, sinPila) {
    // Si hay una solicitud activa, moverse fuera de las pantallas de viaje
    // no altera el estado de la solicitud.
    const previa = pantalla;
    if (!sinPila && previa && previa !== n) { pila.push(previa); if (pila.length > 20) pila.shift(); }
    pantalla = n;
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const el = document.getElementById('screen' + n);
    if (el) { el.classList.add('active'); el.scrollTop = 0; }
    const cont = document.getElementById('screens');
    if (cont) cont.scrollTop = 0;
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', String(b.dataset.screen) === String(n));
    });
    if (n === 10) renderHistorial();
    if (n === 11 && typeof VIAJE !== 'undefined') { try { VIAJE.sincronizar(); } catch (_) {} }
    if (typeof MAPA !== 'undefined') setTimeout(() => { try { MAPA.invalidar(); } catch (_) {} }, 140);
  }

  function atras() {
    if (!document.getElementById('cancelOverlay').classList.contains('hidden')) { FLOW.cerrarCancelacion(); return; }
    if (!document.getElementById('pickerOverlay').classList.contains('hidden')) { PICKER.cerrar(); return; }
    if (!document.getElementById('cuentaOverlay').classList.contains('hidden')) { cerrarCuenta(); return; }
    if (!document.getElementById('origenOverlay').classList.contains('hidden')) { ORIGEN_UI.cerrar(); return; }
    const s = estadoActual();
    const activo = [ESTADOS.BUSCANDO, ESTADOS.ASIGNADO, ESTADOS.EN_CAMINO, ESTADOS.LLEGO, ESTADOS.EN_CURSO].includes(s);
    if (activo) { goToScreen(1); return; }
    if (pantalla !== 1) { goToScreen(1); return; }
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App) { Capacitor.Plugins.App.exitApp(); }
  }

  function setNotice(id, html, cls) {
    const e = document.getElementById(id);
    if (!e) return;
    if (!html) { e.classList.add('hidden'); e.innerHTML = ''; return; }
    e.innerHTML = html;
    e.className = 'notice' + (cls ? ' ' + cls : '');
  }

  function actualizarBadgeUsuario() {
    const s = AUTH.sesion();
    const conectado = !!(s && (s.email || s.invitado || s.nombre));
    // La barra inferior solo existe cuando hay sesión (invitado o con correo)
    document.body.classList.toggle('auth-ok', conectado);
    const b = document.getElementById('userBadge');
    if (b) b.textContent = '👤 ' + ((s && s.nombre) ? s.nombre.split(' ')[0] : 'Invitado');
    const g = document.getElementById('greeting');
    if (g) g.textContent = 'Hola ' + ((s && s.nombre) ? s.nombre.split(' ')[0] : '👋');
  }

  function renderFrecuentes() {
    const cont = document.getElementById('frecuentes');
    if (!cont) return;
    cont.innerHTML = DEST.frecuentes.map(d =>
      `<button class="quick-place" onclick="PICKER.elegir('${d.id}')">${d.nombre_corto || d.nombre}</button>`
    ).join('');
  }


  /* ---------- Historial (Sincronizado con GET /viajes/usuario/{id} en AWS RDS) ---------- */
  let sincronizandoHistorial = false;

  async function sincronizarHistorialDesdeAws() {
    if (sincronizandoHistorial) return;
    if (typeof window === 'undefined' || !window.apiService || typeof window.apiService.obtenerHistorialViajes !== 'function') return;
    const s = (typeof AUTH !== 'undefined' && AUTH.sesion) ? AUTH.sesion() : null;
    const idUsuario = (s && s.id_usuario) ? Number(s.id_usuario) : null;
    if (!idUsuario) return;

    sincronizandoHistorial = true;
    try {
      const viajesRemotos = await window.apiService.obtenerHistorialViajes(idUsuario);
      if (!Array.isArray(viajesRemotos) || !viajesRemotos.length) return;

      const local = leerHistorial();
      let huboCambios = false;

      viajesRemotos.forEach(vr => {
        if (!vr || !vr.id_viaje) return;
        const idViaje = 'V-' + vr.id_viaje;
        if (local.some(x => String(x.id) === idViaje || String(x.id) === ('RDS-' + vr.id_viaje))) return;

        const of = vr.oferta || {};
        const plat = (of.plataforma && of.plataforma.nombre) || 'Uber';
        const cond = (of.conductor && of.conductor.nombre) || 'Conductor asignado';
        const vehTipo = (of.vehiculo && String(of.vehiculo.tipo || '').toLowerCase().includes('moto')) ? 'moto' : 'carro';
        const tarifaNum = Number(vr.precio_final != null ? vr.precio_final : (of.precio_estimado || 0));
        const estadoUpper = String(vr.estado || '').toUpperCase();
        const estadoLocal = estadoUpper === 'CANCELADO'
          ? 'cancelado'
          : (estadoUpper === 'COMPLETADO' ? 'pagado' : 'finalizado');

        local.push({
          id: idViaje,
          fecha: vr.fecha_hora_inicio ? new Date(vr.fecha_hora_inicio).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ahoraTexto(),
          origen: 'Cartagena',
          destino: 'Viaje #' + vr.id_viaje + ' (' + plat + ')',
          vehiculo: vehTipo,
          tarifa: tarifaNum,
          comision: estadoLocal === 'cancelado' ? 0 : Math.round(tarifaNum * COMISION_PCT),
          estado: estadoLocal,
          conductor: cond,
          plataforma: plat,
          km: of.distancia != null ? Number(of.distancia) : null,
          duracionMin: of.tiempo_estimado != null ? Number(of.tiempo_estimado) : null
        });
        huboCambios = true;
      });

      if (huboCambios) {
        try { localStorage.setItem(LS_HIST, JSON.stringify(local.slice(0, 300))); } catch (_) {}
        pintarHistorialDOM();
      }
    } catch (_) {
    } finally {
      sincronizandoHistorial = false;
    }
  }

  function pintarHistorialDOM() {
    const lista = leerHistorial();
    const filtro = (document.getElementById('histFiltroEstado') || {}).value || 'todos';
    const vis = lista.filter(v => filtro === 'todos' ? true : v.estado === filtro);
    const pagados = lista.filter(v => v.estado === 'pagado');
    const cancelados = lista.filter(v => v.estado === 'cancelado');
    const total = pagados.reduce((a, v) => a + (Number(v.tarifa) || 0), 0);
    const kpis = document.getElementById('histKpis');
    if (kpis) {
      kpis.innerHTML = `
        <div class="zs-card corto"><small>COMPLETADOS</small><b>${pagados.length}</b><span>pagados</span></div>
        <div class="zs-card largo"><small>CANCELADOS</small><b>${cancelados.length}</b><span>con motivo</span></div>
        <div class="zs-card medio"><small>FACTURADO</small><b style="font-size:11.5px;">${money(total)}</b><span>COP</span></div>`;
    }
    const cont = document.getElementById('histList');
    if (!cont) return;
    if (!vis.length) {
      cont.innerHTML = '<div class="hist-empty">Todavía no hay viajes aquí.<br>Cuando completes o canceles un viaje aparecerá en esta lista.</div>';
      return;
    }
    cont.innerHTML = vis.map(v => `
      <div class="hist-item">
        <header>
          <b>${v.origen ? v.origen + ' → ' : ''}${v.destino || '—'}</b>
          <span class="tag ${v.estado}">${v.estado === 'pagado' ? 'Pagado' : v.estado === 'cancelado' ? 'Cancelado' : 'Finalizado'}</span>
        </header>
        <div class="h-row"><span>${v.fecha} · ${vehLabel(v.vehiculo)}${v.km ? ' · ' + v.km + ' km' : ''}${v.duracionMin ? ' · ' + v.duracionMin + ' min' : ''}</span><span class="h-price">${money(v.tarifa)}</span></div>
        ${v.conductor ? `<div class="h-row"><span>${v.conductor} · ${v.plataforma || '—'}</span><span>${v.comision ? 'comisión ' + money(v.comision) : ''}</span></div>` : ''}
        ${v.motivo ? `<div class="hist-motivo">Motivo: ${v.motivo}</div>` : ''}
      </div>`).join('');
  }

  function renderHistorial() {
    pintarHistorialDOM();
    sincronizarHistorialDesdeAws();
  }

  function limpiarHistorial() {
    if (!leerHistorial().length) { setNotice('searchNotice', 'No hay viajes guardados para borrar.'); return; }
    if (!window.confirm('¿Borrar todo el historial guardado en este dispositivo?')) return;
    borrarHistorial();
    renderHistorial();
  }

  /* ---------- Cuenta ---------- */
  function abrirCuenta() {
    const s = AUTH.sesion();
    document.getElementById('cuentaNombre').textContent = (s && s.nombre) || 'Invitado';
    document.getElementById('cuentaEmail').textContent = (s && s.email) || 'Sin correo (modo invitado)';
    document.getElementById('cuentaSesion').textContent = s ? 'Activa desde ' + String(s.desde || '').slice(0, 10) : 'Sin sesión';
    document.getElementById('cuentaViajes').textContent = leerHistorial().length;
    const nt = document.getElementById('authTechNotice');
    if (nt) {
      nt.classList.add('hidden');
      nt.innerHTML = '';
    }
    mostrar('cuentaOverlay');
  }
  function cerrarCuenta() { ocultar('cuentaOverlay'); }

  /* ---------- Limpieza visual de una solicitud ---------- */
  function limpiarUIviaje() {
    const set = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
    const dest = document.getElementById('destinoLabel');
    if (dest) dest.textContent = 'Elige tu destino';
    const sub = document.getElementById('destinoSub');
    if (sub) sub.textContent = DEST.lista.length + ' lugares · barrios, hoteles, clínicas, centros comerciales…';
    const ol = document.getElementById('origenLabel');
    if (ol) ol.textContent = 'Elige desde dónde sales';
    const os = document.getElementById('origenSub');
    if (os) os.textContent = 'Busca un lugar, tu ubicación o una dirección';
    set('precioEstimado', '—');
    set('resOrigen', '—'); set('resDestino', '—');
    const chipReset = document.getElementById('zoneChip');
    if (chipReset) { chipReset.className = 'zone-chip hidden'; chipReset.textContent = ''; }
    const chip = document.getElementById('zoneChip');
    if (chip) { chip.className = 'zone-chip'; chip.textContent = 'Elige origen y destino para ver el precio'; }
    const rb0 = document.getElementById('rutaBarInicio');
    if (rb0) rb0.innerHTML = '<span>Elige origen y destino para ver la ruta</span><span class="badge-osrm">OSRM · OSM</span>';
    const offers = document.getElementById('offers');
    if (offers) { offers.innerHTML = ''; offers.classList.add('hidden'); }
    const radar = document.getElementById('radarPanel');
    if (radar) radar.classList.remove('hidden');
    ['searchNotice', 'offersNotice', 'assignedNotice', 'arrivedNotice', 'paymentNotice'].forEach(id => setNotice(id, ''));
    const cnt = document.getElementById('cCountdown'); if (cnt) cnt.textContent = '--:--';
    const pr = document.getElementById('cProgress'); if (pr) pr.style.width = '0%';
    const tp = document.getElementById('tProgreso'); if (tp) tp.style.width = '0%';
    const rec = document.getElementById('receiptBox'); if (rec) rec.innerHTML = '';
    const sb = document.getElementById('btnBuscar'); if (sb) { sb.disabled = false; sb.textContent = '🔍 Buscar conductor'; }
    const rv = document.getElementById('rutaBarViaje');
    if (rv) rv.innerHTML = '<span>Ruta por carretera</span><span class="badge-osrm">OSRM · OSM</span>';
    const cb = document.getElementById('btnConfirmarCancel'); if (cb) cb.classList.remove('hidden');
    const cc = document.getElementById('cancelConfirm'); if (cc) cc.classList.add('hidden');
  }

  function reloj() {
    const c = document.getElementById('clock');
    if (c) c.textContent = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  return { goToScreen, atras, mostrar, ocultar, setNotice, actualizarBadgeUsuario, renderFrecuentes,
    renderHistorial, limpiarHistorial, abrirCuenta, cerrarCuenta, limpiarUIviaje, reloj,
    get pantalla() { return pantalla; } };
})();
