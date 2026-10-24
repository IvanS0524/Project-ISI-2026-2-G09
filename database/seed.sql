-- =============================================================================
-- UnixDriver - Datos de Prueba (Seed Data) para PostgreSQL
-- Ubicación de referencia: Cartagena, Bolívar, Colombia
-- Nota académica: Datos simulados de demostración para pruebas del prototipo.
-- =============================================================================

-- Limpia las tablas y reinicia los contadores de ID en 1 para evitar errores de FK
TRUNCATE TABLE 
    comision,
    configuracion_comision,
    viaje,
    oferta,
    busqueda,
    vehiculo,
    conductor,
    plataforma,
    usuario,
    rol
RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Tabla: rol (IDs generados: 1 = PASAJERO, 2 = ADMINISTRADOR)
-- -----------------------------------------------------------------------------
INSERT INTO rol (nombre) VALUES
('PASAJERO'),
('ADMINISTRADOR');

-- -----------------------------------------------------------------------------
-- 2. Tabla: usuario (IDs generados: 1 al 5)
-- Nota: 'contrasena' simula un hash bcrypt para pruebas de autenticación.
-- -----------------------------------------------------------------------------
INSERT INTO usuario (nombre, correo, contrasena, telefono, fecha_nacimiento, estado, id_rol) VALUES
('Carlos Mendoza', 'carlos.mendoza@unicartagena.edu.co', '$2b$12$KIX/SimulatedHashPasajero1234567890', '3001234567', '2003-05-14', 'ACTIVO', 1),
('Valeria Gómez', 'valeria.gomez@unicartagena.edu.co', '$2b$12$KIX/SimulatedHashValeria12345678901', '3017654321', '2002-11-20', 'ACTIVO', 1),
('Andrés Barrios', 'andres.barrios@gmail.com', '$2b$12$KIX/SimulatedHashAndres123456789012', '3159876543', '1999-08-03', 'ACTIVO', 1),
('Laura Martínez (Admin)', 'admin.laura@unixdriver.co', '$2b$12$KIX/SimulatedHashAdminLaura12345678', '3105554433', '1995-02-10', 'ACTIVO', 2),
('Jorge Herrera (Admin)', 'admin.jorge@unixdriver.co', '$2b$12$KIX/SimulatedHashAdminJorge12345678', '3209998877', '1993-07-25', 'ACTIVO', 2);

-- -----------------------------------------------------------------------------
-- 3. Tabla: plataforma (IDs generados: 1 = Uber, 2 = DiDi, 3 = inDrive, 4 = Cabify)
-- -----------------------------------------------------------------------------
INSERT INTO plataforma (nombre, estado) VALUES
('Uber', 'ACTIVO'),
('DiDi', 'ACTIVO'),
('inDrive', 'ACTIVO'),
('Cabify', 'INACTIVO');

-- -----------------------------------------------------------------------------
-- 4. Tabla: conductor (IDs generados: 1 al 5)
-- -----------------------------------------------------------------------------
INSERT INTO conductor (nombre, calificacion, telefono) VALUES
('Rafael Paternina', 4.85, '3021112233'),
('Jairo Aguas', 4.60, '3042223344'),
('Edgardo Caraballo', 4.92, '3113334455'),
('Farid Monterrosa', 4.45, '3124445566'),
('Wilmer Teherán', 4.78, '3145556677');

-- -----------------------------------------------------------------------------
-- 5. Tabla: vehiculo (IDs generados: 1 al 5)
-- -----------------------------------------------------------------------------
INSERT INTO vehiculo (placa, marca, modelo, tipo) VALUES
('CTG-123', 'Chevrolet', 'Spark GT', 'Economico'),
('BOL-456', 'Renault', 'Logan', 'Confort'),
('KLM-789', 'Kia', 'Picanto', 'Economico'),
('UIO-321', 'Nissan', 'Versa', 'Sedan XL'),
('XYZ-987', 'Suzuki', 'Swift', 'Economico');

-- -----------------------------------------------------------------------------
-- 6. Tabla: busqueda (IDs generados: 1 al 5)
-- Trayectos reales en Cartagena de Indias
-- -----------------------------------------------------------------------------
INSERT INTO busqueda (origen, destino, fecha_hora, estado, id_usuario) VALUES
('Universidad de Cartagena - Campus Piedra de Bolívar', 'Centro Histórico - Torre del Reloj', '2026-10-20 08:15:00', 'COMPLETADA', 1),
('Centro Comercial Mallplaza El Castillo', 'Aeropuerto Internacional Rafael Núñez', '2026-10-21 14:30:00', 'COMPLETADA', 2),
('Bocagrande - Av. San Martín', 'Terminal de Transportes de Cartagena', '2026-10-22 18:00:00', 'COMPLETADA', 1),
('Barrio Manga - Cuarto Callejón', 'Castillo de San Felipe de Barajas', '2026-10-23 10:05:00', 'SIN_RESULTADOS', 3),
('Crespo - Calle 70', 'Universidad Tecnológica de Bolívar - Ternera', '2026-10-24 16:40:00', 'PENDIENTE', 2);

