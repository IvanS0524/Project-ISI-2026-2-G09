'use strict';
/* ============================================================
   UniX Driver · Panel de Administrador (Conectado a AWS REST API)
   ------------------------------------------------------------
   Pestañas:
   1. Panel     -> KPIs en vivo, accesos rápidos y viajes recientes
   2. Usuarios  -> Búsqueda, filtros y activación/inactivación (PATCH /usuarios/{id}/estado)
   3. Comisión  -> Regla vigente, actualización (POST /comisiones/configuracion), historial y cobros
   4. Reportes  -> Desempeño por plataforma (Uber, DiDi, inDrive), Top 5 destinos y resumen operativo
   ============================================================ */

const ADMIN = (() => {
  const state = {
    tabActual: 'panel',
    filtroUsuarios: 'todos',
    busquedaUsuarios: '',
    usuarios: [],
    viajes: [],
    comisiones: [],
    configActiva: { id_configuracion: 1, porcentaje: 10, estado: 'ACTIVA' },
    historialConfig: [],
    usuariosRevelados: {},
    cargando: false
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  function formatoPesos(valor) {
    const num = Math.round(Number(valor) || 0);
    return '$ ' + num.toLocaleString('es-CO');
  }

  function formatoPct(valor) {
    const num = Number(valor);
    if (!isFinite(num)) return '10%';
    return num.toFixed(1).replace(/\.0$/, '') + '%';
  }

  function formatoFecha(fechaIso) {
    if (!fechaIso) return '—';
    const d = new Date(fechaIso);
    if (isNaN(d.getTime())) return String(fechaIso).slice(0, 10);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  function enmascararCorreo(correo) {
    const str = String(correo || '').trim();
    if (!str || !str.includes('@')) return str || '—';
    const [local, dominio] = str.split('@');
    const prefijo = local.slice(0, 3);
    return `${prefijo}•••@${dominio}`;
  }

  function enmascararTelefono(tel) {
    const limpio = String(tel || '').replace(/\D+/g, '');
    if (!limpio) return 'Sin teléfono registrado';
    if (limpio.length <= 5) return `${limpio.slice(0, 2)} ••••`;
    return `${limpio.slice(0, 3)} •••• ${limpio.slice(-2)}`;
  }

  function logoPlataforma(nombre) {
    const n = String(nombre || '').toLowerCase();
    if (n.includes('didi')) return 'img/didi.png';
    if (n.includes('indrive')) return 'img/indrive.png';
    return 'img/uber.png';
  }

  function nombrePlataforma(viaje) {
    if (viaje && viaje.oferta && viaje.oferta.plataforma && viaje.oferta.plataforma.nombre) {
      return viaje.oferta.plataforma.nombre;
    }
    if (viaje && viaje.plataforma) return String(viaje.plataforma);
    return 'Uber';
  }

  function destinoViaje(viaje) {
    if (viaje && viaje.oferta && viaje.oferta.busqueda && viaje.oferta.busqueda.destino) {
      return viaje.oferta.busqueda.destino;
    }
    if (viaje && viaje.destino) return viaje.destino;
    return 'Cartagena';
  }

  function origenViaje(viaje) {
    if (viaje && viaje.oferta && viaje.oferta.busqueda && viaje.oferta.busqueda.origen) {
      return viaje.oferta.busqueda.origen;
    }
    if (viaje && viaje.origen) return viaje.origen;
    return 'Cartagena';
  }

  function precioViaje(viaje) {
    if (!viaje) return 0;
    if (viaje.precio_final != null && Number(viaje.precio_final) > 0) {
      return Number(viaje.precio_final);
    }
    if (viaje.oferta && viaje.oferta.precio_estimado != null) {
      return Number(viaje.oferta.precio_estimado);
    }
    return 0;
  }

  function infoEstadoViaje(estadoRaw) {
    const e = String(estadoRaw || '').toUpperCase();
    if (e === 'COMPLETADO') return { label: 'Finalizado', cls: 'ok' };
    if (e === 'CANCELADO') return { label: 'Cancelado', cls: 'danger' };
    if (e === 'SOLICITADO') return { label: 'Solicitado', cls: 'info' };
    return { label: 'En curso', cls: 'info' };
  }

  function setAviso(id, texto, tipo = '') {
    const el = $(id);
    if (!el) return;
    if (!texto) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = texto;
    el.className = 'notice' + (tipo ? ' ' + tipo : '');
  }

  function obtenerPctVigenteNum() {
    const p = Number(state.configActiva && state.configActiva.porcentaje);
    if (isFinite(p) && p >= 0 && p <= 100) return p;
    return (typeof COMISION_PCT === 'number' ? COMISION_PCT * 100 : 10);
  }

  function calcularIngresosComisionTotal() {
    if (Array.isArray(state.comisiones) && state.comisiones.length > 0) {
      const suma = state.comisiones.reduce((acc, c) => {
        if (String(c.estado || '').toUpperCase() === 'ANULADA') return acc;
        if (c.monto_calculado != null && isFinite(Number(c.monto_calculado))) {
          return acc + Number(c.monto_calculado);
        }
        const precio = c.viaje ? precioViaje(c.viaje) : 0;
        const pct = Number(c.porcentaje_aplicado) || obtenerPctVigenteNum();
        return acc + (precio * pct) / 100;
      }, 0);
      if (suma > 0) return suma;
    }
    const pctActual = obtenerPctVigenteNum();
    return state.viajes
      .filter(v => String(v.estado || '').toUpperCase() === 'COMPLETADO')
      .reduce((acc, v) => acc + (precioViaje(v) * pctActual) / 100, 0);
  }

  /* ============ 1. Render Pestaña PANEL ============ */
  function renderPanel() {
    const pasajerosActivos = state.usuarios.filter(
      u => Number(u.id_rol) === 1 && String(u.estado || '').toUpperCase() === 'ACTIVO'
    ).length;
    const viajesCompletados = state.viajes.filter(
      v => String(v.estado || '').toUpperCase() === 'COMPLETADO'
    ).length;
    const ingresosComision = calcularIngresosComisionTotal();
    const pctVigente = obtenerPctVigenteNum();

    const elPas = $('kpiPasajerosActivos');
    if (elPas) elPas.textContent = String(pasajerosActivos);
    const elVia = $('kpiViajesFinalizados');
    if (elVia) elVia.textContent = String(viajesCompletados);
    const elIng = $('kpiIngresosComision');
    if (elIng) elIng.textContent = formatoPesos(ingresosComision);
    const elCom = $('kpiComisionVigente');
    if (elCom) elCom.textContent = formatoPct(pctVigente);

    const contRecientes = $('adminRecentTripsList');
    const badgeCount = $('adminRecentCount');
    if (badgeCount) badgeCount.textContent = state.viajes.length + ' viajes';
    if (!contRecientes) return;

    const recientes = state.viajes.slice(0, 8);
    if (!recientes.length) {
      contRecientes.innerHTML = '<div class="admin-empty">No hay viajes registrados todavía en el sistema.</div>';
      return;
    }

    contRecientes.innerHTML = recientes.map(v => {
      const plat = nombrePlataforma(v);
      const logo = logoPlataforma(plat);
      const destino = destinoViaje(v);
      const fecha = formatoFecha(v.fecha_hora_inicio || v.fecha_hora_fin || (v.oferta && v.oferta.fecha_hora_respuesta));
      const precio = formatoPesos(precioViaje(v));
      const badge = infoEstadoViaje(v.estado);

      return `<div class="admin-trip-row">
        <div class="admin-trip-logo-wrap">
          <img src="${esc(logo)}" alt="${esc(plat)}" class="admin-plat-img">
        </div>
        <div class="admin-trip-info">
          <b>${esc(destino)}</b>
          <span>${esc(fecha)} · ${esc(plat)}</span>
        </div>
        <div class="admin-trip-right">
          <b class="admin-trip-price">${esc(precio)}</b>
          <span class="admin-status-pill ${badge.cls}">${esc(badge.label)}</span>
        </div>
      </div>`;
    }).join('');
  }

  /* ============ 2. Render Pestaña USUARIOS ============ */
  function renderUsuarios() {
    const cont = $('adminUsersList');
    if (!cont) return;

    const inp = $('adminUserSearch');
    state.busquedaUsuarios = inp ? inp.value.trim().toLowerCase() : state.busquedaUsuarios;

    document.querySelectorAll('#adminUserChips .admin-chip').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filtro') === state.filtroUsuarios);
    });

    const filtrados = state.usuarios.filter(u => {
      const est = String(u.estado || 'ACTIVO').toUpperCase();
      if (state.filtroUsuarios === 'ACTIVO' && est !== 'ACTIVO') return false;
      if (state.filtroUsuarios === 'INACTIVO' && est === 'ACTIVO') return false;
      if (state.busquedaUsuarios) {
        const nom = String(u.nombre || '').toLowerCase();
        const cor = String(u.correo || '').toLowerCase();
        if (!nom.includes(state.busquedaUsuarios) && !cor.includes(state.busquedaUsuarios)) return false;
      }
      return true;
    });

    if (!filtrados.length) {
      cont.innerHTML = '<div class="admin-empty">No se encontraron usuarios con ese criterio.</div>';
      return;
    }

    cont.innerHTML = filtrados.map(u => {
      const esAdmin = Number(u.id_rol) === 2;
      const rolLabel = esAdmin ? 'Administrador' : 'Pasajero';
      const estadoUpper = String(u.estado || 'ACTIVO').toUpperCase();
      const esActivo = estadoUpper === 'ACTIVO';
      const iniciales = String(u.nombre || 'U')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(p => p.charAt(0).toUpperCase())
        .join('') || 'U';
      const nuevoEst = esActivo ? 'INACTIVO' : 'ACTIVO';
      const textoBtn = esActivo ? 'Inactivar cuenta' : 'Activar cuenta';
      const clsBtn = esActivo ? 'btn-outline-danger' : 'btn-outline-primary';
      const idNum = Number(u.id_usuario);
      const revelado = !!state.usuariosRevelados[idNum];
      const correoMostrado = revelado ? (u.correo || '—') : enmascararCorreo(u.correo);
      const telMostrado = revelado ? (u.telefono || 'Sin teléfono registrado') : enmascararTelefono(u.telefono);
      const svgOjo = revelado
        ? `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

      return `<div class="admin-user-card" data-user-id="${esc(u.id_usuario)}">
        <div class="admin-user-top">
          <div class="admin-user-avatar ${esAdmin ? 'is-admin' : ''}">${esc(iniciales)}</div>
          <div class="admin-user-main">
            <div class="admin-user-name-row">
              <b>${esc(u.nombre)}</b>
              <span class="admin-user-id-badge">ID #${esc(u.id_usuario)}</span>
            </div>
            <span>${esc(correoMostrado)}</span>
            <small>${esc(telMostrado)} · ${esc(rolLabel)}</small>
          </div>
          <div class="admin-user-right-tools">
            <button type="button" class="admin-eye-btn ${revelado ? 'active' : ''}"
              onclick="ADMIN.alternarDatosContactoUsuario(${idNum})"
              title="Mostrar/ocultar datos de contacto"
              aria-label="Mostrar/ocultar datos de contacto">
              ${svgOjo}
            </button>
            <span class="admin-status-pill ${esActivo ? 'ok' : 'danger'}">${esc(estadoUpper)}</span>
          </div>
        </div>
        ${esAdmin ? '' : `<div class="admin-user-actions">
          <button type="button" class="btn btn-sm admin-toggle-user-btn ${clsBtn}"
            onclick="ADMIN.cambiarEstadoUsuario(${idNum}, '${nuevoEst}')">
            ${esc(textoBtn)}
          </button>
        </div>`}
      </div>`;
    }).join('');
  }

  function alternarDatosContactoUsuario(idUsuario) {
    const idNum = Number(idUsuario);
    if (!isFinite(idNum)) return;
    state.usuariosRevelados[idNum] = !state.usuariosRevelados[idNum];
    renderUsuarios();
  }

  function setFiltroUsuarios(filtro) {
    state.filtroUsuarios = filtro || 'todos';
    renderUsuarios();
  }

  function filtrarUsuarios() {
    renderUsuarios();
  }

  async function cambiarEstadoUsuario(idUsuario, nuevoEstado) {
    setAviso('adminUsersNotice', '');
    try {
      const actualizado = await window.apiService.cambiarEstadoUsuario(idUsuario, nuevoEstado);
      state.usuarios = state.usuarios.map(u =>
        Number(u.id_usuario) === Number(idUsuario)
          ? Object.assign({}, u, actualizado || { estado: nuevoEstado })
          : u
      );
      renderPanel();
      renderUsuarios();
      setAviso(
        'adminUsersNotice',
        `Estado del usuario #${idUsuario} actualizado a ${nuevoEstado}.`,
        'success'
      );
    } catch (err) {
      setAviso(
        'adminUsersNotice',
        (err && err.message) || 'No se pudo cambiar el estado del usuario.',
        'error'
      );
    }
  }

  /* ============ 3. Render Pestaña COMISIÓN ============ */
  function renderComision() {
    const pct = obtenerPctVigenteNum();
    const elActual = $('adminComisionActualVal');
    if (elActual) elActual.textContent = formatoPct(pct);

    const inp = $('adminNuevoPorcentaje');
    if (inp && !inp.dataset.editado) {
      inp.value = String(pct);
    }
    actualizarPreviewComision();

    const contHist = $('adminHistConfigList');
    if (contHist) {
      const listaH = state.historialConfig.length
        ? state.historialConfig
        : (state.configActiva ? [state.configActiva] : []);
      if (!listaH.length) {
        contHist.innerHTML = '<div class="admin-empty">Sin historial de configuraciones.</div>';
      } else {
        contHist.innerHTML = listaH.map(cfg => {
          const activa = String(cfg.estado || '').toUpperCase() === 'ACTIVA';
          const pctNum = Number(cfg.porcentaje);
          const accionDerecha = activa
            ? '<span class="admin-status-pill ok">ACTIVA</span>'
            : `<button type="button" class="btn-activar-config" onclick="ADMIN.activarConfiguracionHistorica(${isFinite(pctNum) ? pctNum : 0})">Activar</button>`;
          return `<div class="admin-hist-row">
            <div>
              <b>${esc(formatoPct(cfg.porcentaje))}</b>
              <span>Desde ${esc(formatoFecha(cfg.fecha_inicio))} · Admin #${esc(cfg.id_administrador || 1)}</span>
            </div>
            ${accionDerecha}
          </div>`;
        }).join('');
      }
    }

    const contCom = $('adminComisionesViajesList');
    if (contCom) {
      if (!state.comisiones.length) {
        contCom.innerHTML = '<div class="admin-empty">Aún no hay comisiones generadas por viajes completados.</div>';
      } else {
        contCom.innerHTML = state.comisiones.slice(0, 15).map(c => {
          const tasaAplicada = Number(c.porcentaje_aplicado) || pct;
          const monto = c.monto_calculado != null
            ? Number(c.monto_calculado)
            : ((c.viaje ? precioViaje(c.viaje) : 0) * tasaAplicada) / 100;
          const precioFinal = (c.viaje && precioViaje(c.viaje) > 0)
            ? precioViaje(c.viaje)
            : (tasaAplicada > 0 && monto > 0 ? Math.round((monto * 100) / tasaAplicada) : 0);
          const plat = c.viaje ? nombrePlataforma(c.viaje) : '';
          const estCom = String(c.estado || 'GENERADA').toUpperCase();
          const clsCom = estCom === 'ANULADA' ? 'danger' : 'ok';
          return `<div class="admin-hist-row">
            <div>
              <b>Comisión #${esc(c.id_comision)} · Viaje #${esc(c.id_viaje)}${plat ? ' · ' + esc(plat) : ''}</b>
              <span>${esc(formatoFecha(c.fecha_generacion))} · Tarifa base: ${esc(formatoPesos(precioFinal))} · Tasa: ${esc(formatoPct(c.porcentaje_aplicado))}</span>
            </div>
            <div class="admin-trip-right">
              <b class="admin-trip-price">${esc(formatoPesos(monto))}</b>
              <span class="admin-status-pill ${clsCom}">${esc(estCom)}</span>
            </div>
          </div>`;
        }).join('');
      }
    }
  }

  function actualizarPreviewComision() {
    const inp = $('adminNuevoPorcentaje');
    const prev = $('adminComisionPreview');
    if (!prev) return;
    if (inp) inp.dataset.editado = '1';
    const raw = inp ? Number(inp.value) : obtenerPctVigenteNum();
    const pct = isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 0;
    const baseEjemplo = 10000;
    const comisionEj = Math.round(baseEjemplo * (pct / 100));
    const netoEj = baseEjemplo - comisionEj;
    prev.innerHTML = `En un viaje de <b>$ 10.000</b>: comisión UniX <b>${formatoPesos(comisionEj)}</b> (${formatoPct(pct)}) · neto conductor <b>${formatoPesos(netoEj)}</b>`;
  }

  async function guardarComision() {
    setAviso('adminComisionNotice', '');
    const inp = $('adminNuevoPorcentaje');
    const btn = $('btnGuardarComision');
    const pct = inp ? Number(inp.value) : NaN;
    if (!isFinite(pct) || pct < 0 || pct > 100) {
      setAviso('adminComisionNotice', 'Ingresa un porcentaje válido entre 0 y 100.', 'error');
      return;
    }

    const ses = (typeof AUTH !== 'undefined' && AUTH.sesion) ? AUTH.sesion() : null;
    const idAdmin = (ses && ses.id_usuario) ? Number(ses.id_usuario) : 5;

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Actualizando…';
    }
    try {
      const nueva = await window.apiService.crearConfiguracionComision({
        porcentaje: pct,
        id_administrador: idAdmin
      });
      state.configActiva = nueva || { id_configuracion: Date.now(), porcentaje: pct, estado: 'ACTIVA', id_administrador: idAdmin };
      COMISION_PCT = pct / 100;
      if (typeof window !== 'undefined') window.COMISION_PCT = COMISION_PCT;
      if (inp) delete inp.dataset.editado;

      await recargarDatos(true);
      setAviso('adminComisionNotice', `Comisión actualizada correctamente a ${formatoPct(pct)}.`, 'success');
    } catch (err) {
      setAviso('adminComisionNotice', (err && err.message) || 'No se pudo actualizar la comisión.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Actualizar comisión';
      }
    }
  }

  async function activarConfiguracionHistorica(porcentaje) {
    const pct = Number(porcentaje);
    if (!isFinite(pct) || pct < 0 || pct > 100) return;
    const inp = $('adminNuevoPorcentaje');
    if (inp) {
      inp.value = String(pct);
    }
    actualizarPreviewComision();
    await guardarComision();
  }

  /* ============ 4. Render Pestaña REPORTES ============ */
  function renderReportes() {
    const completados = state.viajes.filter(v => String(v.estado || '').toUpperCase() === 'COMPLETADO');
    const cancelados = state.viajes.filter(v => String(v.estado || '').toUpperCase() === 'CANCELADO');
    const enCurso = state.viajes.filter(v => {
      const e = String(v.estado || '').toUpperCase();
      return e !== 'COMPLETADO' && e !== 'CANCELADO';
    });

    const totalFacturado = completados.reduce((a, v) => a + precioViaje(v), 0);
    const tarifaProm = completados.length ? totalFacturado / completados.length : 0;

    const elFin = $('repTotalFinalizados');
    if (elFin) elFin.textContent = String(completados.length);
    const elCur = $('repTotalEnCurso');
    if (elCur) elCur.textContent = String(enCurso.length);
    const elCan = $('repTotalCancelados');
    if (elCan) elCan.textContent = String(cancelados.length);
    const elProm = $('repTarifaPromedio');
    if (elProm) elProm.textContent = formatoPesos(tarifaProm);

    // Desglose por plataforma (Uber, DiDi, inDrive)
    const contPlat = $('adminRepPlataformas');
    if (contPlat) {
      const pctVigente = obtenerPctVigenteNum();
      const plataformasBase = ['Uber', 'DiDi', 'inDrive'];
      const totalComp = completados.length || 1;

      contPlat.innerHTML = plataformasBase.map(nombrePlat => {
        const viajesPlat = completados.filter(
          v => nombrePlataforma(v).toLowerCase() === nombrePlat.toLowerCase()
        );
        const cant = viajesPlat.length;
        const participacion = completados.length ? Math.round((cant / totalComp) * 100) : 0;
        const facturado = viajesPlat.reduce((a, v) => a + precioViaje(v), 0);
        const comisionPlat = Math.round((facturado * pctVigente) / 100);
        const logo = logoPlataforma(nombrePlat);

        return `<div class="admin-plat-report-item">
          <div class="admin-plat-report-head">
            <div class="admin-plat-report-left">
              <div class="admin-trip-logo-wrap">
                <img src="${esc(logo)}" alt="${esc(nombrePlat)}" class="admin-plat-img">
              </div>
              <div class="admin-plat-report-txt">
                <b>${esc(nombrePlat)}</b>
                <span>${cant} ${cant === 1 ? 'viaje finalizado' : 'viajes finalizados'} (${participacion}%)</span>
              </div>
            </div>
            <div class="admin-trip-right">
              <b class="admin-trip-price">${esc(formatoPesos(facturado))}</b>
              <small class="admin-comm-sub">Comisión: ${esc(formatoPesos(comisionPlat))}</small>
            </div>
          </div>
          <div class="admin-bar-track">
            <div class="admin-bar-fill" style="width:${participacion}%;"></div>
          </div>
        </div>`;
      }).join('');
    }

    // Ranking Top 5 destinos más solicitados
    const contDest = $('adminRepDestinos');
    if (contDest) {
      const conteo = {};
      state.viajes.forEach(v => {
        const d = destinoViaje(v);
        if (!d) return;
        conteo[d] = (conteo[d] || 0) + 1;
      });
      const ranking = Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (!ranking.length) {
        contDest.innerHTML = '<div class="admin-empty">Sin datos de destinos solicitados.</div>';
      } else {
        const maxViajes = ranking[0][1] || 1;
        contDest.innerHTML = ranking.map(([barrio, count], idx) => {
          const pctBarra = Math.max(12, Math.round((count / maxViajes) * 100));
          return `<div class="admin-dest-rank-item">
            <div class="admin-dest-rank-top">
              <span><b>#${idx + 1}</b> ${esc(barrio)}</span>
              <b>${count} ${count === 1 ? 'viaje' : 'viajes'}</b>
            </div>
            <div class="admin-bar-track">
              <div class="admin-bar-fill" style="width:${pctBarra}%;"></div>
            </div>
          </div>`;
        }).join('');
      }
    }
  }

  function renderTodo() {
    renderPanel();
    renderUsuarios();
    renderComision();
    renderReportes();
  }

  async function recargarDatos(silencioso = false) {
    if (!silencioso) setAviso('adminNotice', '');
    state.cargando = true;
    try {
      const [resUsr, resVia, resCom, resAct, resHist] = await Promise.allSettled([
        window.apiService.listarUsuarios(),
        window.apiService.listarTodosLosViajes(),
        window.apiService.listarComisiones(),
        window.apiService.obtenerComisionActiva(),
        window.apiService.obtenerHistorialConfigComision()
      ]);

      if (resUsr.status === 'fulfilled' && Array.isArray(resUsr.value)) {
        state.usuarios = resUsr.value;
      }
      if (resVia.status === 'fulfilled' && Array.isArray(resVia.value)) {
        state.viajes = resVia.value;
      }
      if (resCom.status === 'fulfilled' && Array.isArray(resCom.value)) {
        state.comisiones = resCom.value;
      }
      if (resAct.status === 'fulfilled' && resAct.value && resAct.value.porcentaje != null) {
        state.configActiva = resAct.value;
        const p = Number(resAct.value.porcentaje);
        if (isFinite(p) && p >= 0 && p <= 100) {
          COMISION_PCT = p / 100;
          if (typeof window !== 'undefined') window.COMISION_PCT = COMISION_PCT;
        }
      }
      if (resHist.status === 'fulfilled' && Array.isArray(resHist.value)) {
        state.historialConfig = resHist.value;
      }
    } catch (_) {
    } finally {
      state.cargando = false;
      renderTodo();
    }
  }

  function irATab(tabName) {
    const t = ['panel', 'usuarios', 'comision', 'reportes'].includes(tabName) ? tabName : 'panel';
    state.tabActual = t;
    const mapaIds = {
      panel: 'adminTabPanel',
      usuarios: 'adminTabUsuarios',
      comision: 'adminTabComision',
      reportes: 'adminTabReportes'
    };
    Object.entries(mapaIds).forEach(([k, id]) => {
      const el = $(id);
      if (el) {
        el.classList.toggle('hidden', k !== t);
        el.classList.toggle('active', k === t);
      }
    });
    document.querySelectorAll('#adminBottomNav .admin-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-admin-tab') === t);
    });
    if (typeof window !== 'undefined' && window.scrollTo) {
      try { window.scrollTo(0, 0); } catch (_) {}
    }
  }

  function abrir() {
    ['cuentaOverlay', 'pickerOverlay', 'origenOverlay', 'cancelOverlay', 'masInfoOverlay'].forEach(id => {
      if (typeof UI !== 'undefined' && UI.ocultar) UI.ocultar(id);
    });
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.body.classList.remove('on-login', 'auth-ok');
    document.body.classList.add('admin-mode');

    const view = $('adminAppView');
    if (view) view.classList.remove('hidden');

    irATab('panel');
    recargarDatos(true);
  }

  async function abrirPerfilAdmin() {
    setAviso('adminPerfilNotice', '');
    const overlay = $('adminPerfilOverlay');
    if (overlay) overlay.classList.remove('hidden');

    const ses = (typeof AUTH !== 'undefined' && AUTH.sesion) ? AUTH.sesion() : null;
    const idAdmin = (ses && ses.id_usuario) ? Number(ses.id_usuario) : 5;

    const badge = $('adminPerfilRolBadge');
    if (badge) badge.textContent = `Administrador UniX (ID #${idAdmin})`;

    const poblarCampos = (datos) => {
      if (!datos) return;
      const inpNom = $('adminPerfilNombre');
      const inpCor = $('adminPerfilCorreo');
      const inpTel = $('adminPerfilTelefono');
      const inpNac = $('adminPerfilNacimiento');
      if (inpNom && datos.nombre != null) inpNom.value = String(datos.nombre);
      if (inpCor && datos.email != null) inpCor.value = String(datos.email);
      if (inpTel && datos.telefono != null) inpTel.value = String(datos.telefono);
      if (inpNac && datos.fecha_nacimiento != null) {
        inpNac.value = String(datos.fecha_nacimiento).slice(0, 10);
      }
    };

    poblarCampos(ses || {});

    if (window.apiService && typeof window.apiService.obtenerPerfil === 'function') {
      try {
        const perfilRemoto = await window.apiService.obtenerPerfil(idAdmin);
        if (perfilRemoto) {
          poblarCampos(perfilRemoto);
        }
      } catch (e) {
        console.warn('[ADMIN] No se pudo refrescar perfil desde API:', e && e.message);
      }
    }
  }

  function cerrarPerfilAdmin() {
    const overlay = $('adminPerfilOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  async function guardarPerfilAdmin() {
    setAviso('adminPerfilNotice', '');
    const inpNom = $('adminPerfilNombre');
    const inpTel = $('adminPerfilTelefono');
    const inpNac = $('adminPerfilNacimiento');
    const btn = $('btnGuardarPerfilAdmin');

    const nombre = inpNom ? inpNom.value.trim() : '';
    const telefono = inpTel ? inpTel.value.trim() : '';
    const fecha_nacimiento = inpNac && inpNac.value ? inpNac.value.trim() : null;

    if (!nombre || nombre.length < 2) {
      setAviso('adminPerfilNotice', 'Ingresa un nombre válido para el administrador.', 'error');
      return;
    }

    const ses = (typeof AUTH !== 'undefined' && AUTH.sesion) ? AUTH.sesion() : null;
    const idAdmin = (ses && ses.id_usuario) ? Number(ses.id_usuario) : 5;

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Guardando…';
    }
    try {
      const payload = { nombre, telefono };
      if (fecha_nacimiento) payload.fecha_nacimiento = fecha_nacimiento;
      const actualizado = await window.apiService.actualizarPerfil(idAdmin, payload);

      if (typeof AUTH !== 'undefined' && typeof AUTH.actualizarSesion === 'function') {
        AUTH.actualizarSesion({
          nombre: (actualizado && actualizado.nombre) || nombre,
          telefono: (actualizado && actualizado.telefono) || telefono,
          fecha_nacimiento: (actualizado && actualizado.fecha_nacimiento) || fecha_nacimiento
        });
      }

      const idxU = state.usuarios.findIndex(u => Number(u.id_usuario) === idAdmin);
      if (idxU >= 0) {
        state.usuarios[idxU] = Object.assign({}, state.usuarios[idxU], payload, actualizado || {});
        renderUsuarios();
      }

      setAviso('adminPerfilNotice', 'Perfil del administrador actualizado correctamente.', 'success');
    } catch (err) {
      setAviso('adminPerfilNotice', (err && err.message) || 'No se pudo actualizar el perfil.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Guardar cambios';
      }
    }
  }

  function ocultar() {
    cerrarPerfilAdmin();
    state.usuariosRevelados = {};
    const view = $('adminAppView');
    if (view) view.classList.add('hidden');
    document.body.classList.remove('admin-mode');
  }

  function cerrarSesion() {
    ocultar();
    if (typeof AUTH_UI !== 'undefined' && typeof AUTH_UI.salir === 'function') {
      AUTH_UI.salir();
      return;
    }
    if (typeof UI !== 'undefined' && typeof UI.cerrarSesion === 'function') {
      UI.cerrarSesion();
    }
  }

  return {
    abrir,
    ocultar,
    irATab,
    recargarDatos,
    setFiltroUsuarios,
    filtrarUsuarios,
    cambiarEstadoUsuario,
    alternarDatosContactoUsuario,
    enmascararCorreo,
    enmascararTelefono,
    actualizarPreviewComision,
    guardarComision,
    activarConfiguracionHistorica,
    abrirPerfilAdmin,
    cerrarPerfilAdmin,
    guardarPerfilAdmin,
    cerrarSesion,
    get state() { return state; }
  };
})();

if (typeof window !== 'undefined') {
  window.ADMIN = ADMIN;
}
