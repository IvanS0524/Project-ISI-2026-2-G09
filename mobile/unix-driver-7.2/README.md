# UniX Driver · Cartagena — Proyecto completo (versión 7.2)

Aplicación Android de transporte para Cartagena de Indias. Esta carpeta contiene **todo el
código fuente** que genera el APK `versionCode 10` / `versionName "7.2"`.

---

## 1. Qué tecnología usa

**No es Kotlin, ni Java puro, ni Flutter, ni React Native, ni Ionic.**

| Capa | Tecnología real |
|---|---|
| Interfaz y lógica de la app | **HTML5 + CSS3 + JavaScript (ES6)**, sin frameworks |
| Empaquetado a Android | **Capacitor 7** (`@capacitor/android`, `@capacitor/core`, `@capacitor/app`) |
| Capa nativa Android | **Java** (una sola clase: `MainActivity.java`, extiende `BridgeActivity`) |
| Compilación | **Gradle 8.11.1** con el Gradle Wrapper incluido + Android Gradle Plugin 8.7.2 |
| Mapa | **Leaflet** empaquetado localmente en `www/vendor/leaflet/` (sin CDN) |
| Rutas por carretera | **OSRM** público (`router.project-osrm.org`) |
| Geocodificación | **Nominatim** y **Photon** (OpenStreetMap, sin clave) |
| Teselas del mapa | `tile.openstreetmap.org` |
| Almacenamiento | `localStorage` + `@capacitor/preferences`-style `STORE` (`js/storage.js`) |
| Autenticación | Local en el dispositivo; **Firebase Authentication opcional** por REST |

La app es una **aplicación Android real**: se abre desde su icono, sin barra de direcciones,
funciona sin conexión salvo mapa y rutas, y guarda los viajes en el dispositivo.

---

## 2. Programas que debes instalar

| Programa | Versión probada | Para qué |
|---|---|---|
| **Node.js** | 20 LTS o 22 LTS | `npm install` y `npx cap sync` |
| **JDK** | **21** (probado: OpenJDK 21.0.12) | Gradle 8.11.1 exige JDK 17 o superior |
| **Android SDK** | Platform 35, Build-Tools 35.0.0 | compilar el APK |
| **Visual Studio Code** | última | editar el proyecto |
| *(opcional)* Android Studio | última | emulador y depuración nativa |

> El proyecto se compiló con: Node 22.23.4, JDK 21.0.12, Gradle 8.11.1, AGP 8.7.2,
> compileSdk 35, minSdk 23, targetSdk 35.

---

## 3. Instalar Android SDK sin Android Studio

1. Descarga *Command line tools* de <https://developer.android.com/studio#command-tools>.
2. Descomprime en `C:\Android\sdk\cmdline-tools\latest` (Windows) o `~/Android/sdk/cmdline-tools/latest`.
3. Instala los paquetes:

```bash
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

4. Crea el archivo `android/local.properties` con la ruta de tu SDK:

```properties
# Windows
sdk.dir=C\:\\Android\\sdk
# Linux / macOS
sdk.dir=/home/tu-usuario/Android/sdk
```

> `local.properties` **no viene incluido** porque depende de tu equipo. Es el único archivo
> que debes crear a mano, además de la llave de firma (opcional).

Alternativa: define la variable de entorno `ANDROID_HOME` y no necesitas el archivo.

---

## 4. Abrir el proyecto en Visual Studio Code

```bash
cd unix-driver
npm install
code .
```

Al abrir, VS Code sugerirá las extensiones de `.vscode/extensions.json`:
Java Extension Pack, XML, Prettier, Live Server, EditorConfig.

Vista rápida del código:

| Quiero cambiar… | Archivo |
|---|---|
| Textos, pantallas, estructura | `www/index.html` |
| Colores, tamaños, estilos | `www/styles.css`, `www/styles-v2.css`, `www/styles-app.css` |
| Tarifas, mínimo, 45 %, mapas | `www/config/tarifas.js` |
| Cálculo del precio | `www/js/state.js` |
| Flujo del viaje (buscar, ofertas, cancelar, pagar) | `www/js/flows.js` |
| Registro / login / recuperación | `www/js/auth.js` + `www/js/boot.js` |
| Buscador de lugares | `www/js/destinos.js` |
| Selector de origen y GPS | `www/js/origen.js` |
| Mapa y rutas OSRM | `www/js/mapa.js` |
| Base de lugares (861 registros) | `www/data/destinos.json` |
| Icono, nombre y permisos Android | `android/app/src/main/res/`, `AndroidManifest.xml` |

Para ver solo la interfaz en el navegador: clic derecho en `www/index.html` → **Open with Live Server**.
(El mapa y las rutas necesitan internet; el resto funciona igual.)

---

## 5. Ejecutar en un teléfono

1. En el teléfono: **Ajustes → Acerca del teléfono → toca 7 veces «Número de compilación»**.
2. **Ajustes → Opciones de desarrollador → Depuración USB: activar**.
3. Conecta el cable y acepta el aviso «¿Permitir depuración USB?».
4. Comprueba que aparece:

```bash
adb devices
```

5. Instala y ejecuta:

```bash
npm run sync
cd android
./gradlew installDebug        # Windows: gradlew.bat installDebug
```

O instala el APK ya compilado:

```bash
adb install -r UniX_Driver_Final.apk
```

---

## 6. Compilar

### Depuración (debug)

```bash
npm install
npm run sync
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

