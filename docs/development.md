# Desarrollo

Esta guía conserva los recorridos funcionales de desarrollo. Para una referencia estructurada consulta [API](api.md), [web](web.md), [móvil](mobile.md) y [arquitectura](architecture.md). El índice completo está en [index.md](index.md).

## Convenciones

- Código, nombres de archivos técnicos, variables, funciones y clases en inglés.
- Interfaz de usuario y documentación funcional en español.
- TypeScript estricto en API, web y paquete shared.
- Flutter usa los lints oficiales y `dart format`.
- No se hacen commits ni pushes automáticos.
- No se crean repositorios Git anidados.

## Validación Antes De Cerrar Una Tarea

Ejecuta lint, pruebas y builds de los proyectos afectados. Si algo falla, corrige solo lo relacionado con la tarea actual y repite la validación.

Desde la raíz, `pnpm dev` inicia API y web en paralelo. `pnpm dev:api` y `pnpm dev:web` permiten ejecutarlas en terminales separadas para revisar sus logs con mayor claridad.

## Base De Datos

MySQL 8 se ejecuta directamente en el sistema operativo del desarrollador. NestJS usa la configuración validada de Sequelize sin sincronizar esquemas automáticamente.

### Migraciones y seeders

MySQL debe estar disponible y `apps/api/.env` debe contener las variables de base de datos. Ejecuta `pnpm db:migrate` o `pnpm db:seed` para aplicar pendientes; `:status` muestra ejecutados y pendientes, `:undo` revierte el último y `:undo:all` revierte todos. Crea archivos con timestamp en `src/database/migrations` o `src/database/seeders`, exportando siempre `up` y `down`; usa transacciones para cambios compuestos. Sin archivos pendientes, migrate y seed finalizan con cero elementos aplicados. Si MySQL no está disponible, revisa que el servicio esté activo y que las variables `DB_*` sean correctas.

Para el catálogo, aplica estructura con `pnpm db:migrate` y carga datos de desarrollo explícitamente con `pnpm db:seed`. Este comando también carga roles/permisos y por eso el seeder actual debe revisarse antes de usarlo en producción. Para revertir el último seeder usa `pnpm db:seed:undo`; `pnpm db:migrate:undo` revierte la última migración.

Con la API en ejecución prueba `GET /api/catalog/categories`, `GET /api/catalog/products?page=1&limit=12&category=sofas&inStock=true` y `GET /api/catalog/products/sofa-verona`.

## Catálogo web

`apps/web/.env.example` documenta `NEXT_PUBLIC_API_URL`, que en desarrollo apunta a `http://localhost:3001/api`, y `API_SERVER_URL`, usada solamente por el servidor de Next.js para la sesión. Inicia la API con `pnpm dev:api` y la web con `pnpm dev:web`; prueba `http://localhost:3000/`, `/catalogo`, `/catalogo?category=sofas`, `/catalogo?inStock=true`, `/catalogo?q=verona` y `/catalogo/sofa-verona`. Si la API está caída, la web conserva el contenido institucional y muestra mensajes amigables en lugar de datos de respaldo.

## Autenticación

Configura `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET` y `JWT_REFRESH_EXPIRES_IN` como en `apps/api/.env.example`. Después de migrar y cargar seeders, crea actores con `pnpm --filter @home-fashion/api user:create -- "Nombre" correo@ejemplo.com "<contraseña>" ADMIN|EMPLOYEE|WORKSHOP`; el rol debe existir y la contraseña no se imprime. `pnpm --filter @home-fashion/api admin:create -- "Nombre" correo@ejemplo.com "<contraseña>"` se conserva por compatibilidad para el primer ADMIN. Usa `POST /api/auth/login`, `POST /api/auth/refresh` y `POST /api/auth/logout`; para `GET /api/auth/me` envía `Authorization: Bearer <accessToken>`.

Con API y web en ejecución, entra a `/iniciar-sesion` y usa una cuenta interna; ADMIN y EMPLOYEE llegan a `/panel` y el cierre de sesión elimina las cookies. Al vencer el access token la web intenta renovarlo sin exponerlo al navegador; si falla, vuelve al inicio de sesión. Las cuentas WORKSHOP deben usar la aplicación Flutter. No documentes ni compartas credenciales reales.

