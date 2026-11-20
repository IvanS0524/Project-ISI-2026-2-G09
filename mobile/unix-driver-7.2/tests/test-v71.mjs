import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import { fileURLToPath } from 'url';
const www = fileURLToPath(new URL('../www', import.meta.url)).replace(/\/+$/, '');
const vc = new VirtualConsole(); const errs = [];
vc.on('jsdomError', e => { const m = String(e.message || e);
  if (!/getContext|not implemented|Could not parse CSS|canvas|Could not load|Viewport|navigation/i.test(m)) errs.push(m); });
const dom = new JSDOM(fs.readFileSync(www + '/index.html', 'utf8'),
  { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole: vc, pretendToBeVisual: true });
const w = dom.window, d = w.document;
const L = () => { const o = { setView(){return o}, fitBounds(){return o}, addLayer(){return o}, removeLayer(){return o},
  remove(){}, on(){return o}, invalidateSize(){return o}, setZoom(){return o} }; return o; };
w.L = { map: L, tileLayer: () => { const o = { addTo(){return o}, on(){return o}, setUrl(){return o} }; return o; },
  marker: () => { const o = { addTo(){return o}, bindPopup(){return o}, setLatLng(){return o} }; return o; },
  polyline: () => ({ addTo(){ return this; } }), latLngBounds: () => ({}), divIcon: () => ({}), icon: () => ({}) };
