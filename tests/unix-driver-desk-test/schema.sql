-- ============================================================
--  UniX Driver · Cartagena — esquema MySQL/MariaDB
--  Idempotente: se puede ejecutar en cada arranque del servidor.
-- ============================================================

CREATE TABLE IF NOT EXISTS tarifas (
  zona      VARCHAR(10)  NOT NULL PRIMARY KEY,
  moto      INT          NOT NULL,
  carro     INT          NOT NULL,
  etiqueta  VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS barrios (
  id           INT          NOT NULL PRIMARY KEY,
  nombre       VARCHAR(140) NOT NULL,
  nombre_norm  VARCHAR(140) NOT NULL,
  localidad    VARCHAR(80)  NULL,
  zona         ENUM('corto','medio','largo') NOT NULL,
  tarifa_moto  INT          NOT NULL,
  tarifa_carro INT          NOT NULL,
  lat          DECIMAL(10,6) NULL,
  lon          DECIMAL(10,6) NULL,
  distancia_km DECIMAL(6,2)  NULL,
  area_ha      DECIMAL(10,2) NULL,
  es_rural     TINYINT(1)   NOT NULL DEFAULT 0,
  KEY idx_barrios_norm (nombre_norm),
  KEY idx_barrios_zona (zona)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS viajes (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  folio             VARCHAR(20)  NULL UNIQUE,
  barrio_id         INT          NULL,
  barrio_destino    VARCHAR(140) NOT NULL,
  localidad         VARCHAR(80)  NULL,
  zona              VARCHAR(10)  NOT NULL,
  vehiculo          ENUM('moto','carro') NOT NULL,
  tarifa            INT          NOT NULL,
  comision          INT          NOT NULL,
  estado            ENUM('pendiente','asignado','en_curso','finalizado','cancelado','pagado')
                    NOT NULL DEFAULT 'pendiente',
  plataforma        VARCHAR(20)  NULL,
  conductor_nombre  VARCHAR(80)  NULL,
  conductor_vehiculo VARCHAR(60) NULL,
  conductor_placa   VARCHAR(12)  NULL,
  conductor_rating  DECIMAL(3,1) NULL,
  distancia_km      DECIMAL(6,2) NULL,
  creado_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  iniciado_en       DATETIME     NULL,
  finalizado_en     DATETIME     NULL,
  cancelado_en      DATETIME     NULL,
  pagado_en         DATETIME     NULL,
  KEY idx_viajes_estado (estado),
  KEY idx_viajes_fecha (creado_en),
  KEY idx_viajes_barrio (barrio_id),
  CONSTRAINT fk_viajes_barrio FOREIGN KEY (barrio_id) REFERENCES barrios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ofertas (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  viaje_id          INT          NOT NULL,
  plataforma        VARCHAR(20)  NOT NULL,
  precio            INT          NOT NULL,
  eta_min           INT          NOT NULL,
  conductor_nombre  VARCHAR(80)  NOT NULL,
  conductor_vehiculo VARCHAR(60) NOT NULL,
  conductor_placa   VARCHAR(12)  NOT NULL,
  conductor_rating  DECIMAL(3,1) NOT NULL,
  seleccionada      TINYINT(1)   NOT NULL DEFAULT 0,
  creado_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ofertas_viaje (viaje_id),
  CONSTRAINT fk_ofertas_viaje FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pagos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  viaje_id    INT          NOT NULL,
  folio       VARCHAR(24)  NOT NULL UNIQUE,
  monto       INT          NOT NULL,
  comision    INT          NOT NULL,
  neto        INT          NOT NULL,
  metodo      ENUM('efectivo','tarjeta','nequi','daviplata','pse') NOT NULL DEFAULT 'tarjeta',
  estado      ENUM('aprobado','rechazado') NOT NULL DEFAULT 'aprobado',
  referencia  VARCHAR(40)  NOT NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pagos_viaje (viaje_id),
  CONSTRAINT fk_pagos_viaje FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eventos (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  viaje_id  INT          NOT NULL,
  estado    VARCHAR(20)  NOT NULL,
  detalle   VARCHAR(255) NULL,
  creado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_eventos_viaje (viaje_id),
  CONSTRAINT fk_eventos_viaje FOREIGN KEY (viaje_id) REFERENCES viajes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