## Catálogo administrativo

Los endpoints bajo `/api/admin/catalog` requieren `Authorization: Bearer <accessToken>` y el permiso `CATALOG_MANAGE`. Por ejemplo, crea una categoría con `POST /api/admin/catalog/categories` y `{ "name": "Sofás" }`; crea un producto con `POST /api/admin/catalog/products` y `{ "categoryId": "1", "name": "Sofá Verona", "description": "...", "allowsCustomization": true, "status": "ACTIVE" }`; y crea una variante con `POST /api/admin/catalog/products/1/variants` y `{ "sku": "VER-3P-GRI", "salePrice": 1200000, "quantityOnHand": 4, "status": "ACTIVE" }`.

Para retirar un producto usa `PATCH /api/admin/catalog/products/:id` con `{ "status": "INACTIVE" }`. Las imágenes se gestionan con URL mediante `/products/:productId/images` durante esta fase; no se carga ni elimina ningún archivo de almacenamiento externo.

## Panel administrativo de catálogo

Con una sesión ADMIN o con `CATALOG_MANAGE`, prueba `/panel/catalogo`, crea una categoría, luego un producto inactivo en `/panel/catalogo/nuevo` y una variante desde su edición. Activa producto y variante y verifica el resultado en `/catalogo/[slug]`. Las imágenes aún se muestran solo como referencia: no se administran desde la interfaz.

## Clientes y cotizaciones

Desde `/catalogo/[slug]`, un visitante puede enviar una solicitud sin iniciar sesión. La web llama su handler interno y este usa `POST /api/public/quote-requests`; el formulario genera un UUID idempotente, permite una variante activa o un diseño personalizado cuando el producto lo admite, y no envía precios. El resultado queda como `Quote REQUESTED` para que aparezca en `/panel/cotizaciones`. Repetir el mismo UUID y contenido devuelve el mismo código; cambiar el contenido con esa clave responde `409`. Cada solicitud nueva conserva un contacto independiente hasta que Home Fashion lo valide y decida cualquier consolidación administrativa.

En el panel, usa `/panel/clientes` para registrar o desactivar clientes y `/panel/cotizaciones` para crear una cotización en DRAFT. Selecciona primero un cliente; en el detalle añade una variante activa o una personalización permitida. Un precio diferente al catálogo requiere `SALE_PRICE_OVERRIDE` y un motivo. Confirma QUOTED antes de bloquear la edición; desde allí puede pasar a ACCEPTED. ACCEPTED todavía no crea ventas ni pedidos.

`/api/admin/customers` requiere `CUSTOMER_MANAGE` y `/api/admin/quotes`, `QUOTE_MANAGE`. Crea un cliente con `{ "fullName": "Ana Pérez", "phone": "3000000000" }`; crea una cotización con `{ "customerId": "1", "items": [{ "productId": "1", "productVariantId": "1", "quantity": 2 }] }`; cambia a QUOTED mediante `POST /api/admin/quotes/:id/status`. Una cotización `ACCEPTED` puede convertirse en venta desde su detalle.

## Ventas

Las rutas `/api/admin/sales` requieren `SALE_MANAGE`. Crea una venta directa con `POST /api/admin/sales`, por ejemplo `{ "customerId": "1", "deliveryFee": 50000, "items": [{ "productId": "10", "productVariantId": "22", "quantity": 1 }] }`; el backend obtiene el precio de catálogo y calcula importes. Un precio distinto exige `SALE_PRICE_OVERRIDE` y `negotiationReason`; una venta bajo costo también exige ese permiso y `belowCostReason`.

Convierte una cotización aceptada con `POST /api/admin/sales/from-quote/:quoteId`. Consulta ventas con `GET /api/admin/sales?q=...&customerId=1&status=CONFIRMED&page=1&limit=12` y su detalle con `GET /api/admin/sales/:id`; ambos incluyen `amountPaid`, `balance` y `paymentStatus`.

Para una venta confirmada, registra un abono, pago final, devolución o ajuste mediante `POST /api/admin/sales/:id/payments`; usa `type`, `method`, `amount`, `paidAt` y, para ajustes, `adjustmentEffect`. `FINAL_PAYMENT` debe coincidir con el saldo. Anula un movimiento con `POST /api/admin/sales/:saleId/payments/:paymentId/void` y un motivo; el historial conserva el movimiento `VOIDED`. En el detalle web, `PENDING` significa pendiente, `PARTIALLY_PAID` pago parcial y `PAID` pagada; el formulario permite registrar y anular según permisos. Desde una venta confirmada puede crearse su pedido una sola vez.

