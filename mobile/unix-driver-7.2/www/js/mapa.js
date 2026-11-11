'use strict';
/* ============================================================
   UniX Driver · Mapas, rutas y geocodificación
   ------------------------------------------------------------
   Proveedor conmutable (config/tarifas.js → mapas.proveedor):
     'osm'    → OSRM para rutas, Nominatim para direcciones,
                teselas de OpenStreetMap. Sin claves.
     'google' → Directions API + Geocoding API (requiere apiKey).

   Reglas:
   · `km` es SIEMPRE distancia por carretera. Si el proveedor
     falla, `ok` queda en false y `km` en null: nunca se usa la
     distancia en línea recta como si fuera la del recorrido.
   · `lineaRectaKm` se informa aparte y solo como referencia.
   ============================================================ */

const MAPA = (() => {
  const CFG = () => (window.UNIX_CONFIG && UNIX_CONFIG.mapas) || {};
  const OSM = () => CFG().osm || {};
  const GOOGLE = () => CFG().google || {};
  const proveedor = () => (CFG().proveedor === 'google' && GOOGLE().apiKey ? 'google' : 'osm');
  const cache = new Map();
  const cacheGeo = new Map();
  const inst = {};

  const hayLeaflet = () => typeof window.L !== 'undefined' && window.L && window.L.map;

  const haversine = (a, b, c, d) => {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(c - a), dLon = rad(d - b);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const r1 = n => Math.round(n * 10) / 10;

  /* ---------------- Mapa base ---------------- */
  function crear(id) {
    if (!hayLeaflet()) return null;
    if (inst[id]) return inst[id];
    const el = document.getElementById(id);
    if (!el) return null;
    try {
      const o = OSM();
      const map = L.map(el, { zoomControl: false, attributionControl: true, preferCanvas: true })
        .setView([10.4236, -75.5253], 12);
      const capa = L.tileLayer(o.teselas || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, minZoom: 9, attribution: o.atribucion || '© OpenStreetMap', crossOrigin: true,
        keepBuffer: 3, updateWhenIdle: false
      });
      let errores = 0;
      capa.on('tileerror', () => {
        errores += 1;
        if (errores === 3 && o.teselasAlt) {
          try { map.removeLayer(capa); } catch (_) {}
          L.tileLayer(o.teselasAlt, { maxZoom: 19, minZoom: 9, attribution: o.atribucion || '© OpenStreetMap' }).addTo(map);
        }
      });
      capa.addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      inst[id] = { map, capa: null, marcas: [] };
      setTimeout(() => { try { map.invalidateSize(); } catch (_) {} }, 220);
      return inst[id];
    } catch (e) {
      console.warn('Mapa no disponible:', e.message);
      return null;
    }
  }

  function limpiar(o) {
    if (!o) return;
    if (o.capa) { try { o.map.removeLayer(o.capa); } catch (_) {} o.capa = null; }
    o.marcas.forEach(m => { try { o.map.removeLayer(m); } catch (_) {} });
    o.marcas = [];
  }

  const icono = (texto, clase) => L.divIcon({
    className: 'pin-mapa', iconSize: [26, 26], iconAnchor: [13, 13],
    html: '<div class="pin-mapa-i ' + clase + '">' + texto + '</div>'
  });

  function punto(v) {
    return v && v.lat != null && v.lon != null ? [Number(v.lat), Number(v.lon)] : null;
  }

  function dibujar(id, origen, destino, ruta) {
    const o = crear(id);
    if (!o) return false;
    limpiar(o);
    const a = punto(origen), b = punto(destino);
    const pts = (ruta && ruta.geometria || []).map(p => [p[1], p[0]]);
    if (pts.length > 1) {
      o.capa = L.polyline(pts, { color: '#1d4fd7', weight: 5, opacity: .92, lineJoin: 'round' }).addTo(o.map);
    }
    if (a) o.marcas.push(L.marker(a, { icon: icono('A', 'a') }).addTo(o.map)
      .bindPopup('Origen · ' + ((origen && origen.nombre) || '')));
    if (b) o.marcas.push(L.marker(b, { icon: icono('B', 'b') }).addTo(o.map)
      .bindPopup((destino && destino.nombre) || 'Destino'));
    try {
      const caja = [a, b].filter(Boolean);
      if (caja.length === 2) o.map.fitBounds(L.latLngBounds(caja), { padding: [34, 34] });
      else if (caja.length === 1) o.map.setView(caja[0], 14);
    } catch (_) {}
    return true;
  }

  /* ---------------- Ruta por carretera ---------------- */
  async function rutaOSRM(origen, destino) {
    const o = OSM();
    const base = o.osrm || 'https://router.project-osrm.org';
    const url = base + '/route/v1/driving/' + origen.lon + ',' + origen.lat + ';' +
      destino.lon + ',' + destino.lat + '?overview=full&geometries=geojson';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), o.timeoutMs || 9000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      const d = await r.json();
      const rt = d && d.routes && d.routes[0];
      if (!r.ok || !rt) throw new Error((d && d.code) || 'OSRM sin rutas');
      return {
        ok: true, proveedor: 'OSRM · OpenStreetMap',
        km: r1(rt.distance / 1000),
        minutos: Math.max(1, Math.round(rt.duration / 60)),
        geometria: (rt.geometry && rt.geometry.coordinates) || []
      };
    } finally { clearTimeout(t); }
  }

  async function rutaGoogle(origen, destino) {
    const g = GOOGLE();
    const url = g.directions + '?origin=' + origen.lat + ',' + origen.lon +
      '&destination=' + destino.lat + ',' + destino.lon + '&mode=driving&key=' + encodeURIComponent(g.apiKey);
    const r = await fetch(url);
    const d = await r.json();
    const rt = d && d.routes && d.routes[0];
    if (!rt || !rt.legs || !rt.legs[0]) throw new Error((d && d.status) || 'Google sin rutas');
    const leg = rt.legs[0];
    return {
      ok: true, proveedor: 'Google Maps Platform',
      km: r1(leg.distance.value / 1000),
      minutos: Math.max(1, Math.round(leg.duration.value / 60)),
      geometria: (rt.overview_polyline && rt.overview_polyline.points) ? [] : []
    };
  }

  /**
   * Calcula la ruta entre dos puntos.
   * Devuelve siempre un objeto; si el proveedor falla, ok=false y km=null.
   */
  async function calcular(origen, destino) {
    const a = punto(origen), b = punto(destino);
    const recta = a && b ? r1(haversine(a[0], a[1], b[0], b[1])) : null;
    if (!a || !b) {
      return { ok: false, km: null, minutos: null, geometria: [], lineaRectaKm: recta,
        proveedor: null, motivo: !a ? 'SIN_ORIGEN' : 'SIN_DESTINO',
        aviso: !a ? 'Falta el origen del viaje.' : 'Ese destino no tiene coordenadas.' };
    }
    const clave = [a[0], a[1], b[0], b[1]].map(x => x.toFixed(5)).join('|');
    if (cache.has(clave)) return cache.get(clave);

    let salida;
    try {
      salida = proveedor() === 'google' ? await rutaGoogle(origen, destino) : await rutaOSRM(origen, destino);
      salida.lineaRectaKm = recta;
    } catch (e) {
      salida = {
        ok: false, km: null, minutos: null, geometria: [],
        lineaRectaKm: recta, proveedor: proveedor() === 'google' ? 'Google Maps Platform' : 'OSRM · OpenStreetMap',
        motivo: 'PROVEEDOR_NO_DISPONIBLE',
        aviso: 'No se pudo calcular la distancia por carretera: ' + (e && e.message ? e.message : 'servicio no disponible') +
          '. Revisa la conexión e inténtalo de nuevo.'
      };
    }
    cache.set(clave, salida);
    return salida;
  }

  /** Calcula + dibuja + escribe la barra. Nunca inventa precio ni km. */
  async function mostrarRuta(id, idBarra, origen, destino) {
    const barra = document.getElementById(idBarra);
    if (barra) barra.innerHTML = '<span>Calculando ruta por carretera…</span><span class="badge-osrm">…</span>';
    const ruta = await calcular(origen, destino);
    const dibujado = dibujar(id, origen, destino, ruta);
    const etiqueta = ruta.ok ? (proveedor() === 'google' ? 'Google Maps' : 'OSRM · OSM') : 'sin ruta';
    if (barra) {
      if (ruta.ok) {
        barra.innerHTML = '<span><b>' + String(ruta.km).replace('.', ',') + ' km</b> · ' + ruta.minutos +
          ' min por carretera</span><span class="badge-osrm">' + etiqueta + '</span>';
      } else {
        const recta = ruta.lineaRectaKm != null ? ' · línea recta ' + String(ruta.lineaRectaKm).replace('.', ',') + ' km' : '';
        barra.innerHTML = '<span class="err">Ruta no disponible' + recta + '</span>' +
          '<span class="badge-osrm off">' + etiqueta + '</span>';
      }
    }
    if (!dibujado && barra) {
      const el = document.getElementById(id);
      if (el && !el.dataset.aviso) {
        el.dataset.aviso = '1';
        el.innerHTML = '<div class="mapa-hint">No se pudo dibujar el mapa en este dispositivo.<br>' +
          'La ruta y la distancia se calculan igual.</div>';
      }
    }
    return ruta;
  }

  /* ---------------- Geocodificación ---------------- */
  async function osmGeocodificar(q, limite) {
    const o = OSM();
    const url = (o.nominatim || 'https://nominatim.openstreetmap.org') + '/search?format=json&addressdetails=1&limit=' +
      (limite || 6) + '&countrycodes=co&q=' + encodeURIComponent(q);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), o.timeoutMs || 9000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { 'Accept-Language': 'es' } });
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error('respuesta inválida');
      return d.filter(x => {
        const lat = Number(x.lat), lon = Number(x.lon);
        return lat > 8.5 && lat < 12.5 && lon > -77.5 && lon < -74.0; // Bolívar / Cartagena
      }).map(x => ({
        nombre: (x.display_name || '').split(',')[0],
        detalle: (x.display_name || '').split(',').slice(1, 4).join(',').trim(),
        lat: Number(x.lat), lon: Number(x.lon)
      }));
    } finally { clearTimeout(t); }
  }

  async function googleGeocodificar(q, limite) {
    const g = GOOGLE();
    const url = g.geocode + '?address=' + encodeURIComponent(q) + '&components=country:CO&key=' + encodeURIComponent(g.apiKey);
    const r = await fetch(url);
    const d = await r.json();
    if (!d.results) throw new Error(d.status || 'sin resultados');
    return d.results.slice(0, limite || 6).map(x => ({
      nombre: (x.formatted_address || '').split(',')[0],
      detalle: (x.formatted_address || '').split(',').slice(1, 3).join(',').trim(),
      lat: x.geometry.location.lat, lon: x.geometry.location.lng
    }));
  }

  /** Busca direcciones reales. Lanza error si el proveedor no responde. */
  async function geocodificar(q) {
    const clave = 'q:' + q.toLowerCase();
    if (cacheGeo.has(clave)) return cacheGeo.get(clave);
    const lista = proveedor() === 'google' ? await googleGeocodificar(q) : await osmGeocodificar(q);
    cacheGeo.set(clave, lista);
    return lista;
  }

  /** Geocodificación inversa: coordenadas → dirección legible. */
  async function reversa(lat, lon) {
    const clave = 'r:' + lat.toFixed(5) + ',' + lon.toFixed(5);
    if (cacheGeo.has(clave)) return cacheGeo.get(clave);
    let salida = null;
    try {
      if (proveedor() === 'google') {
        const url = GOOGLE().geocode + '?latlng=' + lat + ',' + lon + '&key=' + encodeURIComponent(GOOGLE().apiKey);
        const r = await fetch(url); const d = await r.json();
        const x = d && d.results && d.results[0];
        if (x) salida = { nombre: (x.formatted_address || '').split(',')[0], detalle: x.formatted_address };
      } else {
        const o = OSM();
        const url = (o.nominatim || 'https://nominatim.openstreetmap.org') + '/reverse?format=json&zoom=17&addressdetails=1&lat=' + lat + '&lon=' + lon;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), o.timeoutMs || 9000);
        try {
          const r = await fetch(url, { signal: ctrl.signal, headers: { 'Accept-Language': 'es' } });
          const d = await r.json();
          if (d && d.display_name) {
            salida = { nombre: (d.display_name || '').split(',')[0], detalle: d.display_name };
          }
        } finally { clearTimeout(t); }
      }
    } catch (_) { salida = null; }
    if (salida) cacheGeo.set(clave, salida);
    return salida;
  }

  function invalidar() {
    Object.keys(inst).forEach(k => { try { inst[k].map.invalidateSize(); } catch (_) {} });
  }

  return {
    mostrarRuta, calcular, geocodificar, reversa, invalidar, crear,
    haversine,
    get disponible() { return hayLeaflet(); },
    get proveedor() { return proveedor(); },
    get configurado() { return proveedor() === 'google' ? !!GOOGLE().apiKey : true; }
  };
})();
