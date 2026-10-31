# UniX Driver · Cartagena — Aplicación de escritorio (Node.js + MySQL/XAMPP)

Versión de escritorio del proyecto **UniX Driver · Cartagena**. Conserva la interfaz original
(`UniX-Driver-Escritorio.html`, sin cambios de diseño) y añade un servidor **Node.js + Express**
con **persistencia real en MySQL/MariaDB**.

Todo lo que registres —barrios consultados, tarifas, viajes, ofertas, estados, pagos, comprobantes
e historial— queda guardado en la base de datos y **sobrevive a cerrar la aplicación o apagar el
computador**.

> ⚠️ Proyecto académico. UniX Driver no es un operador de transporte real y los pagos son
> simulados. Uber, DiDi e inDrive son marcas registradas de sus titulares y aquí aparecen solo
> como identificación visual.

---

## 1. Requisitos (Windows 10 / 11)

| Programa | Versión | Dónde |
|---|---|---|
| **XAMPP** (incluye MySQL/MariaDB y phpMyAdmin) | 8.x | https://www.apachefriends.org |
| **Node.js** | 18 o superior (LTS) | https://nodejs.org |
| Navegador | Chrome, Edge o Firefox | — |

No hace falta instalar MySQL aparte: se usa el de XAMPP.

---

## 2. Instalación paso a paso

### Paso 1 — Descomprimir
Descomprime el ZIP en una ruta **sencilla y sin espacios**, por ejemplo:

```
C:\UniX-Driver
```

Dentro deben quedar `start.bat`, `server.js`, `package.json`, `public\`, etc.

### Paso 2 — Arrancar MySQL en XAMPP
1. Abre **XAMPP Control Panel**.
2. Pulsa **Start** en el módulo **MySQL** (debe quedar en verde).
3. Opcional: pulsa **Start** en **Apache** si quieres usar phpMyAdmin.

> Solo necesitas MySQL encendido. Apache es únicamente para phpMyAdmin.

### Paso 3 — Doble clic en `start.bat`
El script hace todo automáticamente:

1. Comprueba que Node.js esté instalado.
2. Crea `.env` a partir de `.env.example` la primera vez.
3. Ejecuta `npm install` si falta `node_modules`.
4. Abre Chrome en **http://localhost:3000**.
5. Arranca el servidor.

Al terminar verás en la consola:

```
✔ MySQL conectado: root@127.0.0.1:3306/unixdriver
✔ Semilla: 212 barrios · 3 zonas tarifarias
✔ UniX Driver · Cartagena escuchando en http://localhost:3000
```

Deja esa ventana abierta mientras uses la aplicación. Para detenerla, ciérrala o pulsa `Ctrl + C`.

### Paso 4 (alternativa manual)
```bat
cd C:\UniX-Driver
copy .env.example .env
npm install
npm start
```

---

## 3. ¿Debo crear la base de datos a mano?

**No es obligatorio.** El servidor la crea sola al arrancar:

- `CREATE DATABASE IF NOT EXISTS unixdriver` (utf8mb4).
- Crea las 6 tablas con `CREATE TABLE IF NOT EXISTS` (idempotente: puedes arrancar mil veces).
- Inserta las tarifas y los **212 barrios** sin duplicarlos (`ON DUPLICATE KEY UPDATE`).

Solo necesitas el usuario MySQL con permiso para crear bases. En XAMPP el usuario `root` sin
contraseña ya lo tiene, y es el valor por defecto del proyecto.

### Si prefieres crearla desde phpMyAdmin (recomendado para respaldo)
1. Abre http://localhost/phpmyadmin
2. Pestaña **Importar** → **Seleccionar archivo** → `database.sql` → **Continuar**
3. Ese archivo crea la base `unixdriver`, las tablas y los datos (212 barrios) ya listos.

El archivo `database.sql` sirve también para **recuperar** la base si algo se daña: al importarlo
se recrean las tablas y se recargan los datos guardados en el momento del respaldo.

---

## 4. Configuración exacta para XAMPP (`.env`)

Contenido de `.env.example` (copiar a `.env`):

```ini
# Puerto de la aplicación. Abre en Chrome: http://localhost:3000
PORT=3000