En web usa `/panel/ventas` para consultar y filtrar, `/panel/ventas/nueva` para registrar una venta directa y `/panel/ventas/[id]` para su detalle. Desde el detalle registra abonos, pagos finales, devoluciones o ajustes y anula movimientos con motivo cuando tenga permiso. Una cotización `ACCEPTED` se convierte desde su detalle y una venta confirmada permite iniciar la creación del pedido.

## Talleres

Con `WORKSHOP_MANAGE`, usa `/panel/talleres`, `/panel/talleres/trabajos` y `/panel/talleres/trabajos/[id]`. Desde el detalle de un pedido, un elemento `MADE_TO_ORDER` en `PENDING_PRODUCTION` permite buscar y seleccionar remotamente un usuario WORKSHOP, añadir instrucciones o fecha esperada, y crear la asignación. Si otro usuario la crea primero, el pedido se recarga para mostrar el trabajo existente.

Con JWT y permisos de taller, consulta `GET /api/workshop/jobs`, inicia con `POST /api/workshop/jobs/:id/progress` y `type: STARTED`, registra avances `PROGRESS`, y marca `READY_FOR_REVIEW`. El inicio cambia el trabajo a `IN_PROGRESS` y el elemento a `IN_PRODUCTION`; el último estado espera revisión. Con `PROGRESS_REVIEW`, usa `GET /api/admin/workshop-progress` y `POST /api/admin/workshop-progress/:id/review`: aprobar el último estado completa el trabajo y deja el elemento `READY`; rechazarlo devuelve el trabajo a `IN_PROGRESS`. Flutter consume estos endpoints; las evidencias se seleccionan desde cámara/galería y se cargan por multipart con media/Cloudinary.

## Revisión de avances

Con `PROGRESS_REVIEW`, abre `/panel/talleres/avances` para filtrar reportes y `/panel/talleres/avances/[id]` para decidirlos. Aprobar un reporte READY_FOR_REVIEW completa el trabajo y deja el elemento READY; rechazarlo devuelve el trabajo a IN_PROGRESS. Flutter muestra el resultado de revisión; las evidencias muestran las imágenes cargadas en Cloudinary.

## Seguimiento público privado

Con `ORDER_MANAGE`, desde `/panel/pedidos/[id]` consulta el estado, genera o rota el enlace (opcionalmente con expiración), cópialo y revócalo. La generación devuelve el token una sola vez y la web construye la URL con su propio origen; tras recargar no puede recuperarse. `/seguimiento/[token]` consulta `GET /api/public/tracking/:token` desde servidor sin JWT y muestra el mismo mensaje para cualquier enlace no disponible. Los datos privados de entrega no forman parte de esta respuesta pública.

## Pedidos

Con `WORKSHOP_MANAGE`, consulta usuarios elegibles en `GET /api/admin/workshop-users` y crea una asignación con `POST /api/admin/workshop-jobs`, por ejemplo `{ "orderItemId": "25", "workshopUserId": "8", "instructions": "Fabricar con la tela indicada", "expectedCompletionDate": "2026-09-20" }`. Consulta el listado y detalle con `GET /api/admin/workshop-jobs` y `GET /api/admin/workshop-jobs/:id`; el detalle de pedido incluye el resumen `workshopJob` cuando exista. La aplicación móvil permite al taller operar sus propios trabajos; los pagos al taller no pertenecen al MVP.

Con `ORDER_MANAGE`, convierte una venta confirmada mediante `POST /api/admin/orders/from-sale/:saleId`. Envía cada `saleItemId` exactamente una vez con `supplyType`: `IN_STOCK` reserva la variante terminada e incrementa `quantityReserved`; `MADE_TO_ORDER` no modifica inventario. Por ejemplo, `{ "items": [{ "saleItemId": "101", "supplyType": "IN_STOCK" }, { "saleItemId": "102", "supplyType": "MADE_TO_ORDER" }] }`.

