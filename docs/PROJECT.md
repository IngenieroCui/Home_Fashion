# Referencia técnica de Home Fashion

Este documento describe el sistema y los procedimientos de validación de Home Fashion. El [README](../README.md) presenta el proyecto y los pasos de instalación local.

## Contexto y alcance

El proyecto de grado centraliza un proceso que pasa por atención comercial, taller e inventario, y termina con la entrega de muebles. El objetivo es dejar un registro consultable del paso de una solicitud a un pedido, con responsables, saldos, estado y evidencia. El alcance incluye muebles terminados y fabricación por encargo, web pública y administrativa, API REST y una aplicación Android de taller. La evaluación técnica usa datos sintéticos. La contabilidad, la facturación electrónica, el inventario de materias primas, la planeación de rutas, iOS y los cobros reales quedan fuera del alcance acreditado.

## Requisitos y trazabilidad

| Requisitos | Actor y resultado esperado | Implementación y comprobación |
| --- | --- | --- |
| RF-01–02 | El cliente consulta catálogo activo y envía una solicitud pública. | `catalog` y `public-quote-requests`. El recorrido asistido comprueba el registro y el reintento conserva el mismo código. |
| RF-03–05 | El personal se autentica y mantiene clientes, catálogo y existencias según permisos. | `auth`, `catalog`, `operations` y `quotes`. Pruebas de sesión, permisos, precio/costo y ajuste auditable. |
| RF-06–08 | El personal registra cotizaciones, ventas y movimientos de pago con totales reproducibles. | `quotes`, `sales` y `payments`. Recorrido asistido/directo y regresiones financieras. |
| RF-09–10 | El personal genera un pedido por venta y asigna producción a un taller habilitado. | `orders` y `workshop-jobs`. Pedido mixto, stock y concurrencia en MySQL. |
| RF-11–12 | El taller reporta trabajos propios y el personal revisa la evidencia. | `workshop-jobs` y Flutter. Pruebas de pertenencia, adjuntos, revisión y reenvío. |
| RF-13–15 | El cliente sigue el pedido y el personal gestiona la entrega; el sistema deriva el estado. | `order-tracking`, `deliveries` y `orders`. E2E de seguimiento, cierre y reservas. |
| Extensiones | Cancelación de pedidos, cuentas y permisos, kardex y cobros de demostración. | Pruebas de cancelación concurrente, revocación, ajuste de inventario y conciliación Sandbox controlada. |

Los requisitos no funcionales se comprueban por atributo. **Seguridad y privacidad** requieren autorización en la API, revocación, proyecciones limitadas y medios privados. **Integridad** exige transacciones, unicidades, cálculos decimales y conservación de historial. **Mantenibilidad y recuperación** requieren migraciones versionadas, pruebas de regresión y restauración ensayada. **Usabilidad, adaptabilidad y accesibilidad** requieren observación en los dispositivos y perfiles objetivo. Los recorridos automatizados y las capturas respaldan comprobaciones técnicas. La medición con usuarios y los objetivos de disponibilidad siguen abiertos.

## Arquitectura y contratos

- [API NestJS](../apps/api/src/modules/). Monolito modular con controladores REST, validación de DTO, reglas de dominio, persistencia Sequelize y adaptadores de proveedores. El prefijo es `/api`. `GET /api/health` expone la comprobación de salud. Los logs HTTP estructurados permiten correlación con `X-Request-Id`.
- [Web Next.js](../apps/web/src/app/). App Router y TypeScript para catálogo, solicitudes, seguimiento y panel. Los manejadores del servidor operan como proxy del mismo origen para operaciones protegidas, gestionan las cookies y delegan la autorización a NestJS. El catálogo puede consultar la API desde el servidor. El navegador recibe las proyecciones que necesita la página.
- [Android Flutter](../apps/mobile/lib/). Cliente HTTP con modelos Dart, navegación y estado de sesión. Usa la misma API mediante `API_BASE_URL`.
- [Contratos TypeScript](../packages/shared/). El workspace pnpm compila este paquete como parte del monorepo. Los clientes de esta revisión mantienen sus propios tipos para consumir los DTO HTTP. Al cambiar un DTO o un estado, revisar los tipos en web y Flutter y las pruebas del flujo. Los controladores y DTO son la referencia para el contrato HTTP. La persistencia se mantiene mediante [migraciones](../apps/api/src/database/migrations/).

