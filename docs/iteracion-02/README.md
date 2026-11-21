# Iteración 02 — Base de Datos Relacional y Primer Prototipo Móvil

Esta carpeta documenta los entregables, decisiones técnicas y avances logrados durante la segunda iteración de **UniX Driver**.

---

## Objetivo

Materializar el modelo de datos relacional del sistema en **PostgreSQL** garantizando la **Tercera Forma Normal (3FN)** e integridad referencial estricta, al tiempo que se construye y depura el primer prototipo interactivo de la interfaz móvil para el pasajero en Cartagena de Indias, incorporando las correcciones de la primera revisión.

---

## 1. Diseño e Implementación de la Base de Datos Relacional (`database/`)

El esquema SQL puro, los datos semilla y su guía de ejecución se consolidaron en la carpeta `database/`:

- **Script DDL del esquema:** [database/schema.sql](../../database/schema.sql)
- **Script DML de datos iniciales:** [database/seed.sql](../../database/seed.sql)
- **Documentación de base de datos:** [database/README.md](../../database/README.md)

### Estructura de las 10 Tablas (Orden Referencial)

| Orden | Tabla | Propósito en el Dominio | Relaciones Clave (FK) |
| :---: | :--- | :--- | :--- |
| 1 | `rol` | Catálogo de roles del sistema (`PASAJERO`, `ADMINISTRADOR`). | *Tabla raíz* |
| 2 | `usuario` | Cuentas de usuario, credenciales con hash y datos básicos de contacto. | `id_rol` → `rol` |
| 3 | `plataforma` | Catálogo de proveedores de transporte simulados (**Uber**, **DiDi**, **inDrive**). | *Tabla raíz* |
| 4 | `conductor` | Datos del conductor asignado a una oferta y su calificación. | *Tabla raíz* |
| 5 | `vehiculo` | Identificación de vehículo (placa única, marca, modelo y tipo). | *Tabla raíz* |
| 6 | `busqueda` | Registro de consultas unificadas de origen y destino realizadas por un usuario. | `id_usuario` → `usuario` |
| 7 | `oferta` | Alternativas cotizadas por plataforma simulada (precio, tiempo y distancia). | `id_busqueda`, `id_plataforma`, `id_conductor`, `id_vehiculo` |
| 8 | `viaje` | Oferta seleccionada por el pasajero y seguimiento de su estado operativo. | `id_oferta` (`UNIQUE`) → `oferta` |
| 9 | `configuracion_comision` | Reglas históricas y vigencia de porcentajes de comisión definidos por el administrador. | `id_administrador` → `usuario` |
| 10 | `comision` | Tasa de comisión aplicada a cada viaje completado. | `id_viaje` (`UNIQUE`) → `viaje`, `id_configuracion` → `configuracion_comision` |

### Reglas de Integridad y Tercera Forma Normal (3FN)

1. **Claves primarias estándar SQL:** Uso de `GENERATED ALWAYS AS IDENTITY` en todas las entidades principales.
2. **Regla de no redundancia en `comision`:** La tabla `comision` registra únicamente el `porcentaje_aplicado`, `fecha_generacion`, `estado` y sus llaves foráneas (`id_viaje`, `id_configuracion`), sin almacenar un campo de monto monetario redundante, ya que dicho monto se deriva directamente de `viaje.precio_final`.
3. **Relaciones `1:1` controladas:**
   - Un `viaje` corresponde a una única `oferta` mediante restricción `UNIQUE (id_oferta)`.
   - Una `comision` se liquida como máximo una vez por `viaje` mediante restricción `UNIQUE (id_viaje)`.
4. **Restricciones de dominio (`CHECK`):**
   - `conductor.calificacion`: Rango numérico entre `0` y `5`.
   - `oferta`: `precio_estimado >= 0`, `tiempo_estimado >= 0` y `distancia >= 0`.
   - `viaje`: `precio_final >= 0` y estados permitidos (`SOLICITADO`, `ACEPTADO`, `EN_CURSO`, `COMPLETADO`, `CANCELADO`).
   - `usuario`: Estados válidos de cuenta (`ACTIVO`, `INACTIVO`, `SUSPENDIDO`).
   - `configuracion_comision`: Porcentaje válido entre `0` y `100` y coherencia temporal (`fecha_fin IS NULL OR fecha_fin >= fecha_inicio`).

---

## 2. Evolución del Primer Prototipo Móvil y Correcciones de Revisión

Sobre la base de las observaciones recibidas tras la Iteración 01, se refinó la vista móvil inicial orientada al usuario pasajero:

- **Consistencia terminológica del flujo principal:** Se unificó la etiqueta de acción hacia el pasajero bajo **"Solicitar viaje"** y se estandarizó la representación comparativa de las tres plataformas del alcance (**Uber**, **DiDi** e **inDrive**) como proveedores simulados.
- **Catálogo georreferenciado de 212 barrios oficiales de Cartagena:** Se estructuró el archivo oficial de barrios con coordenadas geográficas $(X = \text{longitud}, Y = \text{latitud})$ y su localidad administrativa correspondiente, eliminando ubicaciones ambiguas sin coordenadas.
- **Cálculo de distancia origen–destino y tarifas diferenciadas:** Se implementó el cálculo de recorrido entre origen y destino con estimación tarifaria diferenciada por tipo de vehículo (**Moto** y **Carro**), preparando el contrato visual para la futura conexión con la API REST.

---

## 3. Configuración Inicial de Despliegue Estático (`GitHub Pages`)

Para facilitar la revisión temprana e iterativa del prototipo desde navegador y dispositivos móviles sin requerir compilación nativa inmediata:

- Se organizó la exportación y empaquetado de los activos web estáticos (`HTML5 / CSS3 / JavaScript`) en rutas relativas compatibles con alojamiento estático en **GitHub Pages**.
- Se dejó lista la base de estructura web (`www/`) para su empaquetado híbrido progresivo hacia Android mediante **Capacitor**.

---

## Integrantes

- **Ivan Andres Sierra Arrieta**
- **Sebastian de Jesus Morales Marimon**

## Estado de la Entrega

- [x] Diseño e implementación del esquema relacional de 10 tablas en PostgreSQL (`schema.sql` y `seed.sql`).
- [x] Aplicación de reglas 3FN, restricciones `CHECK`, relaciones `1:1` y no redundancia en `comision`.
- [x] Primer prototipo móvil con correcciones de revisión ("Solicitar viaje", 212 barrios $(X, Y)$ y distancia origen–destino).
- [x] Configuración inicial de despliegue estático en GitHub Pages.
