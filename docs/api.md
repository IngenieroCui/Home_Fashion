# API de Home Fashion

Referencia de `apps/api`, una API REST NestJS para todas las reglas comerciales y productivas del MVP.

> Base local: `http://localhost:3001/api`. Todas las rutas de las tablas incluyen el prefijo `/api`.

## 1. Responsabilidades

La API es la autoridad para:

- autenticación, sesión, roles y permisos;
- validación y normalización de entradas;
- catálogo e inventario terminado;
- precios, descuentos, costos visibles y totales;
- clientes, cotizaciones, ventas y pagos;
- creación y estados de pedidos;
- asignación y avances de talleres;
- proyección segura de seguimiento;
- entregas y cierre operativo;
- persistencia transaccional en MySQL.

El módulo media carga imágenes en Cloudinary. Las URLs persistidas de evidencia se generan al subir archivos; los endpoints JSON de referencia se conservan por compatibilidad.

## 2. Requisitos y configuración

- Node.js compatible con NestJS 11; Node 22 LTS es la versión usada en la validación actual.
- pnpm `11.13.1`, fijado en el `packageManager` raíz.
- MySQL 8 moderno, por el uso de JSON, restricciones `CHECK` y transacciones.

Copia `apps/api/.env.example` a `apps/api/.env` solo para desarrollo local:

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NODE_ENV` | No | `development`, `test` o `production`; por defecto `development` |
| `PORT` | No | Puerto HTTP; por defecto `3001` |
| `DB_HOST` | Sí | Host MySQL |
| `DB_PORT` | No | Puerto MySQL; por defecto `3306` |
| `DB_NAME` | Sí | Base de datos |
| `DB_USER` | Sí | Usuario con permisos sobre la base |
| `DB_PASSWORD` | Sí | Contraseña del usuario |
| `DB_LOGGING` | No | Activa SQL en consola; por defecto `false` |
| `JWT_ACCESS_SECRET` | Sí | Secreto de al menos 32 caracteres |
| `JWT_ACCESS_EXPIRES_IN` | No | Duración del access token; por defecto `15m` |
| `JWT_REFRESH_SECRET` | Sí | Secreto distinto, mínimo 32 caracteres |
| `JWT_REFRESH_EXPIRES_IN` | No | Duración del refresh; por defecto `30d` |

En producción, inyecta secretos desde el entorno del servicio. Si se ejecuta `node dist/main.js`, usa `apps/api` como directorio de trabajo o inyecta todas las variables; `ConfigModule` resuelve `.env` desde el directorio actual.

## 3. Preparación y ejecución local

Desde la raíz:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm --filter @home-fashion/api user:create -- "Administrador" admin@example.com "una-clave-segura" ADMIN
pnpm dev:api
```

`db:seed` carga roles/permisos y un catálogo de demostración. Úsalo en bases nuevas de desarrollo o prueba. No lo ejecutes sin revisar en una base de producción que deba conservar un catálogo real.

Comprueba `GET http://localhost:3001/api/health`. Este healthcheck solo confirma que el proceso responde; no comprueba MySQL mediante una consulta.

## 4. Convenciones HTTP

### Autenticación

Las rutas protegidas esperan:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

El login devuelve access y refresh token. El refresh rota la sesión: el consumidor debe sustituir ambos valores. La web abstrae este contrato mediante cookies HttpOnly; Flutter lo implementa con almacenamiento seguro.

### Validación

Los DTO se validan globalmente. Se transforman números y booleanos declarados, se rechazan propiedades desconocidas y los identificadores se exponen como strings para conservar precisión de `BIGINT`.

### Paginación

Los listados usan `page` y `limit`; los valores por defecto son 1 y 12, y `limit` no puede superar 50. Los filtros vacíos deben omitirse.

### Importes

Los importes financieros se manejan como decimales de hasta dos posiciones. En ventas y pagos se envían como strings, por ejemplo `"3299000.00"`, para no introducir errores binarios.

### Errores

La API usa las respuestas JSON estándar de NestJS. Los casos habituales son 400 por validación o transición inválida, 401 sin sesión válida, 403 sin permiso, 404 para recursos no disponibles y 409 para conflictos de idempotencia, unicidad o concurrencia.

## 5. Endpoints públicos y de autenticación