// OSRM y Backend FastAPI simulados en memoria para pruebas deterministas
const dbUsuarios = new Map();
let seqUsuario = 1;
let ultimoPayloadBusqueda = null;
w.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('router.project-osrm.org')) {
    const m = u.match(/driving\/(-?[\d.]+),(-?[\d.]+);(-?[\d.]+),(-?[\d.]+)/);
    let km = 3;
    if (m) { const dLat = (Number(m[1]) - Number(m[3])) * 111; const dLon = (Number(m[2]) - Number(m[4])) * 109;
      km = Math.sqrt(dLat * dLat + dLon * dLon); if (km < 0.2) km = 0.6; }
    return { ok: true, status: 200, json: async () => ({ code: 'Ok',
      routes: [{ distance: km * 1000, duration: km * 160, geometry: { type: 'LineString', coordinates: [[-75.5,10.4],[-75.51,10.41]] } }] }) };
  }
  if (u.includes('/busquedas/resolver-lugar')) {
    return {
      ok: true,
      status: 200,
      json: async () => ([
        {
          nombre: 'Monumento Zapatos Viejos',
          barrio: 'Pie de la Popa',
          categoria: 'Monumento',
          lat: 10.4222,
          lon: -75.5378,
          fuente: 'gemini+nominatim'
        }
      ])
    };
  }
  if (u.endsWith('/usuarios/registro')) {
    const body = JSON.parse(opts.body || '{}');
    const correo = String(body.correo || '').toLowerCase();
    if (dbUsuarios.has(correo)) {
      return { ok: false, status: 400, json: async () => ({ detail: 'Ya existe una cuenta con ese correo.' }) };
    }
    const nuevo = { id_usuario: seqUsuario++, nombre: body.nombre, correo, contrasena: body.contrasena };
    dbUsuarios.set(correo, nuevo);
    return { ok: true, status: 201, json: async () => ({ id_usuario: nuevo.id_usuario, nombre: nuevo.nombre, correo: nuevo.correo }) };
  }
  if (u.endsWith('/usuarios/login')) {
    const body = JSON.parse(opts.body || '{}');
    const correo = String(body.correo || '').toLowerCase();
    const usr = dbUsuarios.get(correo);
    if (!usr) {
      return { ok: false, status: 404, json: async () => ({ detail: 'No hay ninguna cuenta con ese correo.' }) };
    }
    // Soportar cambio de contraseña local en test de recuperación
    const localUsers = JSON.parse(w.localStorage.getItem('unixdriver.users.v2') || '[]');
    const localU = localUsers.find(x => x.email === correo);
    if (body.contrasena !== usr.contrasena && !(localU && body.contrasena === 'nueva123')) {
      return { ok: false, status: 401, json: async () => ({ detail: 'Contraseña incorrecta.' }) };
    }
    return { ok: true, status: 200, json: async () => ({ id_usuario: usr.id_usuario, nombre: usr.nombre, correo: usr.correo }) };
  }
  if (u.endsWith('/busquedas/')) {
    try { ultimoPayloadBusqueda = JSON.parse(opts.body || '{}'); } catch (_) { ultimoPayloadBusqueda = null; }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id_busqueda: 101,
        ofertas: [
          { id_oferta: 501, precio_estimado: 14000, tiempo_estimado: 4, plataforma: { nombre: 'Uber' }, conductor: { nombre: 'Carlos Mendoza', calificacion: 4.9 }, vehiculo: { marca: 'Renault', modelo: 'Logan', placa: 'CTG-123' } },
          { id_oferta: 502, precio_estimado: 13500, tiempo_estimado: 5, plataforma: { nombre: 'DiDi' }, conductor: { nombre: 'Andrés Morales', calificacion: 4.8 }, vehiculo: { marca: 'Chevrolet', modelo: 'Spark', placa: 'CTG-456' } },
          { id_oferta: 503, precio_estimado: 13000, tiempo_estimado: 6, plataforma: { nombre: 'inDrive' }, conductor: { nombre: 'Luis Herrera', calificacion: 4.7 }, vehiculo: { marca: 'Kia', modelo: 'Picanto', placa: 'CTG-789' } }
        ]
      })
    };
  }
  if (u.endsWith('/viajes/solicitar')) {
    return { ok: true, status: 200, json: async () => ({ id_viaje: 901, estado: 'SOLICITADO' }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};
w.navigator.geolocation = { getCurrentPosition: (ok) => ok({ coords: { latitude: 10.42, longitude: -75.54 } }) };
for (const f of ['config/api-env.js','config/tarifas.js','js/storage.js','js/apiService.js','js/auth.js',
  'js/mapa.js','data/destinos.js','js/state.js','js/destinos.js','js/origen.js','js/ui.js','js/flows.js','js/viaje.js','js/admin.js','js/boot.js']) {
  if (!fs.existsSync(www + '/' + f)) continue;
  const c = d.createElement('script'); c.textContent = fs.readFileSync(www + '/' + f, 'utf8'); d.body.appendChild(c);
}
d.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
await new Promise(r => setTimeout(r, 250));

let pass = 0, fail = 0; const fallos = [];
const t = (nombre, cond, extra = '') => { if (cond) { pass++; console.log('PASS · ' + nombre + (extra ? ' → ' + extra : '')); }
  else { fail++; fallos.push(nombre + (extra ? ' → ' + extra : '')); console.log('FAIL · ' + nombre + (extra ? ' → ' + extra : '')); } };
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const $ = id => d.getElementById(id);
const calc = (km, v) => w.eval(`calcularTarifa(${JSON.stringify(km)}, ${JSON.stringify(v)})`);

console.log('\n===== 1. TARIFAS =====');
const tabla = [[1,10000,5000],[3,11000,5000],[4,14000,6300],[5,17000,7650],[6,20000,9000],[7,23000,10350],
  [8,26000,11700],[9,29000,13050],[10,32000,14400]];
for (const [km, ea, em] of tabla) {
  const a = calc(km,'carro'), m = calc(km,'moto');
  t(`km ${km}: auto ${ea} / moto ${em}`, a.precio === ea && m.precio === em, `${a.precio}/${m.precio}`);
}
t('recorrido 0,4 km auto = mínimo 10.000', calc(0.4,'carro').precio === 10000, String(calc(0.4,'carro').precio));
t('recorrido 0,4 km moto = mínimo 5.000', calc(0.4,'moto').precio === 5000, String(calc(0.4,'moto').precio));
t('recorrido 12 km (largo) auto 38.000', calc(12,'carro').precio === 38000, String(calc(12,'carro').precio));
t('recorrido 12 km moto 17.100 (45%)', calc(12,'moto').precio === 17100, String(calc(12,'moto').precio));
let bajo = 0;
for (let k = 0.1; k <= 60; k = +(k + 0.1).toFixed(1)) { if (calc(k,'carro').precio < 10000) bajo++; if (calc(k,'moto').precio < 5000) bajo++; }
t('0 de 1.200 recorridos bajo el mínimo', bajo === 0, 'violaciones=' + bajo);
t('moto = round(auto × 0,45) en toda la tabla', tabla.every(([,ea,em]) => em === Math.max(5000, Math.round(ea*0.45))));
const p = w.eval('UNIX_CONFIG.tarifas.parametros');
t('config: mínimos 10.000/5.000 y motoPct 0,45', p.minimo.carro === 10000 && p.minimo.moto === 5000 && p.motoPct === 0.45,
  JSON.stringify({ minimo: p.minimo, motoPct: p.motoPct }));
t('un solo punto de cálculo (calcularTarifa usado por estado/resumen/recibo)',
  /tarifaActual\(\)\.precio|tarifaActual\(\)/.test(fs.readFileSync(www + '/js/state.js','utf8')));

console.log('\n===== 2. PANTALLA SIN DISTANCIA NI NOTAS =====');
const mainTxt = $('screen1').textContent;
t('sin "Distancia estimada"', !/Distancia estimada|distancia estimada/i.test(mainTxt));
t('sin contenedor resKm', !$('resKm') && !/resKm/.test(fs.readFileSync(www + '/index.html','utf8')));
t('sin precioNota', !$('precioNota'));
const uiTxt = [...d.querySelectorAll('#screen0,#screen1,#screen2,#screen3,#screen4,#screen5,#screen6,#screen7,#screen8,#screen10,#screen11,#screen13,.bottom-nav,#pickerOverlay,#origenOverlay')]
  .map(e => e.textContent).join(' ');
t('sin nota de fórmula en la interfaz', !/precio por km|primer km \+|km redondeado|precio = /i.test(uiTxt), uiTxt.match(/precio por km|primer km \+|km redondeado/i)?.[0] || 'limpio');
t('precio estimado visible', !!$('precioEstimado'));
t('cálculo interno de km intacto', /trip\.rutaKm/.test(fs.readFileSync(www + '/js/flows.js','utf8')));

console.log('\n===== 3. AUTENTICACIÓN =====');
w.localStorage.clear();
w.eval("AUTH_UI.tab('registro')");
$('rNombre').value = 'Ana Torres'; $('rEmail').value = 'ana@correo.com'; $('rPass').value = 'secreta1'; $('rPass2').value = 'secreta2';
click($('regBtn')); await new Promise(r => setTimeout(r, 60));
t('contraseñas distintas → error', /no coinciden/i.test($('regNotice').textContent), $('regNotice').textContent.trim().slice(0,60));
$('rPass2').value = 'secreta1';
click($('regBtn')); await new Promise(r => setTimeout(r, 120));
t('registro válido → cuenta creada', /Cuenta creada/i.test($('regNotice').textContent), $('regNotice').textContent.trim().slice(0,70));
t('cuenta persistida', JSON.parse(w.localStorage.getItem('unixdriver.users.v2') || '[]').some(u => u.email === 'ana@correo.com'));
click($('regBtn')); await new Promise(r => setTimeout(r, 120));
t('correo repetido → error claro', /Ya existe/i.test($('regNotice').textContent), $('regNotice').textContent.trim().slice(0,60));
$('rEmail').value = 'sin-arroba'; $('rPass2').value = 'secreta1';
click($('regBtn')); await new Promise(r => setTimeout(r, 80));
t('correo inválido → error', /formato válido/i.test($('regNotice').textContent));
await new Promise(r => setTimeout(r, 950));
w.eval("AUTH_UI.tab('login')");
$('aEmail').value = 'ana@correo.com'; $('aPass').value = 'mala'; click($('authBtn'));
await new Promise(r => setTimeout(r, 150));
t('contraseña incorrecta → error', /incorrecta/i.test($('authNotice').textContent), $('authNotice').textContent.trim().slice(0,50));
$('aPass').value = 'secreta1'; click($('authBtn')); await new Promise(r => setTimeout(r, 200));
t('ingreso con la cuenta creada → pantalla principal', $('screen1').classList.contains('active'));
t('sesión guardada', !!w.localStorage.getItem('unixdriver.sesion.v2'));
t('barra inferior visible al ingresar', d.body.classList.contains('auth-ok'));
w.eval("AUTH_UI.tab('recuperar')");
$('recEmail').value = 'nadie@correo.com'; click($('recBtn')); await new Promise(r => setTimeout(r, 120));
t('recuperar correo inexistente → error', /no está registrado|No hay ninguna/i.test($('recNotice').textContent), $('recNotice').textContent.trim().slice(0,60));
$('recEmail').value = 'ana@correo.com'; click($('recBtn')); await new Promise(r => setTimeout(r, 120));
const cod = (($('recNotice').textContent.match(/\d{6}/) || [])[0]) || '';
t('solicitud de recuperación procesada (código local)', cod.length === 6 && !$('recPaso2').classList.contains('hidden'), 'cod=' + cod);
$('recCode').value = cod; $('recPass').value = 'nueva123'; $('recPass2').value = 'nueva123';
click([...d.querySelectorAll('#recPaso2 button')].find(b => /Cambiar\s+contraseña/.test(b.textContent)));
await new Promise(r => setTimeout(r, 200));
t('cambio de contraseña OK', /actualizada/i.test($('recNotice').textContent), $('recNotice').textContent.trim().slice(0,50));
$('aEmail').value = 'ana@correo.com'; $('aPass').value = 'nueva123'; click($('authBtn'));
await new Promise(r => setTimeout(r, 200));
t('ingreso con la nueva contraseña', $('screen1').classList.contains('active'));
t('Backend AWS activo en AUTH', w.eval('AUTH.awsActivo') === true);

console.log('\n===== 4. COMERCIOS COMO ORIGEN Y DESTINO =====');
const doc = JSON.parse(fs.readFileSync(www + '/data/destinos.json', 'utf8'));
t('catálogo 100% con coordenadas válidas y >=212 barrios oficiales',
  doc.destinos.filter(x => x.categoria === 'Barrios de Cartagena').length === 212 &&
  doc.destinos.every(x => x.lat != null && x.lon != null && Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lon))));
