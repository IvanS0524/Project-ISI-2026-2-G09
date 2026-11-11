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

const ICONO_CAT = {
  'Barrios y sectores': '🏘️',
  'Restaurantes': '🍽️',
  'Comercio y supermercados': '🛒',
  'Educacion': '🎓',
  'Hoteles y alojamiento': '🏨',
  'Vias y avenidas': '🛣️',
  'Servicios y automotriz': '🔧',
  'Corregimientos e islas': '🏝️',
  'Corregimientos e islas (ampliado)': '🏝️',
  'Salud': '🏥',
  'Turismo y espacios publicos': '🗺️',
  'Ficha general del distrito': '🏛️',
  'Transporte y agencias': '🚌',
  'Division territorial (localidades y UCG)': '📌',
  'Empresas e industria': '🏭',
  'Cafeterias y panaderias': '☕',
  'Estadisticas por categoria': '📊',
  'Zonas turisticas de referencia': '🧭',
  'Bares y discotecas': '🍸',
  'Conjuntos residenciales': '🏢',
  'Estaciones TransCaribe': '🚏',
  'Glorietas e intersecciones': '🔀'
};
const iconoCat = c => ICONO_CAT[c] || '📍';

/** Carga la base local (script) o, si no está, el JSON por fetch. */
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
  DEST.lista = (doc.destinos || []).slice();
  DEST.lista.forEach(d => { DEST.porId[d.id] = d; });
  DEST.frecuentes = (doc.frecuentes || []).map(id => DEST.porId[id]).filter(Boolean);
  if (doc.tarifas) TARIFAS = doc.tarifas;
  DEST.categorias = Array.from(new Set(DEST.lista.map(d => d.categoria)))
    .sort((a, b) => DEST.lista.filter(x => x.categoria === b).length - DEST.lista.filter(x => x.categoria === a).length);
  DEST.meta = doc.meta || {};
  DEST.cargado = true;
  return DEST.lista.length;
}

function destinoPorId(id) { return DEST.porId[id] || null; }

/** Busca por texto y categoría. Devuelve los mejores resultados primero. */
function buscarDestinos(texto, categoria, limite) {
  const t = norm(texto);
  const cat = categoria && categoria !== 'todas' ? categoria : null;
  const tope = limite || 120;
  let base = DEST.lista;
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

  function abrir() {
    abiertoAntes = document.activeElement;
    UI.mostrar('pickerOverlay');
    DEST.texto = '';
    DEST.filtro = 'todas';
    const inp = document.getElementById('pickerInput');
    if (inp) { inp.value = ''; setTimeout(() => { try { inp.focus(); } catch (_) {} }, 120); }
    renderCats();
    filtrar();
  }
  function cerrar() {
    UI.ocultar('pickerOverlay');
    if (abiertoAntes && abiertoAntes.blur) abiertoAntes.blur();
  }
  function renderCats() {
    const cont = document.getElementById('pickerCats');
    if (!cont) return;
    const total = DEST.lista.length;
    const chips = [`<button class="chip ${DEST.filtro === 'todas' ? 'active' : ''}" onclick="PICKER.setFiltro('todas')">Todas (${total})</button>`];
    DEST.categorias.forEach(c => {
      const n = DEST.lista.filter(d => d.categoria === c).length;
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
    const lista = buscarDestinos(DEST.texto, DEST.filtro, 150);
    const cont = document.getElementById('pickerList');
    const cnt = document.getElementById('pickerCount');
    if (cnt) cnt.textContent = lista.length + (lista.length === 150 ? '+' : '') + ' lugares';

    if (!lista.length) {
      cont.innerHTML = `<div class="picker-empty">No encontramos "${(DEST.texto || '').replace(/[<>]/g, '')}".<br>Prueba con otro nombre, un barrio o una categoría.</div>`;
      return;
    }
    cont.innerHTML = lista.map(d => {
      const sub = [d.categoria, d.barrio && d.barrio !== d.nombre ? d.barrio : null]
        .filter(Boolean).join(' · ');
      const aviso = d.estado === 'aproximado' ? ' · ubicación aproximada'
        : (d.estado === 'no verificado' ? ' · sin ubicación verificada' : '');
      return `<div class="picker-item" role="button" tabindex="0" data-id="${esc(d.id)}">
        <div class="pi-ico">${iconoCat(d.categoria)}</div>
        <div class="pi-main">
          <b>${esc(d.nombre)}</b>
          <span>${esc(sub + aviso)}</span>
        </div>
        <div class="pi-price">Elegir</div>
      </div>`;
    }).join('');
    delegar(cont);
  }

  /* Un solo listener por contenedor: cualquier comercio, supermercado o
     dirección se puede tocar aunque se repinte la lista. */
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
    const d = destinoPorId(id);
    if (!d) { UI.setNotice('searchNotice', 'No se pudo leer ese lugar del catálogo. Prueba con otro.', 'error'); return; }
    FLOW.elegirDestino(d);
    cerrar();
    const btn = document.getElementById('btnBuscar');
    if (btn && btn.scrollIntoView) { try { btn.scrollIntoView({ block: 'nearest' }); } catch (_) {} }
  }

  return { abrir, cerrar, filtrar, setFiltro, elegir, renderCats };
})();
