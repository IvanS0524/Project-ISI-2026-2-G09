# Pruebas Automatizadas - UniX Driver

Esta carpeta contiene la suite de pruebas automatizadas del backend de **UniX Driver**, desarrollada con **pytest** para validar tanto la lógica de negocio local como la integración con los servicios en la nube de **AWS** (Amazon S3 y Amazon RDS).

---

## Estructura del Directorio

```text
tests/
├── test_backend_aws.py   # Suite de pruebas unitarias y de integración Cloud (Backend)
└── README.md             # Documentación y guía de ejecución de pruebas
```

> **Nota sobre pruebas del cliente móvil:** Las pruebas automatizadas de la interfaz móvil (Node.js / JSDOM) se encuentran en `mobile/unix-driver-7.2/tests/` y se ejecutan de forma independiente con `npm test` dentro de esa carpeta.

---

## Cobertura de `test_backend_aws.py`

La suite divide las validaciones en dos niveles para que pueda ejecutarse en cualquier equipo (con o sin llaves de AWS):

1. **Pruebas Unitarias (sin dependencias externas):**
   - Validación del catálogo oficial de los **212 barrios de Cartagena** (usando *fallback* local si no hay conexión a S3).
   - Algoritmo de búsqueda binaria de barrios ($O(\log n)$) y resolución de lugares/coordenadas exactas.
   - Cálculo geodésico de distancias mediante la fórmula de **Haversine**.
   - Cálculo dinámico de comisiones respetando la Tercera Forma Normal (3FN), sin almacenar montos redundantes.

2. **Pruebas de Integración Cloud (AWS):**
   - **Amazon S3:** Descarga directa del catálogo `barrios_cartagena.json` desde el bucket configurado.
   - **Amazon RDS (PostgreSQL):** Conexión real a la base de datos en la nube (soportando `DATABASE_URL` o autenticación con tokens dinámicos de AWS IAM sobre SSL) y verificación de datos semilla.
   - *Degradación elegante (`@pytest.mark.skipif`):* Si el entorno no tiene credenciales configuradas en `backend/.env`, las pruebas Cloud se omiten automáticamente (`SKIPPED`) sin hacer fallar las pruebas unitarias.

---

## Guía de Ejecución

### 1. Requisitos previos
Desde la raíz del repositorio, asegúrate de tener instaladas las dependencias del backend (incluyendo `pytest`):

```powershell
python -m pip install -r backend/requirements.txt
```

### 2. Ejecutar toda la suite del backend

**En Windows (PowerShell):**
*(Se recomienda usar `python -m` para evitar errores de PATH en Windows)*
```powershell
python -m pytest -v
```

**En Linux / macOS:**
```bash
pytest -v
```

### 3. Ejecutar únicamente el archivo de pruebas del backend
```powershell
python -m pytest tests/test_backend_aws.py -v
```

### 4. Resultados esperados
- **Con `backend/.env` configurado (credenciales de AWS activas):** Todas las pruebas unitarias y de integración pasan en verde (`passed`).
- **Sin credenciales de AWS (entorno local limpio o CI):** Las pruebas unitarias pasan en verde (`passed`) y las 2 pruebas de integración Cloud (S3 y RDS) se reportan como omitidas (`2 skipped`) de forma controlada.

---

## Pruebas del Cliente Móvil

Para validar también la interfaz móvil y su empaquetado desde la raíz del repositorio:

```powershell
npm --prefix mobile/unix-driver-7.2 test
```