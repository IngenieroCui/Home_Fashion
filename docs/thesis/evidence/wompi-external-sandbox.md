# Home Fashion — validación externa de Wompi Sandbox

Fecha: **28 de octubre de 2026**, America/Bogota. Los timestamps ISO de los logs están en UTC; 2026-10-29 01:53 UTC corresponde al 28 de octubre, 20:53 en Bogotá.

**WOMPI_EXTERNAL_SANDBOX=PENDING_CREDENTIALS**

La validación externa está **BLOQUEADA**. No se encontraron las cuatro credenciales test en las configuraciones reales examinadas. No hubo pago en Wompi ni webhook del proveedor. Ningún resultado de esta ejecución acredita PASS externo.

## Reporte solicitado

| # | Criterio | Resultado de esta ejecución |
|---|---|---|
| 1 | Credenciales test reconocidas | **No**. Las cuatro están ausentes; pertenencia al mismo comercio y validez ante Wompi sin comprobar. |
| 2 | Web/API HTTPS público | **No**. Se verificaron web y API locales por HTTP. No se publicaron túneles al estar bloqueada la integración externa. |
| 3 | Checkout externo | **FAIL — criterio no cumplido por bloqueo; NO EJECUTADO**. No es un fallo observado del checkout de Wompi. |
| 4 | Tarjeta | **FAIL — criterio no cumplido por bloqueo; NO EJECUTADO**. No se introdujeron datos de tarjeta. |
| 5 | Nequi | **NO DISPONIBLE para validar en esta ejecución** por falta de credenciales. La disponibilidad real en el comercio es **DESCONOCIDA**; no se afirma que Wompi o el comercio carezcan del método. |
| 6 | Webhook verificado | **No**. Sin evento HTTPS recibido, firma externa validada ni consulta de transacción real. Dashboard sin configurar en esta ejecución. |
| 7 | Unicidad del abono | **No comprobada externamente**. Hay cero abonos; eso no prueba la unicidad de una aprobación real. |
| 8 | Estado final MySQL | Venta **1 / HF-VTA-2026-00001**, **CONFIRMED**, total **$250.000 COP**, pagado **$0**, saldo **$250.000**, **0 SalePayment**, **0 PaymentAttempt**. |
| 9 | Pendientes | Cuatro llaves test válidas del mismo comercio, HTTPS web/API, configuración del webhook en dashboard, ejecución principal y sus evidencias; después, complementarias. |
| 10 | Estado global | **WOMPI_EXTERNAL_SANDBOX=PENDING_CREDENTIALS**. |

## Preflight y preparación local comprobada

Se partió de `docs/payments/INSTRUCCIONES_SANDBOX.md` y del módulo de pagos existente en el repositorio local `C:/Users/juand/Downloads/Proyectos/Mio/Tesis/home-fashion`.

Se comprobó la presencia de las variables `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET` en el entorno del proceso, usuario y sistema, y en los archivos de entorno existentes del repositorio y su copia de trabajo. Las cuatro están ausentes de los archivos reales; una plantilla `.env.wompi.example` no constituye credenciales válidas. No se imprimieron valores ni se probaron claves inventadas.

La copia de trabajo utilizada coincide con **406 archivos** revisados del código API/web y configuración de compilación del repositorio. Se recompiló la API con la CLI Nest instalada. Corepack intentó descargar pnpm y no pudo resolver el registro; se usó directamente la CLI ya instalada, sin instalar dependencias ni cambiar el módulo.

Se creó una instancia **nueva** de MySQL **8.4.0**, enlazada a **127.0.0.1:33308**, base `home_fashion_e2e`. Es distinta de la instancia de la validación interna anterior en el puerto 33307. Antes de migrar o escribir se verificaron UUID, datadir, base, marcador de aislamiento y privilegios limitados de la cuenta. Se aplicaron las **15 migraciones existentes**, incluidas las de intenciones y PaymentAttempt. Todos los usuarios, cliente, producto y venta de esta base son sintéticos.

Se arrancó **NestJS normal** mediante `apps/api/dist/main.js`, sin reemplazar el adaptador ni sus consultas. Se arrancó **Next.js normal** mediante `next start`, conectado a esa API. Wompi quedó deshabilitado explícitamente mientras faltan las llaves. No se ejecutó `sandbox-directed.cjs`.

Con el ADMIN sintético autenticado se creó la venta mediante `POST /api/admin/sales`, con una unidad de $250.000 y sin abono inicial. Se solicitó un cobro por **$50.000** mediante `POST /api/admin/sales/1/payment-attempts`. La API respondió **503: Wompi Sandbox no está configurado**. No se generó enlace, referencia ni fila PaymentAttempt. Ese rechazo local es la protección de configuración, no una transacción rechazada por Wompi.

La navegación real en Chromium inició sesión en Next, abrió `/panel/ventas/1` y mostró el saldo leído de la API. No se interceptaron ni simularon respuestas HTTP. La lectura SQL final confirmó la ausencia de filas financieras.

## Prueba principal: registro de lo observado

| Dato requerido | Evidencia actual |
|---|---|
| Venta CONFIRMED de $250.000 COP | **Sí**, creada mediante API normal y leída en MySQL. |
| ADMIN genera cobro de $50.000 | **Bloqueado**: solicitud real HTTP 503; ningún intento creado. |
| Referencia de intento | **No existe** en esta base. |
| Visitante abre `/cobro/:token` | **No ejecutado**: no existe enlace emitido. |
| Redirección al checkout alojado real | **No ejecutada**. |
| ID real de transacción Sandbox | **No existe**. |
| Estado consultado a Wompi | **No consultado**; no hay transacción. |
| Evento HTTPS recibido | **No**. |
| Validación de firma del evento externo | **No ejecutada**. |
| Pago interno creado | **No**, 0 filas. |
| Saldo anterior | **$250.000 COP**. |
| Saldo posterior observado | **$250.000 COP**. El objetivo de $200.000 no se alcanzó. |
| Una única fila SalePayment | **No**: hay 0. |
| Relación correcta con PaymentAttempt | **No comprobada**: no existe intento ni pago. |
| Redirección del navegador confirma pago | No hubo retorno de Wompi ni se confirmó pago alguno. La regla del módulo existente no se modificó; no se acredita una prueba externa de esta propiedad. |

