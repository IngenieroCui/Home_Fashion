# Home Fashion QA-1 — Bugs

Fecha Colombia: 2026-09-29. 13 bugs encontrados y corregidos; 0 pendientes. No hubo corrupción comercial ni sobre-reserva observada.

| ID | Severidad | Área | Problema | Estado |
| --- | --- | --- | --- | --- |
| BUG-001 | HIGH | Inventory integrity | API administrativa permitía borrar reservas derivadas de pedidos. | CORREGIDO / RETEST PASS |
| BUG-002 | MEDIUM | Public tracking consistency | lastPublicUpdateAt no avanzaba al salir a reparto o reprogramar. | CORREGIDO / RETEST PASS |
| BUG-003 | LOW | UX terminology | Detalles de taller presentaban enums crudos de suministro/estado. | CORREGIDO / RETEST PASS |
| BUG-004 | MEDIUM | Catalog CRUD | POST variante devolvía 500 al omitir la relación productId obligatoria. | CORREGIDO / RETEST PASS |
| BUG-005 | MEDIUM | Quotes transactions | Crear cotización devolvía 404 y rollback al leerla desde otra conexión antes de commit. | CORREGIDO / RETEST PASS |
| BUG-006 | MEDIUM | Payments | Una segunda anulación devolvía éxito pese al contrato solicitado. | CORREGIDO / RETEST PASS |
| BUG-007 | MEDIUM | Stock concurrency | Última unidad: 201/500 por deadlock MySQL; no hubo sobre-reserva. | CORREGIDO / RETEST PASS |
| BUG-008 | MEDIUM | Media validation | MIME falso era aceptado y texto con MIME imagen terminaba en 502 remoto. | CORREGIDO / RETEST PASS |
| BUG-009 | MEDIUM | Monetary bounds | Precios/totales fuera de DECIMAL(12,2) devolvían 500. | CORREGIDO / RETEST PASS |
| BUG-010 | MEDIUM | Public request concurrency | Solicitud idempotente simultánea: 201/500 aunque solo quedaba una solicitud. | CORREGIDO / RETEST PASS |
| BUG-011 | MEDIUM | Multipart | Seis fotos en taller/entrega generaban LIMIT_UNEXPECTED_FILE y HTTP 500. | CORREGIDO / RETEST PASS |
| BUG-012 | HIGH | Financial privacy | CATALOG_MANAGE sin FINANCIAL_COST_VIEW recibía estimatedCost. | CORREGIDO / RETEST PASS |
| BUG-013 | MEDIUM | Numeric MySQL IDs | Una imagen de la variante propia recibía 400 por comparar number con string. | CORREGIDO / RETEST PASS |

## BUG-001 — HIGH — Inventory integrity

- Reproducción: API administrativa permitía borrar reservas derivadas de pedidos.
- Causa/corrección: DTO sin quantityReserved; creación fuerza cero; actualización bloquea variante y conserva reservas reales.
- Retest: RESERVED-API; PASS.
- Regresión: catalog-admin.dto.spec.ts + catalog-admin.service.spec.ts.

## BUG-002 — MEDIUM — Public tracking consistency

- Reproducción: lastPublicUpdateAt no avanzaba al salir a reparto o reprogramar.
- Causa/corrección: Se usa updated_at de delivery: las únicas operaciones del servicio modifican programación/estado públicos; incluye cancelación. Se excluye order.updatedAt.
- Retest: TRACK-OUT-DATE; PASS.
- Regresión: order-tracking.service.spec.ts (4 estados).

## BUG-003 — LOW — UX terminology

- Reproducción: Detalles de taller presentaban enums crudos de suministro/estado.
- Causa/corrección: Se reutilizan supplyTypeLabel, orderItemStatusLabel, orderStatusLabel y workshopJobStatusLabel.
- Retest: UX-TERMINOLOGY; PASS.
- Regresión: qa-terminology.test.cjs (render HTML).

## BUG-004 — MEDIUM — Catalog CRUD

