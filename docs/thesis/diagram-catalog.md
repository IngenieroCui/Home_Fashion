# Catálogo consolidado de diagramas

Herramientas usadas y verificadas: Mermaid CLI 11.12.0 para fuentes versionables y exportes SVG/PDF, y DBML para el modelo físico completo. Las fuentes viven en `docs/diagrams/source/` y los exportes en `docs/diagrams/export/`. Fecha de exportación: 6 de septiembre de 2026.

Corte técnico del 28 de octubre: D-09 corrige la ruta a `POST /api/admin/orders/from-sale/:saleId`; D-12 incluye consumo de `onHand` y `reserved` solo para IN_STOCK, locks y commit/rollback. Sus fuentes y exportes SVG/PDF se regeneraron. H04 usa lock de cabecera y revalidación antes de editar, cambiar estado o convertir. El esquema actual tiene **15 migraciones** y **23 tablas de dominio**, incluida `payment_attempts`; D-05/DBML de 22 tablas son una base histórica y se complementan con [el modelo de pagos](../payments/modelo-datos.dbml). Wompi es Sandbox y su validación externa está pendiente; los diagramas de pagos viven en `docs/payments/`.

Actualización al 22 de septiembre: D-19 se revisó para mostrar estados reales y dependencias sin representar como cumplidos los hitos vencidos. Su nuevo SVG/PDF de presentación y la fuente Mermaid están en Drive; los demás D-01 a D-18 conservaban ese corte; D-09/D-12 tienen la revisión puntual de octubre descrita arriba.

| ID | Diagrama | Propósito y alcance | Fuente verificable | Formato | Prioridad / estado |
| --- | --- | --- | --- | --- | --- |
| D-01 | Contexto del sistema | Cliente, personal, taller, web, móvil, API, MySQL y servicios externos reales. | Arquitectura y consumidores reales. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-02 | Arquitectura y componentes | Vista general con paneles de backend y web/móvil; evita tres figuras redundantes. | Estructura `apps/`, módulos y dependencias. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-03 | Despliegue | Entorno propuesto de validación; no se presenta como producción. | Configuración y brechas de infraestructura. | Mermaid + SVG/PDF | P0 / generado como propuesta |
| D-04 | Modelo conceptual | Entidades académicas y relaciones del recorrido comercial/productivo. | Modelos, servicios y reglas de negocio. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-05 | ERD físico | 22 tablas, PK/FK y agrupación por dominio; vista completa para anexo. | Base histórica de 22 tablas/13 migraciones; actual: 15 migraciones y complemento Wompi. | DBML + Mermaid + SVG/PDF | P0 / generado y verificado |
| D-06 | Casos de uso por actor | Figura compuesta para cliente, personal y taller. | Requisitos, rutas y permisos. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-07 | Solicitud a cotización | Cliente, Next, API y persistencia; idempotencia. | Controladores/servicios public request y quotes. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-08 | Cotización a venta y pago | Aceptación, conversión, totales y pago append-only. | Quotes/sales services y pruebas. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-09 | Venta a pedido y suministro | Ruta real from-sale, conversión única, clasificación, reserva o fabricación. | Orders service, migraciones y pruebas. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-10 | Taller, avance y revisión | STARTED, PROGRESS, READY, rechazo/reenvío/aprobación. | Workshop services, web y Flutter. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-11 | Seguimiento privado | Generación/rotación, hash y proyección minimizada. | Order tracking service/controller/tests. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-12 | Entrega y cierre | Programar, iniciar, consumir stock reservado y completar/cancelar en transacción. | Deliveries service/controller/tests. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-13 | Estados de Quote | REQUESTED/DRAFT/QUOTED y terminales permitidos. | Enums, servicio y pruebas de quotes. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-14 | Estados de Order y OrderItem | Estados derivados y relación inventario/fabricación/entrega. | `order-state.ts`, servicios y pruebas. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-15 | Estados de WorkshopJob/revisión | Trabajo y estado de revisión, incluidos rechazo y reenvío. | Enums y workshop progress service. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-16 | Estados de Delivery | Programación, despacho, entrega, cancelación y reprogramación. | Delivery enums/service/tests. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-17 | Flujo E2E del negocio | Vista ejecutiva de catálogo a entrega, sin detalles repetidos de secuencias. | `docs/smoke-test-mvp.md`. | Mermaid + SVG/PDF | P0 / generado y verificado |
| D-18 | Sesión y refresh | Web BFF y Flutter, rotación y salida segura. | Auth API, helpers web, cliente Dio y pruebas. | Mermaid + SVG/PDF | P1 / generado y verificado |
| D-19 | Roadmap y ruta crítica | Hitos, dependencias y ruta crítica; no es UML ni sustituye la evidencia de Linear. | Proyecto Linear creado en el bootstrap. | Mermaid + SVG/PDF | P1 / generado y verificado |

## Diagramas fusionados o pospuestos

- Componentes backend y componentes web/móvil se integran como paneles de D-02; se separan solo si la versión A4 pierde legibilidad.
- Los casos de uso general/cliente/personal/taller se gestionan como D-06 con paneles coordinados; podrán exportarse por panel para anexos.
- Los flujos de navegación de cada pantalla quedan P1 y solo se producen si aportan al capítulo o a manuales.
- La matriz visual de permisos queda P1; la tabla de requisitos puede ser suficiente.
- D-03 sigue siendo una arquitectura propuesta; se actualizará cuando exista un entorno realmente desplegado y verificado.

## Criterios de aceptación

- Etiquetas humanas en español y nombres técnicos reales cuando aclaren.
- Título, ID D-XX, leyenda cuando haga falta y conectores legibles.
- Vista A4 simplificada; versión completa editable/alta resolución para Drive cuando aplique.
- Toda relación, transición y servicio externo se traza a una fuente del repositorio o evidencia del entorno.
