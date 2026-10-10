# Diccionario de datos

Derivado de las 11 migraciones vigentes. Convenciones: **NN** no admite nulo; **PK** clave primaria; **FK** clave foránea; **UQ** única. Los nombres son físicos (`snake_case`).

## Catálogo

### `categories`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `name` | VARCHAR(120) | NN; nombre visible. |
| `slug` | VARCHAR(140) | NN, UQ; identificador URL. |
| `description` | TEXT | Nullable. |
| `is_active` | BOOLEAN | NN, default `true`. |
| `created_at`, `updated_at` | DATETIME | NN; auditoría temporal. |

### `products`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `category_id` | BIGINT UNSIGNED | FK→`categories.id`, NN, RESTRICT. |
| `name` | VARCHAR(180) | NN. |
| `slug` | VARCHAR(200) | NN, UQ. |
| `description` | TEXT | NN. |
| `allows_customization` | BOOLEAN | NN, default `false`. |
| `status` | ENUM | NN, default `ACTIVE`; `ACTIVE`, `INACTIVE`. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `product_variants`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `product_id` | BIGINT UNSIGNED | FK→`products.id`, NN, RESTRICT. |
| `sku` | VARCHAR(100) | NN, UQ. |
| `name` | VARCHAR(180) | Nullable. |
| `dimensions`, `material` | VARCHAR(160) | Nullable. |
| `color` | VARCHAR(100) | Nullable. |
| `fabric`, `finish` | VARCHAR(120) | Nullable. |
| `sale_price` | DECIMAL(12,2) | NN; CHECK `> 0`. |
| `estimated_cost` | DECIMAL(12,2) | Nullable; no convertir a cero. |
| `quantity_on_hand` | INTEGER UNSIGNED | NN, default `0`. |
| `quantity_reserved` | INTEGER UNSIGNED | NN, default `0`; CHECK `<= quantity_on_hand`. |
| `location` | VARCHAR(180) | Nullable. |
| `status` | ENUM | NN, default `ACTIVE`; `ACTIVE`, `INACTIVE`. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `product_images`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `product_id` | BIGINT UNSIGNED | FK→`products.id`, NN, RESTRICT. |
| `product_variant_id` | BIGINT UNSIGNED | FK→`product_variants.id`, nullable, RESTRICT. |
| `url` | VARCHAR(2048) | NN; referencia externa, no upload. |
| `public_id`, `alt_text` | VARCHAR(255) | Nullable. |
| `position` | INTEGER UNSIGNED | NN, default `0`. |
| `is_primary` | BOOLEAN | NN, default `false`. |
| `created_at`, `updated_at` | DATETIME | NN. |

## Autenticación y autorización

### `roles`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `code` | VARCHAR(40) | NN, UQ (`ADMIN`, `EMPLOYEE`, `WORKSHOP`). |
| `name` | VARCHAR(100) | NN. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `permissions`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `code` | VARCHAR(80) | NN, UQ. |
| `description` | VARCHAR(255) | NN. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `role_permissions`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `role_id` | BIGINT UNSIGNED | PK compuesta, FK→`roles.id`, CASCADE delete. |
| `permission_id` | BIGINT UNSIGNED | PK compuesta, FK→`permissions.id`, CASCADE delete. |

### `users`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `role_id` | BIGINT UNSIGNED | FK→`roles.id`, NN, RESTRICT. |
| `full_name` | VARCHAR(160) | NN. |
| `email` | VARCHAR(254) | NN, UQ. |
| `password_hash` | VARCHAR(255) | NN; nunca exponer. |
| `is_active` | BOOLEAN | NN, default `true`. |
| `last_login_at` | DATETIME | Nullable. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `user_permission_overrides`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `user_id` | BIGINT UNSIGNED | PK compuesta, FK→`users.id`, CASCADE delete. |
| `permission_id` | BIGINT UNSIGNED | PK compuesta, FK→`permissions.id`, CASCADE delete. |
| `effect` | ENUM | NN; `ALLOW`, `DENY`. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `refresh_sessions`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `user_id` | BIGINT UNSIGNED | FK→`users.id`, NN, CASCADE delete. |
| `token_hash` | VARCHAR(64) | NN, UQ; SHA-256 del refresh. |
| `expires_at` | DATETIME | NN. |
| `revoked_at` | DATETIME | Nullable. |
| `replaced_by_session_id` | BIGINT UNSIGNED | FK autorreferente→`refresh_sessions.id`, nullable, SET NULL. |
| `created_at`, `updated_at` | DATETIME | NN. |

