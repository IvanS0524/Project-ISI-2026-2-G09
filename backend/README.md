# UniX Driver — Backend API & Arquitectura de Servicios

Backend del sistema **UniX Driver**, una plataforma de movilidad urbana para Cartagena de Indias que centraliza y compara en tiempo real ofertas de transporte de **Uber**, **DiDi** e **inDrive**, gestionando el ciclo de vida completo desde la búsqueda georreferenciada de barrios hasta la solicitud del viaje y la liquidación automática de comisiones.

---

## 1. Visión Arquitectónica

El backend sigue una **Arquitectura en Capas (Layered Architecture)** con separación estricta de responsabilidades sobre **FastAPI**, **SQLAlchemy 2.0 (ORM Declarativo)** y **Pydantic v2**:

```mermaid
flowchart LR
    Client["Clientes (Web / Mobile APK)"] --> Router["Capa de Presentación (routes/)"]
    Router <--> Schema["Contratos DTO (schemas/)"]
    Router --> Service["Capa de Dominio y Negocio (services/)"]
    Service --> Repo["Capa de Persistencia (database/repository/)"]
    Service --> S3["Integración Cloud (AWS S3 / JSON Local)"]
    Repo --> ORM["Modelos ORM (models/)"]
    ORM --> DB[("PostgreSQL 16 / AWS RDS")]
```

### Responsabilidades por Capa

| Capa | Directorio | Responsabilidad Principal |
| :--- | :--- | :--- |
| **Presentación (Controladores HTTP)** | `backend/routes/` | Definición de endpoints REST, códigos de estado HTTP, inyección de sesión (`Depends(get_db)`) y serialización de respuestas. |
| **Contratos y Validación (DTOs)** | `backend/schemas/` | Validación de entrada/salida con **Pydantic v2** (`ConfigDict(from_attributes=True)`), restricciones de dominio y tipado estricto. |
| **Lógica de Negocio (Servicios)** | `backend/services/` | Reglas de negocio, algoritmo de búsqueda binaria $O(\log n)$, cálculo geodésico de Haversine, ranking multicriterio de ofertas, máquina de estados del viaje y liquidación de comisiones. |
| **Acceso a Datos (Repositorios)** | `backend/database/repository/` | Consultas transaccionales a PostgreSQL mediante SQLAlchemy 2.0 (`select`, `joinedload`, `flush`, `commit`), aislando el SQL de la lógica de negocio. |
| **Modelos de Dominio (ORM)** | `backend/models/` | Mapeo Objeto-Relacional de las 11 entidades del esquema relacional con integridad referencial. |
| **Infraestructura de Datos** | `backend/database/` | Pool de conexiones SQLAlchemy (`pool_pre_ping`), soporte dual para contraseña estándar o **AWS RDS IAM Authentication Token** con SSL. |

---

## 2. Estructura del Directorio `backend/`

```text
backend/
├── main.py                          # Punto de entrada FastAPI, CORS, healthcheck (/health) y registro de routers
├── Dockerfile                       # Imagen ligera basada en python:3.11-slim para despliegue en contenedores
├── requirements.txt                 # Dependencias fijadas del servidor y suite de pruebas
├── .env.example                     # Plantilla de variables de entorno (Local, Docker, AWS RDS & S3)
├── data/
│   └── barrios_cartagena.json       # Catálogo oficial de respaldo con los 212 barrios de Cartagena y sus centroides (X, Y)
├── database/
│   ├── base.py                      # Clase DeclarativeBase de SQLAlchemy 2.0
│   ├── conexion.py                  # Motor PostgreSQL, generador de sesión get_db() y soporte IAM RDS / SSL
│   ├── README.md                    # Documentación de inicialización de base de datos
│   └── repository/                  # Patrón Repository (acceso a datos desacoplado)
│       ├── usuario_repository.py
│       ├── busqueda_repository.py
│       ├── viaje_repository.py
│       └── comision_repository.py
├── models/                          # Modelos ORM SQLAlchemy 2.0
│   ├── usuario.py                   # Usuario, Pasajero, Administrador (Herencia/Especialización 1:1)
│   ├── busqueda.py                  # Busqueda, Oferta, Plataforma, Conductor, Vehiculo
│   ├── viaje.py                     # Viaje (vinculado 1:1 con Oferta y N:1 con Pasajero)
│   └── comision.py                  # ConfiguracionComision, Comision
├── schemas/                         # Esquemas Pydantic v2 (Request / Response DTOs)
│   ├── usuario.py
│   ├── busqueda.py
│   ├── viaje.py
│   └── comision.py
├── services/                        # Lógica de negocio y algoritmos centrales
│   ├── usuario_service.py           # Registro transaccional, autenticación y gestión de cuentas
│   ├── busqueda_service.py          # Búsqueda binaria, Haversine, cotización multi-app y ranking multicriterio
│   ├── viaje_service.py             # Solicitud de viaje, máquina de estados y disparo automático de comisiones
│   ├── comision_service.py          # Gestión de reglas de comisión y cálculo dinámico sin redundancia
│   └── s3_service.py                # Descarga del catálogo de barrios desde Amazon S3 con fallback local
└── routes/                          # Endpoints REST agrupados por dominio
    ├── usuario_routes.py
    ├── busqueda_routes.py
    ├── viaje_routes.py
    └── comision_routes.py
```