| Método | Ruta | Acceso | Propósito |
| --- | --- | --- | --- |
| GET | `/api/health` | Público | Estado básico del proceso |
| POST | `/api/auth/login` | Público | Login con `email`, `password` |
| POST | `/api/auth/refresh` | Refresh | Rotar tokens con `refreshToken` |
| POST | `/api/auth/logout` | Refresh | Revocar la sesión |
| GET | `/api/auth/me` | JWT | Usuario, rol y permisos efectivos |
| GET | `/api/catalog/categories` | Público | Categorías activas |
| GET | `/api/catalog/products` | Público | Catálogo paginado y filtrado |
| GET | `/api/catalog/products/:slug` | Público | Detalle de producto activo |
| POST | `/api/public/quote-requests` | Público | Crear solicitud idempotente |
| GET | `/api/public/tracking/:token` | Token URL | Seguimiento privado sanitizado |

Filtros de productos: `page`, `limit`, `q`, `category`, `allowsCustomization`, `inStock`.

Ejemplo de solicitud pública:

```json
{
  "requestId": "0ca2d9f4-2b02-4ca8-8a62-63d78a92eae0",
  "fullName": "Ana Pérez",
  "phone": "+57 300 000 0000",
  "email": "ana@example.com",
  "productId": "1",
  "productVariantId": "2",
  "quantity": 1,
  "customization": { "color": "Verde oliva" },
  "message": "Confirmar tiempo de fabricación"
}
```

`requestId` debe ser UUID v4. Repetir la misma clave y contenido devuelve la solicitud original; reutilizarla con otro contenido responde 409. El cliente nunca envía precio, costo, descuento ni estado interno.

## 6. Catálogo administrativo

Todas estas rutas requieren JWT y `CATALOG_MANAGE`.

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET | `/api/admin/catalog/categories` | Listar; filtros `q`, `page`, `limit` |
| POST | `/api/admin/catalog/categories` | Crear categoría |
| PATCH | `/api/admin/catalog/categories/:id` | Editar o desactivar categoría |
| GET | `/api/admin/catalog/products` | Listar; `q`, `categoryId`, `status`, `allowsCustomization` |
| POST | `/api/admin/catalog/products` | Crear producto |
| GET | `/api/admin/catalog/products/:id` | Detalle administrativo |
| PATCH | `/api/admin/catalog/products/:id` | Editar o desactivar producto |
| POST | `/api/admin/catalog/products/:productId/variants` | Crear variante vendible |
| PATCH | `/api/admin/catalog/variants/:id` | Editar variante e inventario |
| POST | `/api/admin/catalog/products/:productId/images` | Asociar imagen por URL |
| PATCH | `/api/admin/catalog/images/:id` | Editar imagen, orden o principal |
| DELETE | `/api/admin/catalog/images/:id` | Eliminar referencia; no elimina archivo remoto |

Ejemplo mínimo de producto y variante:

```json
{
  "categoryId": "1",
  "name": "Sofá Verona",
  "description": "Sofá contemporáneo",
  "allowsCustomization": true,
  "status": "ACTIVE"
}
```

```json
{
  "sku": "VER-3P-GRI",
  "name": "Tres puestos gris",
  "salePrice": 3299000,
  "estimatedCost": 1900000,
  "quantityOnHand": 4,
  "status": "ACTIVE"
}
```

Estados: `ACTIVE`, `INACTIVE`. La disponibilidad calculada es existencia menos reserva.

## 7. Clientes y cotizaciones

| Método | Ruta | Permiso | Propósito |
| --- | --- | --- | --- |
| GET | `/api/admin/customers` | `CUSTOMER_MANAGE` | Listar por `q`, `isActive`, paginación |
| POST | `/api/admin/customers` | `CUSTOMER_MANAGE` | Crear cliente |
| GET | `/api/admin/customers/:id` | `CUSTOMER_MANAGE` | Detalle |
| PATCH | `/api/admin/customers/:id` | `CUSTOMER_MANAGE` | Editar o desactivar |
| GET | `/api/admin/quotes` | `QUOTE_MANAGE` | Listar por `q`, `customerId`, `status` |
| POST | `/api/admin/quotes` | `QUOTE_MANAGE` | Crear cotización |
| GET | `/api/admin/quotes/:id` | `QUOTE_MANAGE` | Detalle con elementos |
| PATCH | `/api/admin/quotes/:id` | `QUOTE_MANAGE` | Editar cabecera en estado editable |
| POST | `/api/admin/quotes/:id/items` | `QUOTE_MANAGE` | Añadir elemento |
| PATCH | `/api/admin/quotes/:quoteId/items/:itemId` | `QUOTE_MANAGE` | Editar elemento |
| DELETE | `/api/admin/quotes/:quoteId/items/:itemId` | `QUOTE_MANAGE` | Quitar elemento |
| POST | `/api/admin/quotes/:id/status` | `QUOTE_MANAGE` | Cambiar estado permitido |

