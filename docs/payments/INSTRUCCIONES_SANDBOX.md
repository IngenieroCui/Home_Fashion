# Ejecución y pendiente externo — Home Fashion / Wompi

Corte: 28/10/2026, America/Bogota. `WOMPI_EXTERNAL_SANDBOX=PENDING_CREDENTIALS`.

## Contratos oficiales consultados

- [Web Checkout](https://docs.wompi.co/docs/colombia/widget-checkout-web/): salida GET a `https://checkout.wompi.co/p/` con `public-key`, `currency`, `amount-in-cents`, `reference`, `signature:integrity`; se añaden `redirect-url` y `expiration-time`. Firma SHA-256 de referencia + centavos + COP + fecha ISO de vencimiento + secreto de integridad, en ese orden. Se calcula exclusivamente en backend. La redirección solo informa.
- [Ambientes y llaves](https://docs.wompi.co/docs/colombia/ambientes-y-llaves/): API fija `https://sandbox.wompi.co/v1`. Solo prefijos `pub_test_`, `prv_test_`, `test_integrity_`, `test_events_`. No hay selección de producción.
- [Eventos](https://docs.wompi.co/docs/colombia/eventos/): verificar SHA-256 concatenando valores de `signature.properties` relativos a `data`, en su orden, luego `timestamp` y secreto de eventos. La lista se lee dinámicamente, con validación de rutas. Se compara el checksum del cuerpo en tiempo constante. El endpoint devuelve 200 tras procesar; un fallo transitorio permite reenvío. No se exige una ventana corta que descarte eventos tardíos legítimos.
- [Seguimiento de transacciones](https://docs.wompi.co/docs/colombia/seguimiento-de-transacciones/): la consulta por ID requiere actualmente llave privada desde el servidor. El adaptador no usa la llave pública para verificar estados.
- [Datos de prueba](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/): tarjeta aprobada `4242 4242 4242 4242`, rechazada `4111 1111 1111 1111`; vencimiento futuro y CVC de prueba. Nequi aprobado `3991111111`, rechazado `3992222222`. PSE: banco que aprueba/rechaza según opciones del checkout. Solo introducir estos datos en Wompi Sandbox.

## Reproducir la validación interna

Desde una copia de trabajo del repositorio, con dependencias instaladas y MySQL Server 8.4 disponible:

```powershell
node tests/e2e/support/local-mysql.mjs
pnpm --filter @home-fashion/api build
node tests/payments/sandbox-directed.cjs
```

Pruebas de regresión de pagos y tipos, desde `apps/api`:

```powershell
pnpm exec tsc -p tsconfig.payments-tests.json
pnpm exec jest --config jest.payments.config.cjs --runInBand --testNamePattern="payment|SalesService|sale money"
```

El provisioner crea una instancia nueva bajo `.e2e-local/`, enlazada a `127.0.0.1:33307`, y una cuenta limitada a `home_fashion_e2e`. Se niega a reutilizar un puerto ocupado. El ejecutor valida host, puerto, nombre de base, UUID de servidor, datadir y marcador de aislamiento antes de escribir. No carga credenciales de Aiven. Conserva datos sintéticos; no borra historia. No se deben copiar `.env.e2e`, `owner.json` ni `demo-private.json` a entregables o Git.

El ejecutor asigna credenciales **ficticias** y sustituye la consulta externa del adaptador solo dentro del proceso de prueba. También controla el upload de evidencia. Nest, validadores HTTP, transacciones, migraciones y restricciones MySQL son reales. Este modo no valida una transacción externa.

Para navegador, iniciar Next con `API_SERVER_URL=http://127.0.0.1:3301/api` en puerto 3300. Después ejecutar:

```powershell
node tests/payments/sandbox-directed.cjs --browser
```

Se requiere Chromium de Playwright disponible. El ejecutor inicia su propia API en 3301. `--serve` conserva una demo controlada tras las pruebas. No usar este ejecutor como servidor para probar Wompi externo: reemplaza deliberadamente la respuesta del proveedor.

Para detener exclusivamente la instancia creada por el provisioner:

```powershell
node tests/e2e/support/local-mysql.mjs --stop
```

## Completar Wompi externo real en Sandbox

1. Obtener del dashboard de comercios las cuatro credenciales **del mismo comercio Sandbox**. No pegarlas en chat ni en un archivo versionado. Usar `.env.wompi.example` como lista de variables privadas y mantener `WOMPI_EXTERNAL_SANDBOX=PENDING_CREDENTIALS` hasta obtener evidencia externa completa.
2. Preparar la misma base **aislada** y migrada. El guard actual requiere `DB_HOST` loopback, nombre con `sandbox` o `e2e` y `WOMPI_SANDBOX_DATABASE_ISOLATED=true`. Arrancar la API normal compilada, no el ejecutor controlado. No ejecutar `db:migrate` contra la configuración Aiven existente.
3. Cargar el entorno aislado en el proceso antes de arrancar. Configurar `WOMPI_ENABLED=true`, las cuatro llaves test, un `WOMPI_LINK_SECRET` aleatorio de al menos 32 caracteres y `WOMPI_PUBLIC_WEB_URL=https://<origen-web-demo>`. El secreto del enlace debe permanecer estable durante la vida de los enlaces emitidos. Las variables privadas nunca usan `NEXT_PUBLIC_`.
4. Publicar temporalmente la API y la web mediante HTTPS accesible con un túnel o un entorno de demostración aprobado que llegue a esa MySQL aislada. El origen web no admite ruta, usuario, query ni fragmento. En Next, `API_SERVER_URL` debe apuntar a la API aislada y terminar en `/api`.
5. En el dashboard **Sandbox**, configurar la URL de eventos `https://<origen-api-demo>/api/payments/wompi/events`. Esta configuración manual no se hizo aquí. No sustituirla por la URL de retorno del navegador.
6. Entrar con el ADMIN existente de la demo. Abrir una venta CONFIRMED, generar un anticipo y abrir el enlace sin sesión. Completar tarjeta aprobada; verificar ID externo, APPROVED consultado con llave privada, una fila en `sale_payments`, relación en `payment_attempts` y saldo de la misma venta. Conservar IDs de prueba y evidencia sin llaves ni datos personales.
7. Repetir con un intento nuevo para tarjeta rechazada, Nequi aprobado/rechazado y PSE si está habilitado. Reenviar la notificación firmada de prueba y verificar que no aumenta la cantidad de movimientos. Una referencia terminada no se reutiliza: generar otro intento.
8. Registrar evidencia de HTTPS y de entrega efectiva del evento, consultar MySQL aislado y actualizar la matriz con resultados reales. Solo entonces sustituir el marcador por un estado documentado de validación externa. No describirlo como cobro con dinero real.

La sección anterior depende de credenciales y configuración manual del comercio. Se detuvo esa parte conforme al encargo. No se abrió un checkout alojado con llaves inventadas ni se fabricó una captura de Wompi.

## Operación y límites

- El enlace vence en 24 horas para iniciar el checkout. Un evento aprobado verificado puede llegar después; se procesa con los mismos controles.
- Un pago manual posterior a emitir el enlace puede consumir el saldo. Si después llega una aprobación que no cabe, el intento conserva APPROVED y queda en revisión; no genera sobrepago ni reverso automático. El comercio debe investigar el caso en Sandbox y aplicar una decisión explícita.
- Una anulación externa después de un abono marca revisión y conserva el movimiento; no constituye devolución implementada. No se capturan PAN, CVC ni credenciales bancarias en Home Fashion.
- No hay tarea de recuperación periódica tras agotar reintentos del proveedor. Una entrega de webhook fallida de forma persistente requiere revisión operativa; refrescar el navegador no confirma dinero.
- Se guardan intención y formulario manual, incluido comprobante opcional, en IndexedDB del navegador antes del envío; al confirmar se eliminan. Una intención incierta se recupera y se reenvía con el mismo UUID. Sin almacenamiento disponible no se envía el pago.
- El cambio de contrato exige `intentId` UUID v4 en todos los clientes nuevos de pagos manuales. Actualizar clientes y migraciones de forma coordinada. El código no ejecuta migraciones ni `sync` al iniciar.
- Las migraciones financieras nuevas son forward-only para evitar borrar trazabilidad. MySQL realiza commit implícito de DDL; planificar aplicación revisada y recuperación del esquema por separado. Ninguna se aplicó a Aiven durante esta tarea.
