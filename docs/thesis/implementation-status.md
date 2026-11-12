# Estado verificable de implementación

Fecha de corte: 6 de septiembre de 2026.

| Componente | Implementación observable | Verificación ejecutada | Validación pendiente |
| --- | --- | --- | --- |
| API | Módulos de catálogo, auth, clientes/cotizaciones, ventas/pagos, pedidos, talleres/avances, tracking y entregas. | Lint aprobado; 32 suites y 270 pruebas; build aprobado. | MySQL real, concurrencia real y recorrido HTTP integral. |
| Web | Catálogo, solicitud, sesión BFF, panel operativo y seguimiento. | Lint aprobado; 24 pruebas; build Next.js aprobado. | Inspección en navegador, responsive, accesibilidad y flujo real. |
| Android | Login WORKSHOP, sesión, trabajos, detalle, avances e historial. | `flutter analyze` sin hallazgos; 47 pruebas aprobadas. | Emulador/dispositivo contra API y condiciones de red reales. |
| Datos | 11 migraciones que producen 22 tablas y seeders separados. | Inventario estático derivado de migraciones. | Migrar/sembrar MySQL 8 limpio y comprobar restricciones. |
| Documentación | Arquitectura, API, web, móvil, desarrollo, trazabilidad y smoke test existentes. | Auditoría documental y bootstrap. | Completar documento final, diagramas y evidencias de validación. |
| Despliegue | Artefactos de API/web compilables; guía agnóstica. | Builds locales. | Infraestructura, HTTPS, secretos, backup, firma y distribución Android. |

## Cambios frente al snapshot del paquete

- El repositorio actual contiene la ruta web corregida `/api/admin/sales/[id]/payments/[paymentId]/void`; el snapshot conservaba `[saleId]` en ese segmento.
- `docs/revision-2026-09-04.md` del repositorio actual documenta correcciones posteriores al snapshot.
- El archivo `CODEX_THESIS_BOOTSTRAP.md` aparece solo en el snapshot y no se trata como fuente vigente.
- `.gitignore` tiene una modificación local previa del usuario; no fue alterada por este bootstrap.
- No se encontraron cambios del esquema: las 22 tablas del snapshot siguen coincidiendo con las 11 migraciones actuales.

`IMPLEMENTADO` sigue sin significar `VALIDADO E2E`.

## Actualización verificada: 27 de septiembre de 2026

- Catálogo web publicado con nueve productos de demostración en tres categorías, nueve imágenes WebP de referencia y disponibilidad calculada. Las fuentes y licencias de las imágenes están en `CATALOG_DEMO_IMAGES.md`. Los seis productos nuevos se agregaron mediante un seeder idempotente sin sustituir imágenes existentes.
- API y web: `pnpm lint`, `pnpm build` y `pnpm test` aprobados. La API pasó 35 suites y 279 pruebas; la web, 26 pruebas. La app Android no se volvió a verificar en esta actualización.
- Aiven: 12 migraciones y tres seeders ejecutados, ninguno pendiente. Una migración correctiva reparó cuatro columnas de auditoría que impedían solicitudes públicas y eliminó claves foráneas duplicadas. Se verificó en el esquema que las columnas admiten NULL y que queda una clave foránea por columna.
- Producción: el POST público de cotización devolvió `201`, un reenvío idéntico conservó el código y un reenvío con la misma clave y contenido distinto devolvió `409`. En la API de Vercel se recorrieron los estados `REQUESTED` → `QUOTED` → `ACCEPTED`, la venta `CONFIRMED` y el pedido `OPEN` con un elemento `MADE_TO_ORDER`; una segunda conversión del mismo pedido devolvió `409`.
- Datos de prueba: quedaron dos recorridos sintéticos en Aiven (uno local conectado a Aiven y uno por la API publicada). Las cuentas administrativas temporales se desactivaron y sus sesiones se revocaron. No se usaron datos reales de clientes.
- Evidencias visuales: `outputs/evidencias_tesis/verificaciones/despliegue-2026-09-27/` contiene portada, catálogo, ficha de producto y resumen de cotización con dos unidades. Las capturas muestran imágenes ilustrativas y no prueban una venta real.
- Siguen pendientes los pasos de taller, seguimiento, pago, entrega y Flutter del recorrido de 21 pasos de `docs/smoke-test-mvp.md`, además de validación con usuarios, mediciones de usabilidad y migración sobre una base limpia descartable. El recorrido de cotización y pedido probado aquí cubre un solo elemento fabricable.

## Actualización verificada: 28 de septiembre de 2026

- La API local conectada a Aiven completó pago/anulación, asignación a taller, STARTED/PROGRESS/READY_FOR_REVIEW, rechazo/reenvío/aprobación, token de seguimiento rotado y revocado, y entrega programada/iniciada/completada. El pedido sintético `HF-PED-2026-00002` terminó en `COMPLETED`.
- Se comprobó `403` del rol WORKSHOP en finanzas y `401` del refresh anterior tras rotación. Las cuentas temporales quedaron inactivas y todas sus sesiones revocadas.
- El validador de pagos rechazaba incorrectamente importes con decimales; se corrigió junto a códigos de trabajo/entrega cuando MySQL devuelve IDs numéricos. Cloudinary aceptó una imagen temporal de prueba y su eliminación.
- Calidad final de este corte: API 36 suites/281 pruebas; web 26 pruebas; Flutter 47 pruebas y análisis sin hallazgos; lint y build API/web aprobados.
- Hay una matriz detallada de RF-01 a RF-15, RNF-01 a RNF-10 y prioridades siguientes en `VALIDACION_TESIS_2026-09-28.md`.
- Continúan pendientes Android en dispositivo (no había emulador conectado), pedido mixto con stock, recorrido visual exhaustivo del panel, accesibilidad, concurrencia, restauración de backup y evaluación con usuarios. La integración se hizo sobre Aiven existente; no se recreó una base limpia descartable.

Para el corte del 12 de noviembre, consulta el [protocolo OE4](evidence/oe4-evaluation-protocol.md) y el [registro de cierre](../release/backlog-2026-11-12.md). Las cifras previas corresponden a los cortes históricos indicados.
