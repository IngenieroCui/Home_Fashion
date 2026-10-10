# Smoke test del MVP

Esta guía prepara una validación manual contra MySQL, navegador y emulador Android. No registra resultados: cada resultado debe anotarse durante la ejecución real.

## 1. Preparación

Requisitos: Node.js, pnpm 11, MySQL local, Flutter y un emulador Android. Desde la raíz del repositorio instala las dependencias:

```powershell
pnpm install
Set-Location apps/mobile
flutter pub get
Set-Location ../..
```

Crea `apps/api/.env` a partir de `apps/api/.env.example` y `apps/web/.env.local` a partir de `apps/web/.env.example`. No crees un archivo de secretos para Flutter: su URL se pasa con `--dart-define`.

Variables obligatorias de la API:

- `NODE_ENV=development`
- `PORT=3001`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`
- `DB_LOGGING=false`
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`, distintos y de al menos 32 caracteres
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=30d`

Variables de la web:

- `API_SERVER_URL=http://localhost:3001/api`
- `NEXT_PUBLIC_API_URL=http://localhost:3001/api`

Usa una base nueva y descartable llamada, por ejemplo, `home_fashion_smoke`. Verifica que las credenciales solo tengan acceso a esa base. No versionar ningún `.env` ni contraseña.

## 2. Base de datos y actores

Con MySQL iniciado y desde la raíz:

```powershell
pnpm db:migrate:status
pnpm db:migrate
pnpm db:migrate:status
pnpm db:seed
pnpm db:seed:status
pnpm --filter @home-fashion/api user:create -- "Propietario Smoke" "admin.smoke@example.test" "<contraseña-segura>" "ADMIN"
pnpm --filter @home-fashion/api user:create -- "Empleado Smoke" "empleado.smoke@example.test" "<contraseña-segura>" "EMPLOYEE"
pnpm --filter @home-fashion/api user:create -- "Taller Smoke" "taller.smoke@example.test" "<contraseña-segura>" "WORKSHOP"
```

Reemplaza cada marcador de contraseña en la terminal y no lo guardes en el repositorio. Los seeders deben dejar roles, permisos, categorías, productos, variantes e inventario terminado; no crean usuarios, pedidos, pagos ni entregas.

Comprueba antes de iniciar el recorrido:

- `pnpm db:migrate:status` no muestra migraciones pendientes.
- `pnpm db:seed:status` no muestra seeders pendientes.
- Los tres usuarios están activos y apuntan respectivamente a `ADMIN`, `EMPLOYEE` y `WORKSHOP`.
- El rol `WORKSHOP` solo tiene `WORKSHOP_JOB_VIEW` y `WORKSHOP_PROGRESS_SUBMIT`.
- Las reservas iniciales de las variantes demo están en cero.

## 3. Inicio de aplicaciones

Usa terminales separadas desde la raíz:

```powershell
pnpm dev:api
```

```powershell
pnpm dev:web
```

Con el emulador Android iniciado:

```powershell
Set-Location apps/mobile
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api
```

Antes del recorrido verifica `http://localhost:3001/api/health`, `http://localhost:3000/catalogo` y la pantalla de inicio de sesión de Flutter. En un dispositivo físico sustituye `10.0.2.2` por la IP local del equipo; no uses HTTP en una build release.

## 4. Recorrido manual exacto

Usa un producto demo con inventario para un elemento `IN_STOCK` y agrega o selecciona un elemento personalizable para `MADE_TO_ORDER`.

