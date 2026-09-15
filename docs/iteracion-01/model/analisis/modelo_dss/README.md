# Modelos DSS

Esta carpeta contiene los Diagramas de Secuencia del Sistema (DSS) para los
principales flujos de Pasajero y Administrador definidos en el análisis de la
iteración 01.

## Estructura

- `Pasajero/`: diagramas de secuencia para los casos de uso del rol pasajero.
- `Administrador/`: diagramas de secuencia para los casos de uso del rol administrador.
## Objetivo

Los diagramas describen la interacción entre el actor y el sistema, mostrando el orden de los mensajes, validaciones, decisiones y resultados esperados para cada proceso principal.

## Diagramas de Pasajero

- [Pasajero/dss1.puml](Pasajero/dss1.puml): DSS01P, Registrarse.
- [Pasajero/dss2.puml](Pasajero/dss2.puml): DSS02P, Iniciar sesión.
- [Pasajero/dss3.puml](Pasajero/dss3.puml): DSS03P, Gestionar perfil.
- [Pasajero/dss4.puml](Pasajero/dss4.puml): DSS04P, Realizar búsqueda unificada de transporte.
- [Pasajero/dss5.puml](Pasajero/dss5.puml): DSS05P, Seleccionar oferta.
- [Pasajero/dss6.puml](Pasajero/dss6.puml): DSS06P, Consultar historial de viajes.

## Diagramas de Administrador

- [Administrador/dss1.puml](Administrador/dss1.puml): DSS01A, Iniciar sesión.
- [Administrador/dss2.puml](Administrador/dss2.puml): DSS02A, Gestionar usuarios.
- [Administrador/dss3.puml](Administrador/dss3.puml): DSS03A, Configurar comisión.
- [Administrador/dss4.puml](Administrador/dss4.puml): DSS04A, Consultar reportes y estadísticas.

## Notación

Los DSS están representados con PlantUML y siguen el formato estándar de secuencia:

- Actores: representan a los usuarios o administradores.
- Sistema: encapsula las operaciones internas y validaciones.
- Mensajes: indican la interacción entre actor y sistema.
- Alternativas: modelan casos exitosos y de error.

## Estado

Los diagramas actuales complementan el análisis funcional y sirven como base
para validar el comportamiento de los flujos de Pasajero y Administrador.


```text
model_dss/
├── Administrador/
│   ├── dss1.puml   # DSS01A: Iniciar Sesión Administrador
│   ├── dss2.puml   # DSS02A: Gestionar Usuarios
│   ├── dss3.puml   # DSS03A: Configurar Comisión
│   └── dss4.puml   # DSS04A: Consultar Reportes y Estadísticas
├── Pasajero/
│   ├── dss1.puml   # DSS01P: Registrarse
│   ├── dss2.puml   # DSS02P: Iniciar Sesión Pasajero
│   ├── dss3.puml   # DSS03P: Gestionar Perfil
│   ├── dss4.puml   # DSS04P: Realizar Búsqueda Unificada de Transporte
│   ├── dss5.puml   # DSS05P: Seleccionar Oferta
│   └── dss6.puml   # DSS06P: Consultar Historial de Viajes
└── README.md