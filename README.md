# UnixDriver
## Plataforma de búsqueda unificada de transporte

Proyecto de Ingeniería de Servicios de Internet, grupo G09, correspondiente al
periodo 2026-2.

## Descripción

La solución busca centralizar la consulta de ofertas de transporte para que un
pasajero pueda buscar alternativas, seleccionar una oferta y consultar su
historial de viajes desde un mismo sistema. También contempla funciones de
administración para gestionar usuarios, configurar la comisión del servicio y
consultar reportes y estadísticas.

## Actores principales

- **Pasajero:** se registra, inicia sesión, gestiona su perfil, realiza búsquedas
	unificadas, selecciona ofertas y consulta su historial de viajes.
- **Administrador:** inicia sesión, gestiona usuarios, configura la comisión y
	consulta reportes y estadísticas.

## Estructura del repositorio

- [`backend/`](backend/): servicios, API y lógica de negocio.
- [`frontend/`](frontend/): interfaz de usuario de la solución.
- [`mobile/`](mobile/): espacio destinado a la aplicación móvil, si aplica.
- [`database/`](database/): recursos relacionados con la base de datos.
- [`docs/`](docs/): documentación y entregables de las iteraciones.
- [`tests/`](tests/): pruebas del proyecto.

## Documentación

- [`docs/iteracion-01/`](docs/iteracion-01/): análisis inicial, casos de uso y
	Diagramas de Secuencia del Sistema (DSS).
- [`docs/iteracion-02/`](docs/iteracion-02/): documentación de la segunda
	iteración.
- [`docs/iteracion-03/`](docs/iteracion-03/): documentación de la tercera
	iteración.
- [`docs/iteracion-final/`](docs/iteracion-final/): documentación de la entrega
	final.

## Estado actual

La primera iteración cuenta con el análisis funcional de los actores Pasajero y
Administrador, incluido el diagrama general de casos de uso y los DSS de sus
principales flujos. Las instrucciones de ejecución y las tecnologías de cada
componente se documentarán junto con la implementación correspondiente.
