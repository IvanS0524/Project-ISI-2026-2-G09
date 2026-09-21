# Diagramas de secuencia de diseño

Esta carpeta contiene los diagramas de secuencia de diseño de la Iteración 01.

A partir de los DSS del análisis, estos diagramas detallan la realización interna
de cada caso de uso, mostrando la interacción entre el actor, la interfaz y los
componentes internos de UnixDriver que participan en cada flujo.

## Estructura

Los diagramas se organizan por actor, igual que los DSS de análisis:

- `Pasajero/`: seis diagramas de secuencia para los casos de uso del Pasajero.
- `Administrador/`: cuatro diagramas de secuencia para los casos de uso del Administrador.

## Trazabilidad

| Código | Caso de uso | Diagrama de diseño |
| --- | --- | --- |
| DSS01P | Registrarse | [Pasajero/sd01_registrarse.puml](Pasajero/sd01_registrarse.puml) |
| DSS02P | Iniciar sesión del pasajero | [Pasajero/sd02_iniciar_sesion_pasajero.puml](Pasajero/sd02_iniciar_sesion_pasajero.puml) |
| DSS03P | Gestionar perfil | [Pasajero/sd03_gestionar_perfil.puml](Pasajero/sd03_gestionar_perfil.puml) |
| DSS04P | Realizar búsqueda unificada | [Pasajero/sd04_busqueda_unificada.puml](Pasajero/sd04_busqueda_unificada.puml) |
| DSS05P | Seleccionar oferta | [Pasajero/sd05_seleccionar_oferta.puml](Pasajero/sd05_seleccionar_oferta.puml) |
| DSS06P | Consultar historial de viajes | [Pasajero/sd06_consultar_historial.puml](Pasajero/sd06_consultar_historial.puml) |
| DSS01A | Iniciar sesión del administrador | [Administrador/sd01_iniciar_sesion.puml](Administrador/sd01_iniciar_sesion.puml) |
| DSS02A | Gestionar usuarios | [Administrador/sd02_gestionar_usuarios.puml](Administrador/sd02_gestionar_usuarios.puml) |
| DSS03A | Configurar comisión | [Administrador/sd03_configurar_comision.puml](Administrador/sd03_configurar_comision.puml) |
| DSS04A | Consultar reportes y estadísticas | [Administrador/sd04_consultar_reportes.puml](Administrador/sd04_consultar_reportes.puml) |

## Relación con otros modelos

- [DSS de análisis](../../analisis/modelo_dss/README.md): definen el flujo externo y el comportamiento observable de cada caso de uso.
- [Diagrama de clases](../diagrama_clases/diagrama_clases.puml): define las clases, atributos, operaciones y relaciones utilizadas como referencia para el diseño.
- [Modelo entidad-relación](../modelo_er/diagrama_er.puml): define las estructuras de persistencia representadas en los diagramas cuando se requiere almacenar o consultar información.

## Convenciones

- `actor` representa al Pasajero o al Administrador.
- `boundary` representa la interfaz de usuario mediante la cual el actor interactúa con el sistema.
- `control` representa el componente encargado de coordinar el flujo y aplicar la lógica correspondiente al caso de uso.
- `database` representa la base de datos cuando se consulta o almacena información.
- Las plataformas externas aparecen únicamente en los flujos que requieren integración con servicios de transporte, como la búsqueda unificada.

Los archivos están escritos en PlantUML y pueden renderizarse con cualquier
herramienta compatible con este formato.