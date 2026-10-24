-- =============================================================================
-- UnixDriver - Esquema de Base de Datos Relacional (PostgreSQL)
-- Asignatura: Ingeniería de Servicios de Internet (ISI) - Grupo G09
-- Descripción: Script DDL alineado con las reglas de negocio y el modelo E-R.
-- =============================================================================

SET client_encoding = 'UTF8';

-- -----------------------------------------------------------------------------
-- 0. Limpieza previa (Permite re-ejecutar el script en entorno de desarrollo)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS comision CASCADE;
DROP TABLE IF EXISTS configuracion_comision CASCADE;
DROP TABLE IF EXISTS viaje CASCADE;
DROP TABLE IF EXISTS oferta CASCADE;
DROP TABLE IF EXISTS busqueda CASCADE;
DROP TABLE IF EXISTS vehiculo CASCADE;
DROP TABLE IF EXISTS conductor CASCADE;
DROP TABLE IF EXISTS plataforma CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS rol CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Tabla: rol
-- -----------------------------------------------------------------------------
CREATE TABLE rol (
    id_rol INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

COMMENT ON TABLE rol IS 'Roles del sistema para el control de acceso (ej. PASAJERO, ADMINISTRADOR).';
COMMENT ON COLUMN rol.id_rol IS 'Identificador único del rol.';
COMMENT ON COLUMN rol.nombre IS 'Nombre único del rol.';

-- -----------------------------------------------------------------------------
-- 2. Tabla: usuario
-- -----------------------------------------------------------------------------
CREATE TABLE usuario (
    id_usuario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_nacimiento DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'INACTIVO', 'SUSPENDIDO')),
    id_rol INTEGER NOT NULL,

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol)
        REFERENCES rol(id_rol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_usuario_rol ON usuario(id_rol);

COMMENT ON TABLE usuario IS 'Usuarios registrados en la plataforma (pasajeros y administradores).';
COMMENT ON COLUMN usuario.correo IS 'Correo electrónico único utilizado como credencial de acceso.';
COMMENT ON COLUMN usuario.contrasena IS 'Hash encriptado de la contraseña del usuario.';
COMMENT ON COLUMN usuario.estado IS 'Estado de la cuenta del usuario en el sistema.';

-- -----------------------------------------------------------------------------
-- 3. Tabla: plataforma
-- -----------------------------------------------------------------------------
CREATE TABLE plataforma (
    id_plataforma INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'INACTIVO'))
);

COMMENT ON TABLE plataforma IS 'Proveedores externos de transporte (ej. Uber, DiDi, inDrive).';
COMMENT ON COLUMN plataforma.nombre IS 'Nombre comercial de la plataforma externa.';
COMMENT ON COLUMN plataforma.estado IS 'Indica si el adaptador de la plataforma está habilitado para consultas.';

-- -----------------------------------------------------------------------------
-- 4. Tabla: conductor
-- -----------------------------------------------------------------------------
CREATE TABLE conductor (
    id_conductor INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    calificacion DECIMAL(3,2)
        CHECK (calificacion >= 0 AND calificacion <= 5),
    telefono VARCHAR(20)
);

COMMENT ON TABLE conductor IS 'Datos del conductor asociados a una oferta cuando el proveedor informa ese dato.';
COMMENT ON COLUMN conductor.calificacion IS 'Calificación promedio del conductor en escala de 0.00 a 5.00.';

-- -----------------------------------------------------------------------------
-- 5. Tabla: vehiculo
-- -----------------------------------------------------------------------------
CREATE TABLE vehiculo (
    id_vehiculo INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    placa VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(25) NOT NULL,
    modelo VARCHAR(25) NOT NULL,
    tipo VARCHAR(25) NOT NULL
);

COMMENT ON TABLE vehiculo IS 'Características del vehículo asociado a una oferta de transporte.';
COMMENT ON COLUMN vehiculo.placa IS 'Identificador o matrícula única del vehículo.';
COMMENT ON COLUMN vehiculo.tipo IS 'Categoría o gama del vehículo (ej. Económico, Confort, SUV, Moto).';