## Clientes y cotizaciones

### `customers`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `full_name` | VARCHAR(180) | NN. |
| `document_type` | ENUM | Nullable; `CC`, `CE`, `NIT`, `PASSPORT`, `OTHER`. |
| `document_number` | VARCHAR(80) | Nullable, UQ. |
| `phone` | VARCHAR(60) | NN. |
| `email` | VARCHAR(254) | Nullable. |
| `city`, `neighborhood` | VARCHAR(120) | Nullable. |
| `address` | VARCHAR(255) | Nullable; dato sensible. |
| `notes` | TEXT | Nullable; uso interno. |
| `is_active` | BOOLEAN | NN, default `true`. |
| `created_by_user_id`, `updated_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, nullable tras la migración de solicitudes públicas. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `quotes`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `code` | VARCHAR(30) | NN, UQ. |
| `customer_id` | BIGINT UNSIGNED | FK→`customers.id`, NN, RESTRICT. |
| `status` | ENUM | NN, default `DRAFT`; `REQUESTED`, `DRAFT`, `QUOTED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`. |
| `valid_until` | DATETIME | Nullable. |
| `customer_notes`, `internal_notes` | TEXT | Nullable. |
| `delivery_fee` | DECIMAL(12,2) | NN, default `0.00`. |
| `subtotal`, `discount_total`, `total` | DECIMAL(12,2) | Nullable mientras se construye la cotización. |
| `created_by_user_id`, `updated_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, nullable para solicitudes públicas. |
| `public_request_key` | VARCHAR(36) | Nullable, UQ; UUID idempotente. |
| `public_request_payload_hash` | VARCHAR(64) | Nullable; detecta reutilización con otro contenido. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `quote_items`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `quote_id` | BIGINT UNSIGNED | FK→`quotes.id`, NN, CASCADE delete. |
| `product_id` | BIGINT UNSIGNED | FK→`products.id`, NN, RESTRICT. |
| `product_variant_id` | BIGINT UNSIGNED | FK→`product_variants.id`, nullable. |
| `product_name_snapshot` | VARCHAR(180) | NN; histórico. |
| `variant_name_snapshot`, `sku_snapshot` | VARCHAR(180/100) | Nullable; históricos. |
| `quantity` | INTEGER UNSIGNED | NN; CHECK `> 0`. |
| `unit_list_price`, `unit_quoted_price` | DECIMAL(12,2) | Nullable. |
| `discount_amount` | DECIMAL(12,2) | NN, default `0.00`. |
| `subtotal` | DECIMAL(12,2) | Nullable. |
| `customization` | JSON | Nullable; estructura controlada por DTO/servicio. |
| `negotiation_reason`, `notes` | TEXT | Nullable. |
| `created_at`, `updated_at` | DATETIME | NN. |

## Ventas y pagos