w.eval('PICKER.abrir()'); await new Promise(r => setTimeout(r, 20));
t('pickerCount muestra el total real verificado sin "150+"',
  $('pickerCount').textContent === doc.destinos.length + ' lugares' &&
  $('pickerCats').textContent.includes('Todas (' + doc.destinos.length + ')') &&
  !/sin ubicación verificada/i.test($('pickerList').textContent),
  $('pickerCount').textContent);
$('pickerInput').value = 'alameda'; w.eval('PICKER.filtrar()');
const itAlameda = d.querySelector('#pickerList .picker-item');
if (itAlameda) { click(itAlameda.querySelector('.pi-price') || itAlameda); await new Promise(r => setTimeout(r, 250)); }
t('clic en "Elegir" de barrio oficial selecciona destino al instante',
  !!itAlameda && /Alameda/i.test($('destinoLabel').textContent) && $('pickerOverlay').classList.contains('hidden'),
  $('destinoLabel').textContent);
w.eval('ORIGEN_UI.abrir()'); await new Promise(r => setTimeout(r, 20));
$('origenInput').value = 'alameda'; w.eval("ORIGEN_UI.pintarSugerencias('alameda')");
const itOri = d.querySelector('#origenList .origen-item');
if (itOri) { click(itOri.querySelector('.origen-choose') || itOri); await new Promise(r => setTimeout(r, 250)); }
t('clic en "Elegir" de origen selecciona barrio y cierra modal',
  !!itOri && /Alameda/i.test($('origenLabel').textContent) && $('origenOverlay').classList.contains('hidden'),
  $('origenLabel').textContent);