Un precio cotizado distinto al catálogo exige además `SALE_PRICE_OVERRIDE` y `negotiationReason`. Los estados son `REQUESTED`, `DRAFT`, `QUOTED`, `ACCEPTED`, `REJECTED`, `EXPIRED` y `CANCELLED`. Una vez enviada como `QUOTED`, la cotización deja de ser editable.

## 8. Ventas y pagos

| Método | Ruta | Permiso | Propósito |
| --- | --- | --- | --- |
| GET | `/api/admin/sales` | `SALE_MANAGE` | Listar por texto, cliente, estado o fechas |
| POST | `/api/admin/sales` | `SALE_MANAGE` | Crear venta directa |
| POST | `/api/admin/sales/from-quote/:quoteId` | `SALE_MANAGE` | Convertir cotización `ACCEPTED` una vez |
| GET | `/api/admin/sales/:id` | `SALE_MANAGE` | Detalle, pagos, saldo y pedido |
| POST | `/api/admin/sales/:id/payments` | `FINANCIAL_PAYMENT_REGISTER` | Registrar movimiento |
| POST | `/api/admin/sales/:saleId/payments/:paymentId/void` | `FINANCIAL_PAYMENT_CORRECT` | Anular con motivo |

Ejemplo de venta directa:

```json
{
  "customerId": "1",
  "deliveryFee": "50000.00",
  "items": [
    { "productId": "1", "productVariantId": "2", "quantity": 1 }
  ],
  "notes": "Entrega en Ibagué"
}
```

`unitSalePrice` es opcional. Si difiere del catálogo exige `SALE_PRICE_OVERRIDE` y `negotiationReason`; vender bajo costo exige además `belowCostReason`.

Tipos de pago: `DEPOSIT`, `PAYMENT`, `FINAL_PAYMENT`, `REFUND`, `ADJUSTMENT`. Métodos: `CASH`, `DEBIT_CARD`, `CREDIT_CARD`, `ADDI`, `SISTECREDITO`, `BANK_TRANSFER`, `OTHER`. Un ajuste también declara `ADD_TO_PAID` o `SUBTRACT_FROM_PAID`.

## 9. Pedidos y seguimiento

| Método | Ruta | Permiso | Propósito |
| --- | --- | --- | --- |
| GET | `/api/admin/orders` | `ORDER_MANAGE` | Listar por texto, cliente, estado o fechas |
| POST | `/api/admin/orders/from-sale/:saleId` | `ORDER_MANAGE` | Convertir venta confirmada |
| GET | `/api/admin/orders/:id` | `ORDER_MANAGE` | Detalle con elementos y operación asociada |
| GET | `/api/admin/orders/:orderId/tracking-access` | `ORDER_MANAGE` | Estado del acceso privado |
| POST | `/api/admin/orders/:orderId/tracking-access` | `ORDER_MANAGE` | Generar o rotar; acepta `expiresAt` opcional |
| POST | `/api/admin/orders/:orderId/tracking-access/revoke` | `ORDER_MANAGE` | Revocar |

Ejemplo de conversión:

```json
{
  "promisedDate": "2026-09-20",
  "notes": "Confirmar acceso al edificio",
  "items": [
    { "saleItemId": "101", "supplyType": "IN_STOCK" },
    { "saleItemId": "102", "supplyType": "MADE_TO_ORDER" }
  ]
}
```

Todos los elementos de la venta deben aparecer exactamente una vez. `IN_STOCK` requiere variante y disponibilidad; `MADE_TO_ORDER` queda pendiente de fabricación.

## 10. Talleres y avances

### Administración

| Método | Ruta | Permiso | Propósito |
| --- | --- | --- | --- |
| GET | `/api/admin/workshop-users` | `WORKSHOP_MANAGE` | Buscar usuarios WORKSHOP activos |
| GET | `/api/admin/workshop-jobs` | `WORKSHOP_MANAGE` | Listar trabajos y filtros |
| POST | `/api/admin/workshop-jobs` | `WORKSHOP_MANAGE` | Asignar un elemento fabricable |
| GET | `/api/admin/workshop-jobs/:id` | `WORKSHOP_MANAGE` | Detalle administrativo |
| GET | `/api/admin/workshop-progress` | `PROGRESS_REVIEW` | Listar reportes |
| GET | `/api/admin/workshop-progress/:id` | `PROGRESS_REVIEW` | Detalle e historial |
| POST | `/api/admin/workshop-progress/:id/review` | `PROGRESS_REVIEW` | `APPROVE` o `REJECT` |

