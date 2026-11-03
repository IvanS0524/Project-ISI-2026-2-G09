# Base de datos - UnixDriver

Esta carpeta contiene los archivos relacionados con el diseño e implementación de la base de datos relacional de la solución **UnixDriver** en **PostgreSQL**.

## Entregables

- `schema.sql`: Script SQL (DDL) para la creación y reconstrucción del esquema de la base de datos.

El archivo `schema.sql` permite reconstruir el esquema completo de la base de datos de forma limpia e incluye comentarios descriptivos (`COMMENT ON`) tanto en el código como en el catálogo del motor PostgreSQL.

---

## Motor y características técnicas

- **SGBD:** PostgreSQL
- **Claves primarias:** Generadas mediante el estándar SQL `GENERATED ALWAYS AS IDENTITY`.
- **Integridad de dominio:** Uso de restricciones `NOT NULL`, `UNIQUE`, valores por defecto (`DEFAULT`) y validaciones `CHECK` para rangos numéricos, estados permitidos y coherencia de fechas.

---

## Estructura del esquema (`schema.sql`)

El esquema está compuesto por **10 tablas** organizadas según su orden de dependencia referencial:

| Orden | Tabla | Descripción | Claves Foráneas (FK) |
| :---: | :--- | :--- | :--- |
| 1 | `rol` | Catálogo de roles del sistema (ej. pasajero, administrador). | *Ninguna* |
| 2 | `usuario` | Cuentas de usuarios, credenciales protegidas y datos de perfil. | `id_rol` → `rol` |
| 3 | `plataforma` | Proveedores externos de transporte (Uber, DiDi, inDrive). | *Ninguna* |
| 4 | `conductor` | Información y calificación del conductor asociado a una oferta. | *Ninguna* |
| 5 | `vehiculo` | Datos del vehículo (placa única, marca, modelo, tipo) de una oferta. | *Ninguna* |
| 6 | `busqueda` | Registro de consultas unificadas de origen y destino realizadas por pasajeros. | `id_usuario` → `usuario` |
| 7 | `oferta` | Alternativas de transporte (precio, tiempo, distancia) devueltas para una búsqueda. | `id_busqueda` → `busqueda`<br>`id_plataforma` → `plataforma`<br>`id_conductor` → `conductor`<br>`id_vehiculo` → `vehiculo` |
| 8 | `viaje` | Registro de la oferta seleccionada por el pasajero y seguimiento de su estado. | `id_oferta` (UNIQUE) → `oferta` |
| 9 | `configuracion_comision` | Parámetros y vigencia de porcentajes de comisión definidos por un administrador. | `id_administrador` → `usuario` |
| 10 | `comision` | Registro del porcentaje de comisión aplicado a cada viaje. | `id_viaje` (UNIQUE) → `viaje`<br>`id_configuracion` → `configuracion_comision` |

---

## Reglas de negocio e integridad implementadas

1. **No redundancia en comisiones:** La tabla `comision` almacena únicamente el `porcentaje_aplicado` y la referencia al `viaje`, evitando almacenar montos monetarios redundantes que se derivan del `precio_final` del viaje.
2. **Relaciones 1 a 1 controladas:**
   - Un `viaje` se asocia a una única `oferta` seleccionada (`id_oferta UNIQUE`).
   - Una `comision` se genera una única vez por cada `viaje` (`id_viaje UNIQUE`).
3. **Validaciones de rango y estados (`CHECK`):**
   - `conductor.calificacion`: Rango válido entre `0` y `5`.
   - `oferta`: `precio_estimado >= 0`, `tiempo_estimado >= 0` y `distancia >= 0`.
   - `viaje`: `precio_final >= 0` y control de estados (`SOLICITADO`, `ACEPTADO`, `EN_CURSO`, `COMPLETADO`, `CANCELADO`).
   - `configuracion_comision`: Porcentaje entre `0` y `100`, y validación temporal (`fecha_fin IS NULL OR fecha_fin >= fecha_inicio`).

---

## Instrucciones de ejecución

### Opción 1: Desde PopSQL / pgAdmin / DBeaver
1. Crear una base de datos vacía en PostgreSQL (por ejemplo, `unixdriver`).
2. Abrir el archivo `database/schema.sql`.
3. Ejecutar todo el script. Las sentencias `DROP TABLE IF EXISTS ... CASCADE` al inicio permiten re-ejecutar el script para reconstruir el esquema limpio en entornos de desarrollo.

### Opción 2: Desde terminal con `psql`
```bash
psql -U postgres -d unixdriver -f database/schema.sql
