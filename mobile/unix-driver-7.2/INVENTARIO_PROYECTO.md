# INVENTARIO DEL PROYECTO — UniX Driver · Cartagena 7.2

Generado a partir del listado real de archivos del ZIP `UniX_Driver_Proyecto_Completo.zip`.

- Archivos totales: **139**
- `www/` (app web empaquetada): **28** archivos
- `android/` (proyecto Gradle): **91** archivos
- Raíz, herramientas, pruebas y docs: **20** archivos

## 1. Tecnologías y versiones reales

| Componente | Tecnología / versión |
|---|---|
| Interfaz | HTML5 + CSS3 + JavaScript ES6 (vanilla, sin framework) |
| Empaquetado móvil | Capacitor 7 (`@capacitor/android` ^7.6.10, `@capacitor/core` ^7.6.10, `@capacitor/app` ^7.0.0) |
| Capa nativa | Java 21 · `MainActivity.java` que extiende `BridgeActivity` |
| Build Android | Gradle 8.11.1 (wrapper incluido) + Android Gradle Plugin 8.7.2 |
| SDK | compileSdk 35 · targetSdk 35 · minSdk 23 |
| Build de assets | Node.js 22 · `npx cap sync android` |
| Mapa | Leaflet 1.9 empaquetado en `www/vendor/leaflet/` (sin CDN) |
| Rutas | OSRM público `https://router.project-osrm.org/route/v1/driving` |
| Geocodificación | Nominatim `nominatim.openstreetmap.org` y Photon `photon.komoot.io` |
| Teselas | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Autenticación | Local con SHA-256/WebCrypto + Firebase Auth (REST) opcional |
| Persistencia | `localStorage` + envoltorio `STORE` en `js/storage.js` |
| Pruebas | jsdom 30 (`tests/*.mjs`) |

## 2. Dependencias declaradas (`package.json`)

```json
{
  "name": "unix-driver-cartagena",
  "version": "7.2.0",
  "private": true,
  "description": "UniX Driver · Cartagena — aplicación Android (Capacitor 7 + HTML/CSS/JS)",
  "scripts": {
    "sync": "cap sync android",
    "build:web": "node tools/build-destinos.js && node tools/build-html.js",
    "build:apk": "npm run sync && cd android && ./gradlew assembleRelease",
    "build:apk:win": "npm run sync && cd android && gradlew.bat assembleRelease",
    "build:debug": "npm run sync && cd android && ./gradlew assembleDebug",
    "test": "node tests/test-v71.mjs && node tests/test-boton.mjs",
    "open:android": "cap open android"
  },
  "dependencies": {
    "@capacitor/android": "^7.6.10",
    "@capacitor/app": "^7.0.0",
    "@capacitor/core": "^7.6.10"
  },
  "devDependencies": {
    "@capacitor/cli": "^7.6.10",
    "jsdom": "^30.1.3"
  }
}
```

Todas se descargan con `npm install` (incluye `package-lock.json` para versiones exactas).
No se incluye `node_modules/` porque son ~200 MB regenerables.

## 3. Backend / base de datos

La app **no tiene servidor ni base de datos remota**: los viajes, la cuenta y el historial se guardan en el teléfono (`localStorage` + espejo en `STORE`). Por eso funciona sin el computador encendido. La "base de datos" de lugares es `www/data/destinos.json` (861 registros). Si quieres un backend, el proyecto de escritorio Node+MySQL es un proyecto aparte, no forma parte de este APK.

## 4. Archivos de la app (`www/`)