Filtros de trabajos: `q`, `workshopUserId`, `status`, `orderId`, `expectedDateFrom`, `expectedDateTo`. Filtros de avances: `q`, `reviewStatus`, `type`, `workshopUserId`, `orderId`, `dateFrom`, `dateTo`.

Ejemplo de asignación:

```json
{
  "orderItemId": "25",
  "workshopUserId": "8",
  "instructions": "Usar la tela indicada en la personalización",
  "expectedCompletionDate": "2026-09-20"
}
```

### Usuario taller

| Método | Ruta | Permiso | Propósito |
| --- | --- | --- | --- |
| GET | `/api/workshop/jobs` | `WORKSHOP_JOB_VIEW` | Solo trabajos del JWT; `q`, `status`, paginación |
| GET | `/api/workshop/jobs/:id` | `WORKSHOP_JOB_VIEW` | Detalle propio sin cliente ni finanzas |
| POST | `/api/workshop/jobs/:id/progress` | `WORKSHOP_PROGRESS_SUBMIT` | Reporte append-only |

Ejemplo de avance:

```json
{
  "type": "PROGRESS",
  "message": "Estructura terminada y lista para tapizado",
  "progressPercent": 60,
  "evidenceUrls": ["https://example.com/evidencias/avance-1.jpg"]
}
```

Tipos: `STARTED`, `PROGRESS`, `READY_FOR_REVIEW`. `PROGRESS` usa 1–99 en la regla de negocio; `READY_FOR_REVIEW` fuerza 100. Se aceptan máximo cinco URLs.

## 11. Entregas

Todas requieren `ORDER_MANAGE`.

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET | `/api/admin/delivery-assignees` | Buscar `OWNER` o `EMPLOYEE` elegible |
| GET | `/api/admin/deliveries` | Listar por texto, estado, tipo, asignado, pedido o fechas |
| POST | `/api/admin/deliveries` | Programar o reprogramar entrega cancelada |
| GET | `/api/admin/deliveries/:id` | Detalle administrativo |
| POST | `/api/admin/deliveries/:id/start` | Pasar a `OUT_FOR_DELIVERY` |
| POST | `/api/admin/deliveries/:id/complete` | Registrar receptor/evidencia y entregar elementos |
| POST | `/api/admin/deliveries/:id/cancel` | Cancelar y recalcular pedido |

Ejemplo de programación interna:

```json
{
  "orderId": "14",
  "address": "Dirección administrada por el negocio",
  "contactName": "Persona de contacto",
  "contactPhone": "3000000000",
  "scheduledDate": "2026-09-25",
  "timeWindow": "2:00 p. m. a 5:00 p. m.",
  "deliveryType": "EMPLOYEE",
  "assignedUserId": "4",
  "fee": "50000.00"
}
```

Tipos: `OWNER`, `EMPLOYEE`, `EXTERNAL_DRIVER`. Un conductor externo usa `externalDriverName` y no `assignedUserId`. La interfaz completa la entrega mediante `POST /api/admin/deliveries/:id/complete-media`, con `receiverName` y de una a cinco imágenes JPG/PNG/WebP (`files`, hasta 10 MB cada una). El endpoint JSON con `evidenceUrls` se conserva por compatibilidad.

## 12. Roles y permisos

| Rol | Comportamiento base |
| --- | --- |
| `ADMIN` | Todos los permisos registrados |
| `EMPLOYEE` | Operación de catálogo, clientes, cotizaciones, ventas, pagos, pedidos, talleres, revisión y entregas según seeder/overrides |
| `WORKSHOP` | `WORKSHOP_JOB_VIEW` y `WORKSHOP_PROGRESS_SUBMIT` |

Los permisos financieros de costo, margen y corrección no se conceden automáticamente a EMPLOYEE. Algunos permisos sembrados están reservados para módulos posteriores y aún no tienen endpoint o interfaz (`USER_MANAGE`, `AUDIT_VIEW`, entre otros).

## 13. Base de datos