1. Abre `/catalogo`, filtra y entra al detalle de un producto. Deben verse únicamente productos y variantes activos, con disponibilidad calculada.
2. Envía la solicitud pública con nombre, teléfono, variante o personalización y cantidad. Debe aparecer un código, y un reintento idéntico con la misma clave no debe duplicar la solicitud.
3. Inicia sesión web con `admin.smoke@example.test`. La solicitud debe existir como cotización `REQUESTED` con cliente, elemento y snapshots persistidos.
4. Completa la cotización, negocia un precio solo si corresponde y llévala por la transición válida hasta `ACCEPTED`. El backend debe recalcular subtotal, descuentos, entrega y total.
5. Convierte la cotización aceptada en una venta. Debe existir una única venta `CONFIRMED`; la cotización no debe poder convertirse otra vez.
6. Registra un abono. Debe aparecer un movimiento `REGISTERED`, y pagado y saldo deben cambiar sin editar movimientos anteriores.
7. Crea el pedido desde la venta, clasificando una línea como `IN_STOCK` y otra como `MADE_TO_ORDER`. Debe existir un solo pedido, una línea por cada `SaleItem` y estado inicial `OPEN`.
8. Comprueba que `IN_STOCK` aumentó `quantity_reserved` sin reducir `quantity_on_hand`, y que `MADE_TO_ORDER` quedó `PENDING_PRODUCTION` sin modificar inventario.
9. Desde el detalle del pedido asigna el elemento fabricable a `taller.smoke@example.test`. El trabajo debe quedar `ASSIGNED` y no debe asignarse a ADMIN, EMPLOYEE ni a un taller inactivo.
10. Inicia sesión en Flutter con el usuario WORKSHOP. Solo deben aparecer sus trabajos, sin clientes completos, precios, costos ni pagos.
11. Abre el trabajo y envía `STARTED`. El trabajo debe quedar `IN_PROGRESS`, su `OrderItem` en `IN_PRODUCTION` y el pedido en `IN_PROGRESS`.
12. Envía `PROGRESS` con porcentaje entre 1 y 99. Debe agregarse al historial sin cambiar el estado operativo.
13. Envía `READY_FOR_REVIEW`. Debe forzar 100 %, dejar el trabajo pendiente de revisión y conservar el elemento en producción.
14. En la web, rechaza una primera solicitud de revisión. Debe quedar `REJECTED`, el trabajo volver a `IN_PROGRESS` y el pedido seguir coherente. Envía otra `READY_FOR_REVIEW` desde Flutter.
15. Aprueba la segunda revisión. El trabajo debe quedar `COMPLETED`, el elemento `READY` y el pedido debe recalcularse según todos sus elementos.
16. Genera o rota el enlace privado desde el pedido. Copia el token solo desde la respuesta de creación; en base debe existir únicamente su hash y prefijo.
17. Abre `/seguimiento/{token}` sin sesión. Deben verse el pedido, sus elementos y solo avances `APPROVED`; no deben aparecer identidad completa, contacto, dirección, precios, pagos, costos, taller, instrucciones ni revisiones internas.
18. Programa la entrega eligiendo propietario, empleado o conductor externo mediante el formulario. Debe quedar `SCHEDULED` y vinculada una sola vez al pedido.
19. Inicia la entrega. Debe quedar `OUT_FOR_DELIVERY`; no debe iniciar si algún elemento vigente sigue en producción.
20. Completa con nombre del receptor y una a cinco URLs válidas de evidencia. La entrega debe quedar `DELIVERED`, todos los elementos vigentes en `DELIVERED` y el pedido en `COMPLETED`.
21. Verifica logout web y Flutter. El refresh revocado no debe restaurar la sesión.

## 5. Comprobaciones por API o base

En cada etapa anota los identificadores y comprueba sin modificar filas manualmente:

- `quotes`: `status`, `public_request_key`, snapshots, totales y relación con el cliente.
- `sales`, `sale_items` y `sale_payments`: unicidad de conversión, snapshots, movimientos append-only y saldos devueltos por la API.
- `orders` y `order_items`: clasificación, estados y correspondencia uno a uno con los elementos de venta.
- `product_variants`: diferencia entre `quantity_on_hand` y `quantity_reserved` antes y después del pedido.
- `workshop_jobs` y `workshop_progress_reports`: asignación, autor, historial, revisión y transiciones.
- `order_tracking_accesses`: hash presente, token completo ausente, vigencia, rotación y revocación.
- `deliveries`: programación, responsable, receptor, evidencias y fechas reales.
- Respuestas públicas: ausencia de campos financieros, personales e internos.

No cambies estados con SQL para hacer avanzar la prueba; si una pantalla o endpoint no permite el paso, regístralo como defecto.

## 6. Registro de errores

Para cada fallo registra: fecha y hora, aplicación, actor y rol, paso de esta guía, URL o endpoint, datos no sensibles usados, estado anterior y esperado, estado recibido, código HTTP, mensaje visible, log de API sin secretos, captura y si el fallo es reproducible. Clasifica además si bloquea el recorrido, si deja datos parciales y si requiere restaurar la base.

Registra explícitamente errores de permisos, contratos de campos o enums, fechas, paginación, concurrencia, pérdida de sesión, doble envío, exposición de datos, reservas, recálculo del pedido y rollback transaccional.

## 7. Rollback en la base descartable

Si falla una migración, detén API y web, guarda el error y consulta `pnpm db:migrate:status`. Las migraciones compuestas son transaccionales; no marques ni edites `SequelizeMeta` manualmente.

- Si la última migración terminó y debe revertirse: `pnpm db:migrate:undo`.
- Si solo deben retirarse datos demo: `pnpm db:seed:undo:all`.
- Para reiniciar por completo una base exclusivamente descartable: ejecuta primero `pnpm db:seed:undo:all` y luego `pnpm db:migrate:undo:all`; vuelve a comprobar ambos estados antes de migrar y sembrar otra vez.
- Si MySQL no pudo revertir una operación DDL, conserva logs y descarta/recrea únicamente `home_fashion_smoke` con una cuenta autorizada. Nunca apliques este procedimiento a una base con datos que deban conservarse.

No continúes el recorrido sobre un esquema parcial y no inventes como aprobado ningún resultado no observado.
