# Iteración Final — Integración Móvil–AWS, Panel de Administrador, Búsqueda Híbrida con IA y Cierre

Esta carpeta reúne la documentación de cierre de la versión final de **UniX Driver**, consolidando la aplicación móvil Android conectada a AWS, el Panel de Administrador completo, el cumplimiento de privacidad y minimización de datos (Ley 1581 de 2012), la búsqueda híbrida inteligente de lugares de Cartagena y la validación integral del sistema.

---

## Objetivo

Entregar el producto completo **UniX Driver** en producción académica, integrando la aplicación móvil híbrida (**Capacitor 7**) directamente con los servicios desplegados en **AWS (EC2, RDS y S3)**, habilitando todas las funcionalidades de los roles **Pasajero** y **Administrador**, e incorporando resolución híbrida automática de lugares turísticos y direcciones en Cartagena mediante **Gemini API + Nominatim (OpenStreetMap) + Amazon S3**.

---

## 1. Integración Móvil–AWS y Sincronización de Entorno (`mobile/unix-driver-7.2/`)

- **Cliente HTTP centralizado (`www/js/apiService.js`):** Gestiona todas las peticiones REST (`login`, `registro`, `obtenerPerfil`, `actualizarPerfil`, `obtenerBarrios`, `resolverLugar`, `buscarOfertas`, `solicitarViaje`, `actualizarEstadoViaje`, `obtenerHistorialViajes` y operaciones administrativas) con control de *timeout* y cancelación mediante `AbortController`.
- **Inyección dinámica de entorno (`npm run env:sync`):** El script `tools/sync-env.js` lee la variable `UNIX_API_URL` desde `mobile/unix-driver-7.2/.env` y genera `www/config/api-env.js` antes de empaquetar o sincronizar Android, evitando quemar direcciones IP sensibles o credenciales en el código fuente.
- **Eliminación de simulaciones offline y limpieza de proyecto:** Se retiraron archivos obsoletos, plantillas de prueba antiguas, configuradores manuales de tarifas locales y modos simulados de autenticación o cotización; cada flujo del pasajero opera directamente contra el backend en AWS y el catálogo oficial de 212 barrios en S3.

---

## 2. Rediseño UI/UX del Pasajero y Aislamiento Estricto de Historial

- **Diseño adaptativo vertical (`100dvh`, `clamp()`, pantallas 20:9):** Se ajustaron las vistas de `Login/Registro`, `Inicio`, `Ofertas` (con trazado de ruta real en **Leaflet + OSRM**), `Conductor asignado`, `Conductor en camino` (con cuenta regresiva y flujo de **Cancelar viaje** con selección de motivo), `Viaje en curso`, `Cobro y Comisión` y `Viaje completado`.
- **Aislamiento de historial por `id_usuario`:**
  - Se reemplazó la clave compartida antigua por almacenamiento aislado por usuario bajo el prefijo `unixdriver.historial.v3.<id_usuario>` en `www/js/state.js` (`claveHistorialUsuario`) y `www/js/storage.js`.
  - La clave legacy `unixdriver.historial.v2` se purga automáticamente al iniciar la aplicación o al leer/escribir historial.
  - Al iniciar o cerrar sesión (`AUTH.ingresar`, `AUTH.registrar`, `AUTH.cerrarSesion`), `STORE.limpiarHistorialEnMemoria()` vacía la memoria activa, limpia el listado del DOM y oculta `#lastTripBox`.
  - La sincronización con `GET /viajes/usuario/{id_usuario}` reemplaza estrictamente el historial del usuario activo sin hacer *merge* entre cuentas distintas en el mismo dispositivo.
- **Mi Perfil (`DSS03P`) y pestaña `Más`:** Edición en vivo de nombre, teléfono y fecha de nacimiento contra `GET/PUT /usuarios/{id_usuario}`, contador real de viajes realizados y modales informativos limpios (*Acerca de UniX Driver*, *Términos y condiciones*, *Ayuda y soporte*).

---

## 3. Panel de Administrador Integrado y Cumplimiento Legal (Ley 1581 de 2012)

Cuando un usuario con `id_rol === 2` (rol `ADMINISTRADOR`) inicia sesión desde la pantalla principal de Login (sin opción pública de autorregistro), la aplicación oculta la interfaz de pasajero y activa el **Panel de Administrador** (`#adminAppView`, `www/js/admin.js`):

- **Pestaña `Panel`:** Tarjetas KPI calculadas en vivo desde la API (*Pasajeros activos*, *Viajes finalizados*, *Comisión vigente* e *Ingresos por comisión*), accesos rápidos y viajes recientes.
- **Pestaña `Usuarios` (*Data Masking* — Ley 1581 de 2012):** Buscador por nombre/correo, chips de filtro (`Todos`, `Activos`, `Inactivos`), cambio de estado en vivo (`PATCH /usuarios/{id}/estado`) y **enmascaramiento por defecto** de correo (`enmascararCorreo`, ej. `car•••@dominio`) y teléfono (`enmascararTelefono`, ej. `300 •••• 67`) con botón de ícono de ojo para revelar puntualmente el contacto de un usuario sin exponer a los demás.
- **Pestaña `Comisión`:**
  - Formulario para actualizar la tasa vigente (`POST /comisiones/configuracion`) con simulador en tiempo real sobre una tarifa ejemplo.
  - **Activación en un clic** (`btn-activar-config`) de cualquier regla histórica desde `GET /comisiones/configuracion/historial`.
  - Listado contable de **Comisiones generadas por viaje** aplicando **minimización de datos**: muestra `Comisión # · Viaje # · Plataforma`, fecha, tarifa base, tasa y monto sin exponer barrios ni rutas individuales de los pasajeros.
