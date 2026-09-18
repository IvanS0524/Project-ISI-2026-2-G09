# UnixDriver
## Plataforma de búsqueda unificada de transporte

Proyecto de Ingeniería de Servicios de Internet, grupo G09, correspondiente al
periodo 2026-2.

## Descripción

UnixDriver es una plataforma de búsqueda unificada de transporte que busca
centralizar la consulta de ofertas para que un pasajero pueda buscar
alternativas, compararlas, seleccionar una oferta y consultar su historial de
viajes desde un mismo sistema.

La plataforma contempla la consulta de información proveniente de servicios
externos de transporte como Uber, DiDi e inDrive. En el prototipo académico,
estas respuestas pueden ser simuladas, dejando planteada una futura integración
con dichos servicios.

También contempla funciones de administración para gestionar usuarios,
configurar la comisión del servicio y consultar reportes y estadísticas.

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

- [`docs/iteracion-01/`](docs/iteracion-01/): documentación de análisis y diseño,
  incluyendo casos de uso, DSS, diagrama de clases, modelo entidad-relación y
  diagramas de secuencia de diseño.
- [`docs/iteracion-02/`](docs/iteracion-02/): documentación de la segunda
	iteración.
- [`docs/iteracion-03/`](docs/iteracion-03/): documentación de la tercera
	iteración.
- [`docs/iteracion-final/`](docs/iteracion-final/): documentación de la entrega
	final.

## Estado actual

La primera iteración cuenta con el análisis funcional de los actores Pasajero y
Administrador, el diagrama general de casos de uso, los DSS, el diagrama de
clases, el modelo entidad-relación y los diagramas de secuencia de diseño.

Las instrucciones de ejecución y las tecnologías de cada componente se
documentarán junto con la implementación correspondiente.