Consulta `GET /api/admin/orders?page=1&limit=12` y `GET /api/admin/orders/:id`. La conversión no descuenta `quantityOnHand`; talleres, entregas y panel web de pedidos se gestionan en sus módulos respectivos.

El pedido recalcula su estado dentro de las transacciones que cambian elementos: inicio o revisión de fabricación y finalización o cancelación operativa de entrega. `CANCELLED` se preserva; elementos cancelados no participan; `READY` exige que todos los vigentes estén listos o entregados y `COMPLETED` que todos estén entregados.

En web, consulta `/panel/pedidos` y `/panel/pedidos/[id]`. Desde `/panel/ventas/[id]/crear-pedido`, clasifica cada elemento como inventario disponible o fabricación bajo pedido, añade fecha prometida y notas opcionales, y crea el pedido. Un error de stock conserva el formulario para cambiar la clasificación. El detalle permite asignar fabricación, gestionar seguimiento y programar una entrega cuando corresponda.

## Aplicación Flutter de talleres

Configura la URL al ejecutar; no crees un `.env` con tokens:

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api
```

Para un dispositivo físico reemplaza `10.0.2.2` por la IP local del computador. Inicia sesión con un usuario activo `WORKSHOP`, verifica listado, búsqueda, filtros, paginación y detalle; luego envía `STARTED`, un `PROGRESS` entre 1 y 99 y `READY_FOR_REVIEW`. Revisa el reporte en la web y confirma que Flutter muestra `APPROVED` o `REJECTED` con el comentario. Selecciona hasta cinco fotografías opcionales JPG/PNG/WebP de hasta 10 MB desde cámara o galería; la app las carga por multipart.

El manifiesto debug permite HTTP para el emulador y una API en la red local. En release, `API_BASE_URL` debe ser HTTPS y esa excepción Android no se empaqueta. No uses una URL HTTP para generar una build distribuible.

Valida la aplicación con:

```bash
dart format --set-exit-if-changed lib test
flutter analyze
flutter test
```

La aplicación disponible en el repositorio es únicamente Android. Las builds release requieren una API HTTPS y una configuración de firma mantenida fuera de Git; consulta [mobile.md](mobile.md).

## Entregas

Los endpoints `POST /api/admin/deliveries`, `GET /api/admin/deliveries`, `GET /api/admin/deliveries/:id` y las acciones `/:id/start`, `/:id/complete` y `/:id/cancel` requieren `ORDER_MANAGE`. `GET /api/admin/delivery-assignees` busca ADMIN activos para `OWNER` o usuarios EMPLOYEE activos. Un conductor externo usa nombre libre y no un usuario interno.

En web usa `/panel/entregas`, `/panel/entregas/[id]` o programa desde `/panel/pedidos/[id]`. Solo puede iniciarse cuando todos los elementos no cancelados están reservados o listos. Para completar registra receptor y selecciona de una a cinco fotografías; el endpoint complete-media las carga en Cloudinary. Una entrega cancelada queda visible y puede reprogramarse sobre el mismo registro si el pedido no es terminal. Cancelar una entrega en camino recompone el pedido a `READY` cuando sus elementos aplicables siguen listos; completar o cancelar no modifica pagos ni cantidades de inventario.

Las migraciones `20260811000000-enable-public-quote-requests.ts` y `20260812000000-create-deliveries.ts` deben aplicarse contra MySQL antes de la prueba manual. El rollback de la primera se detiene si existen solicitudes públicas, para no perder su referencia de auditoría.

La preparación completa, los actores de ejemplo, el orden del recorrido, las comprobaciones y el rollback de una base descartable están en [`docs/smoke-test-mvp.md`](smoke-test-mvp.md).


### Panel operativo — Sprint 2

El inicio consulta operations/overview. Clientes tiene ficha 360 y el inventario terminado está separado del catálogo. Las reservas se muestran en lectura: los ajustes de existencias y el formulario de variante envían únicamente quantityOnHand, sin quantityReserved. Los listados principales usan tablas en escritorio y tarjetas bajo 768 px. Pagos y entregas permiten seleccionar evidencia por archivo; se carga mediante el módulo media, sin URL manual. Las variables Cloudinary existentes también habilitan payments. El CLI reconoce el mismo historial en .js y .ts y excluye archivos .spec de seeders/migraciones.
