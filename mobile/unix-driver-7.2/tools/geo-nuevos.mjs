import fs from 'fs';
const BBOX = { minLat: 10.20, maxLat: 10.62, minLon: -75.75, maxLon: -75.30 };
const dentro = (lat, lon) => lat > BBOX.minLat && lat < BBOX.maxLat && lon > BBOX.minLon && lon < BBOX.maxLon;
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const toks = s => new Set(norm(s).split(' ').filter(w => w.length > 2 && !['los','las','del','de','la','el','san','santa','club','the','urbanizacion','conjunto','residencial','estacion','glorieta','interseccion','avenida','barrio','portal','condominio','apartments'].includes(w)));
const score = (a, b) => { const A = toks(a), B = toks(b); if (!A.size || !B.size) return 0;
  let inter = 0; A.forEach(x => { if (B.has(x)) inter++; });
  return inter / Math.min(A.size, B.size); };

const CONJ = {
  'La Carolina y Los Alpes': ['Ciudad Jardín','Monte Bianco','Jardín Imperial','Torre del Jardín','Balcones del Jardín','Azure','Brisas del Jardín','Nuevos Alpes','Los Cerezos','La Heroica','Urbanización La India'],
  'Parque Heredia y Ternera': ['Parque Heredia','Calamarí','Manatí','Salamandra','Caracolí','Celeste','Gaia','Flamenco','Barlovento','Candil','Malibú','Fragata','Cabo Alto','Coral','Ginger'],
  'El Recreo, La Concepción y alrededores': ['Fiorentti','Ciudad Sevilla','Sevilla Real','Paraíso Real','Mallorca','Valencia','Villa Concha','Rincón de la Villa','Villa del Sol','San Buenaventura','Villa Vanesa','El Edén'],
  'San José de los Campanos y alrededores': ['Villa Grande de Indias','Bosque de la Ceiba','Bosque de la Circunvalar','Quintas del Manantial','Portal de la Cordialidad','Villa Andrea','Villa Amelia','Villas de la Victoria','Villa Rosita','Asturias'],
  'Zona Norte': ['Serena del Mar','Barcelona de Indias','Barceloneta','Terranova de Indias','Cartagena Laguna Club','Baia Kristal','Palma Real','Karibana','Burano','Cavana','Trevi','Palladio','Altana','Portelo','Portanova','Zinnia','Capriella','Los Morros','Morros Eco','Morros Ío','Morros Park'],
  'Ciudad del Bicentenario y alrededores': ['Ciudad del Bicentenario','Villas de Aranjuez','Villas de la Candelaria','Ciudadela La Paz','Flor del Campo','Colombiatón','Villa Estrella','Portal de Alicante','Portal de la Terminal'],
  'Otros sectores': ['Parque Residencial El Country','Los Almendros','Los Caobos','Britania','Santillana de los Patios','Los Corales','Urbanización Castillete','Ipanema','Portal de Santa Mónica','The Club Apartments','Condominio Copacabana']
};
const ESTACIONES = ['Madre Bernarda','La Castellana','Los Ángeles','Los Ejecutivos','Villa Olímpica','Cuatro Vientos','República del Líbano','España','María Auxiliadora','El Prado','Bazurto','Las Delicias','La Popa','Lo Amador','Chambacú','Centro','La Bodeguita'];
const VIAS = [
  ['Glorieta de Cuatro Vientos','glorieta','Avenida Pedro de Heredia','Glorieta Cuatro Vientos Cartagena'],
  ['Glorieta de Bazurto','glorieta','Mercado de Bazurto','Glorieta Bazurto Cartagena'],
  ['Glorieta de San Felipe','glorieta','Castillo San Felipe','Glorieta San Felipe Cartagena'],
  ['Glorieta de la India Catalina','glorieta','Centro histórico','Glorieta India Catalina Cartagena'],
  ['Intersección de María Auxiliadora','intersección','Avenida Pedro de Heredia','Maria Auxiliadora Cartagena'],
  ['Intersección de El Amparo','intersección','Avenida Pedro de Heredia','El Amparo Cartagena'],
  ['Intersección de Santa Lucía','intersección','Avenida Pedro de Heredia','Santa Lucia Cartagena'],
  ['Intersección de El Gallo','intersección','Avenida Pedro de Heredia','El Gallo Cartagena'],
  ['Glorieta de entrada al barrio La Esperanza','glorieta','La Esperanza','La Esperanza Cartagena'],
  ['Puente de Calicanto','intersección','Caño Juan Angola','Puente Calicanto Cartagena'],
  ['Glorieta Santander','glorieta','Bocagrande','Glorieta Santander Bocagrande Cartagena'],
  ['Acceso a la Avenida Venezuela','intersección','Avenida Venezuela','Avenida Venezuela Cartagena'],
  ['Avenida Pedro de Heredia × Avenida del Consulado','intersección','Consulado','Avenida del Consulado Cartagena'],
  ['Avenida Pedro de Heredia × Transversal 54','intersección','Los Alpes','Transversal 54 Cartagena'],
  ['Corredor de la Vía La Cordialidad','corredor vial','Vía La Cordialidad','Via Cordialidad Cartagena'],
  ['Acceso a la Terminal de Transporte','intersección','Terminal','Terminal de Transporte Cartagena'],
  ['Acceso al Aeropuerto Rafael Núñez','intersección','Crespo','Aeropuerto Rafael Nunez Cartagena'],
  ['Corredor de la Vía al Mar','corredor vial','Vía al Mar','Via al Mar Cartagena'],
  ['Anillo Vial (corredor)','corredor vial','Anillo Vial','Anillo Vial Cartagena'],
  ['Acceso a Serena del Mar y Manzanillo del Mar','intersección','Serena del Mar','Serena del Mar Cartagena']
];
const lista = [];
for (const [sector, nombres] of Object.entries(CONJ)) for (const n of nombres)
  lista.push({ nombre: n, tipo: 'Conjunto residencial', categoria: 'Conjuntos residenciales', sector, q: n + ', Cartagena, Bolivar, Colombia' });
