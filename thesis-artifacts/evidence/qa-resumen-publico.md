# Resumen público de validación

El corte del 12 de noviembre de 2026 sobre la revisión de endurecimiento `6547fa60a46ecdbfa560775e4c75e93ad380fb00` usó Windows, Node.js 22.19.0, pnpm 11.13.1, Flutter, Chromium y MySQL 8.4 descartable. La fuente es el informe técnico de QA del corte, conservado con acceso restringido. Las cifras cuentan pruebas, sin incluir lint, compilaciones o controles de entorno.

| Suite | Ejecutadas | Aprobadas | Fallidas |
| --- | ---: | ---: | ---: |
| API | 352 | 352 | 0 |
| Web | 39 | 39 | 0 |
| Flutter | 53 | 53 | 0 |
| Playwright | 6 | 6 | 0 |
| Regresiones sobre MySQL | 50 | 50 | 0 |
| Aislamiento, reportero y empaquetador | 10 | 10 | 0 |
| **Total** | **510** | **510** | **0** |

Los recorridos cubren solicitud, cotización, venta, pago registrado, reserva, fabricación, revisión, seguimiento y entrega. También cubren permisos, pérdida de respuesta y reintentos. Los datos de prueba fueron sintéticos y las respuestas de Cloudinary y Wompi fueron controladas en el corte. La ejecución en un dispositivo Android y la verificación de servicios externos siguen separadas de este resultado.

Las capturas históricas de [catálogo móvil](public-catalog/public-catalog-390.png) y [ficha de producto](public-catalog/public-product-1440.png) muestran vistas públicas con productos y precios de demostración. La documentación de la evaluación con participantes está en el [protocolo OE4](oe4-evaluation-protocol.md). Los informes detallados, capturas internas y trazas permanecen bajo custodia privada.