Resultado: `android/app/build/outputs/apk/debug/app-debug.apk`
Se firma solo con la llave de depuración de Gradle, sin configuración extra.

### Lanzamiento (release)

```bash
npm run sync
cd android
./gradlew assembleRelease      # Windows: gradlew.bat assembleRelease
```

Resultado: `android/app/build/outputs/apk/release/app-release.apk`
(sin firmar si no creaste `android/keystore.properties`; ver punto 7).

### Atajos incluidos en `package.json`

```bash
npm run build:web       # regenera data/destinos.js y UniX-Driver.html (vista previa de un solo archivo)
npm run build:apk       # sync + assembleRelease (Linux/macOS)
npm run build:apk:win   # sync + assembleRelease (Windows)
npm test                # pruebas automáticas (jsdom)
```

---

## 7. Firmar el APK con tu propia llave

Sin firma el APK de release **no se instala**. Pasos (una sola vez):

```bash
keytool -genkeypair -v -keystore android/unixdriver-release.keystore \
  -alias unixdriver -keyalg RSA -keysize 2048 -validity 10000
```

Copia `keystore.properties.example` a `android/keystore.properties` y rellena:

```properties
storeFile=unixdriver-release.keystore
storePassword=TU_CONTRASENA
keyAlias=unixdriver
keyPassword=TU_CONTRASENA
```

Vuelve a compilar con `./gradlew assembleRelease`: el APK saldrá firmado.

Verificar la firma:

```bash
apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk
```

> **Importante:** para actualizar una instalación existente sin desinstalar, el APK nuevo debe
> firmarse con **la misma llave** que el anterior. La llave del APK entregado por nosotros es
> privada y **no se incluye** en este ZIP; si instalas el tuyo encima del nuestro, Android
> pedirá desinstalar primero. Es lo normal y esperado.

---

## 8. Permisos de Android incluidos

`android/app/src/main/AndroidManifest.xml`:

- `INTERNET` y `ACCESS_NETWORK_STATE` — mapa, rutas OSRM, geocodificación, Firebase.
- `ACCESS_COARSE_LOCATION` y `ACCESS_FINE_LOCATION` — botón «Usar mi ubicación actual».

La app pide el permiso de ubicación solo cuando tocas ese botón.

---

## 9. Errores frecuentes y solución

| Error | Causa y solución |
|---|---|
| `SDK location not found` | Falta `android/local.properties` o `ANDROID_HOME`. Ver punto 3. |
| `Unsupported class file major version` / `Unsupported Java` | JDK incorrecto. Usa **JDK 21** y verifica con `java -version`. |
| `Could not find com.android.tools.build:gradle:8.7.2` | Sin internet la primera vez, o falta el repositorio `google()`. Conecta y reintenta. |
| `cap: command not found` | No ejecutaste `npm install` en la raíz del proyecto. |
| `Project ':capacitor-android' not found` | Falta `npx cap sync android` (regenera `android/capacitor.settings.gradle`). |
| `App not installed` / `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | La firma es distinta a la instalada. Desinstala la app anterior e instala la nueva. |
| `INSTALL_FAILED_VERSION_DOWNGRADE` | El APK instalado tiene `versionCode` mayor. Sube `versionCode` en `android/app/build.gradle`. |
| Gradle se queda sin memoria | Sube `org.gradle.jvmargs` en `android/gradle.properties` (p. ej. `-Xmx4096m`). |
| El mapa no carga en el móvil | Sin internet, o el WebView no tiene teselas. Las rutas requieren conexión por diseño. |
| `npm install` falla por permisos | No uses `sudo`. Borra `node_modules` y `package-lock.json` y reintenta. |

---

## 10. Pruebas

```bash
npm install
npm test
```

- `tests/test-v71.mjs` — 50 comprobaciones: tabla de tarifas y mínimos, pantalla sin textos
  técnicos, autenticación completa (registro, correo repetido, contraseña incorrecta,
  recuperación), comercios como origen y destino, ofertas y navegación.
- `tests/test-boton.mjs` — 12 comprobaciones del botón «Crear cuenta» y del inicio de sesión.

Ambas usan `jsdom` y simulan OSRM, por lo que **no necesitan internet ni un teléfono**.

---

## 11. Estructura

```
unix-driver/
├── www/                     # la app (esto es lo que se empaqueta)
│   ├── index.html           # todas las pantallas
│   ├── styles*.css          # estilos
│   ├── config/              # tarifas, firebase
│   ├── data/                # 861 lugares + tarifas
│   ├── js/                  # lógica (auth, flows, mapa, state, ui…)
│   ├── img/                 # logos de plataformas
│   └── vendor/leaflet/      # Leaflet local
├── android/                 # proyecto Android (Gradle + Capacitor)
│   ├── app/src/main/        # manifest, Java, recursos, iconos
│   ├── gradle/wrapper/      # Gradle 8.11.1
│   ├── gradlew, gradlew.bat
│   └── build.gradle, settings.gradle, variables.gradle
├── tools/                   # scripts de mantenimiento de datos
├── tests/                   # pruebas automáticas
├── package.json             # dependencias y comandos
├── capacitor.config.json
├── keystore.properties.example
└── .env.example
```

Detalle completo en **INVENTARIO_PROYECTO.md**; servicios externos en **CONFIGURACION_SERVICIOS.md**.
