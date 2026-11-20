'use strict';
/* ============================================================
   UniX Driver · Navegación, avisos, listado de precios e historial
   ============================================================ */

const UI = (() => {
  let pantalla = 0;
  const pila = [];

  function mostrar(id) { const e = document.getElementById(id); if (e) e.classList.remove('hidden'); }
  function ocultar(id) { const e = document.getElementById(id); if (e) e.classList.add('hidden'); }

  function ocultarTarjetasViajeAjenas() {
    const s11 = document.getElementById('screen11');
    if (s11) s11.classList.remove('active');
    const vb = document.getElementById('viajeBody');
    if (vb) vb.classList.add('hidden');
    const lt = document.getElementById('lastTripBox');
    if (lt) lt.classList.add('hidden');
    document.querySelectorAll('#viajeBody .vj-empty').forEach(node => node.classList.add('hidden'));
  }

  function goToScreen(n, sinPila) {
    // Si hay una solicitud activa, moverse fuera de las pantallas de viaje
    // no altera el estado de la solicitud.
    const previa = pantalla;
    if (!sinPila && previa && previa !== n) { pila.push(previa); if (pila.length > 20) pila.shift(); }
    pantalla = n;
    document.body.classList.toggle('on-login', Number(n) === 0);
    ocultar('masInfoOverlay');
    if (Number(n) === 0) {
      ['cuentaOverlay', 'pickerOverlay', 'origenOverlay', 'cancelOverlay', 'masInfoOverlay'].forEach(ocultar);
    }
    const co = document.getElementById('cuentaOverlay');
    if (co && Number(n) !== 12) {
      co.classList.add('hidden');
      co.classList.remove('active');
    }
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    if (Number(n) !== 11) {
      ocultarTarjetasViajeAjenas();
    } else {
      const vb = document.getElementById('viajeBody');
      if (vb) vb.classList.remove('hidden');
    }
    const el = document.getElementById('screen' + n);
    if (el) { el.classList.add('active'); el.scrollTop = 0; }
    const cont = document.getElementById('screens');
    if (cont) cont.scrollTop = 0;
    if (typeof window !== 'undefined' && window.scrollTo) {
      try { window.scrollTo(0, 0); } catch (_) {}
    }
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', String(b.dataset.screen) === String(n));
    });
    if (n === 10) renderHistorial();
    if (n === 11 && typeof VIAJE !== 'undefined') { try { VIAJE.sincronizar(); } catch (_) {} }
    if ((Number(n) === 2 || Number(n) === 3) && typeof MAPA !== 'undefined' && typeof trip !== 'undefined' && trip && trip.origen && trip.destino) {
      const mapId = Number(n) === 2 ? 'mapaOfertas' : 'mapaAsignado';
      const barId = Number(n) === 2 ? 'rutaBarOfertas' : 'rutaBarAsignado';
      setTimeout(() => { try { MAPA.mostrarRuta(mapId, barId, trip.origen, trip.destino); } catch (_) {} }, 60);
    }
    if (typeof MAPA !== 'undefined') setTimeout(() => { try { MAPA.invalidar(); } catch (_) {} }, 150);
  }

  function atras() {
    if (!document.getElementById('cancelOverlay').classList.contains('hidden')) { FLOW.cerrarCancelacion(); return; }
    const masMod = document.getElementById('masInfoOverlay');
    if (masMod && !masMod.classList.contains('hidden')) { cerrarMasModal(); return; }
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

  const SVG_SEARCH_BTN = '<svg class="ico-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg><span>Buscar opciones</span>';
  const SVG_CHIP_PIN = '<svg class="ico-svg chip-pin-svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.42 7.5 12.5 7.5 12.5s7.5-7.08 7.5-12.5C19.5 5.36 16.14 2 12 2zm0 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z"/></svg>';

  function actualizarBadgeUsuario() {
    const s = AUTH.sesion();
    const conectado = !!(s && (s.email || s.invitado || s.nombre));
    // La barra inferior solo existe cuando hay sesión (invitado o con correo)
    document.body.classList.toggle('auth-ok', conectado);
    const b = document.getElementById('userBadge');
    if (b) b.textContent = (s && s.nombre) ? s.nombre.split(' ')[0] : 'Invitado';
    const g = document.getElementById('greeting');
    if (g) g.textContent = 'Hola ' + ((s && s.nombre) ? s.nombre.split(' ')[0] : 'Usuario');
  }

  function renderFrecuentes() {
    const cont = document.getElementById('frecuentes');
    if (!cont) return;
    const sugeridos = [
      { label: 'Centro Histórico', query: 'Centro' },
      { label: 'Bocagrande', query: 'Bocagrande' },
      { label: 'Manga', query: 'Manga' }
    ];
    cont.innerHTML = sugeridos.map(s =>
      `<button type="button" class="quick-place" onclick="PICKER.elegir('${s.query}')">${SVG_CHIP_PIN}<span>${s.label}</span></button>`
    ).join('');
  }


  /* ---------- Historial (Fuente única de verdad: GET /viajes/usuario/{id} en AWS RDS) ---------- */
  let seqSyncHistorial = 0;

  function obtenerIdUsuarioSesionActiva() {
    try {
      const s = (typeof AUTH !== 'undefined' && typeof AUTH.sesionActual === 'function')
        ? AUTH.sesionActual()
        : ((typeof AUTH !== 'undefined' && AUTH.sesion) ? AUTH.sesion() : null);
      if (!s || s.invitado || s.id_usuario == null) return null;
      const id = Number(s.id_usuario);
      return (Number.isFinite(id) && id > 0) ? id : null;
    } catch (_) {
      return null;
    }
  }

  function limpiarHistorialDOM() {
    const kpis = document.getElementById('histKpis');
    if (kpis) {
      kpis.innerHTML = `
        <div class="zs-card corto"><small>COMPLETADOS</small><b>0</b><span>pagados</span></div>
        <div class="zs-card largo"><small>CANCELADOS</small><b>0</b><span>con motivo</span></div>
        <div class="zs-card medio"><small>FACTURADO</small><b style="font-size:11.5px;">${money(0)}</b><span>COP</span></div>`;
    }
    const cont = document.getElementById('histList');
    if (cont) {
      cont.innerHTML = '<div class="hist-empty">Todavía no hay viajes aquí.<br>Cuando completes o canceles un viaje aparecerá en esta lista.</div>';
    }
    const elVj = document.getElementById('cuentaViajes');
    if (elVj) elVj.textContent = '0';
    const lt = document.getElementById('lastTripBox');
    if (lt) lt.classList.add('hidden');
  }

  function actualizarResumenHistorialUsuario(lista) {
    const arr = Array.isArray(lista) ? lista : [];
    const elVj = document.getElementById('cuentaViajes');
    if (elVj) elVj.textContent = String(arr.length);
    if (typeof VIAJE !== 'undefined' && typeof VIAJE.render === 'function' && !VIAJE.activo) {
      try { VIAJE.render(); } catch (_) {}
    }
    const ultimo = arr.find(x => x && (x.estado === 'pagado' || x.estado === 'finalizado')) || null;
    const lt = document.getElementById('lastTripBox');
    if (lt) {
      lt.classList.toggle('hidden', !ultimo || Number(pantalla) !== 11);
    }
    if (Number(pantalla) !== 11) {
      ocultarTarjetasViajeAjenas();
    }
  }

  function mapearViajeRemoto(vr, idUsuario) {
    const of = vr.oferta || {};
    const busq = of.busqueda || {};
    const plat = (of.plataforma && of.plataforma.nombre) || 'Uber';
    const cond = (of.conductor && of.conductor.nombre) || 'Conductor asignado';
    const vehTipo = (of.vehiculo && String(of.vehiculo.tipo || '').toLowerCase().includes('moto')) ? 'moto' : 'carro';
    const tarifaNum = Number(vr.precio_final != null ? vr.precio_final : (of.precio_estimado || 0));
    const estadoUpper = String(vr.estado || '').toUpperCase();
    const estadoLocal = estadoUpper === 'CANCELADO'
      ? 'cancelado'
      : (estadoUpper === 'COMPLETADO' ? 'pagado' : 'finalizado');

    return {
      id: 'V-' + vr.id_viaje,
      id_usuario: Number(idUsuario),
      fecha: vr.fecha_hora_inicio
        ? new Date(vr.fecha_hora_inicio).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : ahoraTexto(),
      origen: busq.origen || 'Cartagena',
      destino: busq.destino || ('Viaje #' + vr.id_viaje + ' (' + plat + ')'),
      vehiculo: vehTipo,
      tarifa: tarifaNum,
      comision: estadoLocal === 'cancelado' ? 0 : Math.round(tarifaNum * COMISION_PCT),
      estado: estadoLocal,
      conductor: cond,
      plataforma: plat,
      km: of.distancia != null ? Number(of.distancia) : null,
      duracionMin: of.tiempo_estimado != null ? Number(of.tiempo_estimado) : null
    };
  }

  async function sincronizarHistorialDesdeAws(idUsuarioParam) {
    const idUsuario = (idUsuarioParam != null && Number(idUsuarioParam) > 0)
      ? Number(idUsuarioParam)
      : obtenerIdUsuarioSesionActiva();
    if (!idUsuario) {
      if (typeof STORE !== 'undefined' && typeof STORE.limpiarHistorialEnMemoria === 'function') {
        STORE.limpiarHistorialEnMemoria();
      } else if (typeof limpiarHistorialEnMemoria === 'function') {
        limpiarHistorialEnMemoria();
      }
      limpiarHistorialDOM();
      return [];
    }
    if (typeof window === 'undefined' || !window.apiService || typeof window.apiService.obtenerHistorialViajes !== 'function') {
      pintarHistorialDOM();
      return leerHistorial(idUsuario);
    }

    const reqSeq = ++seqSyncHistorial;
    try {
      const viajesRemotos = await window.apiService.obtenerHistorialViajes(idUsuario);
      const idActual = obtenerIdUsuarioSesionActiva();
      if (reqSeq !== seqSyncHistorial || !idActual || idActual !== idUsuario) {
        return [];
      }
      if (!Array.isArray(viajesRemotos)) {
        return leerHistorial(idUsuario);
      }

      const normalizados = viajesRemotos
        .filter(vr => vr && vr.id_viaje != null)
        .map(vr => mapearViajeRemoto(vr, idUsuario));

      // Reemplazo estricto sin merge con viajes locales de otros usuarios ni caché global
      reemplazarHistorial(normalizados, idUsuario);
      pintarHistorialDOM();
      return normalizados;
    } catch (_) {
      const idActual = obtenerIdUsuarioSesionActiva();
      if (reqSeq === seqSyncHistorial && idActual === idUsuario) {
        pintarHistorialDOM();
      }
      return leerHistorial(idUsuario);
    }
  }

  function pintarHistorialDOM() {
    const idUsuario = obtenerIdUsuarioSesionActiva();
    if (!idUsuario) {
      limpiarHistorialDOM();
      return;
    }
    const lista = leerHistorial(idUsuario);
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
    if (cont) {
      if (!vis.length) {
        cont.innerHTML = '<div class="hist-empty">Todavía no hay viajes aquí.<br>Cuando completes o canceles un viaje aparecerá en esta lista.</div>';
      } else {
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
    }
    actualizarResumenHistorialUsuario(lista);
  }

  function renderHistorial() {
    const idUsuario = obtenerIdUsuarioSesionActiva();
    if (!idUsuario) {
      if (typeof STORE !== 'undefined' && typeof STORE.limpiarHistorialEnMemoria === 'function') {
        STORE.limpiarHistorialEnMemoria();
      } else if (typeof limpiarHistorialEnMemoria === 'function') {
        limpiarHistorialEnMemoria();
      }
      limpiarHistorialDOM();
      return;
    }
    pintarHistorialDOM();
    sincronizarHistorialDesdeAws(idUsuario);
  }

  function limpiarHistorial() {
    const idUsuario = obtenerIdUsuarioSesionActiva();
    if (!idUsuario || !leerHistorial(idUsuario).length) { setNotice('searchNotice', 'No hay viajes guardados para borrar.'); return; }
    if (!window.confirm('¿Borrar todo el historial guardado en este dispositivo?')) return;
    borrarHistorial(idUsuario);
    pintarHistorialDOM();
  }

  /* ---------- Cuenta / Perfil de Pantalla Completa (DSS03P) ---------- */
  const SVG_SAVE_BTN = '<svg class="ico-svg" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Guardar cambios</span>';

  function calcularIniciales(nombre) {
    const partes = String(nombre || 'U').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'U';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function pintarDatosPerfilDOM(datos) {
    const nombre = (datos && datos.nombre) || 'Invitado';
    const correo = (datos && (datos.correo || datos.email)) || 'Sin correo (modo invitado)';
    const telefono = (datos && datos.telefono) || '';
    const nacimiento = datos && datos.fecha_nacimiento ? String(datos.fecha_nacimiento).slice(0, 10) : '';
    const fechaDesde = datos && (datos.fecha_registro || datos.desde)
      ? String(datos.fecha_registro || datos.desde).slice(0, 10)
      : 'Sin sesión';

    const elNom = document.getElementById('cuentaNombre');
    if (elNom) elNom.textContent = nombre;
    const elEm = document.getElementById('cuentaEmail');
    if (elEm) elEm.textContent = correo;
    const elSes = document.getElementById('cuentaSesion');
    if (elSes) elSes.textContent = fechaDesde;
    const elVj = document.getElementById('cuentaViajes');
    const idUsrActivo = obtenerIdUsuarioSesionActiva();
    if (elVj) elVj.textContent = String(idUsrActivo ? leerHistorial(idUsrActivo).length : 0);
    const elAv = document.getElementById('perfilAvatar');
    if (elAv) elAv.textContent = calcularIniciales(nombre);

    const inpNom = document.getElementById('perfilNombre');
    if (inpNom) inpNom.value = datos && datos.nombre ? datos.nombre : '';
    const inpEm = document.getElementById('perfilEmail');
    if (inpEm) inpEm.value = (datos && (datos.correo || datos.email)) || '';
    const inpTel = document.getElementById('perfilTelefono');
    if (inpTel) inpTel.value = telefono;
    const inpNac = document.getElementById('perfilNacimiento');
    if (inpNac) inpNac.value = nacimiento;
  }

  async function sincronizarPerfilDesdeAws(idUsuario) {
    if (!idUsuario) return;
    if (typeof window === 'undefined' || !window.apiService || typeof window.apiService.obtenerPerfil !== 'function') return;
    try {
      const remoto = await window.apiService.obtenerPerfil(idUsuario);
      if (remoto && typeof remoto === 'object' && (remoto.nombre || remoto.correo)) {
        if (typeof AUTH !== 'undefined' && AUTH.actualizarSesion) {
          AUTH.actualizarSesion(remoto);
        }
        pintarDatosPerfilDOM(Object.assign({}, AUTH.sesion() || {}, remoto));
        actualizarBadgeUsuario();
      }
    } catch (_) {}
  }

  function abrirCuenta() {
    const s = AUTH.sesion();
    setNotice('perfilNotice', '');
    const nt = document.getElementById('authTechNotice');
    if (nt) {
      nt.classList.add('hidden');
      nt.innerHTML = '';
    }
    pintarDatosPerfilDOM(s || {});

    // Ocultar pantallas traseras y tarjetas de viaje ajenas al abrir Perfil
    ocultar('masInfoOverlay');
    ocultarTarjetasViajeAjenas();
    pantalla = 12;
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const co = document.getElementById('cuentaOverlay');
    if (co) {
      co.classList.remove('hidden');
      co.classList.add('active');
      co.scrollTop = 0;
    }
    if (typeof window !== 'undefined' && window.scrollTo) {
      try { window.scrollTo(0, 0); } catch (_) {}
    }
    // Marcar tab "Perfil" como activo en la barra inferior
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cuenta === '1');
    });

    if (s && s.id_usuario && !s.invitado) {
      sincronizarPerfilDesdeAws(s.id_usuario);
      sincronizarHistorialDesdeAws(s.id_usuario);
    }
  }

  function cerrarCuenta() {
    const co = document.getElementById('cuentaOverlay');
    if (co) {
      co.classList.add('hidden');
      co.classList.remove('active');
    }
    if (pantalla === 12) {
      goToScreen(1, true);
    }
  }

  async function guardarPerfil() {
    const s = AUTH.sesion();
    const inpNom = document.getElementById('perfilNombre');
    const inpTel = document.getElementById('perfilTelefono');
    const inpNac = document.getElementById('perfilNacimiento');
    const btn = document.getElementById('btnGuardarPerfil');

    const nombre = inpNom ? inpNom.value.trim() : '';
    const telefono = inpTel ? inpTel.value.trim() : '';
    const fechaNacimiento = inpNac && inpNac.value ? inpNac.value.trim() : '';

    setNotice('perfilNotice', '');
    if (nombre.length < 2) {
      setNotice('perfilNotice', 'El nombre debe tener al menos 2 caracteres.', 'error');
      return;
    }

    const idUsuario = (s && s.id_usuario) ? Number(s.id_usuario) : 1;
    const payload = {
      nombre,
      telefono: telefono || null,
      fecha_nacimiento: fechaNacimiento || null
    };

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Guardando…</span>';
    }

    try {
      let actualizado = payload;
      if (typeof window !== 'undefined' && window.apiService && typeof window.apiService.actualizarPerfil === 'function') {
        const resp = await window.apiService.actualizarPerfil(idUsuario, payload);
        if (resp && typeof resp === 'object' && (resp.nombre || resp.id_usuario)) {
          actualizado = resp;
        }
      }
      if (typeof AUTH !== 'undefined' && AUTH.actualizarSesion) {
        AUTH.actualizarSesion(actualizado);
      }
      pintarDatosPerfilDOM(Object.assign({}, AUTH.sesion() || {}, actualizado));
      actualizarBadgeUsuario();
      setNotice('perfilNotice', 'Perfil actualizado correctamente.', 'success');
    } catch (err) {
      setNotice('perfilNotice', (err && err.message) || 'No se pudo actualizar el perfil. Verifica tu conexión.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = SVG_SAVE_BTN;
      }
    }
  }

  /* ---------- Limpieza visual de una solicitud ---------- */
  function limpiarUIviaje() {
    const set = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
    const dest = document.getElementById('destinoLabel');
    if (dest) {
      dest.textContent = 'Barrio o lugar de destino';
      dest.classList.add('is-placeholder');
    }
    const sub = document.getElementById('destinoSub');
    if (sub) sub.textContent = DEST.lista.length + ' lugares · barrios, hoteles, clínicas, centros comerciales…';
    const ol = document.getElementById('origenLabel');
    const origenNombre = (typeof trip !== 'undefined' && trip && trip.origen && trip.origen.nombre) ? trip.origen.nombre : 'Universidad de Cartagena';
    if (ol) ol.textContent = origenNombre;
    const os = document.getElementById('origenSub');
    if (os) os.textContent = 'Busca un lugar, tu ubicación o una dirección';
    set('precioEstimado', '—');
    set('resOrigen', origenNombre); set('resDestino', '—');
    const chipReset = document.getElementById('zoneChip');
    if (chipReset) { chipReset.className = 'zone-chip hidden'; chipReset.textContent = ''; }
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
    const sb = document.getElementById('btnBuscar'); if (sb) { sb.disabled = false; sb.innerHTML = SVG_SEARCH_BTN; }
    const rv = document.getElementById('rutaBarViaje');
    if (rv) rv.innerHTML = '<span>Ruta por carretera</span><span class="badge-osrm">OSRM · OSM</span>';
    const ro = document.getElementById('rutaBarOfertas');
    if (ro) ro.innerHTML = '<span>Calculando ruta por carretera…</span><span class="badge-osrm">OSRM · OSM</span>';
    const ra = document.getElementById('rutaBarAsignado');
    if (ra) ra.innerHTML = '<span>Ruta por carretera</span><span class="badge-osrm">OSRM · OSM</span>';
    const cb = document.getElementById('btnConfirmarCancel'); if (cb) cb.classList.remove('hidden');
    const cc = document.getElementById('cancelConfirm'); if (cc) cc.classList.add('hidden');
  }

  /* ---------- Pestaña Más: modales informativos y cierre de sesión ---------- */
  const MAS_MODALES = {
    acerca: {
      titulo: 'Acerca de UniX Driver',
      ico: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8.5" r="0.8" fill="currentColor" stroke="none"/></svg>',
      html: `
        <p><strong>UniX Driver · Cartagena</strong> integra en una sola aplicación la comparación y solicitud de viajes en tiempo real sobre <strong>Uber</strong>, <strong>DiDi</strong> e <strong>inDrive</strong>.</p>
        <div class="mas-info-box">
          <h4>¿Qué puedes hacer?</h4>
          <ul>
            <li>Comparar tarifas, tiempos de llegada y opciones en <strong>Moto</strong> o <strong>Carro</strong>.</li>
            <li>Seleccionar tu origen y destino en cientos de barrios y puntos clave de Cartagena.</li>
            <li>Consultar el trazado de tu ruta, seguimiento del conductor y comprobante del viaje.</li>
          </ul>
        </div>
        <p class="mas-muted-note">Versión 1.0.0 · Cartagena de Indias, Colombia.</p>`
    },
    terminos: {
      titulo: 'Términos y condiciones',
      ico: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
      html: `
        <p>Al utilizar <strong>UniX Driver</strong> aceptas las condiciones de uso orientadas a garantizar transparencia y seguridad en cada solicitud:</p>
        <div class="mas-info-box">
          <h4>1. Uso del servicio</h4>
          <p>Las tarifas mostradas reflejan la distancia estimada, el tipo de vehículo seleccionado y la disponibilidad vigente al momento de tu consulta.</p>
          <h4>2. Tratamiento de datos personales</h4>
          <p>Tus datos (nombre, correo, teléfono, ubicación de recogida y destino) se utilizan exclusivamente para gestionar tu cuenta, procesar solicitudes e historial de viajes.</p>
          <h4>3. Cancelaciones responsables</h4>
          <p>Puedes cancelar una solicitud antes de iniciar el recorrido indicando el motivo desde la pantalla del viaje.</p>
        </div>`
    },
    soporte: {
      titulo: 'Ayuda y soporte',
      ico: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
      html: `
        <p>¿Necesitas ayuda con un viaje en Cartagena? Escríbenos por nuestros canales de atención:</p>
        <div class="mas-info-box">
          <h4>Canales de contacto</h4>
          <ul>
            <li><strong>Correo:</strong> soporte@unixdriver.co</li>
            <li><strong>Horario:</strong> Lunes a sábado, 6:00 a. m. a 10:00 p. m.</li>
            <li><strong>Cobertura:</strong> Área urbana de Cartagena de Indias.</li>
          </ul>
        </div>
        <div class="mas-info-box">
          <h4>Preguntas frecuentes</h4>
          <ul>
            <li><strong>¿Cómo cambio el punto de recogida?</strong> Toca el campo <em>Origen</em> en Inicio para usar tu ubicación actual o buscar otra dirección.</li>
            <li><strong>¿Dónde veo mis recibos?</strong> Ingresa en la pestaña <em>Historial</em> para revisar viajes completados y tarifas.</li>
          </ul>
        </div>`
    }
  };

  function abrirMasModal(tipo) {
    const info = MAS_MODALES[tipo] || MAS_MODALES.acerca;
    const titleEl = document.getElementById('masModalTitle');
    const icoEl = document.getElementById('masModalIco');
    const bodyEl = document.getElementById('masModalBody');
    if (titleEl) titleEl.textContent = info.titulo;
    if (icoEl) icoEl.innerHTML = info.ico;
    if (bodyEl) bodyEl.innerHTML = info.html;
    mostrar('masInfoOverlay');
  }

  function cerrarMasModal() {
    ocultar('masInfoOverlay');
  }

  function cerrarSesion() {
    cerrarMasModal();
    try {
      if (typeof AUTH !== 'undefined' && typeof AUTH.cerrarSesion === 'function') {
        AUTH.cerrarSesion();
      } else if (typeof AUTH !== 'undefined' && typeof AUTH.salir === 'function') {
        AUTH.salir();
      }
    } catch (_) {}
    if (typeof AUTH_UI !== 'undefined' && typeof AUTH_UI.salir === 'function') {
      AUTH_UI.salir();
      return;
    }
    ['cuentaOverlay', 'pickerOverlay', 'origenOverlay', 'cancelOverlay', 'masInfoOverlay'].forEach(ocultar);
    document.body.classList.remove('auth-ok');
    try { if (typeof resetTripState === 'function') resetTripState(); } catch (_) {}
    limpiarUIviaje();
    actualizarBadgeUsuario();
    goToScreen(0, true);
  }

  function reloj() {
    const c = document.getElementById('clock');
    if (c) c.textContent = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  return { goToScreen, atras, mostrar, ocultar, setNotice, actualizarBadgeUsuario, renderFrecuentes,
    renderHistorial, sincronizarHistorialDesdeAws, limpiarHistorialDOM, limpiarHistorial, abrirCuenta, cerrarCuenta, guardarPerfil, limpiarUIviaje, reloj,
    abrirMasModal, cerrarMasModal, cerrarSesion,
    get pantalla() { return pantalla; } };
})();
