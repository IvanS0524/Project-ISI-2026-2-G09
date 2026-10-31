'use strict';
/* Pruebas de humo contra un servidor en marcha. Uso: npm run smoke  (o BASE=http://host:puerto) */
const BASE = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 3000);

const res = [];
const check = (nombre, ok, extra) => res.push([ok ? 'PASS' : 'FAIL', nombre, extra]);

async function req(path, options) {
  const r = await fetch(BASE + path, options);
  let d = {};
  try { d = await r.json(); } catch (_) {}
  return { status: r.status, ok: r.ok, data: d };
}
const post = (p, body) => req(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const patch = (p, body) => req(p, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });

(async () => {
  const h = await req('/api/health');
  check('GET /api/health responde', h.ok, 'barrios=' + (h.data.barrios) + ' viajes=' + h.data.viajes);

  const b = await req('/api/barrios');
  check('GET /api/barrios devuelve 212', b.ok && b.data.barrios.length === 212, 'n=' + (b.data.barrios || []).length);

  const laBoquilla = (b.data.barrios || []).find(x => /boquilla/i.test(x.nombre));
  check('La Boquilla existe con tarifa larga', !!laBoquilla && laBoquilla.zona === 'largo' && laBoquilla.tarifa_moto === 14000,
    laBoquilla ? laBoquilla.zona + ' ' + laBoquilla.tarifa_moto + '/' + laBoquilla.tarifa_carro : 'no encontrada');

  const p1 = await req('/api/price?destino=Bocagrande&vehiculo=moto');
  check('Cotización Bocagrande moto', p1.ok && p1.data.tarifa === 9000, 'tarifa=' + p1.data.tarifa + ' comision=' + p1.data.comision);

  const p2 = await req('/api/price?destino=La%20Boquilla&vehiculo=carro');
  check('Cotización La Boquilla carro (antes restringida)', p2.ok && p2.data.tarifa === 32000, 'tarifa=' + p2.data.tarifa);

  const p3 = await req('/api/price?destino=BarrioInexistente&vehiculo=moto');
  check('Barrio inexistente devuelve 404', p3.status === 404 && p3.data.code === 'BARRIO_NO_ENCONTRADO', p3.data.code);

  const ruta = await req('/api/ruta?id=' + (laBoquilla ? laBoquilla.id : 1));
  check('Ruta OSRM o estimación local', ruta.ok && ruta.data.distancia_km > 0, 'fuente=' + ruta.data.fuente + ' km=' + ruta.data.distancia_km);

  const v = await post('/api/viajes', { barrio_destino: 'Bocagrande', vehiculo: 'carro' });
  check('POST /api/viajes crea el viaje', v.status === 201 && v.data.viaje.id > 0, 'id=' + (v.data.viaje || {}).id + ' folio=' + (v.data.viaje || {}).folio);
  const id = (v.data.viaje || {}).id;

  const o = await post('/api/viajes/' + id + '/ofertas');
  check('Se generan 3 ofertas', o.ok && o.data.ofertas.length === 3, (o.data.ofertas || []).map(x => x.plataforma + ':' + x.precio).join(' '));

  const o2 = await post('/api/viajes/' + id + '/ofertas');
  check('Las ofertas se reutilizan (no se duplican)', o2.ok && o2.data.reutilizadas === true, 'reutilizadas=' + o2.data.reutilizadas);

  const sel = await patch('/api/ofertas/' + o.data.ofertas[0].id + '/seleccionar', {});
  check('Seleccionar oferta asigna conductor', sel.ok && sel.data.viaje.estado === 'asignado', 'estado=' + (sel.data.viaje || {}).estado + ' conductor=' + (sel.data.viaje || {}).conductor_nombre);

  const enCurso = await patch('/api/viajes/' + id, { estado: 'en_curso' });
  check('Estado en_curso', enCurso.ok && enCurso.data.viaje.estado === 'en_curso' && !!enCurso.data.viaje.iniciado_en, 'iniciado_en=' + enCurso.data.viaje.iniciado_en);

  const fin = await patch('/api/viajes/' + id, { estado: 'finalizado' });
  check('Estado finalizado', fin.ok && fin.data.viaje.estado === 'finalizado', 'finalizado_en=' + fin.data.viaje.finalizado_en);

  const malo = await patch('/api/viajes/' + id, { estado: 'inventado' });
  check('Estado inválido rechazado (400)', malo.status === 400 && malo.data.code === 'ESTADO_INVALIDO', malo.data.code);

  const pago = await post('/api/viajes/' + id + '/pago', { metodo: 'tarjeta' });
  const tarifaViaje = Number(fin.data.viaje.tarifa);
  check('Registro de pago', pago.status === 201 && Number(pago.data.pago.monto) === tarifaViaje &&
    Number(pago.data.pago.comision) === Math.round(tarifaViaje * 0.10),
    'folio=' + (pago.data.pago || {}).folio + ' monto=' + (pago.data.pago || {}).monto + ' comision=' + (pago.data.pago || {}).comision);

  const vp = await req('/api/viajes/' + id);
  check('Viaje queda en estado pagado', vp.ok && vp.data.viaje.estado === 'pagado', 'estado=' + vp.data.viaje.estado);
  check('El viaje guarda ofertas, pago y eventos', vp.data.ofertas.length === 3 && vp.data.pagos.length === 1 && vp.data.eventos.length >= 4,
    'ofertas=' + vp.data.ofertas.length + ' pagos=' + vp.data.pagos.length + ' eventos=' + vp.data.eventos.length);

  const comp = await fetch(BASE + '/api/viajes/' + id + '/comprobante');
  const html = await comp.text();
  check('Comprobante imprimible', comp.ok && /Comprobante de servicio/.test(html) && html.includes((vp.data.viaje.folio || '')), 'bytes=' + html.length);

  const hist = await req('/api/viajes?limit=10');
  check('Historial devuelve viajes', hist.ok && hist.data.viajes.length >= 1, 'total=' + hist.data.total);

  const filtro = await req('/api/viajes?estado=pagado&vehiculo=carro');
  check('Filtros de historial', filtro.ok && filtro.data.viajes.every(x => x.estado === 'pagado' && x.vehiculo === 'carro'),
    'n=' + filtro.data.viajes.length);

  const pagos = await req('/api/pagos');
  check('Listado de pagos con totales', pagos.ok && pagos.data.cobrado >= 20000, 'cobrado=' + pagos.data.cobrado + ' comisiones=' + pagos.data.comisiones);

  const est = await req('/api/estadisticas');
  check('Estadísticas', est.ok && est.data.resumen.total >= 1, 'total=' + (est.data.resumen || {}).total + ' facturado=' + (est.data.resumen || {}).facturado);

  const cancel = await post('/api/viajes', { barrio_destino: 'Manga', vehiculo: 'moto' });
  const c2 = await patch('/api/viajes/' + cancel.data.viaje.id, { estado: 'cancelado' });
  check('Cancelación de viaje', c2.ok && c2.data.viaje.estado === 'cancelado', 'estado=' + c2.data.viaje.estado);
  const pagoCancel = await post('/api/viajes/' + cancel.data.viaje.id + '/pago', { metodo: 'efectivo' });
  check('No se cobra un viaje cancelado (409)', pagoCancel.status === 409, pagoCancel.data.code);

  const fallos = res.filter(r => r[0] === 'FAIL');
  res.forEach(r => console.log(r[0] + ' · ' + r[1] + (r[2] ? '  → ' + r[2] : '')));
  console.log('\nRESUMEN ' + (res.length - fallos.length) + '/' + res.length);
  console.log('SMOKE_EXIT=' + (fallos.length ? 1 : 0));
  process.exit(fallos.length ? 1 : 0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
