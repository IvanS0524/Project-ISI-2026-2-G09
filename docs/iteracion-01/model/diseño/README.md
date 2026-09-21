# Diseño

Esta carpeta reúne los modelos de diseño de la iteración 01.

## Entregables

- [Diagrama de clases](diagrama_clases/diagrama_clases.puml): responsabilidades, clases, atributos, operaciones y relaciones del sistema.
- [Modelo entidad-relación](modelo_er/diagrama_er.puml): entidades, claves y relaciones persistentes.
- [Diagramas de secuencia](diagramas_secuencia/README.md): colaboración interna para los diez casos de uso documentados en los DSS.

## Relación con el análisis

Los DSS de [análisis](../analisis/modelo_dss/README.md) definen los eventos
externos y el comportamiento observable del sistema. Los diagramas de esta
carpeta desarrollan esos flujos mostrando la colaboración entre los componentes
internos de UnixDriver y, cuando corresponde, la interacción con la base de datos
y las plataformas externas.

## Herramienta

Los diagramas usan PlantUML. Los archivos `.puml` son la fuente editable y
pueden renderizarse con la extensión de PlantUML para VS Code o con la
herramienta oficial de línea de comandos.