## Capturas

**Captura real de Home Fashion local, antes de cualquier pago externo.** Muestra la venta confirmada, pagado $0, saldo $250.000, lista vacía de cobros y el mensaje de Wompi sin configurar. No demuestra una aprobación del proveedor.

La captura histórica `01-venta-local-sin-abono.png` no se adjunta en Git ni en el paquete de código.

- **Captura del checkout Wompi REAL: pendiente**. No se pudo obtener sin credenciales válidas.
- **Captura del saldo actualizado a $200.000: pendiente**. No se fabricó un abono para producirla.
- No se reutilizaron capturas de la validación controlada anterior.

## Pruebas complementarias

La prueba principal no alcanzó PASS; conforme a la condición del encargo, **no se ejecutaron** tarjeta rechazada, Nequi aprobado/rechazado, webhook repetido, reconsulta, intento vencido ni saldo insuficiente por pago posterior.

**PSE: disponibilidad no comprobada**, sin acceso al checkout del comercio. Solo debe probarse si aparece habilitado y disponible allí.

## Evidencias preservadas y clasificación

| Archivo | Alcance |
|---|---|
| [Preflight](wompi-external-sandbox/logs/preflight.json) | Presencia de variables en archivos, exclusión de plantillas y comparación de fuentes. No contiene valores de secretos. |
| [Variables de proceso/usuario/sistema](wompi-external-sandbox/logs/environment-presence.json) | Presencia booleana de cada una de las cuatro credenciales. |
| [Preparación MySQL](wompi-external-sandbox/logs/database-preparation.json) | Aislamiento, puerto y migraciones aplicadas. |
| [Verificación API local](wompi-external-sandbox/logs/local-verification.json) | Operaciones HTTP, cobro bloqueado y saldo sin modificación. |
| [Verificación web local](wompi-external-sandbox/logs/browser-preparation.json) | Login y venta HTTP 200; captura local, sin mocks. |
| [Estado final SQL](wompi-external-sandbox/logs/mysql-final.json) | SELECT ejecutados, resultados y ausencia de filas SalePayment/PaymentAttempt. |
| [Log API](wompi-external-sandbox/logs/api.sanitized.log) / [stderr](wompi-external-sandbox/logs/api-error.sanitized.log) | Arranque normal de Nest, sanitizado. |
| [Log web](wompi-external-sandbox/logs/web.sanitized.log) / [stderr](wompi-external-sandbox/logs/web-error.sanitized.log) | Arranque normal de Next, sanitizado. |
| [Cierre del entorno](wompi-external-sandbox/logs/cleanup.json) | Apagado de los procesos temporales y conservación de datos. |
| [Manifiesto](wompi-external-sandbox/manifest.json) | SHA-256 de los entregables y revisión de ausencia de secretos. |

**Externo real:** ninguna prueba ejecutada. **Local real:** MySQL, migraciones, API, autenticación ADMIN, creación de venta, rechazo de configuración, navegador Next y lectura final SQL. **Proveedor simulado:** no utilizado en esta ejecución. Los PASS controlados anteriores permanecen fuera de este dictamen.

No se conectó ni modificó Aiven. No se enviaron datos personales ni dinero. Los secretos del entorno local y las sesiones están únicamente en `work/`, fuera del paquete entregado y del repositorio. No se publicaron servicios ni se configuró el dashboard Wompi.

## Continuación requerida

1. Configurar privadamente las cuatro credenciales test del mismo comercio en un archivo `.env` ignorado; comunicar únicamente su ruta. Comprobar su validez contra Sandbox y su asociación al comercio, sin revelar valores. Mantener este estado hasta obtener evidencia completa.
2. Reutilizar la MySQL dedicada y la venta **1** sin volver a ejecutar la preparación de base nueva. Arrancar la API normal con esas cuatro llaves, el guard de aislamiento, un `WOMPI_LINK_SECRET` aleatorio estable y el origen web HTTPS temporal. La web debe seguir apuntando exclusivamente a la API aislada.
3. Habilitar HTTPS público temporal web/API y configurar en el **dashboard Sandbox** `https://<origen-api>/api/payments/wompi/events`. Verificar que esa configuración corresponde al mismo comercio.
4. Generar por ADMIN un cobro nuevo de $50.000, abrirlo como visitante y completar una tarjeta aprobada usando los datos oficiales vigentes de Sandbox.
5. Preservar referencia, ID externo, consulta autenticada a Wompi, entrega HTTPS y validación de firma. Comprobar en MySQL exactamente una fila SalePayment enlazada al PaymentAttempt y saldo de $200.000, sin confirmar por el retorno del navegador. Capturar checkout real y saldo actualizado.
6. Solo si esa prueba es PASS, ejecutar y documentar las complementarias; comprobar métodos disponibles en el checkout. Actualizar este informe con evidencias nuevas, manteniendo separado el presente bloqueo de la ejecución posterior.

**Cierre:** los procesos temporales API, web y MySQL se detienen al finalizar la preparación; los datos sintéticos y la configuración local privada se conservan para retomar. No hay PASS externo acreditado.
