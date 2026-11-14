'use strict';
/* ============================================================
   UniX Driver · CONFIGURACIÓN CENTRAL
   ------------------------------------------------------------
   Todo lo configurable del servicio vive aquí. Nada de precios
   está escrito en el código de los destinos: si se cambia este
   archivo (o la configuración administrativa dentro de la app)
   cambian los precios de los 747 lugares a la vez.

   IMPORTANTE SOBRE LAS TARIFAS
   ----------------------------
   `parametros` contiene los valores del modelo anterior,
   conservados como REFERENCIA operativa provisional
   (estado: 'provisional'). No son precios comerciales
   definitivos: reemplázalos por los que definas.
   Si dejas un valor en null, la app NO muestra precio y avisa
   «Tarifa no configurada» en lugar de inventar una cifra.
   ============================================================ */

window.UNIX_CONFIG = {
  version: '1.0.0',

  /* ---------- Tarifas por kilómetro ---------- */
  tarifas: {
    moneda: 'COP',
    // 'inicial_aproximado' → tabla inicial cargada (editable)
    // 'definitivo'         → valores comerciales ya aprobados
    estado: 'inicial_aproximado',

    // Para dejar una tarifa SIN definir usa null: la app mostrará
    // «Tarifa no configurada» y no permitirá solicitar el viaje.
    parametros: {
      // 'tramos'  → precio = primerKm + ((kmCobrable - 1) × porKm)
      //             kmCobrable = max(1, ceil(km))  (se redondea al km completo)
      // 'lineal'  → precio = base + km × porKm  (modelo anterior, opcional)
      modo: 'tramos',

      // Valores INICIALES aproximados definidos por el negocio.
      // Editables desde la app (Cuenta → ⚙️ Tarifas) o aquí mismo.
      primerKm: { moto: 5000, carro: 5000 },   // incluye el primer kilómetro
      porKm:    { moto: 3000, carro: 3000 },   // cada kilómetro adicional
      minimo:   { moto: 5000, carro: 10000 },  // tarifas mínimas por vehículo (COP)
      // La motocicleta se calcula como este porcentaje del precio del automóvil.
      motoPct: 0.45,
      base:     { moto: 2000, carro: 2000 },   // solo se usa si modo = 'lineal'

      redondeo: 500,
      recargos: [
        // Desactivado por defecto; se puede activar y dar un % desde la app.
        { id: 'trayecto-largo', nombre: 'Recargo por distancia', activo: false, desde_km: 15, pct: 0 }
      ]
    },

    // Tabla de referencia con la que se validan los valores iniciales.
    referencia: {
      nota: 'Configuración inicial aproximada; no son precios comerciales definitivos.',
      formula: 'auto = 5.000 + ((km - 1) × 3.000), mínimo 10.000 · moto = auto × 0,45, mínimo 5.000',
      tabla: [
        { km: 1, carro: 10000, moto: 5000 }, { km: 2, carro: 10000, moto: 5000 },
        { km: 3, carro: 11000, moto: 5000 }, { km: 4, carro: 14000, moto: 6300 },
        { km: 5, carro: 17000, moto: 7650 }, { km: 6, carro: 20000, moto: 9000 },
        { km: 7, carro: 23000, moto: 10350 }, { km: 8, carro: 26000, moto: 11700 },
        { km: 9, carro: 29000, moto: 13050 }, { km: 10, carro: 32000, moto: 14400 }
      ]
    },

    // Referencia histórica del modelo por zonas (ya NO se usa para cobrar).
    historico: {
      nota: 'Tarifas fijas por zona vigentes antes del cálculo por kilómetro.',
      corto: { moto: 5000, carro: 15000, rango: 'hasta 3 km' },
      medio: { moto: 9000, carro: 20000, rango: '3 – 7 km' },
      largo: { moto: 14000, carro: 32000, rango: 'más de 7 km' }
    }
  },

  /* ---------- Mapas y rutas ---------- */
  mapas: {
    // 'osm' (por defecto, sin claves) | 'google' (requiere apiKey)
    proveedor: 'osm',
    osm: {
      osrm: 'https://router.project-osrm.org',
      nominatim: 'https://nominatim.openstreetmap.org',
      teselas: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      teselasAlt: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      atribucion: '© OpenStreetMap · rutas OSRM',
      timeoutMs: 9000
    },
    google: {
      // Rellenar para usar Google Maps Platform (Directions + Geocoding).
      apiKey: null,
      directions: 'https://maps.googleapis.com/maps/api/directions/json',
      geocode: 'https://maps.googleapis.com/maps/api/geocode/json'
    }
  },

  /* ---------- Backend API REST (inyectado desde .env vía config/api-env.js) ---------- */
  api: {
    baseUrl: (typeof window !== 'undefined' && window.UNIX_API_URL) || 'http://localhost:8000',
    fallbackUrls: [],
    timeoutMs: 8000
  },

  /* ---------- Integraciones de plataformas ----------
     'aws_rest'      → cotización y persistencia en el backend FastAPI (AWS EC2 + S3 + RDS)
                       con respaldo local automático si no hay red.
     'no_integrado'  → las tarifas comparadas se calculan localmente. */
  integraciones: {
    plataformas: 'aws_rest',
    pagos: 'aws_rest',
    autenticacion: 'aws_rds'
  },

  /* ---------- Origen por defecto (solo sugerencia, no obligatorio) ---------- */
  origenSugerido: {
    nombre: 'Universidad de Cartagena · Piedra de Bolívar',
    direccion: 'Sede Piedra de Bolívar, Cartagena',
    lat: 10.401904,
    lon: -75.508695
  }
};
