# CONFIGURACIÓN DE SERVICIOS EXTERNOS — UniX Driver · Cartagena 7.2

Todo lo de este documento se configura **desde archivos del propio proyecto**, sin tocar el
código de las pantallas. Antes de empezar, esto es lo que el APK 7.2 usa realmente:

| Servicio | ¿Se usa en 7.2? | ¿Necesita clave / cuenta? |
|---|---|---|
| OSRM público (rutas por carretera) | **Sí, servicio real** | **No.** Uso libre y sin clave |
| Nominatim (geocodificación) | **Sí, servicio real** | **No.** Uso libre con límite de cortesía |
| Photon (geocodificación de respaldo) | **Sí, servicio real** | **No** |
| Teselas OpenStreetMap | **Sí, servicio real** | **No** |
| Leaflet 1.9 | **Sí**, empaquetado en `www/vendor/leaflet/` | **No.** Ya incluido |
| Firebase Authentication | **Opcional, desactivado** (`apiKey: null`) | **Sí, tuya** |
| Google Maps / Directions | **Opcional, desactivado** | **Sí, tuya** |
| DiDi / Uber / inDrive (API de flota) | **No integradas** | — (ver §5) |
| Pasarela de pagos | **No integrada** | — (ver §6) |

> **Honestidad sobre lo simulado:** las *ofertas de conductores* (nombres, placas, ETA, precio
> por plataforma) se generan en el código (`www/js/flows.js`, función `mostrarOfertas`) a partir
> de la tarifa calculada. **No hay una API real de Uber/DiDi/inDrive llamada**: esas
> plataformas no ofrecen una API pública de despacho, así que en el APK 7.2 ese paso es una
> demostración del flujo. Lo mismo ocurre con el pago: se registra el método elegido y se
> genera el comprobante local, sin cobro real. Todo lo demás (registro, sesión, búsqueda de
> 861 lugares, cálculo por kilómetros, ruta real por carretera, historial) es funcional.

---

## 1. Rutas por carretera — OSRM (ya funciona, sin claves)

```
https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
```

- Ojo con el orden: **longitud primero, latitud después**.
- Servidor de demostración de OSM: sin clave, con límites de uso razonables.
- Si publicas la app en tienda, monta tu propio OSRM (Docker `osrm/osrm-backend` con el extracto
  de Colombia) y cambia la URL en un solo sitio:

`www/config/tarifas.js`

```js
mapas: {
  proveedor: 'osm',                                  // 'osm' | 'google'
  osrm:    'https://router.project-osrm.org',
  nominatim: 'https://nominatim.openstreetmap.org',
  teselas: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  timeoutMs: 9000
}
```

La app **nunca** presenta la distancia en línea recta como si fuera la del recorrido: si OSRM
falla, no muestra precio y avisa del problema.

---

## 2. Geocodificación — Nominatim y Photon (ya funciona, sin claves)

Se usan para buscar direcciones escritas a mano y para el botón de GPS (geocodificación
inversa). Reglas de cortesía de OSM, ya respetadas en el código: máximo ~1 petición por segundo
por usuario y un `User-Agent` identificable. No requiere registro.

Si necesitas más volumen, la alternativa es un servicio de pago (LocationIQ, MapTiler,
Geoapify). Para cambiarlo, edita `nominatim` en el bloque `mapas` y en `www/js/mapa.js` las
funciones `osmGeocodificar` / `osmGeocodificarInverso`.

---

## 3. Firebase Authentication (opcional — necesitas tus propias credenciales)

**Estado actual:** `www/config/firebase-config.js` tiene las claves en `null`, así que la app
funciona con **cuentas locales reales** en el dispositivo (contraseña con SHA-256 y sal,
registro, ingreso y recuperación por código de 6 dígitos). **No hay ningún mensaje de éxito
falso**: la recuperación local dice explícitamente que el código se genera en el teléfono
porque no hay servidor de correo.

Para usar correo real de restablecimiento y cuentas en la nube:

1. Crea un proyecto en <https://console.firebase.google.com>.
2. **Authentication → Sign-in method → Correo electrónico/contraseña: habilitar.**
   (Opcional: habilita también el proveedor de Google si vas a usar «Continuar con Google».)
3. **Configuración del proyecto → Tus apps → Web (`</>`)** y copia los datos.
4. Rellena `www/config/firebase-config.js`:

```js
window.UNIX_FIREBASE = {
  apiKey: 'AIzaSy...',                          // pública por diseño, no es un secreto
  authDomain: 'unix-driver.firebaseapp.com',
  projectId: 'unix-driver'
};
```

5. `npm run sync` y vuelve a compilar.

Qué cambia al rellenarlo (implementado en `www/js/auth.js`):

