# Home Fashion · Informe técnico del candidato de entrega

Fecha de corte 12 de noviembre de 2026, Bogotá. Base `backlog/2026-11-12` en `4b7ec941dc73952885b1b69b6e5fe9f0c1466e8b`. Candidato en `fix/home-fashion-final-hardening`. La [auditoría inicial](final-hardening-audit.md) contrasta HF-01 a HF-13 con el árbol de referencia y fija los criterios de aceptación.

## A. Cambios implementados

| Problema original | Archivos y solución | Resultado verificado |
| --- | --- | --- |
| P0 · Evidencias aportadas como URL | `workshop-progress.controller.ts`, `deliveries.controller.ts`, `sales.controller.ts`, sus DTO y servicios. Taller y abonos admiten JSON de texto. Las fotografías requieren multipart. La ruta antigua de entrega responde 400 con instrucciones de migración. | Pruebas HTTP rechazaron URLs en los tres módulos. Next.js y Flutter conservan sus rutas multipart. Playwright comprobó la lectura por el taller asignado, 401 sin sesión, 404 para otro taller y proyección de seguimiento sin fotos. |
| P0 · Pertenencia de la evidencia | `cloudinary-media.service.ts` exige entrega autenticada y valida la correspondencia de carpeta, URL e identificador del activo. El interceptor existente firma enlaces de cinco minutos tras la autorización del recurso y evita su caché. | Contrato, firma y expiración calculada en Jest. Carga, persistencia y lectura con Cloudinary controlado en E2E. |
| P1 · Borrado de fotos comerciales | `catalog-image-resolver.service.ts`, `catalog-admin.service.ts`, `media-cleanup.service.ts` y migración `20261112004000`. La selección bloquea la referencia hasta confirmar el documento. La cola retiene imágenes del catálogo y de cotizaciones, ventas y pedidos. | MySQL verificó imagen libre, las tres referencias históricas, alias de versión y formato de un trabajo antiguo, repetición, reintento del proveedor y carrera con una cotización. |
| P1 · Concurrencia de pedidos | `workshop-progress.service.ts` y `workshop-jobs.service.ts` adquieren primero el bloqueo de pedido, igual que cancelación y entregas. | MySQL comprobó cancelación frente a inicio de taller, programación, cierre, ajuste y duplicación. Las reservas y el evento de cancelación se conservaron coherentes. |
| P1 · Reenvío de avances desde Flutter | `progress_report_sheet.dart`, `workshop_job.dart`, DTO, modelo y servicio de avance, y migración `20261112005000`. Un formulario abierto reutiliza su identificador. La API devuelve el reporte original o 409 si cambia el contenido. | Widget Flutter, reenvío multipart en Playwright y concurrencia de dos envíos en MySQL. El registro se escribió una sola vez. |
| P1 · Cuotas e identidad detrás del proxy | `request-rate-limit.ts` y `api-client-address.ts` normalizan la IP y devuelven 503 cuando falta una identidad fiable. La web requiere firma en Vercel. | Dos instancias de la lógica de cuota compartieron MySQL para login, refresh y solicitud pública. Se verificaron 429, `Retry-After` y contadores separados. |
| P1 · Credenciales y permisos | Se conservaron las guardias, permisos de campos, administración de usuarios y revocación por versión. Se añadió un procedimiento de alta y restablecimiento, además de aserciones para sesiones revocadas y mutaciones denegadas. | La suite verificó ADMIN, EMPLOYEE y WORKSHOP, `CATALOG_PRICE_EDIT`, `FINANCIAL_COST_EDIT`, `USER_MANAGE`, cancelación, inventario e inactivación. Tras restablecer, el secreto anterior dejó de permitir ingreso y ambos tokens se revocaron. |
| Entrega técnica | `scripts/package-source.py` añade exportación y verificación contra Git, con metadatos tar y gzip deterministas. Ambos `vercel.json` deshabilitan el despliegue Git de la rama. Se actualizaron API, móvil, arquitectura, trazabilidad, operación y diagramas D-10 a D-12. | El empaquetador verificó correspondencia de bytes, repetibilidad y exclusión de secretos y runtimes. |

## B. Hallazgos adicionales

