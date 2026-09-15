# Análisis

Esta carpeta reúne los artefactos de análisis funcional de la iteración 01,
el diagrama general de casos de uso y los Diagramas de Secuencia del Sistema
(DSS) asociados a los actores definidos.

## Modelo de dominio

El modelo de dominio representa los conceptos principales del sistema y las relaciones entre ellos, incluyendo el Pasajero, el Administrador, las plataformas de transporte externas, las ofertas de transporte y los viajes.

El diagrama está disponible en [modelo_dominio](modelo_dominio/modelo_dominio.png).

## Casos de uso

El diagrama general está disponible en [casos_uso/casos_uso.jpg](casos_uso/casos_uso.jpg).
Los DSS se encuentran en [modelo_dss/](modelo_dss/README.md).

### Pasajero

| Código | Caso de uso | Archivo |
| --- | --- | --- |
| DSS01P | Registrarse | [dss1.puml](modelo_dss/Pasajero/dss1.puml) |
| DSS02P | Iniciar sesión | [dss2.puml](modelo_dss/Pasajero/dss2.puml) |
| DSS03P | Gestionar perfil | [dss3.puml](modelo_dss/Pasajero/dss3.puml) |
| DSS04P | Realizar búsqueda unificada de transporte | [dss4.puml](modelo_dss/Pasajero/dss4.puml) |
| DSS05P | Seleccionar oferta | [dss5.puml](modelo_dss/Pasajero/dss5.puml) |
| DSS06P | Consultar historial de viajes | [dss6.puml](modelo_dss/Pasajero/dss6.puml) |

### Administrador

| Código | Caso de uso | Archivo |
| --- | --- | --- |
| DSS01A | Iniciar sesión | [dss1.puml](modelo_dss/Administrador/dss1.puml) |
| DSS02A | Gestionar usuarios | [dss2.puml](modelo_dss/Administrador/dss2.puml) |
| DSS03A | Configurar comisión | [dss3.puml](modelo_dss/Administrador/dss3.puml) |
| DSS04A | Consultar reportes y estadísticas | [dss4.puml](modelo_dss/Administrador/dss4.puml) |

## Actores del sistema
### Pasajero

Actor principal que utiliza UnixDriver para consultar, comparar y seleccionar alternativas de transporte.

### Administrador

Actor principal encargado de gestionar usuarios, configurar la comisión del servicio y consultar reportes y estadísticas.

### Plataforma de Transporte

Actor secundario que representa las plataformas externas de transporte, como Uber, DiDi e inDrive. Estas proporcionan información sobre las ofertas disponibles para la búsqueda unificada.

## Alcance actual

En esta iteración se incluyen el modelo de dominio, el diagrama general de casos de uso y los DSS del Pasajero y del Administrador.

La integración con plataformas externas se encuentra definida conceptualmente en el modelo de dominio y en el diagrama de casos de uso. Los flujos de comunicación con dichas plataformas aún no cuentan con DSS almacenados en esta carpeta.