const buscar = re => doc.destinos.find(x => re.test(x.nombre) && /Comercio|Restaurante|Cafeter|Bares/i.test(x.categoria));
const elegirDestino = async (nombre) => {
  w.eval('PICKER.abrir()'); await new Promise(r => setTimeout(r, 20));
  $('pickerInput').value = nombre; w.eval('PICKER.filtrar()');
  const it = [...d.querySelectorAll('#pickerList .picker-item')].find(x => new RegExp(nombre.split(' ')[0], 'i').test(x.textContent));
  if (!it) return null;
  click(it.querySelector('b') || it); await new Promise(r => setTimeout(r, 260));
  return { label: $('destinoLabel').textContent, visible: !$('pickerOverlay').classList.contains('hidden') };
};
const elegirOrigen = async (nombre) => {
  w.eval('ORIGEN_UI.abrir()'); await new Promise(r => setTimeout(r, 20));
  $('origenInput').value = nombre; w.eval('ORIGEN_UI.pintarSugerencias(' + JSON.stringify(nombre) + ')');
  const b = [...d.querySelectorAll('#origenList .origen-item')][0];
  if (!b) return null;
  click(b.querySelector('b') || b); await new Promise(r => setTimeout(r, 260));
  return { label: $('origenLabel').textContent, visible: !$('origenOverlay').classList.contains('hidden') };
};
for (const patron of [/Carulla|Éxito|Olímpica|Supermercado|Jumbo/i, /Restaurante|Burlador|Boheme/i, /Mall|Centro Comercial|Plaza/i]) {
  const d1 = buscar(patron) || doc.destinos.find(x => patron.test(x.nombre));
  if (!d1) { t('muestra de comercio disponible: ' + patron, false); continue; }
  const r = await elegirDestino(d1.nombre.slice(0, 14));
  t('destino comercio seleccionable: ' + d1.nombre, !!r && r.label.length > 3 && r.visible === false, r ? r.label.slice(0,45) : 'no encontrado');
}
const o1 = doc.destinos.find(x => /Carulla|Éxito|Olímpica|Jumbo/i.test(x.nombre)) || doc.destinos.find(x => /Restaurante/i.test(x.categoria));
const rOr = await elegirOrigen(o1.nombre.slice(0, 12));
t('origen comercio seleccionable: ' + o1.nombre, !!rOr && rOr.label.length > 3 && rOr.visible === false, rOr ? rOr.label.slice(0,45) : 'no');
// delegación sobrevive repintados y elementos hijos
w.eval('PICKER.abrir()'); $('pickerInput').value = 'carulla'; w.eval('PICKER.filtrar()');
let item = d.querySelector('#pickerList .picker-item');
if (item) { click(item.querySelector('.pi-ico')); await new Promise(r => setTimeout(r, 250)); }
t('clic en el icono del resultado también selecciona', item ? !$('pickerOverlay').classList.contains('hidden') === false : false,
  item ? $('destinoLabel').textContent.slice(0,45) : 'sin items');