| Superficie | Contrato |
| --- | --- |
| Pública | `/api/catalog`, `/api/public/quote-requests` y `/api/public/tracking/:token`. |
| Sesión | `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` y `/api/auth/me`. |
| Panel | Recursos `/api/admin` para clientes, cotizaciones, catálogo, ventas, pedidos, entregas, usuarios, operación y revisión. |
| Taller | `/api/workshop/jobs` para lectura de trabajos propios y `POST /api/workshop/jobs/:id/progress-media` para cargas multipart. |
| Pagos de prueba | Intentos bajo `/api/admin/sales/:saleId/payment-attempts` y rutas del proveedor bajo `/api/payments`. |

## Modelo de datos

**21 migraciones y 28 tablas de aplicación**, verificadas en MySQL 8.4.0. `SequelizeMeta` registra migraciones y `SequelizeData` registra seeders ejecutados mediante la CLI. La preparación E2E aplica el seeder de roles directamente y tiene **30 tablas**, incluidas `SequelizeMeta` y el marcador `e2e_isolation`. Los archivos de migración y el resultado de `information_schema` prevalecen sobre los diagramas de cortes anteriores.

| Grupo | Tablas |
| --- | --- |
| Catálogo | `categories`, `products`, `product_variants`, `product_images` |
| Identidad | `roles`, `permissions`, `role_permissions`, `users`, `user_permission_overrides`, `refresh_sessions` |
| Comercial | `customers`, `quotes`, `quote_items`, `sales`, `sale_items`, `sale_payments`, `payment_attempts` |
| Pedidos y taller | `orders`, `order_items`, `workshop_jobs`, `workshop_progress_reports` |
| Seguimiento y entrega | `order_tracking_accesses`, `deliveries` |
| Operación | `request_rate_limits`, `media_cleanup`, `inventory_movements`, `order_cancellations`, `user_admin_events` |

La categoría agrupa productos y el producto agrupa variantes identificadas por SKU. Una imagen pertenece al producto y puede asociarse a una variante. Los permisos se asignan por rol y pueden tener excepciones por cuenta. Un cliente tiene varias cotizaciones y ventas. Las restricciones sobre `sales.quote_id` y `orders.sale_id` impiden conversiones duplicadas. Las líneas de venta y pedido conservan snapshots comerciales, incluidas las referencias de imagen. La relación única de `order_items.sale_item_id` conserva la correspondencia de líneas. Cada línea de fabricación tiene como máximo un trabajo y este puede tener varios reportes. El acceso de seguimiento y la entrega se vinculan al pedido. Un intento de pago aprobado puede quedar vinculado al movimiento financiero que registró.

## Reglas de negocio y transiciones

| Entidad | Recorrido y restricciones |
| --- | --- |
| Cotización | Una solicitud pública empieza en `REQUESTED`. El panel también crea `DRAFT`. La propuesta pasa a `QUOTED` y puede aceptarse, rechazarse, expirar o cancelarse según su estado. Se bloquea la cabecera al editar o convertir y se comprueba el estado de nuevo antes de confirmar la venta. |
| Venta y pagos | La venta `CONFIRMED` conserva importes e imágenes de sus líneas. El resumen del pago deriva `PENDING`, `PARTIALLY_PAID` o `PAID`. Los movimientos `REGISTERED` pueden anularse a `VOIDED` con trazabilidad. Los ajustes y devoluciones se reflejan mediante movimientos y el servidor calcula el saldo con importes decimales. |
| Pedido | `OPEN`, `IN_PROGRESS`, `READY` y `COMPLETED` se derivan de las líneas y sus transiciones. La cancelación permitida registra el motivo, cambia las líneas y libera reservas aplicables. El pedido y las operaciones relacionadas usan un orden coherente de bloqueo. |
| Inventario | La disponibilidad se calcula como físico menos reservado. `IN_STOCK` reserva en la creación del pedido y al entregar consume físico y reserva. La cancelación libera la reserva. Los ajustes registran saldo previo, saldo nuevo, motivo y actor. El kardex debe partir de un saldo de apertura conciliado para existencias antiguas. |
| Taller | `MADE_TO_ORDER` empieza como producción pendiente. Un `WORKSHOP` activo recibe un trabajo `ASSIGNED`, lo inicia y envía avances hasta `READY_FOR_REVIEW`. Una aprobación de listo completa el trabajo y deja lista la línea. Un rechazo permite una nueva presentación. Los reportes conservan autor, fechas, estado de revisión y evidencia. |
| Entrega | `SCHEDULED` → `OUT_FOR_DELIVERY` → `DELIVERED`. El responsable puede ser propietario, empleado o conductor externo. El cierre exige receptor y evidencia. La programación, inicio, cierre y cancelación revalidan pedido y entrega. |