for (const n of ESTACIONES)
  lista.push({ nombre: 'Estación ' + n, tipo: 'Estación TransCaribe', categoria: 'Estaciones TransCaribe', sector: 'Troncal TransCaribe', q: 'Estación ' + n + ' TransCaribe Cartagena' });
lista.push({ nombre: 'Estación de transferencia Santa Lucía', tipo: 'Estación de transferencia', categoria: 'Estaciones TransCaribe', sector: 'Santa Lucía', q: 'Estacion de transferencia Santa Lucia TransCaribe Cartagena' });
lista.push({ nombre: 'Patio Portal TransCaribe (El Gallo)', tipo: 'Portal', categoria: 'Estaciones TransCaribe', sector: 'El Gallo', q: 'Patio Portal TransCaribe Cartagena' });
for (const [n, tipo, sector, q] of VIAS)
  lista.push({ nombre: n, tipo, categoria: 'Glorietas e intersecciones', sector, q });

const UA = { 'User-Agent': 'UniXDriver-Cartagena/7.2 (proyecto academico; contacto: unixdriver@example.com)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function photon(q) {
  const url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(q) + '&limit=5&lat=10.41&lon=-75.51&bbox=-75.75,10.20,-75.30,10.62';
  try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) }); if (!r.ok) return [];
    const j = await r.json();
    return (j.features||[]).map(f => ({ lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
      label: (f.properties.name||'') + ' ' + (f.properties.street||'') + ' ' + (f.properties.city||'') + ' ' + (f.properties.district||''),
      city: f.properties.city || '', tipo: f.properties.osm_value || '', osm: 'https://www.openstreetmap.org/' + (f.properties.osm_type||'node') + '/' + f.properties.osm_id }));
  } catch (_) { return []; }
}
async function nominatim(q) {
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=co&viewbox=-75.75,10.62,-75.30,10.20&bounded=1&q=' + encodeURIComponent(q);
  try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) }); if (!r.ok) return [];
    const j = await r.json();
    return j.map(f => ({ lat: Number(f.lat), lon: Number(f.lon), label: f.display_name, city: /Cartagena/i.test(f.display_name) ? 'Cartagena' : '', tipo: f.type || '', osm: 'https://www.openstreetmap.org/' + (f.osm_type||'node') + '/' + f.osm_id }));
  } catch (_) { return []; }
}
const cacheFile = '/home/user/v5/data-src/geo-nuevos-cache.json';
let cache = {}; try { cache = JSON.parse(fs.readFileSync(cacheFile,'utf8')); } catch (_) {}
let i = 0;
for (const p of lista) {
  i++;
  if (cache[p.q]) { Object.assign(p, cache[p.q]); continue; }
  const variantes = [p.q, p.q.replace(/,\s*Cartagena, Bolivar, Colombia$/i, ' Cartagena'),
                     p.nombre + ' Cartagena', p.nombre];
  let cands = [];
  for (const v of variantes) { cands = await photon(v); if (cands.length) break; await sleep(180); }
  if (!cands.length) { await sleep(1100); cands = await nominatim(variantes[1]); }
  if (!cands.length) { await sleep(1100); cands = await nominatim(p.nombre + ', Cartagena, Colombia'); }
  const buenos = cands.filter(c => dentro(c.lat, c.lon));
  let best = null, bestS = 0;
  for (const c of buenos) { const s = score(p.nombre, c.label); if (s > bestS) { bestS = s; best = c; } }
  if (best && bestS >= 0.6 && (!best.city || /cartagena/i.test(best.city))) {
    Object.assign(p, { lat: +best.lat.toFixed(6), lon: +best.lon.toFixed(6), estado: 'verificado',
      fuente: 'OpenStreetMap · ' + best.osm, nota: '' , match: bestS.toFixed(2), etiqueta: best.label.slice(0,110) });
  } else if (best && bestS >= 0.34) {
    Object.assign(p, { lat: +best.lat.toFixed(6), lon: +best.lon.toFixed(6), estado: 'aproximado',
      fuente: 'OpenStreetMap · ' + best.osm, nota: 'Coincidencia parcial: verificar el punto exacto antes de usarlo.', match: bestS.toFixed(2), etiqueta: best.label.slice(0,110) });
  } else {
    Object.assign(p, { lat: null, lon: null, estado: 'no verificado',
      fuente: 'Sin coincidencia en OpenStreetMap (Nominatim/Photon)', nota: 'No se encontró en el mapa: queda en la lista sin coordenadas hasta verificarlo.' });
  }
  cache[p.q] = { lat: p.lat, lon: p.lon, estado: p.estado, fuente: p.fuente, nota: p.nota, match: p.match, etiqueta: p.etiqueta };
  if (i % 20 === 0) { fs.writeFileSync(cacheFile, JSON.stringify(cache)); console.error('...' + i + '/' + lista.length); }
  await sleep(150);
}
fs.writeFileSync(cacheFile, JSON.stringify(cache));
fs.writeFileSync('/home/user/v5/data-src/nuevos-lugares.json', JSON.stringify(lista, null, 1));
const res = {}; lista.forEach(p => { res[p.categoria] = res[p.categoria] || { verificado:0, aproximado:0, 'no verificado':0 };
  res[p.categoria][p.estado]++; });
console.log(JSON.stringify(res, null, 1));
console.log('TOTAL', lista.length, 'con coords', lista.filter(p=>p.lat!=null).length);
console.log('NO VERIFICADOS:', lista.filter(p=>!p.lat).map(p=>p.nombre).join(' | '));