-- -----------------------------------------------------------------------------
-- 7. Tabla: oferta (IDs generados: 1 al 7)
-- Incluye múltiples ofertas por búsqueda para probar la comparación (DSS04P)
-- -----------------------------------------------------------------------------
INSERT INTO oferta (
    precio_estimado, tiempo_estimado, distancia, fecha_hora_respuesta, estado,
    id_busqueda, id_plataforma, id_conductor, id_vehiculo
) VALUES
-- 3 Ofertas para la Búsqueda 1 (Piedra de Bolívar -> Centro Histórico, ~6.8 km)
(16500.00, 22, 6.80, '2026-10-20 08:15:02', 'DISPONIBLE', 1, 1, 1, 1), -- Uber
(14800.00, 25, 6.80, '2026-10-20 08:15:03', 'DISPONIBLE', 1, 2, 2, 2), -- DiDi (Más económica)
(15500.00, 19, 6.80, '2026-10-20 08:15:03', 'DISPONIBLE', 1, 3, 3, 3), -- inDrive (Más rápida y mejor conductor)

-- 2 Ofertas para la Búsqueda 2 (Mallplaza -> Aeropuerto, ~4.2 km)
(12900.00, 14, 4.20, '2026-10-21 14:30:02', 'DISPONIBLE', 2, 1, 4, 4), -- Uber
(11500.00, 16, 4.20, '2026-10-21 14:30:03', 'EXPIRADA',   2, 2, 5, 5), -- DiDi

-- 2 Ofertas para la Búsqueda 3 (Bocagrande -> Terminal de Transportes, ~14.5 km)
(28000.00, 38, 14.50, '2026-10-22 18:00:02', 'DISPONIBLE',    3, 3, 3, 3), -- inDrive
(31200.00, 35, 14.50, '2026-10-22 18:00:03', 'NO_DISPONIBLE', 3, 1, 1, 1); -- Uber

-- -----------------------------------------------------------------------------
-- 8. Tabla: viaje (IDs generados: 1 al 3)
-- Relación 1:1 con la oferta elegida por el pasajero (DSS05P y DSS06P)
-- -----------------------------------------------------------------------------
INSERT INTO viaje (fecha_hora_inicio, fecha_hora_fin, precio_final, estado, id_oferta) VALUES
-- Viaje 1: Carlos eligió la oferta 3 (inDrive) de la Búsqueda 1 y completó el viaje
('2026-10-20 08:20:00', '2026-10-20 08:40:00', 15500.00, 'COMPLETADO', 3),

-- Viaje 2: Valeria eligió la oferta 4 (Uber) de la Búsqueda 2 y completó el viaje
('2026-10-21 14:35:00', '2026-10-21 14:50:00', 12900.00, 'COMPLETADO', 4),

-- Viaje 3: Carlos eligió la oferta 6 (inDrive) de la Búsqueda 3 pero luego fue cancelado
('2026-10-22 18:05:00', '2026-10-22 18:09:00', 0.00,     'CANCELADO',  6);

-- -----------------------------------------------------------------------------
-- 9. Tabla: configuracion_comision (IDs generados: 1 y 2)
-- Creadas por los usuarios administradores (IDs 4 y 5)
-- -----------------------------------------------------------------------------
INSERT INTO configuracion_comision (porcentaje, fecha_inicio, fecha_fin, estado, id_administrador) VALUES
(4.00, '2026-08-01 00:00:00', '2026-09-30 23:59:59', 'INACTIVA', 4),
(5.50, '2026-10-01 00:00:00', NULL,                  'ACTIVA',   5);

-- -----------------------------------------------------------------------------
-- 10. Tabla: comision (IDs generados: 1 al 3)
-- Registra el porcentaje aplicado a cada viaje sin duplicar montos
-- -----------------------------------------------------------------------------
INSERT INTO comision (porcentaje_aplicado, fecha_generacion, estado, id_viaje, id_configuracion) VALUES
(5.50, '2026-10-20 08:40:05', 'PAGADA',   1, 2),
(5.50, '2026-10-21 14:50:05', 'GENERADA', 2, 2),
(5.50, '2026-10-22 18:09:05', 'ANULADA',  3, 2);