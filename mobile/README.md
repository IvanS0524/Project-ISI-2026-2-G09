# Aplicación Móvil Android - UniX Driver

Aplicación móvil nativa para Android de la **Plataforma de Búsqueda Unificada de Transporte (UniX Driver)** desarrollada con **Kotlin** y **Jetpack Compose**.

Solo frontend / UI: las respuestas de plataformas como Uber, DiDi e inDrive están **simuladas** en la lógica local del prototipo.

---

## 🛠️ Requisitos del Entorno

- **JDK 17 o superior**.
- **Android SDK** (API 34 o superior) y **Build-Tools 34.0.0**.
- **Android Studio** (Jellyfish, Koala, Ladybug o superior recomendado) o IntelliJ IDEA con plugin de Android.
- Dispositivo Android físico (con depuración USB/WiFi activada) o un Emulador con **Android 7.0 (API 24)** o superior.

---

## 🚀 Cómo Compilar y Ejecutar

### 1. Compilar y generar el archivo APK

Para generar el ejecutable APK en modo Debug desde la terminal:

**En Windows (PowerShell / CMD):**
```powershell
.\gradlew.bat assembleDebug
```

**En macOS / Linux:**
```bash
./gradlew assembleDebug
```

📍 **Ubicación del APK generado:**
```text
build/outputs/apk/debug/unix-driver-debug.apk
```

### 2. Instalar directamente en celular o emulador

Asegúrate de tener un celular o emulador conectado e ingresa:

```powershell
.\gradlew.bat installDebug
```

### 3. Ejecutar desde Android Studio

1. Abre la carpeta del proyecto en Android Studio.
2. Selecciona la configuración **`app`** / **`MainActivity`** en la barra superior.
3. Elige tu celular o emulador objetivo y presiona el botón **Run (▶️)** o `Shift + F10`.

---

## 🎨 Estilos y Recursos Visuales

- **Colores y Tipografía:** Ubicados en `ui/theme/Theme.kt`. Al modificar la paleta de colores o estilos principales, se actualiza automáticamente toda la aplicación.
- **Iconos e Ilustraciones:** Almacenados en formato VectorDrawable nativo de Android en `src/main/res/drawable/`:
  - `ic_logo.xml` (Logo principal de UniX Driver)
  - `ic_skyline_top.xml` (Ilustración superior)
  - `ic_skyline_bottom.xml` (Ilustración inferior de mapa)
  - `ic_google.xml` e `ic_apple.xml` (Iconos de inicio de sesión social)
- **Componente de Arte:** `ui/components/Art.kt` gestiona la carga de vectores mediante `painterResource(id = ...)`.

---

## 🔑 Cuentas de Prueba

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| **Pasajero** | `juan@unixdriver.com` | `123456` |
| **Administrador** | `admin@unixdriver.com` | `admin123` |

---

## 📁 Estructura del Proyecto

```text
src/main/
├── AndroidManifest.xml      # Declaración de componentes y configuración Android
├── res/                     # Recursos nativos (iconos vectoriales y recursos de la app)
│   └── drawable/            # Iconos vectoriales (ic_logo.xml, ic_skyline_*.xml, etc.)
└── kotlin/co/edu/unicartagena/unixdriver/
    ├── data/                # Datos simulados (destinos, conductores, plataformas)
    ├── model/               # Modelos de datos del dominio (viajes, usuarios, tarifas)
    ├── service/             # Servicios de cálculo de tarifas y simulación de transporte
    ├── state/               # Estado global de la app (AppStore) y navegación
    ├── ui/                  # Interfaz gráfica en Jetpack Compose
    │   ├── components/      # Componentes reutilizables, mapas visuales y recursos de arte
    │   ├── screens/         # Pantallas organizadas por módulo (admin, auth, passenger)
    │   └── theme/           # Definición de tema, paleta de colores y tipografía
    ├── util/                # Utilidades de formato (moneda COP, fechas)
    └── MainActivity.kt      # Actividad nativa principal y punto de entrada de la app
```
