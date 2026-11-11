# UniX Driver · Mapas, geolocalización y tarifas

## 1. Proveedor de mapas y rutas (conmutable)

La app habla con el proveedor a través de `config/tarifas.js → mapas.proveedor`.

| Proveedor | Valor | Clave | Servicios | Límites de uso |
|---|---|---|---|---|
| OpenStreetMap / OSRM (por defecto) | `osm` | No requiere | Rutas: `router.project-osrm.org/route/v1/driving/{lon},{lat};{lon},{lat}` · Geocodificación: `nominatim.openstreetmap.org/search` y `/reverse` · Teselas: `tile.openstreetmap.org` | Servidor de demostración de OSRM y Nominatim: uso moderado, 1 req/s recomendado, sin SLA. Producción: alojar OSRM/Nominatim propios o contratar un proveedor. Política de uso de Nominatim: máximo 1 petición por segundo y User-Agent identificable. |
| Google Maps Platform | `google` | `mapas.google.apiKey` | Directions API (`maps.googleapis.com/maps/api/directions/json`) y Geocoding API | Requiere cuenta de facturación; cuotas por SKU (crédito mensual incluido según plan vigente). |

**Permisos Android necesarios** (`AndroidManifest.xml`):

- `android.permission.INTERNET` — mapas, teselas y rutas.
- `android.permission.ACCESS_NETWORK_STATE` — detectar falta de conexión.
- `android.permission.ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` — «Usar mi ubicación actual» como origen. Se solicita en tiempo de ejecución; si el usuario lo niega, el origen se elige manualmente.

**Regla de distancia.** `MAPA.calcular()` devuelve `km` solo cuando el proveedor respondió con una ruta vial. `lineaRectaKm` se informa aparte y **nunca** se usa para cobrar: si no hay ruta, la app muestra el error, deja el precio vacío y bloquea la solicitud.

## 2. Tarifas por kilómetro

Todo se edita en `config/tarifas.js → tarifas.parametros` (no hay precios dentro de los destinos):

```js
parametros: {
  base:    { moto: null, carro: null },   // POR DEFINIR
  porKm:   { moto: null, carro: null },   // POR DEFINIR
  minimo:  { moto: null, carro: null },   // POR DEFINIR
  redondeo: 500,
  recargos: [{ id: 'trayecto-largo', desde_km: 15, pct: 0.20, activo: true }]
}
```

Fórmula: `precio = redondeo(base + km × porKm)`, aplicando recargos y luego el mínimo.

- Si un valor es `null`, la app muestra **«Tarifa no configurada»** y no permite solicitar el viaje. No se inventa ninguna cifra.
- Los valores del modelo anterior por zonas quedan en `tarifas.historico` solo como referencia.
- Editable también desde la app: la configuración vive en un único objeto en memoria (`window.UNIX_CONFIG`); una futura pantalla administrativa puede sobrescribir esos valores y persistirlos sin tocar el código.
