# Validación funcional de Home Fashion — 28 de septiembre de 2026

Este corte contrasta los requisitos de `docs/thesis/requirements.md` y el recorrido de `docs/smoke-test-mvp.md` con lo observado. **Implementado** significa que existe el flujo en código; **verificado** indica el tipo de prueba realmente ejecutada. Los registros creados para el recorrido usan identidades y datos ficticios. No hubo pagos reales.

## Resultado de esta iteración

- Catálogo público: nueve muebles/artículos demostrativos en tres categorías, con imágenes WebP externas. Origen y licencia de cada imagen: `CATALOG_DEMO_IMAGES.md`.
- Aiven: 12 migraciones y tres seeders aplicados. Se reparó el esquema que impedía solicitudes públicas. El catálogo, la cotización y el recorrido operativo persisten en MySQL real.
- API publicada: solicitud pública idempotente (`201` al crear, mismo código al reintentar, `409` con la misma clave y contenido diferente); cotización aceptada, venta confirmada y pedido creado una sola vez. Se comprobó el rechazo de la conversión duplicada (`409`).
- API local conectada a Aiven: depósito de prueba, anulación y saldo recalculado; asignación a taller, avances STARTED/PROGRESS/READY_FOR_REVIEW, rechazo, nueva presentación y aprobación; enlace privado rotado/revocado; entrega SCHEDULED → OUT_FOR_DELIVERY → DELIVERED y pedido COMPLETED. El rol WORKSHOP obtuvo `403` al consultar ventas. El refresh antiguo obtuvo `401` después de rotarlo. Se desactivaron las cuentas temporales y revocaron sus sesiones.
- Cloudinary: carga de una imagen temporal de 1 píxel, recepción de URL HTTPS y eliminación confirmada con las credenciales locales actualizadas.
- Calidad: `pnpm lint`, `pnpm build`, 36 suites/281 pruebas API, 26 pruebas web, `flutter analyze` sin hallazgos y 47 pruebas Flutter aprobadas.
- Se corrigieron fallos observados con MySQL real: columnas de auditoría de solicitudes públicas, IDs numéricos en códigos de negocio, consultas con `createdAt` y validación de importes decimales. Los errores corregidos se repitieron hasta obtener el resultado esperado.

## Requisitos funcionales, uno por uno

| Requisito | Estado y evidencia | Lo que falta validar o mejorar |
| --- | --- | --- |
| RF-01 Catálogo público | Implementado; nueve productos visibles en la web publicada, filtros/fichas inspeccionados y capturados. API y web con pruebas. | Inspección formal a 360 px, tableta, teclado y lector de pantalla; ampliar variedad y fotografía propia. |
| RF-02 Solicitud pública | Implementado y probado por HTTP en producción con idempotencia y detección de conflicto. Resumen web capturado. | Usabilidad del formulario con personas reales y manejo visual de fallos de red. |
| RF-03 Autenticación y roles | Login ADMIN/WORKSHOP, refresh rotativo y 401 del token antiguo probados por HTTP; permisos de taller verificados con 403. Tests de cookies web y almacenamiento Flutter. | Login/logout web y Android observados en navegador/dispositivo con HTTPS y red intermitente. |
| RF-04 Catálogo e inventario administrativos | CRUD y reservas implementados; servicios/controladores con pruebas, seeders y catálogo persistido en Aiven. | Recorrer todas las altas, ediciones, desactivaciones, carga Cloudinary y ajustes de stock desde la UI; competencia por stock en MySQL. |
| RF-05 Clientes | Alta desde solicitud pública persistida; panel y API implementados con pruebas. | Probar edición, duplicados y desactivación mediante UI con historial conservado. |
| RF-06 Cotizaciones | Solicitud REQUESTED → QUOTED → ACCEPTED probada por HTTP; cálculo backend y snapshots implementados. | Negociación, rechazo y validaciones de descuentos desde panel; comparar importes de múltiples líneas. |
| RF-07 Ventas | Conversión desde cotización a venta CONFIRMED y bloqueo de segunda conversión probados en producción. | Venta directa, precio negociado y permisos financieros en UI. |
| RF-08 Pagos | Depósito, anulación, historial y saldo PARTIALLY_PAID verificados por HTTP y MySQL real. | Métodos adicionales, devoluciones/ajustes, evidencia operativa y simultaneidad de pagos. No se incluye pasarela real en el MVP. |
| RF-09 Pedidos | Conversión única a pedido, línea MADE_TO_ORDER y estado inicial OPEN probados; duplicado 409. | Recorrido mixto IN_STOCK + MADE_TO_ORDER, reserva de inventario y competencia por la última unidad. |
| RF-10 Asignación a taller | Asignación real produjo código HF-TAL y trabajo ASSIGNED visible al taller correcto. | Comprobar por HTTP taller inactivo, rol incorrecto y doble asignación simultánea. |
| RF-11 Trabajo propio y avances | WORKSHOP consultó su trabajo y reportó inicio, 60 % y listo por HTTP; acceso financiero denegado. Flutter: 47 pruebas. | Ejecución en emulador Android/dispositivo, aislamiento frente a otro taller y red lenta. |
| RF-12 Revisión | Rechazo, nueva presentación y aprobación probados en MySQL; elemento y pedido pasaron a READY. | Validar la claridad de la revisión y la evidencia visual en el panel con usuarios. |
| RF-13 Seguimiento privado | Token creado, rotado y revocado por HTTP; tokens anteriores respondieron 404. Proyección pública limitada a código, estado, fecha y elementos; reportes filtrados por aprobación en código y tests. | Inspección manual completa del JSON público y de la página con datos más variados; expiración temporal real. |
| RF-14 Entrega | Conductor externo: programación, inicio y cierre con receptor/evidencia ficticios por HTTP; pedido COMPLETED. | Cancelación/reprogramación, otros tipos de responsable y UI completa de entrega. |
| RF-15 Estado derivado | OPEN → IN_PROGRESS → READY → COMPLETED observado; reglas y transacciones cubiertas por pruebas. | Recorrido mixto con stock, cancelaciones y concurrencia real. |

