'use strict';
/* ============================================================
   UniX Driver · Almacenamiento persistente
   ------------------------------------------------------------
   Usa Capacitor Preferences si el plugin está instalado; si no,
   localStorage del WebView (que también persiste al cerrar la app).
   Los datos sobreviven a cerrar la aplicación y a reiniciar el móvil.
   ============================================================ */

const STORE = (() => {
  const plugin = () => {
    try {
      const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;
      return P && typeof P.get === 'function' ? P : null;
    } catch (_) { return null; }
  };
  const motor = () => (plugin() ? 'Preferences' : 'localStorage');

  async function getJSON(clave, porDefecto) {
    const P = plugin();
    if (P) {
      try {
        const r = await P.get({ key: clave });
        if (r && r.value) return JSON.parse(r.value);
      } catch (_) {}
    }
    try {
      const v = localStorage.getItem(clave);
      return v ? JSON.parse(v) : porDefecto;
    } catch (_) { return porDefecto; }
  }

  async function setJSON(clave, valor) {
    const P = plugin();
    const txt = JSON.stringify(valor);
    if (P) { try { await P.set({ key: clave, value: txt }); } catch (_) {} }
    try { localStorage.setItem(clave, txt); } catch (_) {}
  }

  async function remove(clave) {
    const P = plugin();
    if (P) { try { await P.remove({ key: clave }); } catch (_) {} }
    try { localStorage.removeItem(clave); } catch (_) {}
  }

  function limpiarHistorialEnMemoria() {
    try {
      if (typeof window !== 'undefined' && typeof window.limpiarHistorialEnMemoria === 'function') {
        window.limpiarHistorialEnMemoria();
      }
    } catch (_) {}
  }

  return { getJSON, setJSON, remove, motor, limpiarHistorialEnMemoria };
})();