- **Pestaña `Reportes` y Modal `Perfil del Administrador y Aspectos Legales`:**
  - Desglose de ingresos y viajes por plataforma simulada (**Uber**, **DiDi**, **inDrive**), Top 5 barrios de destino en Cartagena y resumen operativo.
  - Modal accesible desde la barra superior para editar el perfil del administrador (`GET/PUT /usuarios/{id_usuario}`) y consultar el **Marco Legal, Privacidad y Términos de Administración** (Ley 1581 de 2012 - Habeas Data, alcance de auditoría y uso identificativo de marcas).

---

## 4. Buscador Híbrido Automático de Lugares (`Gemini API + Nominatim + S3`) y Coordenadas Exactas

Para permitir al pasajero buscar hoteles, restaurantes, monumentos o direcciones específicas fuera de la lista exacta de barrios sin sacrificar la precisión tarifaria:

- **Resolución inteligente en el backend (`backend/services/lugar_ia_service.py` y `GET /busquedas/resolver-lugar`):**
  1. **Paso A (Gemini API opcional):** Si `GEMINI_API_KEY` está configurada, interpreta consultas con errores ortográficos o nombres turísticos en Cartagena devolviendo nombre oficial, consulta cartográfica (`query_mapa`), barrio probable y categoría.
  2. **Paso B (Nominatim OpenStreetMap):** Geocodifica dentro de la caja geográfica estricta de Cartagena (`lat` `[10.25, 10.60]`, `lon` `[-75.65, -75.35]`) y asigna el barrio oficial más cercano del catálogo S3 mediante `encontrar_barrio_mas_cercano()`.
  3. **Paso C (Respaldo Gemini + S3):** Si Nominatim no devuelve el punto exacto, resuelve el barrio probable contra `buscar_barrio_binaria()` usando las coordenadas oficiales en Amazon S3.
  4. **Caché LRU en memoria:** Evita llamadas repetidas para consultas equivalentes y retorna `[]` de forma segura ante consultas menores a 3 caracteres o fallos externos.
- **Autocompletado híbrido automático en móvil (`www/js/destinos.js` y `www/js/origen.js`):**
  - Filtrado local instantáneo (0 ms) sobre los lugares verificados y los 212 barrios sincronizados desde S3.
  - Cuando una consulta de 4 o más caracteres no arroja coincidencias locales suficientes, dispara automáticamente tras **500 ms** de pausa el estado discreto `"Buscando en Cartagena..."` (sin botones ni menciones a IA) y agrega las ubicaciones devueltas directamente como resultados seleccionables con cancelación automática (`AbortController`) de peticiones obsoletas.
- **Cálculo preciso por coordenadas exactas (`POST /busquedas/`):** `BusquedaCrear` acepta `origen_lat`, `origen_lon`, `destino_lat` y `destino_lon` opcionales, y `obtener_distancia_trayecto_cartagena()` prioriza esas coordenadas exactas manteniendo total retrocompatibilidad con búsquedas solo por nombre de barrio.

---

## 5. Resultados de Verificación Final y Empaquetado Android

| Suite / Entregable | Comando Ejecutado | Resultado Verificado |
| :--- | :--- | :--- |
| **Backend (Unitarias + AWS S3/RDS + Lugares IA)** | `python -m pytest -v` | **9/9 PASS** (`tests/test_backend_aws.py`) |
| **App Móvil — Tarifas, Auth, Catálogo y Buscador Híbrido** | `npm test` (`tests/test-v71.mjs`) | **60/60 PASS** (0 errores JS) |
| **App Móvil — Flujos UI, Panel Admin, Data Masking e Historial Aislado** | `npm test` (`tests/test-boton.mjs`) | **59/59 PASS** (0 errores JS) |
| **Bundle Web y Sincronización Capacitor** | `npm run build:web` · `npm run sync` | Bundle único (`UniX-Driver.html`) y assets Android actualizados |
| **Instalador Android (APK)** | `.\android\gradlew.bat assembleDebug` | APK generado en `mobile/unix-driver-7.2/android/app/build/outputs/apk/debug/app-debug.apk` |

### Documentación para Usuario Final
- Consulta la guía completa de operación para pasajeros y administradores en el **[Manual de Usuario](MANUAL_USUARIO.md)**.

---

## Integrantes

- **Ivan Andres Sierra Arrieta**
- **Sebastian de Jesus Morales Marimon**

## Estado de la Entrega

- [x] Integración completa Móvil (Capacitor 7) ↔ Backend REST en AWS (EC2 / RDS / S3).
- [x] Rediseño visual adaptativo y aislamiento estricto de historial por usuario.
- [x] Panel de Administrador completo con *Data Masking* (Ley 1581 de 2012), gestión de comisiones y reportes.
- [x] Buscador híbrido automático (`Gemini API + Nominatim + S3`) y cotización por coordenadas exactas.
- [x] Suite de pruebas aprobada (`9/9` backend, `60/60` + `59/59` mobile) y APK Android generado.
- [x] Manual de Usuario publicado en `MANUAL_USUARIO.md`.