# MySQL / MariaDB de XAMPP
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=unixdriver
```

### Credenciales de ejemplo

| Dato | Valor XAMPP por defecto |
|---|---|
| Usuario | `root` |
| Contraseña | *(vacía)* |
| Host | `127.0.0.1` |
| Puerto MySQL | `3306` |
| Base de datos | `unixdriver` |

Si tu XAMPP tiene contraseña de root, escríbela en `DB_PASSWORD=tu_clave` (sin comillas).
Si cambiaste el puerto de MySQL en XAMPP, ajusta `DB_PORT`.

### Tabla de equivalencias (entorno de desarrollo → XAMPP)

| | Desarrollo (sandbox) | **Tu PC con XAMPP** |
|---|---|---|
| Usuario | `unix` | `root` |
| Contraseña | `unixdriver2026` | *(vacía)* |
| Puerto app | 4311 | **3000** |

---

## 5. Puerto correcto de acceso

> **Abre en Chrome: http://localhost:3000**

- `3000` es el puerto de la aplicación (Node.js). Es el único que se escribe en el navegador.
- `3306` es el puerto interno de MySQL. **No se abre en Chrome**.
- `4311` fue solo un puerto de pruebas del entorno de desarrollo; **no se usa** en tu instalación.
- `80` lo usa Apache si abres phpMyAdmin en http://localhost/phpmyadmin.

Si el 3000 estuviera ocupado, cambia `PORT=3100` en `.env` y abre http://localhost:3100
(`start.bat` lee el puerto del `.env` y abre la URL correcta automáticamente).

---

## 6. Base de datos: dónde queda todo

| Tabla | Qué guarda |
|---|---|
| `tarifas` | Las 3 zonas con precio de moto y carro (5.000/15.000 · 9.000/20.000 · 14.000/32.000) |
| `barrios` | Los **212 barrios** oficiales: zona, localidad, coordenadas, distancia, tarifas |
| `viajes` | Cada viaje: folio, destino, vehículo, tarifa, comisión 10 %, estado y fechas por estado |
| `ofertas` | Las 3 ofertas por viaje (Uber/DiDi/inDrive), conductor, placa, rating y cuál se eligió |
| `pagos` | Folio de recibo, monto, comisión, neto, método y estado del pago |
| `eventos` | Bitácora de cada cambio de estado del viaje (auditoría) |

Estados válidos: `pendiente → asignado → en_curso → finalizado / cancelado → pagado`.

### Comprobar que se está guardando en MySQL
En phpMyAdmin → base `unixdriver`:

```sql
SELECT COUNT(*) FROM barrios;   -- 212
SELECT * FROM viajes ORDER BY id DESC;
SELECT * FROM pagos ORDER BY id DESC;
```

---

## 7. API REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servidor / base / nº de barrios |
| GET | `/api/barrios?zona=&q=` | Catálogo de barrios y tarifas |
| GET | `/api/barrios/:id` | Un barrio |
| GET | `/api/price?destino=&vehiculo=` | Cotización por zona |
| GET | `/api/ruta?id=` | Ruta real OSRM/OSM con estimación local de respaldo |
| GET/POST | `/api/viajes` | Historial con filtros (estado, vehículo, zona, q, desde, hasta) / crear viaje |
| GET/PATCH/DELETE | `/api/viajes/:id` | Consultar / cambiar estado / cancelar |
| POST | `/api/viajes/:id/ofertas` | Generar (o reutilizar) las 3 ofertas |
| PATCH | `/api/ofertas/:id/seleccionar` | Elegir oferta y asignar conductor |
| POST | `/api/viajes/:id/pago` | Registrar pago |
| GET | `/api/pagos` | Pagos con totales |
| GET | `/api/viajes/:id/comprobante` | Comprobante HTML imprimible / PDF |
| GET | `/api/estadisticas` | KPIs del panel |

---

## 8. Pruebas

```bat
npm run smoke
```

Ejecuta 24 comprobaciones contra el servidor en marcha (barrios, cotizaciones, creación de viaje,
ofertas, estados, pago, comprobante, historial, filtros, pagos, estadísticas, cancelación).

Para regenerar el respaldo SQL con los datos actuales:

```bat
npm run db:dump
```

Crea `database.sql` con esquema + datos.

---

## 9. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL apagado. Enciéndelo en XAMPP Control Panel |
| `Access denied for user 'root'` | Contraseña incorrecta en `.env` (`DB_PASSWORD`) |
| `EADDRINUSE :3000` | Puerto ocupado: cambia `PORT` en `.env` |
| La página carga sin datos | Mira la consola de la ventana negra: ahí está el error real |
| `npm` no se reconoce | Reinstala Node.js marcando "Add to PATH" |
| Se borró la base | Importa `database.sql` en phpMyAdmin |

---

## 10. Estructura del proyecto

```
UniX-Driver-Escritorio/
├─ start.bat              Arranque en Windows (CRLF)
├─ start.sh               Arranque en Linux/macOS
├─ server.js              Servidor Express + API REST
├─ db.js                  Pool mysql2, creación de base, esquema y semilla
├─ schema.sql             Esquema de las 6 tablas (idempotente)
├─ database.sql           Respaldo completo (esquema + datos)
├─ seed/
│  └─ barrios_cartagena.json   212 barrios oficiales
├─ scripts/
│  └─ dump.js             Genera database.sql
├─ public/
│  ├─ index.html          Interfaz de escritorio (sin cambios de diseño)
│  ├─ app.js              Lógica del cliente contra la API
│  ├─ styles.css
│  ├─ app-extra.css
│  ├─ img/                Logos uber.png, didi.png, indrive.png
│  └─ vendor/leaflet/     Leaflet local (sin CDN)
├─ test/
│  └─ smoke.js            Pruebas de humo de la API
└─ .env.example           Configuración de ejemplo para XAMPP
```