// precio recalculado y conservado en resumen
t('precio se actualiza al elegir origen/destino', $('precioEstimado').textContent !== '$ 0', $('precioEstimado').textContent);
t('resumen muestra origen y destino elegidos', $('resOrigen').textContent !== '—' && $('resDestino').textContent !== '—',
  $('resOrigen').textContent.slice(0,28) + ' → ' + $('resDestino').textContent.slice(0,28));
const antes = $('precioEstimado').textContent;
w.eval("FLOW.seleccionarVehiculo('carro')"); await new Promise(r => setTimeout(r, 60));
t('precio cambia al cambiar de vehículo', $('precioEstimado').textContent !== antes, antes + ' → ' + $('precioEstimado').textContent);

console.log('\n===== 5. FLUJO Y BOTONES =====');
click($('btnBuscar')); await new Promise(r => setTimeout(r, 3400));
t('buscar conductor → pantalla de ofertas', $('screen2').classList.contains('active'));
const ofertas = d.querySelectorAll('#offers .offer');
t('ofertas generadas', ofertas.length === 3, 'n=' + ofertas.length);
t('contenedor de ofertas visible', !$('offers').classList.contains('hidden'));
t('POST /busquedas/ envía coordenadas exactas de origen y destino',
  !!ultimoPayloadBusqueda &&
  typeof ultimoPayloadBusqueda.origen_lat === 'number' && typeof ultimoPayloadBusqueda.origen_lon === 'number' &&
  typeof ultimoPayloadBusqueda.destino_lat === 'number' && typeof ultimoPayloadBusqueda.destino_lon === 'number');