| Acción | Sin claves (estado 7.2) | Con claves |
|---|---|---|
| Crear cuenta | Local en el dispositivo | `accounts:signUp` en Firebase **y** copia local |
| Ingresar | Verifica hash local | Verifica local; si no existe, `signInWithPassword` |
| Recuperar contraseña | Código de 6 dígitos en pantalla | `accounts:sendOobCode` → **correo real con enlace** |
| Sin internet | Funciona | Requiere conexión |
| Google | Aviso «Firebase no configurado» | Pendiente de habilitar el proveedor en consola |

Los errores de Firebase se traducen a español (`EMAIL_EXISTS`, `EMAIL_NOT_FOUND`,
`WEAK_PASSWORD`, `TOO_MANY_ATTEMPTS_TRY_LATER`, `NETWORK_REQUEST_FAILED`…).

**Credenciales que debes obtener tú:** `apiKey`, `authDomain` y `projectId`. No se incluyen.

**Nota sobre `google-services.json`:** solo es necesario si añades notificaciones push o algún
plugin nativo de Firebase. La autenticación de este proyecto va por REST desde el JavaScript,
así que **no hace falta** ese archivo.

---

## 4. Google Maps Platform (opcional)

El código ya trae el conmutador (`www/js/mapa.js`: `proveedor()` devuelve `'google'` solo si
`proveedor === 'google'` **y** hay `apiKey`).

1. En <https://console.cloud.google.com>: crea un proyecto, activa **facturación**.
2. Habilita **Maps JavaScript API**, **Directions API** y **Geocoding API**.
3. Crea una clave de API y **restríngela** por aplicación Android
   (`com.unixdriver.cartagena` + la huella SHA-1 de tu llave de firma).
4. En `www/config/tarifas.js`:

```js
mapas: { proveedor: 'google', google: { apiKey: 'TU_CLAVE', directions: 'https://maps.googleapis.com/maps/api/directions/json', geocode: 'https://maps.googleapis.com/maps/api/geocode/json' } }
```

Con `proveedor: 'google'` la distancia cobrada pasa a ser la de Directions (tráfico real) y el
mapa deja de usar teselas de OSM.

**Credenciales que debes obtener tú:** la clave de API de Google (tiene costo por uso).
Sin clave, la app sigue funcionando con OSM como hasta ahora.

---

## 5. Tarifas (no es un servicio externo, pero es la configuración clave)

`www/config/tarifas.js`:

```js
parametros: {
  modo: 'tramos',
  primerKm: { moto: 5000, carro: 5000 },
  porKm:    { moto: 3000, carro: 3000 },
  minimo:   { moto: 5000, carro: 10000 },
  motoPct:  0.45,
  redondeo: 500
}
```

- **Automóvil:** `precio = máx(10.000, 5.000 + (km−1) × 3.000)`
- **Motocicleta:** `precio = máx(5.000, round(precio_auto × 0,45))`
- El 45 % se aplica **una vez**, sobre el precio final del auto.
- El usuario también puede editar estos valores en la app: **Cuenta → ⚙️ Tarifas**
  (se guardan en el dispositivo y mandan sobre las de fábrica).

---

## 6. Integraciones que NO están hechas (y qué haría falta)

| Función | Estado real en 7.2 | Para integrarla de verdad |
|---|---|---|
| Ofertas de Uber / DiDi / inDrive | Generadas localmente para mostrar el flujo | Acuerdo comercial + API privada de cada plataforma; no existe API pública de despacho |
| Seguimiento del conductor en vivo | Cambios de estado locales con temporizador | Backend con WebSocket y app de conductor |
| Pago con tarjeta / PSE / Nequi | Se registra el método elegido y se emite comprobante local | Pasarela (Wompi, Mercado Pago, PayU) + backend que reciba la confirmación |
| Notificaciones push | No incluidas | Firebase Cloud Messaging + `google-services.json` |
| Conductores reales | No hay backend de flota | Servidor propio (Node/MySQL, como el proyecto de escritorio) expuesto por HTTPS |

Los logos de Uber, DiDi e inDrive se incluyen **solo como referencia visual** de comparación de
precios; son marcas registradas de sus titulares y su uso aquí es identificativo y académico.

---

## 7. Permisos que la app solicita

`android/app/src/main/AndroidManifest.xml`:

| Permiso | Para qué |
|---|---|
| `INTERNET` | teselas, OSRM, Nominatim, Firebase |
| `ACCESS_NETWORK_STATE` | detectar si hay conexión antes de pedir la ruta |
| `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` | botón «📍 Usar mi ubicación actual» (se pide en el momento, no al abrir) |

No se piden cámara, contactos, SMS ni almacenamiento.

---

## 8. Variables de entorno

La app Android **no lee `.env`**: todo lo que consume viaja dentro de `www/`. El archivo
`.env.example` se incluye solo como plantilla para cuando agregues un backend. Ninguna
credencial real está incluida en el ZIP.