| Prioridad | Impacto y tratamiento |
| --- | --- |
| P1 | El modo local de QA cerraba entregas mediante una URL de fixture. Se migró a carga multipart en Chromium con respuestas controladas del proveedor y comprobación de referencias autenticadas en MySQL. Se ajustaron las aserciones de persistencia al nuevo contrato. |
| P1 | Vercel limita el cuerpo de cada función a 4,5 MB. El límite local de NestJS es por archivo. La diferencia puede afectar adjuntos reales, por lo que el preview debe medir el tamaño total y validar el flujo antes de operar. [Límites de Vercel Functions](https://vercel.com/docs/functions/limitations). |
| P1 | El restablecimiento administrativo revoca sesiones, pero la cuenta carece de autoservicio y caducidad del secreto inicial. El manual describe entrega cifrada y verificación humana. |
| P2 | Un avance sin `requestId` conserva compatibilidad con consumidores anteriores. Flutter conserva la clave mientras el formulario está abierto. El cierre de la aplicación pierde ese estado de reenvío. |
| P2 | El tipado general de la API incluye fixtures de Jest con errores históricos de tipos. El tipado de producción y la ejecución Jest usan sus configuraciones propias. |
| P2 | Android debug compila con un aviso de compatibilidad futura de Kotlin 2.0.20. La configuración del repositorio carece de firma release autorizada. |

## C. Pruebas y evidencias

| Ejecución final | Ejecutadas | Aprobadas | Fallidas |
| --- | ---: | ---: | ---: |
| Jest API, 43 suites | 352 | 352 | 0 |
| Node web | 39 | 39 | 0 |
| Flutter | 53 | 53 | 0 |
| `pnpm test:closure`, MySQL real y proveedores controlados | 50 | 50 | 0 |
| Playwright Chromium | 6 | 6 | 0 |
| Aislamiento E2E | 2 | 2 | 0 |
| Reportero y entrega | 4 | 4 | 0 |
| Empaquetador | 4 | 4 | 0 |
| **Total** | **510** | **510** | **0** |

Los totales cuentan una ejecución final por suite. La instalación con lockfile, lint, tipado de producción de API y web, tipado de Playwright, compilación de contratos/API/web, `flutter analyze`, build Android debug, migraciones y restauración se registran aparte.

Ejecución Playwright `2026-11-12T16-22-30-254Z-9a0367f2`. El resumen de entrega conserva los resultados por escenario sin material de autenticación. Los reintentos de preparación ajustaron expectativas heredadas de las evidencias y el arranque del doble controlado en Windows.

Entorno Windows, Node.js 22.19.0, pnpm 11.13.1, MySQL 8.4 descartable en loopback, NestJS, Next.js y Chromium. Los casos de Wompi usaron respuestas controladas y contabilidad real en MySQL. Playwright ejercitó catálogo, solicitud, cotización, venta, reserva, taller, revisión, entrega, seguimiento, permisos y recuperación tras pérdida de respuesta. También verificó `/api/health`, `X-Request-Id` y ausencia de autorización CORS para un origen ajeno. ADB devolvió una lista vacía de dispositivos y emuladores.

**Recuperación sintética.** Se restauró un respaldo lógico de 182 732 bytes en un esquema nuevo de la misma instancia MySQL descartable. La ejecución tardó 3,37 s. Coincidieron los conteos de 30 tablas, el marcador de aislamiento y las 21 migraciones. `CHECK TABLE` devolvió `OK` en seis tablas críticas. Los arranques E2E repetidos respetaron el registro de migraciones existente.

Para crear una copia reproducible de la revisión, ejecuta `python scripts/package-source.py --output home-fashion.tar.gz --commit HEAD`. Comprueba su contenido con `python scripts/package-source.py --verify home-fashion.tar.gz --commit HEAD` y compara el SHA-256 con el manifiesto.

Para repetir las pruebas, usa `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:e2e:provision`, `pnpm test:e2e:journey` y `pnpm test:closure` según la [guía de QA](../../tests/e2e/README.md). Flutter ejecuta `flutter test`, `flutter analyze` y `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:4301/api`. Para las regresiones financieras, inicia primero la base sintética y aplica las migraciones con la preparación E2E.

## D. Pendientes de tesis y operación

| Estado | Trabajo pendiente y responsable |
| --- | --- |
| Validación externa | Cloudinary aislado requiere una cuenta autorizada. Verificar carga, lectura en Next.js y Flutter, acceso anónimo, expiración, invalidación y destrucción. Vercel requiere preview aislado para IP real, cuota entre funciones, capacidad de adjuntos, CORS y salud. Wompi requiere claves test y un webhook HTTPS autorizado para confirmar la conciliación externa. |
| Acción manual | El investigador debe reclutar participantes autorizados, obtener consentimiento, medir tareas y línea base, y documentar los resultados de OE4. El responsable del negocio debe aprobar la migración de fotos históricas, la conciliación de saldos iniciales, los plazos de privacidad y la entrega de credenciales. Operaciones debe verificar Android real, gestionar firma release, configurar alertas y repetir la restauración en una instancia independiente. |
| Fuera del alcance aprobado | Cobros reales, intervención en producción, uso de datos reales y retiro de fotografías de clientes. |

Consulta el [protocolo OE4](../thesis/evidence/oe4-evaluation-protocol.md) y el [manual operativo y de reversión](operations-2026-11-12.md).

## E. Evaluación final

**Preparación académica estimada 85 %.** Evaluación ponderada con 25 puntos para cada componente. Diseño 25/25, implementación 25/25, QA técnica 25/25 y evaluación de campo 10/25 por disponer de protocolo, trazabilidad e instrumentos. La calificación académica depende de la universidad y de los resultados reales de OE4.

**Preparación para producción estimada 70 %.** Seguridad de software 24/30, integridad funcional 22/25, recuperación y operación 15/25 e integraciones y campo 9/20. Los principales riesgos son la exposición histórica de imágenes, el límite de tamaño de Vercel, la ausencia de una prueba real del proveedor y de Android, y la gestión operativa de respaldos y credenciales.

Usar el candidato para revisión académica y demostración con datos sintéticos. Completar OE4 antes del cierre académico y los controles del apartado D antes de habilitar la operación con datos reales.
