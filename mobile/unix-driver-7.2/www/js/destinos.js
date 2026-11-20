'use strict';

/* Orden de las zonas heredadas, usado solo para ordenar el listado de lugares.
   La tarifa ya NO depende de la zona: se calcula por kilómetros. */
const ZONA_ORDEN = { corto: 1, medio: 2, largo: 3, restringido: 4 };
/* ============================================================
   UniX Driver · Base de destinos y buscador
   ------------------------------------------------------------
   Fuente: data/destinos.js (generado desde data/destinos.json).
   Búsqueda tolerante a tildes/mayúsculas por nombre, barrio y
   categoría. Sin duplicados: la lista ya viene deduplicada.
   ============================================================ */

const DEST = {
  lista: [],
  porId: {},
  frecuentes: [],
  categorias: [],
  filtro: 'todas',
  texto: '',
  cargado: false
};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const SVG_PIN_CAT = '<svg class="ico-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>';
const iconoCat = () => SVG_PIN_CAT;

function tieneCoordsValidas(d) {
  if (!d || d.estado === 'no verificado') return false;
  const lat = Number(d.lat);
  const lon = Number(d.lon);
  return d.lat != null && d.lon != null && Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
}

/** Carga la base local (script) y sincroniza en segundo plano los 212 barrios oficiales desde AWS S3 (`GET /busquedas/barrios`). */
async function cargarDestinos() {
  let doc = window.UNIX_DESTINOS || null;
  if (!doc) {
    try {
      const r = await fetch('data/destinos.json');
      doc = await r.json();
    } catch (e) {
      doc = { destinos: [], frecuentes: [], tarifas: null };
    }
  }
  DEST.porId = {};
  DEST.lista = (doc.destinos || []).filter(tieneCoordsValidas).map(d => {
    const clean = Object.assign({}, d, { lat: Number(d.lat), lon: Number(d.lon) });
    DEST.porId[clean.id] = clean;
    return clean;
  });
  DEST.frecuentes = (doc.frecuentes || []).map(id => DEST.porId[id]).filter(Boolean);
  if (doc.tarifas) TARIFAS = doc.tarifas;
  DEST.categorias = Array.from(new Set(DEST.lista.map(d => d.categoria)))
    .sort((a, b) => DEST.lista.filter(x => x.categoria === b).length - DEST.lista.filter(x => x.categoria === a).length);
  DEST.meta = doc.meta || {};
  DEST.cargado = true;

  // Sincronización no bloqueante con el catálogo oficial de 212 barrios en AWS S3
  sincronizarBarriosDesdeAws();

  return DEST.lista.length;
}