### `sales`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `code` | VARCHAR(30) | NN, UQ. |
| `customer_id` | BIGINT UNSIGNED | FK→`customers.id`, NN. |
| `quote_id` | BIGINT UNSIGNED | FK→`quotes.id`, nullable, UQ. |
| `status` | ENUM | NN, default `CONFIRMED`; `CONFIRMED`, `CANCELLED`. |
| `subtotal`, `discount_total`, `delivery_fee`, `total` | DECIMAL(12,2) | NN; `delivery_fee >= 0`. |
| `notes` | TEXT | Nullable. |
| `created_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, NN. |
| `cancelled_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, nullable. |
| `cancelled_at` | DATETIME | Nullable. |
| `cancellation_reason` | TEXT | Nullable. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `sale_items`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `sale_id` | BIGINT UNSIGNED | FK→`sales.id`, NN. |
| `product_id` | BIGINT UNSIGNED | FK→`products.id`, NN. |
| `product_variant_id` | BIGINT UNSIGNED | FK→`product_variants.id`, nullable. |
| `product_name_snapshot` | VARCHAR(180) | NN. |
| `variant_name_snapshot`, `sku_snapshot` | VARCHAR(180/100) | Nullable. |
| `customization` | JSON | Nullable; snapshot controlado. |
| `quantity` | INTEGER UNSIGNED | NN; CHECK `> 0`. |
| `unit_list_price` | DECIMAL(12,2) | Nullable. |
| `unit_sale_price` | DECIMAL(12,2) | NN; CHECK `> 0`. |
| `unit_cost_snapshot` | DECIMAL(12,2) | Nullable y privado. |
| `discount_amount`, `subtotal` | DECIMAL(12,2) | NN. |
| `negotiation_reason` | TEXT | Nullable. |
| `is_below_cost` | BOOLEAN | NN, default `false`. |
| `below_cost_reason`, `notes` | TEXT | Nullable. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `sale_payments`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `sale_id` | BIGINT UNSIGNED | FK→`sales.id`, NN. |
| `customer_id` | BIGINT UNSIGNED | FK→`customers.id`, NN; consulta/auditoría. |
| `type` | ENUM | NN; `DEPOSIT`, `PAYMENT`, `FINAL_PAYMENT`, `REFUND`, `ADJUSTMENT`. |
| `method` | ENUM | NN; `CASH`, `DEBIT_CARD`, `CREDIT_CARD`, `ADDI`, `SISTECREDITO`, `BANK_TRANSFER`, `OTHER`. |
| `adjustment_effect` | ENUM | Nullable; `ADD_TO_PAID`, `SUBTRACT_FROM_PAID`. |
| `amount` | DECIMAL(12,2) | NN; CHECK `> 0`. |
| `paid_at` | DATETIME | NN. |
| `reference` | VARCHAR(160) | Nullable. |
| `notes` | TEXT | Nullable. |
| `evidence_url` | VARCHAR(500) | Nullable; referencia externa. |
| `status` | ENUM | NN, default `REGISTERED`; `REGISTERED`, `VOIDED`. |
| `created_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, NN. |
| `voided_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, nullable. |
| `voided_at` | DATETIME | Nullable. |
| `void_reason` | TEXT | Nullable. |
| `created_at`, `updated_at` | DATETIME | NN. |

## Pedidos, fabricación, seguimiento y entrega