El identificador de reenvío de la solicitud pública es idempotente. Flutter mantiene un `requestId` mientras el formulario de avance sigue abierto. Un reenvío idéntico devuelve el avance original y un contenido distinto con la misma clave recibe `409`. Los consumidores anteriores pueden seguir enviando avances sin esa clave. El cierre de la aplicación pierde la clave guardada en memoria. Una respuesta perdida en una mutación financiera requiere consultar el resultado antes de volver a enviarla.

## Seguridad, sesión y permisos

NestJS comprueba JWT, estado de cuenta, versión de autenticación y permisos efectivos. Los refresh tokens rotan y se registran como hashes. Cambiar credenciales o inactivar una cuenta revoca sesiones. Next.js usa cookies HttpOnly para la sesión web y Flutter usa almacenamiento seguro. La API protege recursos y campos sensibles independientemente de los controles de interfaz.

- `ADMIN` tiene el conjunto administrativo inicial, incluida la gestión de cuentas. `EMPLOYEE` puede recibir permisos por función. La administración de usuarios, la edición de precios de catálogo, la visualización y edición de costos o márgenes, el registro y corrección de pagos, y la revisión o cancelación se controlan por permisos. Consultar el [seeder de roles y permisos](../apps/api/src/database/seeders/20260804170500-seed-auth-roles-permissions.ts) y las guardias de los controladores.
- `WORKSHOP` consulta y reporta sobre trabajos propios. La aplicación móvil acepta ese rol. El seguimiento público usa un token revocable y entrega una proyección limitada con avances aprobados. Excluye contacto, finanzas, datos internos y fotos de evidencia.
- La cuota de login, refresh y solicitudes públicas se registra en MySQL. En Vercel, el proxy firma la identidad del cliente. Ante una identidad no verificable se devuelve indisponibilidad; al agotar la cuota se devuelve `429` con `Retry-After`.

## Fotografías y evidencia

Las fotografías de catálogo se publican a través de Cloudinary. Las evidencias de taller, pago y entrega se suben por multipart con validación de archivos. El servidor guarda las referencias privadas y genera enlaces firmados de cinco minutos al autorizar una respuesta. Un enlace firmado puede compartirse hasta que expire. Los endpoints compatibles con JSON permiten texto en los casos admitidos; las fotografías requieren multipart. Los enlaces históricos que no cumplen el contrato se ocultan en la aplicación. Su retiro o migración en el proveedor requiere conciliación y autorización.

Al eliminar una referencia de catálogo, la transacción encola la limpieza. El procesador verifica que el activo no esté referenciado por catálogo, cotización, venta o pedido antes de eliminarlo. Operaciones puede ejecutar `POST /api/admin/media-cleanup/drain` con una cuenta autorizada y revisar reintentos y tareas agotadas.

## Gestión de pagos

El registro manual y las correcciones usan el servicio de ventas, que conserva movimientos y recalcula saldos en transacción. Los nombres de métodos registran la forma de pago. Wompi Sandbox es una extensión experimental. Mantiene una intención estable y los intentos del proveedor. El retorno del navegador informa el resultado al usuario. El abono requiere un webhook válido, verificación de la transacción, coincidencia de referencia, moneda e importe y registro idempotente.

La plantilla [`.env.wompi.example`](../.env.wompi.example) documenta el interruptor y las variables. El adaptador exige claves Sandbox, MySQL aislado en loopback, un esquema identificado como Sandbox/E2E y un origen público HTTPS. La prueba externa requiere una cuenta de pruebas y un webhook HTTPS autorizado. Las regresiones dirigidas usan respuestas controladas y comprueban la contabilidad con MySQL real.

## Aplicación Android

El [cliente](../apps/mobile/README.md) restaura la sesión, consulta trabajos y permite tomar o elegir hasta cinco fotos para un avance. Se ejecuta con `flutter run --dart-define=API_BASE_URL=...`. Usa `10.0.2.2` para el anfitrión en el emulador. La excepción HTTP se limita a debug. Release exige HTTPS y firma Android administrada fuera del repositorio. Para validar un dispositivo, cubrir autenticación, expiración/refresh, cámara, galería, pérdida de respuesta y lectura posterior de las evidencias con un usuario autorizado.

## Despliegue y configuración