- Reproducción: POST variante devolvía 500 al omitir la relación productId obligatoria.
- Causa/corrección: Persistir productId de la ruta al crear la variante.
- Retest: CAT-CREATE; PASS.
- Regresión: catalog-admin.service.spec.ts.

## BUG-005 — MEDIUM — Quotes transactions

- Reproducción: Crear cotización devolvía 404 y rollback al leerla desde otra conexión antes de commit.
- Causa/corrección: La lectura del detalle comparte la transacción de creación.
- Retest: QUOTE-CREATE; PASS.
- Regresión: quotes.service.spec.ts.

## BUG-006 — MEDIUM — Payments

- Reproducción: Una segunda anulación devolvía éxito pese al contrato solicitado.
- Causa/corrección: 409 si el movimiento ya está VOIDED; se conserva historia y razón original.
- Retest: PAY-VOID-AGAIN; PASS.
- Regresión: sales.service.spec.ts.

## BUG-007 — MEDIUM — Stock concurrency

- Reproducción: Última unidad: 201/500 por deadlock MySQL; no hubo sobre-reserva.
- Causa/corrección: Traducir ER_LOCK_DEADLOCK/ER_LOCK_WAIT_TIMEOUT después del rollback a 409 controlado.
- Retest: LAST-UNIT-RACE; PASS.
- Regresión: orders.service.spec.ts (2 códigos).

## BUG-008 — MEDIUM — Media validation

- Reproducción: MIME falso era aceptado y texto con MIME imagen terminaba en 502 remoto.
- Causa/corrección: Verificar firma de bytes acorde al MIME y tamaño antes de upload. Cloudinary conserva la decodificación definitiva.
- Retest: MEDIA-not-image; PASS.
- Regresión: qa-media-regression.spec.ts.

## BUG-009 — MEDIUM — Monetary bounds

- Reproducción: Precios/totales fuera de DECIMAL(12,2) devolvían 500.
- Causa/corrección: Límites de DTO y validación de multiplicaciones/suma antes de persistir. Operaciones mantienen centavos con BigInt.
- Retest: QUOTE-OVERFLOW; PASS.
- Regresión: qa-money-regression.spec.ts + public-quote-requests.service.spec.ts.

## BUG-010 — MEDIUM — Public request concurrency

- Reproducción: Solicitud idempotente simultánea: 201/500 aunque solo quedaba una solicitud.
- Causa/corrección: Hasta dos reintentos de la transacción ya revertida con la misma requestId; replay del ganador y conflicto controlado si se agotan.
- Retest: PUBLIC-RACE; PASS.
- Regresión: public-quote-requests.service.spec.ts.

## BUG-011 — MEDIUM — Multipart

- Reproducción: Seis fotos en taller/entrega generaban LIMIT_UNEXPECTED_FILE y HTTP 500.
- Causa/corrección: Límite explícito files:5 en Multer además del máximo de FilesInterceptor.
- Retest: MULTIPART-workshop-6; PASS.
- Regresión: qa-multipart.spec.ts (HTTP/Multer/ValidationPipe reales, medios y dominio controlados).

## BUG-012 — HIGH — Financial privacy

- Reproducción: CATALOG_MANAGE sin FINANCIAL_COST_VIEW recibía estimatedCost.
- Causa/corrección: Omitir costo en detalle y respuestas de creación/edición de variantes. La web conserva un costo omitido al editar otros campos.
- Retest: CATALOG-COST-PRIVACY; PASS.
- Regresión: catalog-admin.controller.spec.ts + regresión web de costos omitidos.

## BUG-013 — MEDIUM — Numeric MySQL IDs

- Reproducción: Una imagen de la variante propia recibía 400 por comparar number con string.
- Causa/corrección: Normalizar ambos IDs a String en la comprobación de pertenencia.
- Retest: CATALOG-IMAGE-OWNER; PASS.
- Regresión: catalog-admin.service.spec.ts.

## Alcance

Cambios en código local y pruebas del proyecto. QA por API local/DB real. Sin despliegue, sin commit automático y sin cambios de stack. La historia QA se conserva y las cuentas QA están desactivadas/revocadas.