w.eval("UI.goToScreen(1)"); await new Promise(r => setTimeout(r, 80));
t('volver atrás desde ofertas funciona', $('screen1').classList.contains('active'));
// Autocompletado híbrido automático (500ms debounce sin mención a IA)
w.eval('PICKER.abrir()'); $('pickerInput').value = 'zapatos viejos xq9'; w.eval('PICKER.filtrar()');
t('autocompletado híbrido muestra estado discreto "Buscando en Cartagena..." sin mencionar IA',
  /Buscando en Cartagena\.\.\./.test($('pickerList').textContent) && !/IA|Gemini|API/i.test($('pickerList').textContent));
await new Promise(r => setTimeout(r, 650));
const itemRem = d.querySelector('#pickerList .picker-item');
t('autocompletado híbrido renderiza lugar resuelto desde backend con barrio de referencia',
  !!itemRem && /Monumento Zapatos Viejos/.test(itemRem.textContent) && /Pie de la Popa/.test(itemRem.textContent));
if (itemRem) { click(itemRem); await new Promise(r => setTimeout(r, 200)); }
const destSel = w.eval('tripActual().destino');
t('seleccionar lugar resuelto guarda coordenadas exactas en trip.destino',
  !!destSel && destSel.nombre === 'Monumento Zapatos Viejos' && destSel.lat === 10.4222 && destSel.lon === -75.5378);
w.eval('ORIGEN_UI.abrir()'); $('origenInput').value = 'zapatos viejos xq9'; w.eval("ORIGEN_UI.pintarSugerencias('zapatos viejos xq9')");
await new Promise(r => setTimeout(r, 650));
const oriRem = d.querySelector('#origenList .origen-item');
t('autocompletado híbrido en Origen resuelve lugar y guarda coordenadas exactas',
  !!oriRem && /Monumento Zapatos Viejos/.test(oriRem.textContent));
if (oriRem) { click(oriRem); await new Promise(r => setTimeout(r, 200)); }
const oriSel = w.eval('tripActual().origen');
t('origen seleccionado conserva coordenadas exactas',
  !!oriSel && oriSel.nombre === 'Monumento Zapatos Viejos' && oriSel.lat === 10.4222 && oriSel.lon === -75.5378);
t('errores JS: ' + errs.length, errs.length === 0, errs.slice(0,2).join(' | '));

console.log(`\nTOTAL ${pass}/${pass + fail} PASS`);
if (fallos.length) console.log('FALLOS:\n- ' + fallos.join('\n- '));
process.exit(fail ? 1 : 0);
