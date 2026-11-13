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

## Android en emulador (13 de noviembre de 2026)

La aplicación de taller se ejecutó en un **emulador** Pixel 9 Pro XL con Android API 37 contra la API, la web y MySQL aislados con datos sintéticos. No se usó un teléfono físico. Se ejecutaron doce escenarios: inicio y cierre de sesión, trabajos asignados, especificaciones y estados, inicio de fabricación, avance con observaciones, galería, cámara emulada, envío multipart, revisión ADMIN con aprobación y rechazo, seguimiento del cliente limitado a avances aprobados, pérdida de conexión y respuesta perdida sin duplicados, y cierre y reapertura con restauración de sesión, refresh de JWT y envíos pendientes. Todos terminaron aprobados después de corregir un duplicado de reportes al cerrar la app con un envío confirmado sin respuesta. Con un certificado HTTPS no confiable, el cliente rechazó la conexión.

| Suite (corte del 13/11) | Ejecutadas | Aprobadas | Fallidas |
| --- | ---: | ---: | ---: |
| API | 352 | 352 | 0 |
| Web | 39 | 39 | 0 |
| Flutter | 57 | 57 | 0 |
| Playwright negocio | 6 | 6 | 0 |
| Playwright soporte Android | 2 | 2 | 0 |
| Regresiones sobre MySQL | 50 | 50 | 0 |
| Aislamiento, reportero y empaquetador | 10 | 10 | 0 |
| Escenarios Android en emulador | 12 | 12 | 0 |
| **Total** | **528** | **528** | **0** |

Cloudinary siguió controlado porque no hubo una cuenta de pruebas autorizada. Quedan pendientes el teléfono físico, una API HTTPS de pruebas con certificado de confianza pública y la firma release con un almacén de claves externo.

Las capturas históricas de [catálogo móvil](public-catalog/public-catalog-390.png) y [ficha de producto](public-catalog/public-product-1440.png) muestran vistas públicas con productos y precios de demostración. La documentación de la evaluación con participantes está en el [protocolo OE4](oe4-evaluation-protocol.md). Los informes detallados, capturas internas y trazas permanecen bajo custodia privada.