---

## 3. Algoritmos y Reglas de Negocio Clave

### 3.1. Catálogo Híbrido (Amazon S3 + Fallback Local) y Búsqueda Binaria $O(\log n)$
- Al iniciar la consulta de barrios (`busqueda_service.py`), el backend intenta descargar `barrios_cartagena.json` desde el bucket configurado en **Amazon S3** (`s3_service.py`) y lo almacena en caché en memoria (`@lru_cache`). Si no hay conectividad o credenciales AWS, conmuta de forma transparente al archivo local `backend/data/barrios_cartagena.json`.
- Los **212 barrios oficiales de Cartagena** se normalizan (sin tildes, en mayúsculas) y se pre-ordenan alfabéticamente en memoria para resolver la localización de coordenadas mediante **búsqueda binaria pura (`_busqueda_binaria_exacta`)** en complejidad $O(\log n)$, con respaldo por coincidencia parcial para entradas abreviadas del usuario.

### 3.2. Cálculo Geodésico de Haversine con Factor Vial Urbano
- A partir de las coordenadas $(\text{latitud } Y, \text{longitud } X)$ de los centroides de los barrios de origen y destino, se calcula la distancia ortodrómica con la fórmula de **Haversine** ($R = 6371.0\text{ km}$) y se aplica un **factor de corrección vial urbano de `1.30x`** propio de la trazabilidad geográfica de Cartagena (puentes, cuerpos de agua y desvíos viales).

### 3.3. Cotización en Plataformas y Ranking Multicriterio
- Se cotiza simultáneamente sobre las tres plataformas soportadas en el proyecto (**Uber**, **DiDi** e **inDrive**) verificando que se encuentren en estado `ACTIVO`.
- Las ofertas se ordenan automáticamente mediante una función de costo multicriterio (`_calcular_puntaje_recomendacion`):
  $$\text{Puntaje} = \left(\frac{\text{Precio COP}}{1000} \times 0.65\right) + (\text{Tiempo min} \times 0.35)$$
  Donde el menor puntaje encabeza la lista de recomendaciones (ponderando **65% economía** y **35% rapidez de llegada**).

### 3.4. Máquina de Estados del Viaje y Liquidación de Comisiones
- **Solicitud de Viaje (`POST /viajes/solicitar`)**: Valida que la oferta esté disponible, crea el registro en `viaje` con estado `SOLICITADO` y actualiza el estado de la oferta a `SELECCIONADA`.
- **Transiciones Controladas (`PATCH /viajes/{id_viaje}/estado`)**: Se valida estrictamente el grafo de estados permitido:
  - `SOLICITADO` → `ACEPTADO` | `EN_CURSO` | `COMPLETADO` | `CANCELADO`
  - `ACEPTADO` → `EN_CURSO` | `COMPLETADO` | `CANCELADO`
  - `EN_CURSO` → `COMPLETADO` | `CANCELADO`
  - `COMPLETADO` y `CANCELADO` son estados terminales inmutables (cualquier intento de reversión retorna `409 Conflict`).
- **Liquidación Automática de Comisión**: Cuando un viaje pasa a `COMPLETADO`, se genera de forma idempotente su registro en `comision` vinculando la regla `ACTIVA` de `configuracion_comision`. Siguiendo la Tercera Forma Normal (3FN), el monto monetario no se almacena de forma redundante en base de datos, sino que se expone dinámicamente mediante `@computed_field` (`monto_calculado`) en `ComisionRespuesta` a partir de `viaje.precio_final` y `porcentaje_aplicado`.

---

## 4. Referencia de Endpoints de la API REST

