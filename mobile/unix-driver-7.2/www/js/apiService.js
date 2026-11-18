'use strict';
/* ============================================================
   UniX Driver · Cliente HTTP Centralizado para API REST
   ------------------------------------------------------------
   Arquitectura:
   - Consume el Backend FastAPI a través del endpoint inyectado
     dinámicamente desde `.env` (`window.UNIX_API_URL`), sin
     quemar direcciones IP públicas en el código fuente.
   - Si `window.UNIX_API_URL` está definido, tiene prioridad
     absoluta sobre cualquier URL antigua en `localStorage` y
     sincroniza `localStorage` automáticamente.
   - Control de timeout mediante AbortController.
   - Compatible con WebView de Capacitor, navegador y JSDOM.
   ============================================================ */

(function (global) {
  const LS_API_URL = 'unixdriver.api.url';
  const DEFAULT_API_URL = 'http://localhost:8000';

  function obtenerConfigApi() {
    const cfg = (global.UNIX_CONFIG && global.UNIX_CONFIG.api) || {};
    const envUrl = (typeof global.UNIX_API_URL === 'string' && global.UNIX_API_URL.trim())
      ? global.UNIX_API_URL.trim().replace(/\/+$/, '')
      : null;

    if (envUrl) {
      try {
        if (global.localStorage && global.localStorage.getItem(LS_API_URL) !== envUrl) {
          global.localStorage.setItem(LS_API_URL, envUrl);
        }
      } catch (_) {}
      return {
        url: envUrl,
        fallbackUrls: [],
        timeoutMs: Number(cfg.timeoutMs) || 7000
      };
    }

    let guardada = null;
    try { guardada = global.localStorage ? global.localStorage.getItem(LS_API_URL) : null; } catch (_) {}

    const base = (guardada || cfg.baseUrl || DEFAULT_API_URL).replace(/\/+$/, '');
    return {
      url: base,
      fallbackUrls: [],
      timeoutMs: Number(cfg.timeoutMs) || 7000
    };
  }

  let urlActiva = obtenerConfigApi().url;
  let estadoConexion = { conectado: false, url: urlActiva, ultimaVerificacion: null };
  global.UNIX_API_URL = urlActiva;

  /**
   * Realiza una petición HTTP con timeout hacia el endpoint configurado.
   * Devuelve siempre un objeto estructurado: { ok, status, data, redError, url }
   */
  async function peticion(ruta, opciones = {}) {
    const cfg = obtenerConfigApi();
    const host = cfg.url || urlActiva || DEFAULT_API_URL;
    const metodo = (opciones.method || 'GET').toUpperCase();
    const timeoutMs = Number(opciones.timeoutMs) || cfg.timeoutMs;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;

    try {
      const fetchOpts = {
        method: metodo,
        headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, opciones.headers || {})
      };
      if (opciones.body != null) {
        fetchOpts.body = typeof opciones.body === 'string' ? opciones.body : JSON.stringify(opciones.body);
      }
      if (ctrl) fetchOpts.signal = ctrl.signal;

      const resp = await fetch(host + ruta, fetchOpts);
      let data = null;
      try { data = await resp.json(); } catch (_) { data = null; }

      urlActiva = host;
      global.UNIX_API_URL = host;
      estadoConexion = { conectado: true, url: host, ultimaVerificacion: new Date().toISOString() };

      return { ok: resp.ok, status: resp.status, data, redError: false, url: host };
    } catch (_) {
      estadoConexion = { conectado: false, url: host, ultimaVerificacion: new Date().toISOString() };
      return { ok: false, status: 0, data: null, redError: true, url: host };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function extraerError(res, mensajePorDefecto) {
    if (res && res.data && res.data.detail) {
      if (typeof res.data.detail === 'string') return res.data.detail;
      if (Array.isArray(res.data.detail) && res.data.detail[0] && res.data.detail[0].msg) {
        return res.data.detail[0].msg;
      }
    }
    return mensajePorDefecto;
  }

  const apiService = {
    get baseUrl() { return urlActiva; },
    get estado() { return estadoConexion; },

    setBaseUrl(nuevaUrl) {
      if (!nuevaUrl) return urlActiva;
      urlActiva = String(nuevaUrl).trim().replace(/\/+$/, '');
      global.UNIX_API_URL = urlActiva;
      try { if (global.localStorage) global.localStorage.setItem(LS_API_URL, urlActiva); } catch (_) {}
      return urlActiva;
    },

    peticion,

    // 0. Healthcheck del servidor AWS EC2 + RDS
    async verificarSalud() {
      const res = await peticion('/health', { method: 'GET', timeoutMs: 4500 });
      const ok = !!(res.ok && res.data && res.data.status === 'ok');
      return { ok, url: res.url, data: res.data };
    },

    // 1. Iniciar sesión (DSS02P -> POST /usuarios/login)
    async login(correo, contrasena) {
      const res = await peticion('/usuarios/login', {
        method: 'POST',
        body: { correo: String(correo || '').trim().toLowerCase(), contrasena: String(contrasena || '') }
      });
      if (!res.ok) throw new Error(extraerError(res, 'Error al iniciar sesión'));
      return res.data;
    },

    // 2. Registrar usuario (DSS01P -> POST /usuarios/registro)
    async registrar(datosUsuario) {
      const res = await peticion('/usuarios/registro', {
        method: 'POST',
        body: {
          nombre: String(datosUsuario.nombre || '').trim(),
          correo: String(datosUsuario.correo || datosUsuario.email || '').trim().toLowerCase(),
          contrasena: String(datosUsuario.contrasena || datosUsuario.pass || ''),
          telefono: datosUsuario.telefono || null,
          fecha_nacimiento: datosUsuario.fecha_nacimiento || null,
          id_rol: Number(datosUsuario.id_rol) || 1
        }
      });
      if (!res.ok) throw new Error(extraerError(res, 'Error al registrar usuario'));
      return res.data;
    },

    // 3. Consultar y actualizar perfil (DSS03P -> GET/PUT /usuarios/{id_usuario})
    async obtenerPerfil(idUsuario) {
      const res = await peticion(`/usuarios/${encodeURIComponent(idUsuario)}`, { method: 'GET' });
      if (!res.ok) throw new Error(extraerError(res, 'No se pudo obtener el perfil del usuario'));
      return res.data;
    },

    async actualizarPerfil(idUsuario, datos) {
      const res = await peticion(`/usuarios/${encodeURIComponent(idUsuario)}`, {
        method: 'PUT',
        body: datos
      });
      if (!res.ok) throw new Error(extraerError(res, 'No se pudo actualizar el perfil'));
      return res.data;
    },

    // 4. Obtener catálogo de los 212 barrios de Cartagena desde AWS S3 (GET /busquedas/barrios)
    async obtenerBarrios(query = '') {
      const ruta = query
        ? `/busquedas/barrios?q=${encodeURIComponent(query)}`
        : '/busquedas/barrios';
      const res = await peticion(ruta, { method: 'GET', timeoutMs: 6000 });
      if (!res.ok || !Array.isArray(res.data)) {
        throw new Error(extraerError(res, 'No se pudieron cargar los barrios desde AWS S3'));
      }
      return res.data;
    },

    // 5. Realizar búsqueda unificada y comparar ofertas Uber, DiDi e inDrive (DSS04P -> POST /busquedas/)
    async buscarOfertas(origen, destino, idUsuario = 1) {
      const res = await peticion('/busquedas/', {
        method: 'POST',
        body: {
          origen: String(origen || '').trim(),
          destino: String(destino || '').trim(),
          id_usuario: Number(idUsuario) || 1
        }
      });
      if (!res.ok) throw new Error(extraerError(res, 'Error al buscar ofertas en el servidor'));
      return res.data;
    },

    // 6. Consultar una búsqueda registrada por ID (GET /busquedas/{id_busqueda})
    async obtenerBusqueda(idBusqueda) {
      const res = await peticion(`/busquedas/${encodeURIComponent(idBusqueda)}`, { method: 'GET' });
      if (!res.ok) throw new Error(extraerError(res, 'No se encontró la búsqueda solicitada'));
      return res.data;
    },

    // 7. Solicitar viaje seleccionando una oferta (DSS05P -> POST /viajes/solicitar)
    async solicitarViaje(idOferta) {
      const res = await peticion('/viajes/solicitar', {
        method: 'POST',
        body: { id_oferta: Number(idOferta) }
      });
      if (!res.ok) throw new Error(extraerError(res, 'Error al solicitar el viaje'));
      return res.data;
    },

    // 8. Actualizar estado del viaje y liquidar comisión en COMPLETADO (PATCH /viajes/{id_viaje}/estado)
    async actualizarEstadoViaje(idViaje, estado, precioFinal = null) {
      const cuerpo = { estado: String(estado || '').toUpperCase() };
      if (precioFinal != null && isFinite(Number(precioFinal))) {
        cuerpo.precio_final = Number(precioFinal);
      }
      const res = await peticion(`/viajes/${encodeURIComponent(idViaje)}/estado`, {
        method: 'PATCH',
        body: cuerpo
      });
      if (!res.ok) throw new Error(extraerError(res, 'No se pudo actualizar el estado del viaje'));
      return res.data;
    },

    // 9. Consultar historial de viajes del pasajero desde AWS RDS (DSS06P -> GET /viajes/usuario/{id_usuario})
    async obtenerHistorialViajes(idUsuario) {
      const res = await peticion(`/viajes/usuario/${encodeURIComponent(idUsuario)}`, {
        method: 'GET',
        timeoutMs: 6000
      });
      if (!res.ok || !Array.isArray(res.data)) {
        throw new Error(extraerError(res, 'Error al consultar el historial de viajes'));
      }
      return res.data;
    },

    // 10. Consultar configuración de comisión vigente (GET /comisiones/configuracion/activa)
    async obtenerComisionActiva() {
      const res = await peticion('/comisiones/configuracion/activa', {
        method: 'GET',
        timeoutMs: 5000
      });
      if (!res.ok || !res.data || res.data.porcentaje == null) {
        throw new Error(extraerError(res, 'No se pudo obtener la comisión activa'));
      }
      return res.data;
    },

    // 11. Listar usuarios para el Panel de Administrador (GET /usuarios/)
    async listarUsuarios(filtros = {}) {
      const params = [];
      if (filtros && filtros.id_rol != null && filtros.id_rol !== '') {
        params.push('id_rol=' + encodeURIComponent(filtros.id_rol));
      }
      if (filtros && filtros.estado) {
        params.push('estado=' + encodeURIComponent(String(filtros.estado).trim().toUpperCase()));
      }
      const ruta = params.length ? `/usuarios/?${params.join('&')}` : '/usuarios/';
      const res = await peticion(ruta, { method: 'GET', timeoutMs: 6000 });
      if (!res.ok || !Array.isArray(res.data)) {
        throw new Error(extraerError(res, 'No se pudo obtener la lista de usuarios'));
      }
      return res.data;
    },

    // 12. Cambiar estado de un usuario (PATCH /usuarios/{id_usuario}/estado)
    async cambiarEstadoUsuario(idUsuario, estado) {
      const res = await peticion(`/usuarios/${encodeURIComponent(idUsuario)}/estado`, {
        method: 'PATCH',
        body: { estado: String(estado || '').trim().toUpperCase() }
      });
      if (!res.ok) {
        throw new Error(extraerError(res, 'No se pudo actualizar el estado del usuario'));
      }
      return res.data;
    },

    // 13. Listar todos los viajes del sistema (GET /viajes/)
    async listarTodosLosViajes(estado = null) {
      const ruta = estado
        ? `/viajes/?estado=${encodeURIComponent(String(estado).trim().toUpperCase())}`
        : '/viajes/';
      const res = await peticion(ruta, { method: 'GET', timeoutMs: 6000 });
      if (!res.ok || !Array.isArray(res.data)) {
        throw new Error(extraerError(res, 'No se pudo obtener el listado de viajes'));
      }
      return res.data;
    },

    // 14. Listar todas las comisiones generadas (GET /comisiones/)
    async listarComisiones() {
      const res = await peticion('/comisiones/', { method: 'GET', timeoutMs: 6000 });
      if (!res.ok || !Array.isArray(res.data)) {
        throw new Error(extraerError(res, 'No se pudo obtener el listado de comisiones'));
      }
      return res.data;
    },

    // 15. Consultar historial de configuraciones de comisión (GET /comisiones/configuracion/historial)
    async obtenerHistorialConfigComision() {
      const res = await peticion('/comisiones/configuracion/historial', {
        method: 'GET',
        timeoutMs: 6000
      });
      if (!res.ok || !Array.isArray(res.data)) {
        throw new Error(extraerError(res, 'No se pudo obtener el historial de comisiones'));
      }
      return res.data;
    },

    // 16. Crear nueva configuración de comisión activa (POST /comisiones/configuracion)
    async crearConfiguracionComision({ porcentaje, id_administrador }) {
      const res = await peticion('/comisiones/configuracion', {
        method: 'POST',
        body: {
          porcentaje: Number(porcentaje),
          fecha_inicio: new Date().toISOString(),
          estado: 'ACTIVA',
          id_administrador: Number(id_administrador)
        }
      });
      if (!res.ok) {
        throw new Error(extraerError(res, 'No se pudo guardar la nueva configuración de comisión'));
      }
      return res.data;
    }
  };

  global.apiService = apiService;
  global.API_SERVICE = apiService;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { apiService };
  }
})(typeof window !== 'undefined' ? window : globalThis);
