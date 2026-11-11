import fs from 'fs';
const P = '/home/user/v5';
const doc = JSON.parse(fs.readFileSync(P + '/www/data/destinos.json', 'utf8'));
let nuevos = JSON.parse(fs.readFileSync(P + '/data-src/nuevos-lugares.json', 'utf8'));

/* QA: coincidencias de OSM que caen fuera del punto correcto -> se anulan las
   coordenadas (no se inventa nada) y la ficha queda como "no verificado". */
const ANULAR = {
  'Estación Las Delicias': 'La coincidencia de OSM rompe la secuencia de la troncal. Falta verificar en campo.',
  'Intersección de María Auxiliadora': 'La coincidencia de OSM cae en El Pozón, no en la Av. Pedro de Heredia.',
  'Anillo Vial (corredor)': 'La coincidencia de OSM cae en El Bosque, no en el Anillo Vial del norte.',
  'Acceso a la Avenida Venezuela': 'La coincidencia de OSM es una vía homónima al oriente, no el acceso real.',
  'Acceso a la Terminal de Transporte': 'La coincidencia de OSM es un paradero de la ruta X104, no el acceso a la Terminal.'
};
const COMPARTE = { 'Glorieta de Cuatro Vientos': 'Estación Cuatro Vientos', 'Glorieta de Bazurto': 'Estación Bazurto' };

nuevos = nuevos.map(p => {
  if (ANULAR[p.nombre]) return { ...p, lat: null, lon: null, estado: 'no verificado', nota: ANULAR[p.nombre] };
  if (COMPARTE[p.nombre] && p.lat != null) return { ...p, estado: 'aproximado',
    nota: 'Comparte nodo con la ' + COMPARTE[p.nombre] + ': el punto vial exacto está por confirmar.' };
  return p;
});

/* Item 20 de la lista de estaciones: los paraderos alimentadores. El dataset
   oficial (947 registros) no trae latitud/longitud, así que no se dibuja. */
nuevos.push({
  nombre: 'Paraderos de rutas alimentadoras y complementarias (TransCaribe)',
  tipo: 'Paradero', categoria: 'Estaciones TransCaribe', sector: 'Toda la ciudad',
  lat: null, lon: null, estado: 'no verificado',
  fuente: 'Datos Abiertos Cartagena · Paraderos TransCaribe 2025 (947 registros, sin latitud/longitud)',
  nota: 'El archivo oficial no incluye coordenadas: no se puede ubicar en el mapa sin inventarlas.'
});

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const existentes = new Map(doc.destinos.map(d => [norm(d.nombre), d]));

const usados = new Set(doc.destinos.map(d => d.id));
const nuevoId = () => { let n = 1; while (usados.has('N' + String(n).padStart(4, '0'))) n++; const id = 'N' + String(n).padStart(4, '0'); usados.add(id); return id; };

const agregados = [], duplicados = [];
for (const p of nuevos) {
  const k = norm(p.nombre);
  if (existentes.has(k)) { duplicados.push(p.nombre); continue; }
  const rec = {
    id: nuevoId(),
    nombre: p.nombre,
    tipo: p.tipo,
    categoria: p.categoria,
    subcategoria: p.tipo + ' · ' + p.sector,
    barrio: p.sector,
    localidad: '',
    sector: p.sector,
    direccion: p.direccion || p.sector,
    zona: null,
    lat: p.lat,
    lon: p.lon,
    estado: p.estado,
    fuente: p.fuente,
    nota: p.nota || '',
    maps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.nombre + ' Cartagena de Indias, Bolivar, Colombia'),
    descripcion: p.tipo + ' en ' + p.sector + ' (Cartagena). Ubicación: ' + p.estado + '.',
    nombre_norm: norm(p.nombre), barrio_norm: norm(p.sector), cat_norm: norm(p.categoria),
    nombre_corto: p.nombre
  };
  existentes.set(k, rec); agregados.push(rec);
}
doc.destinos = doc.destinos.concat(agregados);
doc.meta.total_destinos = doc.destinos.length;
doc.meta.fecha_generacion = '2026-11-10';
doc.meta.ampliacion_2026 = {
  fuente: 'Listas del usuario verificadas con Google Maps, OpenStreetMap (Nominatim/Photon) y Datos Abiertos Cartagena',
  agregados: agregados.length, duplicados_omitidos: duplicados.length,
  por_estado: agregados.reduce((a, r) => { a[r.estado] = (a[r.estado] || 0) + 1; return a; }, {})
};
fs.writeFileSync(P + '/www/data/destinos.json', JSON.stringify(doc, null, 0));

const porCat = {};
agregados.forEach(r => { porCat[r.categoria] = porCat[r.categoria] || { verificado: 0, aproximado: 0, 'no verificado': 0 };
  porCat[r.categoria][r.estado]++; });
console.log('AGREGADOS', agregados.length, 'DUPLICADOS OMITIDOS', duplicados.length, duplicados.join(' | '));
console.log(JSON.stringify(porCat, null, 1));
console.log('TOTAL CATALOGO', doc.destinos.length);
console.log('SIN COORDS (nuevos):', agregados.filter(r => r.lat == null).map(r => r.nombre).join(' | '));