## Requisitos no funcionales y tesis

| Requisito | Evidencia actual | Brecha |
| --- | --- | --- |
| RNF-01 Seguridad | JWT/permisos en rutas; WORKSHOP recibió 403 en finanzas; secretos y CA ignorados por Git. | Auditoría HTTP de todas las rutas y prueba de permisos por rol. |
| RNF-02 Privacidad | Proyección pública explícita y tests de exclusión; datos ficticios en las pruebas. | Inspección HTTP sistemática y capturas anonimizadas. |
| RNF-03 Integridad | Duplicados de cotización/pedido rechazados; transacciones e índices. | Pruebas de concurrencia MySQL para stock, conversión y asignación. |
| RNF-04 Finanzas | Pagos decimales, anulación sin borrar movimiento y saldo real verificados. | Reconciliación y escenarios simultáneos. |
| RNF-05 Sesión | Rotación de refresh y rechazo del anterior probados; web y Flutter tienen tests. | Recorrido en cliente real y pérdida de conectividad. |
| RNF-06 Usabilidad | Flujos implementados. | Medir tareas con usuarios; no existe aún evidencia para afirmar menos de un minuto. |
| RNF-07 Adaptabilidad | Web compilada y páginas públicas capturadas. | Verificación formal de 360 px a escritorio y accesibilidad. |
| RNF-08 Mantenibilidad | API modular, lint y builds aprobados; documentación técnica existente. | Mantener matriz y contratos actualizados con cada iteración. |
| RNF-09 Despliegue | Web/API HTTPS publicados y probados; Flutter analiza y pasa tests. | APK/AAB release firmado y prueba Android real contra HTTPS. |
| RNF-10 Recuperación | Migraciones y seeders reproducibles ejecutados en Aiven. | Ensayo de restauración de backup sobre base descartable. |

Las metas académicas OE1–OE3 tienen base documental, implementación y evidencia técnica parcial. **OE4 (evaluación con usuarios) sigue pendiente**: definir participantes, tareas, línea base, tiempos, errores, ayuda, SUS/entrevista y consentimiento. Las capturas y tests no sustituyen esa medición. Tampoco se ejecutó aún todo el smoke test exacto de 21 pasos: faltan el pedido mixto con stock, UI administrativa completa y Android en dispositivo.

## Próximas mejoras con mayor impacto

1. Recorrido de navegador del panel: cotización con dos líneas, negociación, venta directa, pagos y pedido mixto con reserva de stock.
2. Prueba Android real de taller contra la API HTTPS, incluyendo refresh, formularios incompletos y red lenta.
3. Verificación responsive/accesibilidad y simplificación de los formularios de cotización y pedidos con usuarios.
4. Pruebas de concurrencia de inventario, doble asignación y pagos; restauración ensayada de Aiven en una base descartable.
5. Fotografías propias o activos licenciados permanentes para el catálogo y más variantes con dimensiones, materiales y disponibilidad útiles para cotizar.

No se consideran entregadas las exclusiones del MVP (pasarela de pago, GPS, notificaciones, modo offline, inventario de materias primas, pagos a talleres, iOS o analítica avanzada), tal como indica `docs/traceability.md`.