| Archivo | Tamaño |
|---|---|
| `www/config/firebase-config.js` | 1.1 KB |
| `www/config/tarifas.js` | 4.8 KB |
| `www/data/destinos.js` | 613.0 KB |
| `www/data/destinos.json` | 612.9 KB |
| `www/data/tarifas.json` | 1.9 KB |
| `www/img/didi.png` | 12.9 KB |
| `www/img/indrive.png` | 8.5 KB |
| `www/img/uber.png` | 8.0 KB |
| `www/index.html` | 26.1 KB |
| `www/js/auth.js` | 10.8 KB |
| `www/js/boot.js` | 9.1 KB |
| `www/js/config-tarifas.js` | 5.1 KB |
| `www/js/destinos.js` | 8.1 KB |
| `www/js/flows.js` | 22.4 KB |
| `www/js/mapa.js` | 12.3 KB |
| `www/js/origen.js` | 7.7 KB |
| `www/js/state.js` | 10.1 KB |
| `www/js/storage.js` | 1.6 KB |
| `www/js/ui.js` | 9.3 KB |
| `www/js/viaje.js` | 9.0 KB |
| `www/styles-app.css` | 13.1 KB |
| `www/styles-v2.css` | 12.8 KB |
| `www/styles.css` | 19.8 KB |
| `www/vendor/leaflet/images/marker-icon-2x.png` | 2.4 KB |
| `www/vendor/leaflet/images/marker-icon.png` | 1.4 KB |
| `www/vendor/leaflet/images/marker-shadow.png` | 618 B |
| `www/vendor/leaflet/leaflet.css` | 14.5 KB |
| `www/vendor/leaflet/leaflet.js` | 144.1 KB |

## 5. Proyecto Android (`android/`)