Comandos desde la raíz:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:migrate:undo
pnpm db:migrate:undo:all
pnpm db:seed:status
pnpm db:seed
pnpm db:seed:undo
pnpm db:seed:undo:all
```

No ejecutes `undo` contra datos valiosos sin respaldo y una revisión de impacto. El rollback de solicitudes públicas se detiene si encuentra datos que perderían auditoría.

Para crear actores:

```bash
pnpm --filter @home-fashion/api user:create -- "Nombre" correo@example.com "clave-segura" ADMIN
pnpm --filter @home-fashion/api user:create -- "Nombre" correo@example.com "clave-segura" EMPLOYEE
pnpm --filter @home-fashion/api user:create -- "Nombre" correo@example.com "clave-segura" WORKSHOP
```

## 14. Calidad y compilación

```bash
pnpm --filter @home-fashion/api lint
pnpm --filter @home-fashion/api test
pnpm --filter @home-fashion/api build
```

El build queda en `apps/api/dist`. La validación del 7 de agosto de 2026 aprobó lint, 32 suites/269 pruebas y build.

Las pruebas usan dobles de persistencia; no sustituyen el smoke test con MySQL. Consulta [smoke-test-mvp.md](smoke-test-mvp.md).

## 15. Despliegue

Procedimiento agnóstico del proveedor:

1. Provisionar MySQL 8, base, usuario de mínimo privilegio, backup y red privada cuando sea posible.
2. Instalar dependencias con `pnpm install --frozen-lockfile`.
3. Inyectar todas las variables con `NODE_ENV=production` y secretos distintos.
4. Ejecutar `pnpm --filter @home-fashion/api build`.
5. Ejecutar `pnpm db:migrate` una sola vez como tarea de release.
6. Cargar roles/permisos con una estrategia aprobada; el `db:seed` actual también inserta catálogo demo.
7. Crear el primer ADMIN por CLI desde un entorno administrativo seguro.
8. Iniciar desde `apps/api` con `node dist/main.js` y un supervisor de procesos.
9. Publicar detrás de HTTPS y limitar el acceso directo a MySQL.
10. Verificar health, login, consulta pública y una operación de lectura autenticada.

No se recomienda ejecutar migraciones automáticamente en cada réplica al arrancar; varias instancias podrían competir. Ejecuta una tarea de release controlada.

Antes de producción faltan, como mínimo: rate limiting, estrategia de logs/alertas, backup restaurado en ensayo, rotación de secretos, política de URLs externas y prueba integral real.

## 16. Solución de problemas

- **Falla la configuración al iniciar:** revisa todos los `DB_*` y secretos JWT de 32 caracteres o más.
- **La API inicia pero una ruta falla con conexión:** el healthcheck no prueba MySQL; revisa servicio, red, usuario y base.
- **Una migración falla en `CHECK`:** confirma MySQL 8 moderno y no MariaDB/una versión antigua sin validar compatibilidad.
- **401 después de refresh:** sustituye el refresh anterior; la rotación lo invalida.
- **403 con sesión válida:** consulta `/auth/me` y revisa permisos efectivos/overrides.
- **409 en solicitud pública:** no reutilices el mismo `requestId` con contenido diferente.
- **409 al crear pedido o trabajo:** otro proceso pudo crear la relación única; recarga el detalle.
- **Archivo de evidencia rechazado:** usa JPG/PNG/WebP hasta 10 MB; la interfaz carga el archivo en Cloudinary. Las referencias URL de los endpoints JSON compatibles deben ser absolutas.


### Operación 360 y comprobantes

- GET /admin/operations/overview: dashboard adaptado a permisos; excluye WORKSHOP y oculta finanzas sin SALE_MANAGE.
- GET /admin/operations/inventory: CATALOG_MANAGE, filtros q/categoryId/status/alert y paginación; alertas solo de variantes activas (bajo stock: 1–2 disponibles).
- GET /admin/operations/customers/:id: CUSTOMER_MANAGE, secciones comerciales/financieras/logísticas según permisos adicionales.
- GET /admin/operations/sales/:id/order-preparation: ORDER_MANAGE, datos mínimos y disponibilidad real para preparar pedidos.
- POST /admin/sales/:id/payments-media: FINANCIAL_PAYMENT_REGISTER; multipart type/method/amount/paidAt/reference?/notes?/adjustmentEffect?/file?. Una imagen JPG/PNG/WebP opcional de hasta 10 MB; Cloudinary payments/{sale-code}, WebP hasta 1600×1600; elimina la nueva evidencia si falla el registro. El endpoint JSON permanece compatible.
