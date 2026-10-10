# Paquete de modelos y diagramas — Home Fashion

Fecha de corte: 6 de septiembre de 2026.

**Revisión puntual:** el 22 de septiembre se actualizó la fuente de D-19 y se publicó una versión visual nueva en Drive. Los otros diagramas mantienen la fecha de corte original.

Este paquete contiene las fuentes editables Mermaid, el modelo físico completo en DBML y exportaciones SVG/PDF listas para incorporar en el trabajo de grado. Las figuras representan el código y la documentación verificados en el repositorio `home-fashion`; D-03 se etiqueta expresamente como despliegue propuesto porque aún no existe evidencia de producción.

## Herramientas

- Mermaid: diagramas de contexto, arquitectura, secuencia, estados, flujo y roadmap.
- DBML: fuente completa del esquema físico de 22 tablas.
- SVG: formato preferido para insertar en Word/Google Docs sin perder nitidez.
- PDF: copia portable para revisión y anexos.

No se necesita conectar Figma, Lucidchart o draw.io. Figma puede usarse después, de manera opcional, para retoque gráfico; la fuente académica debe conservarse en texto versionable.

## Inventario y uso sugerido

| ID | Archivo | Uso sugerido en la tesis |
| --- | --- | --- |
| D-01 | `D-01-contexto-sistema` | Arquitectura / contexto |
| D-02 | `D-02-arquitectura-componentes` | Diseño de la solución |
| D-03 | `D-03-despliegue-validacion` | Arquitectura objetivo y limitaciones |
| D-04 | `D-04-modelo-conceptual` | Modelo de dominio |
| D-05 | `D-05-erd-fisico` + `database.dbml` | Diseño de datos / anexo técnico |
| D-06 | `D-06-casos-uso-actores` | Requisitos y actores |
| D-07 | `D-07-secuencia-solicitud-cotizacion` | Diseño del proceso comercial |
| D-08 | `D-08-secuencia-cotizacion-venta-pago` | Ventas y pagos |
| D-09 | `D-09-secuencia-venta-pedido-suministro` | Pedido e inventario/fabricación |
| D-10 | `D-10-secuencia-taller-avance-revision` | Producción y control de calidad |
| D-11 | `D-11-secuencia-seguimiento-privado` | Seguridad y experiencia del cliente |
| D-12 | `D-12-secuencia-entrega-cierre` | Logística y cierre |
| D-13 | `D-13-estados-cotizacion` | Reglas de cotización |
| D-14 | `D-14-estados-pedido-items` | Reglas de pedido |
| D-15 | `D-15-estados-taller-revision` | Reglas de taller |
| D-16 | `D-16-estados-entrega` | Reglas de entrega |
| D-17 | `D-17-flujo-e2e-negocio` | Síntesis ejecutiva / metodología |
| D-18 | `D-18-secuencia-sesion-refresh` | Seguridad técnica |
| D-19 | `D-19-roadmap-ruta-critica` | Gestión y plan de cierre |

## Reglas de publicación

1. Insertar la versión SVG cuando el editor lo permita; usar PDF en anexos o impresión.
2. Titular como “Figura D-XX. …” y citar “Fuente: elaboración propia con base en el repositorio Home Fashion (2026)”.
3. No presentar D-03 como infraestructura productiva hasta adjuntar evidencia real de despliegue, HTTPS, secretos, respaldo y monitoreo.
4. Actualizar la fuente `.mmd` si cambia un estado, endpoint, entidad o dependencia; volver a exportar y registrar la fecha.
5. Mantener `database.dbml` como fuente canónica del modelo físico; D-05 es una vista resumida legible de sus 22 tablas.

## Estructura

- `source/`: 19 fuentes Mermaid y `database.dbml`.
- `svg/`: exportaciones vectoriales para el cuerpo del documento.
- `pdf/`: exportaciones para revisión y anexos.
- `cronograma-retrospectivo-y-plan.md`: cronología honesta y plan prospectivo.
