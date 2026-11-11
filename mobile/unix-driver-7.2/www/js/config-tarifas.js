'use strict';
/* ============================================================
   UniX Driver · Configuración interna de tarifas (administrable)
   ------------------------------------------------------------
   Los precios comerciales NO vienen escritos en el código: se
   definen aquí y se guardan en el dispositivo. Mientras no haya
   valores, la app muestra «Tarifa no configurada» y no permite
   solicitar el viaje (nunca inventa una cifra).
   ============================================================ */

const LS_TARIFAS = 'unixdriver.tarifas.v1';

const CONFIG_UI = (() => {
  const el = id => document.getElementById(id);
  const aviso = (t, cls) => { const n = el('cfgNotice'); if (n) { n.textContent = t; n.className = 'notice ' + (cls || ''); } };

  const num = v => {
    const t = String(v == null ? '' : v).replace(/[^\d.]/g, '');
    if (!t) return null;
    const n = Number(t);
    return isFinite(n) && n >= 0 ? n : null;
  };
  const txt = v => (v == null ? '' : String(v));

  function parametros() {
    const c = window.UNIX_CONFIG && UNIX_CONFIG.tarifas;
    if (!c.parametros) c.parametros = {};
    const p = c.parametros;
    p.base = p.base || { moto: null, carro: null };
    p.primerKm = p.primerKm || { moto: null, carro: null };
    p.porKm = p.porKm || { moto: null, carro: null };
    p.minimo = p.minimo || { moto: null, carro: null };
    return p;
  }

  function pintar() {
    const p = parametros();
    const set = (id, v) => { const e = el(id); if (e) e.value = txt(v); };
    const ini = p.primerKm || p.base;
    set('cfgBaseMoto', ini.moto); set('cfgBaseCarro', ini.carro);
    set('cfgKmMoto', p.porKm.moto); set('cfgKmCarro', p.porKm.carro);
    set('cfgMinMoto', p.minimo.moto); set('cfgMinCarro', p.minimo.carro);
    set('cfgRedondeo', p.redondeo == null ? '' : p.redondeo);
    const r = (p.recargos || [])[0];
    set('cfgRecPct', r && r.pct != null ? Math.round(Number(r.pct) * 100) : '');
    const est = (window.UNIX_CONFIG.tarifas.estado || '').toUpperCase();
    aviso(est === 'DEFINITIVO' ? 'Tarifas marcadas como definitivas.' : 'Aún no hay precios comerciales definidos: hasta que los guardes, la app no muestra precio.', '');
  }

  function abrir() { pintar(); const o = el('cfgOverlay'); if (o) o.classList.remove('hidden'); }
  function cerrar() { const o = el('cfgOverlay'); if (o) o.classList.add('hidden'); }

  function guardar() {
    const p = parametros();
    const iniMoto = num(el('cfgBaseMoto').value), iniCarro = num(el('cfgBaseCarro').value);
    p.primerKm = { moto: iniMoto, carro: iniCarro };
    p.base = { moto: iniMoto, carro: iniCarro };
    p.modo = 'tramos';
    p.porKm = { moto: num(el('cfgKmMoto').value), carro: num(el('cfgKmCarro').value) };
    p.minimo = { moto: num(el('cfgMinMoto').value), carro: num(el('cfgMinCarro').value) };
    p.redondeo = num(el('cfgRedondeo').value);
    const pct = num(el('cfgRecPct').value);
    p.recargos = pct ? [{ id: 'trayecto-largo', nombre: 'Recargo por distancia', activo: true, desde_km: 15, pct: pct / 100 }]
                     : [{ id: 'trayecto-largo', nombre: 'Recargo por distancia', activo: false, desde_km: 15, pct: 0 }];
    const okMoto = p.primerKm.moto != null && p.porKm.moto != null && p.minimo.moto != null;
    const okCarro = p.primerKm.carro != null && p.porKm.carro != null && p.minimo.carro != null;
    window.UNIX_CONFIG.tarifas.estado = (okMoto && okCarro) ? 'definitivo' : 'inicial_aproximado';
    try { localStorage.setItem(LS_TARIFAS, JSON.stringify({ modo: 'tramos', primerKm: p.primerKm, base: p.base, porKm: p.porKm, minimo: p.minimo, redondeo: p.redondeo, recargos: p.recargos, estado: UNIX_CONFIG.tarifas.estado })); } catch (_) {}
    const ok = typeof FLOW !== 'undefined' && FLOW.actualizarPrecio;
    if (ok) FLOW.actualizarPrecio();
    aviso(ok ? 'Parámetros guardados.' : 'Parámetros guardados.', 'success');
  }

  function restablecer() {
    const p = parametros();
    p.base = { moto: null, carro: null }; p.primerKm = { moto: null, carro: null };
    p.porKm = { moto: null, carro: null }; p.minimo = { moto: null, carro: null };
    p.redondeo = 500;
    p.recargos = [{ id: 'trayecto-largo', nombre: 'Recargo por distancia', activo: false, desde_km: 15, pct: 0 }];
    window.UNIX_CONFIG.tarifas.estado = 'por_definir';
    try { localStorage.removeItem(LS_TARIFAS); } catch (_) {}
    pintar();
    if (typeof FLOW !== 'undefined' && FLOW.actualizarPrecio) FLOW.actualizarPrecio();
    aviso('Configuración borrada. La app no mostrará precios hasta que definas los parámetros.', '');
  }

  /* Carga lo guardado en el dispositivo al arrancar */
  function cargar() {
    let g = null;
    try { g = JSON.parse(localStorage.getItem(LS_TARIFAS) || 'null'); } catch (_) {}
    if (!g || (!g.base && !g.primerKm)) return false;
    const p = parametros();
    if (g.primerKm) p.primerKm = g.primerKm; else if (g.base) p.primerKm = g.base;
    if (g.base) p.base = g.base;
    p.porKm = g.porKm; p.minimo = g.minimo;
    if (g.redondeo != null) p.redondeo = g.redondeo;
    if (g.recargos) p.recargos = g.recargos;
    if (g.estado) window.UNIX_CONFIG.tarifas.estado = g.estado;
    return true;
  }
  cargar();

  return { abrir, cerrar, guardar, restablecer, cargar };
})();