| Archivo | Tamaño |
|---|---|
| `android/.gitignore` | 1.8 KB |
| `android/app/.gitignore` | 26 B |
| `android/app/build.gradle` | 3.1 KB |
| `android/app/capacitor.build.gradle` | 414 B |
| `android/app/proguard-rules.pro` | 751 B |
| `android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java` | 774 B |
| `android/app/src/main/AndroidManifest.xml` | 2.0 KB |
| `android/app/src/main/assets/capacitor.config.json` | 241 B |
| `android/app/src/main/assets/capacitor.plugins.json` | 92 B |
| `android/app/src/main/assets/public/config/firebase-config.js` | 1.1 KB |
| `android/app/src/main/assets/public/config/tarifas.js` | 4.8 KB |
| `android/app/src/main/assets/public/cordova.js` | 0 B |
| `android/app/src/main/assets/public/cordova_plugins.js` | 0 B |
| `android/app/src/main/assets/public/data/destinos.js` | 613.0 KB |
| `android/app/src/main/assets/public/data/destinos.json` | 612.9 KB |
| `android/app/src/main/assets/public/data/tarifas.json` | 1.9 KB |
| `android/app/src/main/assets/public/img/didi.png` | 12.9 KB |
| `android/app/src/main/assets/public/img/indrive.png` | 8.5 KB |
| `android/app/src/main/assets/public/img/uber.png` | 8.0 KB |
| `android/app/src/main/assets/public/index.html` | 26.1 KB |
| `android/app/src/main/assets/public/js/auth.js` | 10.8 KB |
| `android/app/src/main/assets/public/js/boot.js` | 9.1 KB |
| `android/app/src/main/assets/public/js/config-tarifas.js` | 5.1 KB |
| `android/app/src/main/assets/public/js/destinos.js` | 8.1 KB |
| `android/app/src/main/assets/public/js/flows.js` | 22.4 KB |
| `android/app/src/main/assets/public/js/mapa.js` | 12.3 KB |
| `android/app/src/main/assets/public/js/origen.js` | 7.7 KB |
| `android/app/src/main/assets/public/js/state.js` | 10.1 KB |
| `android/app/src/main/assets/public/js/storage.js` | 1.6 KB |
| `android/app/src/main/assets/public/js/ui.js` | 9.3 KB |
| `android/app/src/main/assets/public/js/viaje.js` | 9.0 KB |
| `android/app/src/main/assets/public/styles-app.css` | 13.1 KB |
| `android/app/src/main/assets/public/styles-v2.css` | 12.8 KB |
| `android/app/src/main/assets/public/styles.css` | 19.8 KB |
| `android/app/src/main/assets/public/vendor/leaflet/images/marker-icon-2x.png` | 2.4 KB |
| `android/app/src/main/assets/public/vendor/leaflet/images/marker-icon.png` | 1.4 KB |
| `android/app/src/main/assets/public/vendor/leaflet/images/marker-shadow.png` | 618 B |
| `android/app/src/main/assets/public/vendor/leaflet/leaflet.css` | 14.5 KB |
| `android/app/src/main/assets/public/vendor/leaflet/leaflet.js` | 144.1 KB |
| `android/app/src/main/java/com/unixdriver/cartagena/MainActivity.java` | 128 B |
| `android/app/src/main/res/drawable/ic_launcher_background.xml` | 5.5 KB |
| `android/app/src/main/res/drawable/splash.png` | 3.9 KB |
| `android/app/src/main/res/drawable-land-hdpi/splash.png` | 7.5 KB |
| `android/app/src/main/res/drawable-land-mdpi/splash.png` | 3.9 KB |
| `android/app/src/main/res/drawable-land-xhdpi/splash.png` | 9.0 KB |
| `android/app/src/main/res/drawable-land-xxhdpi/splash.png` | 13.7 KB |
| `android/app/src/main/res/drawable-land-xxxhdpi/splash.png` | 17.3 KB |
| `android/app/src/main/res/drawable-port-hdpi/splash.png` | 7.7 KB |
| `android/app/src/main/res/drawable-port-mdpi/splash.png` | 4.0 KB |
| `android/app/src/main/res/drawable-port-xhdpi/splash.png` | 9.6 KB |
| `android/app/src/main/res/drawable-port-xxhdpi/splash.png` | 13.0 KB |
| `android/app/src/main/res/drawable-port-xxxhdpi/splash.png` | 17.1 KB |
| `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml` | 1.8 KB |
| `android/app/src/main/res/layout/activity_main.xml` | 535 B |
| `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` | 266 B |
| `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml` | 266 B |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` | 466 B |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png` | 438 B |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png` | 466 B |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` | 314 B |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png` | 317 B |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png` | 314 B |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` | 615 B |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png` | 586 B |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png` | 615 B |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` | 930 B |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png` | 923 B |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png` | 930 B |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` | 1.2 KB |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png` | 1.4 KB |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png` | 1.2 KB |
| `android/app/src/main/res/values/ic_launcher_background.xml` | 121 B |
| `android/app/src/main/res/values/strings.xml` | 367 B |
| `android/app/src/main/res/values/styles.xml` | 823 B |
| `android/app/src/main/res/xml/config.xml` | 185 B |
| `android/app/src/main/res/xml/file_paths.xml` | 213 B |
| `android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java` | 402 B |
| `android/build.gradle` | 636 B |
| `android/capacitor-cordova-android-plugins/build.gradle` | 1.6 KB |
| `android/capacitor-cordova-android-plugins/cordova.variables.gradle` | 312 B |
| `android/capacitor-cordova-android-plugins/src/main/AndroidManifest.xml` | 210 B |
| `android/capacitor-cordova-android-plugins/src/main/java/.gitkeep` | 0 B |
| `android/capacitor-cordova-android-plugins/src/main/res/.gitkeep` | 1 B |
| `android/capacitor.settings.gradle` | 393 B |
| `android/gradle/wrapper/gradle-wrapper.jar` | 42.6 KB |
| `android/gradle/wrapper/gradle-wrapper.properties` | 253 B |
| `android/gradle.properties` | 987 B |
| `android/gradlew` | 8.6 KB |
| `android/gradlew.bat` | 2.9 KB |
| `android/settings.gradle` | 208 B |
| `android/variables.gradle` | 497 B |

## 6. Raíz, herramientas y pruebas

| Archivo | Tamaño |
|---|---|
| `.editorconfig` | 179 B |
| `.env.example` | 653 B |
| `.gitignore` | 226 B |
| `.vscode/extensions.json` | 244 B |
| `.vscode/launch.json` | 250 B |
| `.vscode/settings.json` | 605 B |
| `README.md` | 9.5 KB |
| `capacitor.config.json` | 236 B |
| `data-src/nuevos-lugares.json` | 57.4 KB |
| `data-src/paraderos.xlsx` | 93.7 KB |
| `docs/MAPAS_Y_TARIFAS.md` | 2.6 KB |
| `keystore.properties.example` | 613 B |
| `package-lock.json` | 56.3 KB |
| `package.json` | 857 B |
| `tests/test-boton.mjs` | 4.5 KB |
| `tests/test-v71.mjs` | 12.6 KB |
| `tools/build-destinos.js` | 518 B |
| `tools/build-html.js` | 657 B |
| `tools/geo-nuevos.mjs` | 9.7 KB |
| `tools/merge-lugares.mjs` | 4.3 KB |

## 7. Qué hace cada módulo de `www/js/`

| Módulo | Responsabilidad |
|---|---|
| `state.js` | Estado del viaje, tarifas (auto = máx 10.000; moto = 45 % con mínimo 5.000), historial, constantes |
| `storage.js` | Envoltorio de almacenamiento (localStorage + respaldo nativo) |
| `auth.js` | Registro, ingreso, sesión, recuperación por código y Firebase REST opcional |
| `boot.js` | Arranque, pestañas de acceso, botón Atrás de Android, cableado de la UI |
| `destinos.js` | Catálogo de 861 lugares, buscador sin tildes, filtros por categoría y selector |
| `origen.js` | Selector de origen: catálogo, GPS, dirección manual y geocodificación |
| `mapa.js` | Leaflet local, teselas OSM, ruta por carretera OSRM y proveedor conmutable |
| `flows.js` | Flujo completo: buscar conductor, ofertas, asignación, viaje, cancelación, pago |
| `ui.js` | Navegación entre pantallas, overlays, historial, cuenta, avisos |
| `viaje.js` | Pantalla «Viaje»: estado del viaje en curso y último viaje finalizado |
| `config-tarifas.js` | Panel ⚙️ para editar tarifas y guardarlas en el dispositivo |

## 8. Recursos gráficos incluidos

- `www/img/didi.png` — 12.9 KB
- `www/img/indrive.png` — 8.5 KB
- `www/img/uber.png` — 8.0 KB
- `www/vendor/leaflet/images/marker-icon-2x.png` — 2.4 KB
- `www/vendor/leaflet/images/marker-icon.png` — 1.4 KB
- `www/vendor/leaflet/images/marker-shadow.png` — 618 B
- Iconos de la app: `android/app/src/main/res/mipmap-*/ic_launcher*.png` (mdpi 48 → xxxhdpi 192), `ic_launcher_round.png`, `ic_launcher_foreground.png`, adaptativos `mipmap-anydpi-v26/*.xml` y `values/ic_launcher_background.xml` (U blanca sobre azul `#1D4FD7`).
- Splash: `android/app/src/main/res/drawable-*/splash.png`.
- Tipografías: **no se usan tipografías externas**; la app usa la fuente del sistema (`-apple-system, Roboto, sans-serif`). No hay archivos de fuente que incluir.

## 9. Lo que NO se incluye y por qué

| Excluido | Motivo |
|---|---|
| `android/app/unixdriver-release.keystore` | Llave privada de firma del APK entregado. Incluirla permitiría falsificar la app. Crea la tuya (README §7). |
| `android/local.properties` | Contiene la ruta del SDK de cada equipo. Se crea en un paso (README §3). |
| `node_modules/` | ~200 MB regenerables con `npm install`. |
| `android/app/build/`, `android/.gradle/` | Artefactos de compilación. |
| `google-services.json` | Solo si activas Firebase; lo genera tu proyecto de Firebase. |