| Componente | Configuración operativa |
| --- | --- |
| Vercel | Dos proyectos con raíces `apps/web` y `apps/api`. Confirmar rama de producción, integración Git y autorizaciones antes de publicar. Usar un preview aislado para comprobar el candidato. |
| API y MySQL | Variables de la [plantilla raíz](../.env.example), JWT separados y TLS con `DB_SSL_MODE=REQUIRED`. En local se admite una CA por ruta. En Vercel usar `DB_SSL_CA_BASE64`. Verificar host, esquema, identidad y respaldo antes de migrar. |
| Web | `API_SERVER_URL` apunta a la API con `/api`. `NEXT_PUBLIC_API_URL` configura la URL pública usada por el catálogo. Compartir `HF_PROXY_SECRET` de al menos 32 caracteres entre web y API en Vercel. |
| Medios | Configurar credenciales y carpetas separadas por entorno en Cloudinary. Comprobar límite total de petición de Vercel, límites por archivo de NestJS, expiración de enlaces, invalidación y accesos por rol. |
| Bootstrap | `pnpm db:migrate` aplica el esquema y `pnpm db:migrate:status` muestra el estado. El seeding completo incluye catálogo de demostración. Revisar y autorizar los datos que se aplicarán en cualquier entorno compartido. |

## Pruebas y evidencia

Consulta [los comandos de QA](../tests/e2e/README.md) para Chromium y MySQL descartable. El preflight valida loopback, esquema, usuario, privilegios, UUID y marcador antes de aplicar migraciones y preparar datos. La API y la web se sirven en los puertos `4301` y `4300`. Las ejecuciones nuevas escriben en `.e2e-evidence/`, que queda fuera de Git y del empaquetado. Jest cubre servicios, controladores y HTTP. Node cubre utilidades y comportamiento web. Flutter cubre modelos, sesión y widgets. `pnpm test:closure` cubre contabilidad, idempotencia, reservas, cancelación concurrente y otras reglas de cierre sobre MySQL.

El [resumen público de QA](../thesis-artifacts/evidence/qa-resumen-publico.md) conserva resultados por suite, entorno, alcance y límites de validación. Los originales con trazas operativas, capturas internas o referencias de recursos se custodian fuera de la distribución pública. Las [capturas del catálogo](../thesis-artifacts/evidence/public-catalog/) documentan la interfaz pública con productos de demostración.

Los [diagramas editables](../thesis-artifacts/diagrams/source/) y [PDF de sustentación](../thesis-artifacts/diagrams/export/) conservan contexto, arquitectura, despliegue, procesos, secuencias y estados. D-05 representa un corte físico anterior; para el esquema vigente usa la sección de modelo y las migraciones. [Diagramas del experimento Wompi](../thesis-artifacts/diagrams/wompi/).

## Mantenimiento y recuperación

1. Antes de una intervención, registra commit, destino y responsable. Guarda un respaldo cifrado y verifica los permisos del operador. Usa una base independiente para ensayar la restauración y comprueba migraciones, conteos, integridad de tablas y un flujo sintético.
2. Si falla una versión, pausa las escrituras afectadas y la cola de medios cuando corresponda. Conserva registros de incidente y referencias de evidencia. Evalúa la compatibilidad de la versión anterior con las columnas aditivas. Revertir la migración de avances puede perder las claves de reenvío. Recupera en un destino alterno y valida antes de reabrir.
3. Concilia reservas por variante con las líneas activas. Registra el saldo de apertura de inventario y conserva el motivo y el identificador de cualquier ajuste. Para medios antiguos, concilia las referencias con el proveedor y verifica accesos, migración y CDN antes del retiro autorizado.
4. El administrador verifica al titular antes del alta o restablecimiento. Entrega un secreto único por un canal autorizado y confirma la revocación. Los registros operativos deben excluir credenciales, cuerpos sensibles y enlaces firmados. La aplicación aún requiere intervención administrativa para cambiar la contraseña.
5. Para empaquetar una revisión, usa `pnpm source:package --output home-fashion.tar.gz --commit HEAD`. Usa `pnpm source:package --verify home-fashion.tar.gz --commit HEAD` para verificar el contenido contra Git.

## Cierre académico y operación comercial

**OE1** caracteriza actores, procesos y requisitos. **OE2** aporta arquitectura y código integrado. **OE3** aporta pruebas de calidad, MySQL y navegador, con Android en dispositivo pendiente. **OE4** requiere una evaluación con participantes y consentimiento, tareas observadas, línea base comparable, mediciones y análisis de resultados. El [protocolo OE4](../thesis-artifacts/evidence/oe4-evaluation-protocol.md) define la recolección. La universidad y los participantes intervienen en el cierre académico.

Antes de operar con datos reales quedan la verificación de Vercel y Cloudinary en un entorno aislado, el manejo de fotos históricas, la firma y prueba de Android, los procedimientos aprobados de privacidad y credenciales, los responsables de alertas, la conciliación de existencias y la restauración en una instancia independiente. El webhook externo de Wompi depende de un entorno Sandbox autorizado y permanece experimental.
