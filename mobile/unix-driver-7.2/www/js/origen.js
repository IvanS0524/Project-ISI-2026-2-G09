'use strict';
/* ============================================================
   UniX Driver · Origen del viaje (libre + GPS + dirección)
   ------------------------------------------------------------
   - Buscar origen por nombre, barrio, dirección o sector.
   - Sugerencias del catálogo oficial verificado.
   - Direcciones reales con Nominatim (OpenStreetMap, sin clave).
   - Ubicación actual del dispositivo (GPS) con permiso del usuario
     y geocodificación inversa para mostrar la dirección.
   - El origen puede cambiarse antes de solicitar el viaje y el
     precio se recalcula en el acto.
   ============================================================ */

const ORIGEN_UI = (() => {
  let resultados = [];
  let buscando = false;

  const el = id => document.getElementById(id);
  const setText = (id, v) => { const e = el(id); if (e) e.textContent = v; };

  function abrir() {
    mostrar();
    const inp = el('origenInput');
    if (inp) { inp.value = ''; }
    setText('origenNoticeTxt', '');
    pintarSugerencias('');
    setTimeout(() => { try { inp.focus(); } catch (_) {} }, 130);
  }

  function cerrar() { const o = el('origenOverlay'); if (o) o.classList.add('hidden'); }

  function mostrar() {
    const o = el('origenOverlay');
    if (!o) return;
    o.classList.remove('hidden');
    pintarFrecuentes();
  }

  /* ---------- Lista local (catálogo verificado de lugares) ---------- */
  const tieneCoordsOrigen = d => {
    if (!d || d.estado === 'no verificado') return false;
    const lat = Number(d.lat);
    const lon = Number(d.lon);
    return d.lat != null && d.lon != null && Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
  };

  function pintarSugerencias(texto) {
    const cont = el('origenList');
    if (!cont) return;
    const lista = buscarDestinos(texto, 'todas', 40).filter(tieneCoordsOrigen);
    resultados = lista.map(d => ({
      tipo: 'catalogo',
      id: d.id,
      nombre: d.nombre,
      barrio: d.barrio || d.nombre,
      detalle: [d.barrio && d.barrio !== d.nombre ? d.barrio : null, d.categoria].filter(Boolean).join(' · '),
      lat: Number(d.lat),
      lon: Number(d.lon)
    }));
    pintarLista();
  }

  const SVG_ORIGEN_PIN = '<svg class="ico-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>';

  function pintarLista() {
    const cont = el('origenList');
    if (!cont) return;
    if (!resultados.length) {
      cont.innerHTML = '<div class="origen-vacio">Sin resultados. Prueba con otro nombre o busca la dirección.</div>';
      return;
    }
    cont.innerHTML = resultados.map((r, i) => `
      <button type="button" class="origen-item" data-i="${i}">
        <span class="origen-pin">${SVG_ORIGEN_PIN}</span>
        <span class="origen-txt"><b>${escO(r.nombre)}</b><small>${escO(r.detalle || '')}</small></span>
        <span class="origen-choose">Elegir</span>
      </button>`).join('');
    delegarLista();
  }

  /* Delegación: cualquier lugar del catálogo (comercio, supermercado,
     restaurante…) se puede tocar aunque la lista se repinte. */
  function delegarLista() {
    const cont = el('origenList');
    if (!cont || cont.dataset.delegado === '1') return;
    cont.dataset.delegado = '1';
    cont.addEventListener('click', ev => {
      const b = ev.target.closest ? ev.target.closest('.origen-item') : null;
      if (!b || !cont.contains(b)) return;
      ev.preventDefault();
      elegir(Number(b.getAttribute('data-i')));
    });
  }

  const escO = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------- Búsqueda de direcciones (Nominatim) ---------- */
  async function buscarDireccion() {
    const inp = el('origenInput');
    const q = (inp ? inp.value : '').trim();
    if (q.length < 3) { setText('origenNoticeTxt', 'Escribe al menos 3 caracteres.'); return; }
    buscando = true;
    setText('origenNoticeTxt', 'Buscando direcciones…');
    let lista = [];
    try {
      lista = await MAPA.geocodificar(q);
    } catch (e) { lista = []; }
    buscando = false;
    if (!lista.length) {
      setText('origenNoticeTxt', 'No se encontraron direcciones. Revisa la conexión o elige un lugar de la lista.');
      return;
    }
    setText('origenNoticeTxt', '');
    resultados = lista.map(d => ({
      tipo: 'direccion', id: null, nombre: d.nombre, detalle: d.detalle || 'Dirección', lat: d.lat, lon: d.lon
    }));
    pintarLista();
  }

  /* ---------- Ubicación actual ---------- */
  function leerGPS() {
    return new Promise((resolve, reject) => {
      const geo = (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Geolocation) || null;
      if (geo && geo.getCurrentPosition) {
        geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
          .then(p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }))
          .catch(reject);
        return;
      }
      if (!navigator.geolocation) { reject(new Error('GPS_NO_DISPONIBLE')); return; }
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        e => reject(e),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  async function usarGPS() {
    setText('origenNoticeTxt', 'Obteniendo tu ubicación…');
    const btn = el('origenGpsBtn');
    if (btn) btn.disabled = true;
    try {
      const c = await leerGPS();
      setText('origenNoticeTxt', 'Buscando la dirección de tu ubicación…');
      let nombre = 'Mi ubicación actual';
      let dir = c.lat.toFixed(5) + ', ' + c.lon.toFixed(5);
      try {
        const rv = await MAPA.reversa(c.lat, c.lon);
        if (rv && rv.nombre) { nombre = rv.nombre; dir = rv.detalle || dir; }
      } catch (_) {}
      aplicar({ nombre, direccion: dir, lat: c.lat, lon: c.lon, fuente: 'gps' });
      cerrar();
    } catch (e) {
      const negado = e && (e.code === 1 || /denied|permiso/i.test(String(e.message || '')));
      setText('origenNoticeTxt', negado
        ? 'Permiso de ubicación denegado. Puedes elegir el origen manualmente.'
        : 'No se pudo obtener tu ubicación. Elige el origen manualmente.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /* ---------- Filtro en vivo del catálogo ---------- */
  function filtrar(t) { pintarSugerencias(t || ''); }

  /* ---------- Selección ---------- */
  function elegir(i) {
    const r = resultados[i];
    if (!r) return;
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    if (r.lat == null || r.lon == null || !Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
      setText('origenNoticeTxt', 'No se encontraron coordenadas válidas para ese lugar. Elige otro punto o busca una dirección.');
      return;
    }
    aplicar({ nombre: r.nombre, barrio: r.barrio || r.nombre, direccion: r.detalle || '', lat, lon, fuente: r.tipo });
    cerrar();
  }

  function aplicar(origen) {
    if (typeof FLOW !== 'undefined' && FLOW.elegirOrigen) FLOW.elegirOrigen(origen);
  }

  /* ---------- Orígenes frecuentes (historial) ---------- */
  function pintarFrecuentes() {
    const cont = el('origenFrecuentes') || el('origenFrec');
    if (!cont) return;
    const hist = (typeof leerHistorial === 'function' ? leerHistorial() : []) || [];
    const vistos = {}, lista = [];
    hist.forEach(h => {
      if (!h.origen || !h.origen_lat || !h.origen_lon) return;
      const k = h.origen + '|' + h.origen_lat;
      if (vistos[k]) return;
      vistos[k] = 1;
      lista.push({ nombre: h.origen, lat: Number(h.origen_lat), lon: Number(h.origen_lon) });
    });
    const base = lista.slice(0, 3);
    if (window.UNIX_CONFIG && UNIX_CONFIG.origenSugerido) {
      const s = UNIX_CONFIG.origenSugerido;
      if (!lista.some(x => Math.abs(x.lat - s.lat) < 1e-6 && Math.abs(x.lon - s.lon) < 1e-6)) base.push(s);
    }
    cont.innerHTML = base.map((x, i) => `
      <button type="button" class="origen-chip" onclick="ORIGEN_UI.elegirFrecuente(${i})">${escO(x.nombre)}</button>`).join('');
    cont.dataset.lista = JSON.stringify(base);
  }

  function elegirFrecuente(i) {
    const cont = el('origenFrecuentes') || el('origenFrec');
    if (!cont) return;
    let base = [];
    try { base = JSON.parse(cont.dataset.lista || '[]'); } catch (_) {}
    const x = base[i];
    if (!x || x.lat == null || x.lon == null) return;
    aplicar({ nombre: x.nombre, barrio: x.barrio || x.nombre, direccion: x.direccion || '', lat: Number(x.lat), lon: Number(x.lon), fuente: 'sugerido' });
    cerrar();
  }

  return { abrir, cerrar, filtrar, buscarDireccion, usarGPS, elegir, elegirFrecuente, pintarSugerencias,
    get buscando() { return buscando; } };
})();
