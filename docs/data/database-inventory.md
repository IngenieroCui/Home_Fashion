# Inventario de base de datos

Fuente de verdad: `apps/api/src/database/migrations/`. Corte: 6 de septiembre de 2026.

## Resultado

- 11 migraciones TypeScript.
- 22 tablas de dominio.
- MySQL 8, Sequelize/Umzug y `synchronize: false`.
- La migración `enable-public-quote-requests` modifica `customers`/`quotes` y no crea una tabla.
- No se encontraron diferencias de tablas frente al snapshot preliminar del paquete.

## Migraciones

| Orden | Migración | Efecto |
| --- | --- | --- |
| 1 | `20260804154000-create-catalog.ts` | 4 tablas de catálogo, índices y checks de precio/reserva. |
| 2 | `20260804170000-create-auth.ts` | 6 tablas de roles, permisos, usuarios y sesiones. |
| 3 | `20260804180000-create-customers-quotes.ts` | 3 tablas de clientes/cotizaciones y check de cantidad. |
| 4 | `20260805000000-create-sales.ts` | 2 tablas de ventas y checks financieros/cantidad. |
| 5 | `20260806000000-create-sale-payments.ts` | Pagos append-only y check de importe. |
| 6 | `20260807000000-create-orders.ts` | Pedidos/elementos, unicidades y check de cantidad. |
| 7 | `20260808000000-create-workshop-jobs.ts` | Asignación única por elemento de pedido. |
| 8 | `20260809000000-create-workshop-progress-reports.ts` | Historial de avances y revisión. |
| 9 | `20260810000000-create-order-tracking-accesses.ts` | Acceso privado único por pedido y hash de token. |
| 10 | `20260811000000-enable-public-quote-requests.ts` | Auditoría nullable y clave/hash idempotentes en `quotes`. |
| 11 | `20260812000000-create-deliveries.ts` | Entrega única por pedido y checks de asignación/tarifa. |

## Tablas por dominio

| Dominio | Tablas | Cantidad |
| --- | --- | ---: |
| Catálogo | `categories`, `products`, `product_variants`, `product_images` | 4 |
| Autenticación/autorización | `roles`, `permissions`, `role_permissions`, `users`, `user_permission_overrides`, `refresh_sessions` | 6 |
| Clientes/cotizaciones | `customers`, `quotes`, `quote_items` | 3 |
| Ventas/pagos | `sales`, `sale_items`, `sale_payments` | 3 |
| Pedidos/fabricación | `orders`, `order_items`, `workshop_jobs`, `workshop_progress_reports` | 4 |
| Tracking/entrega | `order_tracking_accesses`, `deliveries` | 2 |
| **Total** |  | **22** |

## Relaciones y unicidades críticas

- `products.category_id → categories.id`.
- `product_variants.product_id → products.id`; `sku` único.
- `product_images` pertenece a producto y opcionalmente a variante.
- Roles y permisos forman M:N por `role_permissions`; overrides por usuario/permiso.
- `refresh_sessions.replaced_by_session_id` es autorreferencia nullable.
- Cliente 1:N cotizaciones/ventas; cotización 0..1:0..1 venta por `sales.quote_id UNIQUE`.
- Venta 1:N líneas/pagos y 1:0..1 pedido por `orders.sale_id UNIQUE`.
- `order_items.sale_item_id UNIQUE` conserva correspondencia uno a uno.
- `workshop_jobs.order_item_id UNIQUE` limita un trabajo por elemento.
- Pedido 1:0..1 acceso de tracking y 1:0..1 entrega.

## Checks explícitos

- `product_variants.sale_price > 0`.
- `product_variants.quantity_reserved <= quantity_on_hand`.
- `quote_items.quantity > 0`.
- `sales.delivery_fee >= 0`.
- `sale_items.quantity > 0` y `unit_sale_price > 0`.
- `sale_payments.amount > 0`.
- `order_items.quantity > 0`.
- En `deliveries`, conductor externo exige nombre y no usuario; propietario/empleado exige usuario y no conductor externo.
- `deliveries.fee IS NULL OR fee >= 0`.

## Riesgos a validar en MySQL

- Compatibilidad real de todos los `CHECK` con la versión objetivo.
- Rollback de solicitud pública se detiene si existen filas con auditoría nullable.
- Unicidades y locks bajo concurrencia real.
- Consistencia entre modelos Sequelize y columnas/mapeos de migración.
- Separación futura entre seeders esenciales y catálogo demo antes de producción.

El detalle de columnas está en [data-dictionary.md](data-dictionary.md) y la fuente diagramable en [database.dbml](database.dbml).
