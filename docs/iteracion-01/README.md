# Iteración 01

Esta carpeta contiene la documentación y los modelos de análisis correspondientes a la primera iteración del proyecto **Plataforma Inteligente de Recomendación de Transporte para Cartagena (UnixDriver)**.

## Objetivo

Definir los actores, requisitos funcionales y flujos principales del sistema antes de iniciar la etapa de diseño y construcción de la aplicación. En esta iteración se modelan las interacciones del Pasajero y del Administrador con la plataforma.

## Entregables

### 1. Documentación de análisis

* [Análisis funcional](model/analisis/README.md): Descripción de los actores, casos de uso y modelos de análisis del sistema.
* [Modelo de dominio](model/analisis/modelo_dominio/modelo_dominio.png): Representación de los conceptos principales del dominio y sus relaciones.
* [Diagrama de casos de uso](model/analisis/casos_uso/casos_uso.jpg): Representación de las funcionalidades del sistema y las interacciones de los actores.

### 2. Diagramas de secuencia del sistema (DSS)

Los DSS se encuentran organizados por actor y describen las interacciones entre el usuario y el sistema para los casos de uso principales.

* [DSS del Pasajero](model/analisis/modelo_dss/Pasajero/): Seis diagramas de secuencia del sistema.
* [DSS del Administrador](model/analisis/modelo_dss/Administrador/): Cuatro diagramas de secuencia del sistema.

## Alcance funcional

### Pasajero

* Registrarse e iniciar sesión.
* Gestionar su perfil.
* Realizar una búsqueda unificada de transporte.
* Seleccionar una oferta de transporte.
* Consultar el historial de viajes.

### Administrador

* Iniciar sesión.
* Gestionar usuarios.
* Configurar la comisión del servicio.
* Consultar reportes y estadísticas.

### Plataforma de Transporte

- Proporcionar información sobre las ofertas de transporte disponibles.
- Representar la integración conceptual con plataformas externas como Uber, DiDi e inDrive.

## Integrantes

* Ivan Andres Sierra Arrieta
* Sebastian de Jesus Morales Marimon

## Estado de la entrega

* [x] Análisis funcional inicial.
* [x] Modelo de dominio.
* [x] Diagrama general de casos de uso.
* [x] DSS del Pasajero.
* [x] DSS del Administrador.