async function sincronizarBarriosDesdeAws() {
  if (typeof window === 'undefined' || !window.apiService || typeof window.apiService.obtenerBarrios !== 'function') return;
  try {
    const barriosAws = await window.apiService.obtenerBarrios();
    if (!Array.isArray(barriosAws) || !barriosAws.length) return;
    let agregados = 0;
    barriosAws.forEach((b, idx) => {
      const nombreOficial = b.nombre_oficial || b.nombre;
      const lat = Number(b.coordenada_y != null ? b.coordenada_y : b.lat);
      const lon = Number(b.coordenada_x != null ? b.coordenada_x : b.lon);
      if (!nombreOficial || !Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return;

      const claveNorm = norm(nombreOficial);
      const existente = DEST.lista.find(d => (d.nombre_norm || norm(d.nombre)) === claveNorm);
      if (existente) {
        if (!tieneCoordsValidas(existente)) {
          existente.lat = lat;
          existente.lon = lon;
        }
        if (b.localidad && !existente.localidad) existente.localidad = b.localidad;
      } else {
        const idBarrio = 'aws-barrio-' + (b.codigo || (idx + 1));
        const item = {
          id: idBarrio,
          nombre: nombreOficial,
          nombre_norm: claveNorm,
          barrio: nombreOficial,
          barrio_norm: claveNorm,
          localidad: b.localidad || 'Cartagena',
          categoria: 'Barrios de Cartagena',
          cat_norm: 'barrios de cartagena',
          zona: 'medio',
          lat,
          lon,
          verificado: true
        };
        DEST.lista.push(item);
        DEST.porId[idBarrio] = item;
        agregados++;
      }
    });
    if (agregados > 0) {
      DEST.categorias = Array.from(new Set(DEST.lista.map(d => d.categoria)))
        .sort((a, b) => DEST.lista.filter(x => x.categoria === b).length - DEST.lista.filter(x => x.categoria === a).length);
      const sub = document.getElementById('destinoSub');
      if (sub) sub.textContent = DEST.lista.length + ' lugares · barrios y sitios clave de Cartagena';
      const overlay = document.getElementById('pickerOverlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        PICKER.renderCats();
        PICKER.filtrar();
      }
    }
  } catch (_) {}
}

function destinoPorId(id) { return DEST.porId[id] || null; }

/** Busca por texto y categoría. Devuelve únicamente lugares con coordenadas válidas, mejores resultados primero. */
function buscarDestinos(texto, categoria, limite) {
  const t = norm(texto);
  const cat = categoria && categoria !== 'todas' ? categoria : null;
  const tope = (limite != null && limite > 0) ? limite : DEST.lista.length;
  let base = DEST.lista.filter(tieneCoordsValidas);
  if (cat) base = base.filter(d => d.categoria === cat);

  if (!t) {
    return base.slice()
      .sort((a, b) => ((ZONA_ORDEN[a.zona] || 0) - (ZONA_ORDEN[b.zona] || 0)) ||
        String(a.nombre).localeCompare(String(b.nombre), 'es'))
      .slice(0, tope);
  }

  const tokens = t.split(' ').filter(Boolean);
  const res = [];
  for (const d of base) {
    const nombre = d.nombre_norm || norm(d.nombre);
    const barrio = d.barrio_norm || norm(d.barrio);
    const categ = d.cat_norm || norm(d.categoria);
    let puntaje = 0;
    if (nombre === t) puntaje = 100;
    else if (nombre.startsWith(t)) puntaje = 80;
    else if (nombre.includes(t)) puntaje = 60;
    else if (barrio.includes(t)) puntaje = 45;
    else if (categ.includes(t)) puntaje = 30;
    else if (tokens.every(tk => nombre.includes(tk) || barrio.includes(tk) || categ.includes(tk))) puntaje = 20;
    if (puntaje) res.push({ d, puntaje });
  }
  res.sort((a, b) => (b.puntaje - a.puntaje) || String(a.d.nombre).localeCompare(String(b.d.nombre), 'es'));
  return res.slice(0, tope).map(x => x.d);
}

const PICKER = (() => {
  let abiertoAntes = null;
  let remotoTimer = null;
  let remotoSeq = 0;
  let remotoAbort = null;

  function cancelarBusquedaRemota() {
    if (remotoTimer) { clearTimeout(remotoTimer); remotoTimer = null; }
    if (remotoAbort) { try { remotoAbort.abort(); } catch (_) {} remotoAbort = null; }
    remotoSeq += 1;
  }

  function hayCoincidenciaExacta(lista, texto) {
    const t = norm(texto);
    if (!t || !lista.length) return false;
    return lista.some(d => (d.nombre_norm || norm(d.nombre)) === t || (d.barrio_norm || norm(d.barrio)) === t);
  }

  function renderFilas(lista) {
    return lista.map(d => {
      const sub = [d.categoria, d.localidad || (d.barrio && d.barrio !== d.nombre ? d.barrio : null)]
        .filter(Boolean).join(' · ');
      return `<div class="picker-item" role="button" tabindex="0" data-id="${esc(d.id)}">
        <div class="pi-ico">${iconoCat(d.categoria)}</div>
        <div class="pi-main">
          <b>${esc(d.nombre)}</b>
          <span>${esc(sub)}</span>
        </div>
        <div class="pi-price">Elegir</div>
      </div>`;
    }).join('');
  }

  function abrir() {
    abiertoAntes = document.activeElement;
    cancelarBusquedaRemota();
    UI.mostrar('pickerOverlay');
    DEST.texto = '';
    DEST.filtro = 'todas';
    const inp = document.getElementById('pickerInput');
    if (inp) { inp.value = ''; setTimeout(() => { try { inp.focus(); } catch (_) {} }, 120); }
    renderCats();
    filtrar();
  }
  function cerrar() {
    cancelarBusquedaRemota();
    UI.ocultar('pickerOverlay');
    UI.ocultar('destinosOverlay');
    if (abiertoAntes && abiertoAntes.blur) abiertoAntes.blur();
  }
  function renderCats() {
    const cont = document.getElementById('pickerCats');
    if (!cont) return;
    const validos = DEST.lista.filter(tieneCoordsValidas);
    const chips = [`<button class="chip ${DEST.filtro === 'todas' ? 'active' : ''}" onclick="PICKER.setFiltro('todas')">Todas (${validos.length})</button>`];
    DEST.categorias.forEach(c => {
      const n = validos.filter(d => d.categoria === c).length;
      if (!n) return;
      chips.push(`<button type="button" class="chip ${DEST.filtro === c ? 'active' : ''}" data-cat="${esc(c)}">${iconoCat(c)} ${esc(c)} (${n})</button>`);
    });
    cont.innerHTML = chips.join('');
    if (cont.dataset.delegado !== '1') {
      cont.dataset.delegado = '1';
      cont.addEventListener('click', ev => {
        const b = ev.target.closest ? ev.target.closest('[data-cat]') : null;
        if (!b) return;
        setFiltro(b.getAttribute('data-cat'));
      });
    }
  }
  function setFiltro(c) { DEST.filtro = c; renderCats(); filtrar(); }

  function filtrar() {
    const inp = document.getElementById('pickerInput');
    DEST.texto = inp ? inp.value : '';
    const qTrim = DEST.texto.trim();
    const lista = buscarDestinos(DEST.texto, DEST.filtro, 0);
    const cont = document.getElementById('pickerList');
    const cnt = document.getElementById('pickerCount');
    if (!cont) return;

    cancelarBusquedaRemota();

    if (cnt) cnt.textContent = lista.length + (lista.length === 1 ? ' lugar' : ' lugares');

    const puedeResolver = typeof window !== 'undefined' && window.apiService && typeof window.apiService.resolverLugar === 'function';
    const necesitaRemoto = puedeResolver && qTrim.length >= 4 && (lista.length === 0 || (lista.length < 2 && !hayCoincidenciaExacta(lista, qTrim)));

    if (!lista.length) {
      if (necesitaRemoto) {
        cont.innerHTML = '<div class="picker-empty">Buscando en Cartagena...</div>';
      } else {
        cont.innerHTML = `<div class="picker-empty">No encontramos "${(DEST.texto || '').replace(/[<>]/g, '')}".<br>Prueba con otro nombre, un barrio o una categoría.</div>`;
      }
    } else {
      cont.innerHTML = renderFilas(lista) + (necesitaRemoto ? '<div class="picker-empty" style="padding:10px 12px;">Buscando en Cartagena...</div>' : '');
      delegar(cont);
    }

    if (!necesitaRemoto) return;

    const seq = ++remotoSeq;
    remotoTimer = setTimeout(async () => {
      remotoTimer = null;
      if (seq !== remotoSeq) return;
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      remotoAbort = ctrl;
      let remotos = [];
      try {
        remotos = await window.apiService.resolverLugar(qTrim, ctrl ? ctrl.signal : null);
      } catch (_) {
        remotos = [];
      } finally {
        if (remotoAbort === ctrl) remotoAbort = null;
      }

      if (seq !== remotoSeq) return;
      const actualInp = document.getElementById('pickerInput');
      if (actualInp && actualInp.value.trim() !== qTrim) return;

      const vistos = new Set(lista.map(d => norm(d.nombre)));
      const combinados = lista.slice();
      (Array.isArray(remotos) ? remotos : []).forEach((r, idx) => {
        if (!r || !r.nombre || !tieneCoordsValidas(r)) return;
        const nNorm = norm(r.nombre);
        if (vistos.has(nNorm)) return;
        vistos.add(nNorm);
        const idRem = 'remoto-' + seq + '-' + idx;
        const item = {
          id: idRem,
          nombre: String(r.nombre).trim(),
          nombre_norm: nNorm,
          barrio: String(r.barrio || r.nombre).trim(),
          barrio_norm: norm(r.barrio || r.nombre),
          categoria: String(r.categoria || 'Lugar en Cartagena').trim(),
          cat_norm: norm(r.categoria || 'Lugar en Cartagena'),
          lat: Number(r.lat),
          lon: Number(r.lon),
          fuente: r.fuente || 'cartagena',
          verificado: true
        };
        DEST.porId[idRem] = item;
        combinados.push(item);
      });

      if (cnt) cnt.textContent = combinados.length + (combinados.length === 1 ? ' lugar' : ' lugares');
      if (!combinados.length) {
        cont.innerHTML = `<div class="picker-empty">No encontramos "${qTrim.replace(/[<>]/g, '')}".<br>Prueba con otro nombre, un barrio o una categoría.</div>`;
        return;
      }
      cont.innerHTML = renderFilas(combinados);
      delegar(cont);
    }, 500);
  }

  /* Un solo listener por contenedor: cualquier lugar o botón "Elegir" se selecciona al instante. */
  function delegar(cont) {
    if (!cont || cont.dataset.delegado === '1') return;
    cont.dataset.delegado = '1';
    cont.addEventListener('click', ev => {
      const it = ev.target.closest ? ev.target.closest('.picker-item') : null;
      if (!it || !cont.contains(it)) return;
      const id = it.getAttribute('data-id');
      if (id) { ev.preventDefault(); elegir(id); }
    });
    cont.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const it = ev.target.closest ? ev.target.closest('.picker-item') : null;
      if (!it) return;
      ev.preventDefault();
      const id = it.getAttribute('data-id');
      if (id) elegir(id);
    });
  }

  function elegir(id) {
    let d = destinoPorId(id);
    if (!d && id) {
      const encontrados = buscarDestinos(String(id), 'todas', 10);
      d = encontrados.find(tieneCoordsValidas) || null;
    }
    if (!d || !tieneCoordsValidas(d)) {
      UI.setNotice('searchNotice', 'No se pudo leer ese lugar del catálogo. Prueba con otro.', 'error');
      return;
    }
    FLOW.elegirDestino(Object.assign({}, d, { lat: Number(d.lat), lon: Number(d.lon) }));
    cerrar();
    const btn = document.getElementById('btnBuscar');
    if (btn && btn.scrollIntoView) { try { btn.scrollIntoView({ block: 'nearest' }); } catch (_) {} }
  }

  return { abrir, cerrar, filtrar, setFiltro, elegir, renderCats };
})();