-- -----------------------------------------------------------------------------
-- 6. Tabla: busqueda
-- -----------------------------------------------------------------------------
CREATE TABLE busqueda (
    id_busqueda INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    origen VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (
            estado IN (
                'PENDIENTE',
                'PROCESANDO',
                'COMPLETADA',
                'SIN_RESULTADOS',
                'ERROR'
            )
        ),
    id_usuario INTEGER NOT NULL,

    CONSTRAINT fk_busqueda_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_busqueda_usuario ON busqueda(id_usuario);
CREATE INDEX idx_busqueda_fecha ON busqueda(fecha_hora);

COMMENT ON TABLE busqueda IS 'Registro de consultas unificadas de trayecto realizadas por los pasajeros (DSS04P).';
COMMENT ON COLUMN busqueda.origen IS 'Punto o dirección de partida solicitada por el pasajero.';
COMMENT ON COLUMN busqueda.destino IS 'Punto o dirección de llegada solicitada por el pasajero.';

-- -----------------------------------------------------------------------------
-- 7. Tabla: oferta
-- -----------------------------------------------------------------------------
CREATE TABLE oferta (
    id_oferta INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    precio_estimado DECIMAL(10,2) NOT NULL
        CHECK (precio_estimado >= 0),
    tiempo_estimado INTEGER NOT NULL
        CHECK (tiempo_estimado >= 0),
    distancia DECIMAL(10,2) NOT NULL
        CHECK (distancia >= 0),
    fecha_hora_respuesta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE'
        CHECK (
            estado IN (
                'DISPONIBLE',
                'SELECCIONADA',
                'NO_DISPONIBLE',
                'EXPIRADA'
            )
        ),
    id_busqueda INTEGER NOT NULL,
    id_plataforma INTEGER NOT NULL,
    id_conductor INTEGER NOT NULL,
    id_vehiculo INTEGER NOT NULL,

    CONSTRAINT fk_oferta_busqueda
        FOREIGN KEY (id_busqueda)
        REFERENCES busqueda(id_busqueda)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_oferta_plataforma
        FOREIGN KEY (id_plataforma)
        REFERENCES plataforma(id_plataforma)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_oferta_conductor
        FOREIGN KEY (id_conductor)
        REFERENCES conductor(id_conductor)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_oferta_vehiculo
        FOREIGN KEY (id_vehiculo)
        REFERENCES vehiculo(id_vehiculo)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_oferta_busqueda ON oferta(id_busqueda);
CREATE INDEX idx_oferta_plataforma ON oferta(id_plataforma);

COMMENT ON TABLE oferta IS 'Alternativas de movilidad devueltas por las plataformas para una búsqueda.';
COMMENT ON COLUMN oferta.precio_estimado IS 'Tarifa estimada en pesos colombianos (COP).';
COMMENT ON COLUMN oferta.tiempo_estimado IS 'Tiempo estimado en minutos.';
COMMENT ON COLUMN oferta.distancia IS 'Distancia estimada del trayecto en kilómetros.';

-- -----------------------------------------------------------------------------
-- 8. Tabla: viaje
-- -----------------------------------------------------------------------------
CREATE TABLE viaje (
    id_viaje INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha_hora_inicio TIMESTAMP,
    fecha_hora_fin TIMESTAMP,
    precio_final DECIMAL(10,2)
        CHECK (precio_final >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'SOLICITADO'
        CHECK (
            estado IN (
                'SOLICITADO',
                'ACEPTADO',
                'EN_CURSO',
                'COMPLETADO',
                'CANCELADO'
            )
        ),
    id_oferta INTEGER NOT NULL UNIQUE,

    CONSTRAINT fk_viaje_oferta
        FOREIGN KEY (id_oferta)
        REFERENCES oferta(id_oferta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_fechas_viaje
        CHECK (fecha_hora_fin IS NULL OR fecha_hora_fin >= fecha_hora_inicio)
);

CREATE INDEX idx_viaje_estado ON viaje(estado);

COMMENT ON TABLE viaje IS 'Registro de la oferta seleccionada por el pasajero y seguimiento de su estado (DSS05P y DSS06P).';
COMMENT ON COLUMN viaje.id_oferta IS 'Referencia única (1:1) a la oferta seleccionada para el viaje.';

-- -----------------------------------------------------------------------------
-- 9. Tabla: configuracion_comision
-- -----------------------------------------------------------------------------
CREATE TABLE configuracion_comision (
    id_configuracion INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    porcentaje DECIMAL(5,2) NOT NULL
        CHECK (porcentaje >= 0 AND porcentaje <= 100),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
        CHECK (estado IN ('ACTIVA', 'INACTIVA')),
    id_administrador INTEGER NOT NULL,

    CONSTRAINT fk_config_administrador
        FOREIGN KEY (id_administrador)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_fechas_configuracion
        CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX idx_config_comision_estado ON configuracion_comision(estado);

COMMENT ON TABLE configuracion_comision IS 'Parámetros históricos y vigentes de comisión definidos por un administrador.';
COMMENT ON COLUMN configuracion_comision.porcentaje IS 'Valor porcentual de comisión (0.00 a 100.00).';

-- -----------------------------------------------------------------------------
-- 10. Tabla: comision
-- -----------------------------------------------------------------------------
CREATE TABLE comision (
    id_comision INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    porcentaje_aplicado DECIMAL(5,2) NOT NULL
        CHECK (
            porcentaje_aplicado >= 0
            AND porcentaje_aplicado <= 100
        ),
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'GENERADA'
        CHECK (
            estado IN (
                'GENERADA',
                'PAGADA',
                'ANULADA'
            )
        ),
    id_viaje INTEGER NOT NULL UNIQUE,
    id_configuracion INTEGER NOT NULL,

    CONSTRAINT fk_comision_viaje
        FOREIGN KEY (id_viaje)
        REFERENCES viaje(id_viaje)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_comision_configuracion
        FOREIGN KEY (id_configuracion)
        REFERENCES configuracion_comision(id_configuracion)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_comision_configuracion ON comision(id_configuracion);

COMMENT ON TABLE comision IS 'Registro de la comisión aplicada a cada viaje sin almacenar montos redundantes.';
COMMENT ON COLUMN comision.porcentaje_aplicado IS 'Porcentaje vigente aplicado al viaje en el momento de su generación.';