### `orders`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `code` | VARCHAR(30) | NN, UQ. |
| `sale_id` | BIGINT UNSIGNED | FK→`sales.id`, NN, UQ. |
| `customer_id` | BIGINT UNSIGNED | FK→`customers.id`, NN. |
| `status` | ENUM | NN, default `OPEN`; `OPEN`, `IN_PROGRESS`, `READY`, `COMPLETED`, `CANCELLED`. |
| `promised_date` | DATE | Nullable. |
| `notes` | TEXT | Nullable. |
| `created_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, NN. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `order_items`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `order_id` | BIGINT UNSIGNED | FK→`orders.id`, NN. |
| `sale_item_id` | BIGINT UNSIGNED | FK→`sale_items.id`, NN, UQ. |
| `product_id` | BIGINT UNSIGNED | FK→`products.id`, NN. |
| `product_variant_id` | BIGINT UNSIGNED | FK→`product_variants.id`, nullable. |
| `product_name_snapshot` | VARCHAR(180) | NN. |
| `variant_name_snapshot`, `sku_snapshot` | VARCHAR(180/100) | Nullable. |
| `customization` | JSON | Nullable; snapshot. |
| `quantity` | INTEGER UNSIGNED | NN; CHECK `> 0`. |
| `supply_type` | ENUM | NN; `IN_STOCK`, `MADE_TO_ORDER`. |
| `status` | ENUM | NN; `RESERVED`, `PENDING_PRODUCTION`, `IN_PRODUCTION`, `READY`, `DELIVERED`, `CANCELLED`. |
| `notes` | TEXT | Nullable. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `workshop_jobs`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `code` | VARCHAR(50) | NN, UQ. |
| `order_item_id` | BIGINT UNSIGNED | FK→`order_items.id`, NN, UQ. |
| `workshop_user_id` | BIGINT UNSIGNED | FK→`users.id`, NN. |
| `status` | ENUM | NN, default `ASSIGNED`; `ASSIGNED`, `IN_PROGRESS`, `READY_FOR_REVIEW`, `COMPLETED`, `CANCELLED`. |
| `instructions` | TEXT | Nullable; información necesaria para el taller. |
| `expected_completion_date` | DATE | Nullable. |
| `assigned_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, NN. |
| `assigned_at` | DATETIME | NN. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `workshop_progress_reports`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `workshop_job_id` | BIGINT UNSIGNED | FK→`workshop_jobs.id`, NN. |
| `type` | ENUM | NN; `STARTED`, `PROGRESS`, `READY_FOR_REVIEW`. |
| `message` | TEXT | NN. |
| `progress_percent` | INTEGER UNSIGNED | Nullable; servicio limita 1–99 o fuerza 100. |
| `evidence_urls` | JSON | Nullable; máximo cinco URLs por validación de aplicación. |
| `review_status` | ENUM | NN, default `PENDING_REVIEW`; `PENDING_REVIEW`, `APPROVED`, `REJECTED`. |
| `submitted_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, NN. |
| `submitted_at` | DATETIME | NN. |
| `reviewed_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, nullable. |
| `reviewed_at` | DATETIME | Nullable. |
| `review_comment` | TEXT | Nullable. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `order_tracking_accesses`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `order_id` | BIGINT UNSIGNED | FK→`orders.id`, NN, UQ. |
| `token_hash` | VARCHAR(64) | NN, UQ; token completo no se persiste. |
| `token_prefix` | VARCHAR(16) | NN; identificación administrativa no secreta. |
| `active` | BOOLEAN | NN, default `true`. |
| `expires_at` | DATETIME | Nullable. |
| `created_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, NN. |
| `rotated_at` | DATETIME | Nullable. |
| `revoked_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, nullable. |
| `revoked_at` | DATETIME | Nullable. |
| `created_at`, `updated_at` | DATETIME | NN. |

### `deliveries`

| Columna | Tipo | Reglas / significado |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED | PK, NN, autoincremental. |
| `code` | VARCHAR(50) | NN, UQ. |
| `order_id` | BIGINT UNSIGNED | FK→`orders.id`, NN, UQ. |
| `status` | ENUM | NN, default `SCHEDULED`; `SCHEDULED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`. |
| `address` | VARCHAR(500) | NN; dato sensible. |
| `address_reference` | VARCHAR(255) | Nullable. |
| `contact_name` | VARCHAR(160) | NN; dato sensible. |
| `contact_phone` | VARCHAR(40) | NN; dato sensible. |
| `scheduled_date` | DATE | NN. |
| `time_window` | VARCHAR(80) | Nullable. |
| `delivery_type` | ENUM | NN; `OWNER`, `EMPLOYEE`, `EXTERNAL_DRIVER`. |
| `assigned_user_id` | BIGINT UNSIGNED | FK→`users.id`, nullable; obligatorio para OWNER/EMPLOYEE. |
| `external_driver_name` | VARCHAR(160) | Nullable; obligatorio solo para EXTERNAL_DRIVER. |
| `fee` | DECIMAL(12,2) | Nullable; CHECK `>= 0`. |
| `notes` | TEXT | Nullable. |
| `receiver_name` | VARCHAR(160) | Nullable hasta completar. |
| `evidence_urls` | JSON | Nullable hasta completar; servicio exige 1–5 URLs. |
| `delivered_at` | DATETIME | Nullable hasta completar. |
| `created_by_user_id` | BIGINT UNSIGNED | FK→`users.id`, NN. |
| `created_at`, `updated_at` | DATETIME | NN. |

## Observación sobre reglas de aplicación

Algunas invariantes (por ejemplo, porcentajes de avance, correspondencia entre `delivery_type` y rol del usuario, transiciones de estado y estructura permitida de JSON) viven en servicios/DTO y pruebas, no únicamente en el DDL. Deben documentarse junto con el ERD y validarse mediante integración.