| Módulo | Método | Ruta | Caso de Uso / Descripción |
| :--- | :---: | :--- | :--- |
| **Sistema** | `GET` | `/` | Metadatos del servicio y enlaces a documentación interactiva. |
| **Sistema** | `GET` | `/health` | Verificación de estado del servidor (Healthcheck). |
| **Usuarios** | `POST` | `/usuarios/registro` | **DSS01P** — Registrar nuevo usuario (`PASAJERO` o `ADMINISTRADOR`). |
| **Usuarios** | `POST` | `/usuarios/login` | **DSS02P** — Autenticar credenciales y obtener perfil de sesión. |
| **Usuarios** | `GET` | `/usuarios/{id_usuario}` | **DSS03P** — Consultar perfil de un usuario por ID. |
| **Usuarios** | `PUT` | `/usuarios/{id_usuario}` | **DSS03P** — Actualizar datos básicos del perfil de usuario. |
| **Búsquedas** | `GET` | `/busquedas/barrios` | Listar o autocompletar (`?q=`) los 212 barrios oficiales de Cartagena. |
| **Búsquedas** | `POST` | `/busquedas/` | **DSS04P** — Ejecutar búsqueda unificada y cotizar en Uber, DiDi e inDrive. |
| **Búsquedas** | `GET` | `/busquedas/{id_busqueda}` | Consultar una búsqueda y sus ofertas ordenadas por recomendación. |
| **Viajes** | `POST` | `/viajes/solicitar` | **DSS05P** — Solicitar un viaje seleccionando una oferta disponible. |
| **Viajes** | `GET` | `/viajes/usuario/{id_usuario}` | **DSS06P** — Consultar historial de viajes de un pasajero. |
| **Viajes** | `GET` | `/viajes/{id_viaje}` | Consultar detalle y estado actual de un viaje. |
| **Viajes** | `PATCH` | `/viajes/{id_viaje}/estado` | Actualizar estado del viaje (genera comisión automáticamente al pasar a `COMPLETADO`). |
| **Comisiones** | `GET` | `/comisiones/configuracion/activa` | Consultar la regla de porcentaje de comisión vigente (`ACTIVA`). |
| **Comisiones** | `POST` | `/comisiones/configuracion` | **DSS01A** — Crear nueva regla de comisión (desactiva la anterior si entra `ACTIVA`). |
| **Comisiones** | `GET` | `/comisiones/` | **DSS02A** — Listar comisiones generadas con cálculo dinámico de `monto_calculado`. |

---

## 5. Variables de Entorno (`backend/.env`)

Copie el archivo `backend/.env.example` como `backend/.env`. El motor soporta tres escenarios: **PostgreSQL Local**, **Contenedor Docker** o **Amazon RDS PostgreSQL (con o sin IAM Token)**:

# URL de conexión estándar (PostgreSQL Local / Docker / AWS RDS con contraseña)
DATABASE_URL=postgresql+psycopg2://postgres:tu_password_aqui@localhost:5432/unixdriver

# Parámetros individuales y opciones para AWS RDS IAM Authentication
USE_RDS_IAM=false
DB_HOST=localhost
DB_PORT=5432
DB_NAME=unixdriver
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
DB_SSL_MODE=prefer
AWS_REGION=us-east-2

# Integración con Amazon S3 para catálogo de barrios (fallback automático a JSON local si se omite)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=unixdriver-data-cartagenabarrios-2026
S3_BARRIOS_KEY=barrios_cartagena.json

---

## 6. Guía de Ejecución

### Opción 1: Ejecución con Docker Compose (Recomendada)

Inicia automáticamente **PostgreSQL 16** (ejecutando `database/schema.sql` y `database/seed.sql`), el **Backend FastAPI** en el puerto `8000` y el **Frontend Web** en el puerto `3000`.

```powershell
# Desde la raíz del repositorio: construir e iniciar contenedores en segundo plano
docker compose up --build -d

# Consultar logs del backend en tiempo real
docker compose logs -f backend

# Detener los servicios
docker compose down
```

- **Swagger UI (Interactivo)**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Healthcheck**: `http://localhost:8000/health`

### Opción 2: Ejecución en Entorno Local (Sin Docker)

Requisitos: **Python 3.11+** y **PostgreSQL 15+** en ejecución con los scripts `database/schema.sql` y `database/seed.sql` aplicados.

```powershell
# 1. Crear y activar entorno virtual desde la raíz del repositorio
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Instalar dependencias
python -m pip install -r backend\requirements.txt

# 3. Configurar variables de entorno
Copy-Item backend\.env.example backend\.env

# 4. Iniciar servidor Uvicorn con recarga en caliente
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 7. Pruebas Automatizadas

El proyecto cuenta con pruebas de integración y de ciclo de vida completo en la carpeta `tests/` utilizando `pytest` y `TestClient` de FastAPI sobre una base de datos aislada en memoria:

```powershell
python -m pytest tests/ -v
```