# Release Candidate — Home Fashion — 2026-10-10

Revisión: 2026-10-10T21:19:14.332526+00:00 (UTC); fecha de trabajo 2026-10-10, America/Bogota.

## Estado verificable

RC LOCAL CONSERVADO Y EMPAQUETABLE. PUBLICACIÓN DEL RC BLOQUEADA.
Último commit verificable: `ff3fbb867812617e34752d5e1cd1e0f99c211e2f`, rama `master`; versión package.json `0.1.0`.
El worktree incluye numerosos cambios previos sin commit y archivos nuevos de QA-1,
QA-2 y journeys. El commit por sí solo no identifica este RC: el tar.gz seguro y su
manifest SHA-256 identifican el contenido entregado. No se creó commit ni se hizo push/deploy.

## Resultados anteriores conservados (no reejecutados)

| Evidencia | Resultado documentado |
| --- | --- |
| qa-1-2026-09-29.md | 212/212 escenarios PASS; 13 bugs corregidos; API 340, web 37, Flutter 50 |
| qa-2-2026-09-30.md + qa-2-summary.json | 154 escenarios: 153 PASS, 0 FAIL finales, 1 Android pendiente; 10 bugs corregidos; API 343, web 39, Flutter 50 |
| automated-business-journeys.md + results.json | 5/5 PASS; catálogo/run 20261010204640-afd3702f; 2026-10-10T20:51:33.466Z; Chromium, Next.js, NestJS, MySQL dedicado y Cloudinary reales |

Se mantuvieron los seis PNG originales de journeys, sus resultados y el informe.
El último éxito queda identificado en `automated-business-journeys-last-success.json`.
Se añadió únicamente una copia pequeña del Markdown en la carpeta original; no se
duplicaron las capturas. WORKSHOP por API no demuestra ejecución Android.

## Publicación y configuración

El conector Vercel no mostró equipos/proyectos; consultas explícitas al equipo
`team_WdljsMja3hCQebqtqFBdigPe` devolvieron 403 por acceso al scope
`ingenierocuis-projects`. La CLI local ya instalada (39.3.0) sí permitió leer los
proyectos y despliegues existentes, sin extraer credenciales.

| Proyecto | Alias público comprobado | Deployment | Estado / fecha |
| --- | --- | --- | --- |
| home-fashion-web | https://home-fashion-web-five.vercel.app | dpl_J2WfMUcXRXnCQyRTmzDZoixqhQee | Ready, producción, 2026-09-28 18:43:29 -05 |
| home-fashion-api | https://home-fashion-api.vercel.app | dpl_EQKFZkndvNQHZKXZzLvWAVx26xu5 | Ready, producción, 2026-09-28 18:43:29 -05 |

`vercel inspect <alias> --logs` permitió extraer sólo el commit `ff3fbb8` para ambos
builds; no se persistieron logs crudos. Coincide con HEAD, pero no contiene los cambios
locales posteriores. Estos despliegues son anteriores a QA-1, QA-2 y journeys:
**el RC actual no está publicado/verificado**. Ready no implica API saludable.

`vercel env ls production` confirmó los nombres `API_SERVER_URL` y
`NEXT_PUBLIC_API_URL` en el proyecto web, Production/Preview, valores cifrados.
No se descargaron valores ni archivos de secretos: la dirección efectiva configurada
y la causa del HTTP 500 permanecen sin verificar. El alias API descubierto respondió
500 en `/api/health` y `/api/catalog/products`. No se alteró Aiven ni secretos productivos.

## Smoke corto READ-ONLY de la publicación anterior

No hubo login, POST, nueva operación comercial ni escritura DB/Cloudinary. Se hicieron
GET públicos y navegación anónima en navegador; los escenarios bloqueados no se cuentan PASS.

| # | Escenario | Estado | Evidencia / límite |
| --- | --- | --- | --- |
| 1 | API health | FAIL | GET https://home-fashion-api.vercel.app/api/health → 500 |
| 2 | Home | FAIL funcional | GET web → 200; interfaz visible, sin categorías/muebles; mensajes de indisponibilidad |
| 3 | Catálogo y fotografía | FAIL funcional | GET /catalogo → 200; “No pudimos cargar el catálogo”; GET API catálogo → 500; fotografía no verificable |
| 4 | Producto/variante | BLOQUEADO | Catálogo no entrega productos; sin enlace de producto para inspección |
| 5 | Login | PASS parcial | GET /iniciar-sesion → 200; formulario visible; autenticación no ejecutada |
| 6 | Dashboard | BLOQUEADO | Sin sesión productiva verificada y API no saludable |
| 7 | Clientes | BLOQUEADO | Sin sesión productiva verificada y API no saludable |
| 8 | Cotizaciones | BLOQUEADO | Sin sesión productiva verificada y API no saludable |
| 9 | Ventas | BLOQUEADO | Sin sesión productiva verificada y API no saludable |
| 10 | Pedidos | BLOQUEADO | Sin sesión productiva verificada y API no saludable |
| 11 | Taller/revisión | BLOQUEADO | Sin sesión productiva verificada y API no saludable |
| 12 | Entregas | BLOQUEADO | Sin sesión productiva verificada y API no saludable |

Consola del navegador: 0 mensajes warn/error capturados en Home, catálogo y login.
Esto no elimina los fallos HTTP de la API ni certifica consola de módulos bloqueados.
Balance: 1 PASS parcial de interfaz, 3 FAIL funcionales, 8 BLOQUEADOS. No es smoke del RC.

## Correcciones y comprobaciones dirigidas

1. `scripts/package-source.py`: exportación por allowlist, sin seguir symlinks/junctions,
   con rechazo de secretos conocidos locales, JWT, claves privadas y credenciales en URLs;
   ejemplos con credenciales no ficticias bloquean el empaquetado. Rechaza sobrescribir
   archivos existentes y verifica cada miembro del tar antes de entregar el resultado.
2. `.gitignore`: permite Markdown, Mermaid, DBML, diagramas exportados y reportes/PNG
   QA enumerados; mantiene fuera JSON arbitrario, trazas HTTP, HAR, sesiones, dumps,
   tokens y credenciales. `qa-2-network-console.json` permanece local/ignorado.
3. Runner/reporter: cada intento tiene ID independiente del catálogo reutilizable.
   Preflight bloqueado escribe status separado; cada ejecución conserva resultados,
   informe y capturas en `runs/<execution-id>`. Fallos y selecciones parciales no
   reemplazan el informe completo anterior; sólo cinco PASS actualizan último éxito.
4. Stock: SELECT de variante activa del catálogo E2E comprueba disponibles >= 3
   (venta directa, mixto, recuperación: 1 cada uno). Dos escenarios usan fabricación.
   El chequeo ocurre dentro de la transacción de fixtures, antes de servicios/journeys;
   insuficiencia hace rollback, sin reset de reservas/ventas/pedidos.

Pruebas ejecutadas: `pnpm test:release` 4/4 PASS (resultados sintéticos, sin servicios),
`pnpm test:e2e:typecheck` PASS, `pnpm test:source-package` 3/3 PASS,
auditoría de selección: ningún archivo fuente Git existente omitido; escaneo de los
documentos versionables sin secretos detectados; `git diff --check` PASS.
La inspección automática del comprimido verifica tipos, rutas, contenido y ausencia de
enlaces. El manifest adjunto enumera cada archivo e incluye SHA-256 del tar.gz final.

Una consulta adicional de stock real E2E quedó BLOQUEADA: “MySQL E2E no está disponible;
no se ejecutaron mutaciones”. No se reinició, reprovisionó, borró ni cambió a otra base.
El stock actual no se afirma. El guard del chequeo permanece obligatorio para la próxima
ejecución. El procedimiento exacto de detener/conservar configuración/provisionar otra
instancia está en `tests/e2e/README.md`; no fue ejecutado durante este cierre.

## Android (inspección menor a cinco minutos)

`adb devices`: lista vacía (adb existente usado por ruta absoluta).
`flutter devices`: Windows, Chrome y Edge; 0 Android.
`emulator -list-avds`: sin AVD existentes (emulator usado por ruta absoluta).
**ANDROID_RUNTIME=PENDIENTE**. No SDK, emulador ni APK nuevos instalados/construidos.

## Política de evidencias y distribución

Usar desde la raíz:

```powershell
pnpm source:package --output <ruta-nueva>/home-fashion-source-2026-10-10-rc.tar.gz
pnpm source:package --verify <ruta-nueva>/home-fashion-source-2026-10-10-rc.tar.gz
```

Se conservan `*.example` revisados, código y evidencias sintéticas permitidas. Quedan
excluidos `.e2e-local`, owner.json, `.env` reales, certs/claves, node_modules, .git,
.next, dist/build, caches, temporales, DB/dumps, HAR/storageState, trazas y sesiones.
Los binarios de evidencias admitidos tienen carpetas explícitas; cualquier nueva captura
requiere revisión visual/sanitización antes de incluirla. Las capturas previas de journeys
constaban revisadas; se inspeccionaron también tracking final y login QA-2 sin secretos
visibles. Un escáner de texto no certifica por sí solo el contenido visual de futuros PNG/PDF.

El archivo anterior `Tesis/home-fashion-source.tar.gz` sigue siendo inseguro y no debe
compartirse. Se conservó sin modificar; compartir exclusivamente el nuevo tar.gz seguro
y su manifest. Los datos E2E locales permanecen en su lugar y no forman parte del paquete.

El listado completo que queda disponible para Git está en `release-documentation-inventory.md`.
No se ejecutó git add, commit, push ni despliegue. Permitir una extensión no sustituye
la revisión de secretos: mantener deny por defecto para exportaciones nuevas y revisar
capturas/reportes antes de staging selectivo.

## Pasos exactos pendientes (sin ejecutarlos aquí)

1. Revisar el inventario y el diff local, hacer staging selectivo de fuentes/evidencias
   sanitizadas y crear el commit RC para obtener un SHA que identifique QA-1/QA-2/journeys.
2. En los proyectos existentes de Vercel, inspeccionar el error de runtime de API 500 y
   comprobar en el panel los endpoints API configurados. Registrar causa y corrección;
   cualquier cambio productivo requiere autorización expresa. No crear proyectos ni alterar Aiven.
3. Cuando se autorice publicar ese SHA, usar los proyectos existentes `home-fashion-api`
   y `home-fashion-web`; comprobar los commits de ambos deployments y los aliases;
   repetir sólo smoke READ-ONLY de hasta 12 escenarios con una sesión autorizada.
4. Conectar un Android real o un AVD ya disponible y completar la validación runtime
   pendiente, sin repetir por rutina el build APK o los journeys web/API.
5. Usar la matriz de trazabilidad, diagramas, instrumentos y registros conservados para
   redactar metodología/resultados/limitaciones y revisión académica. Los capítulos no se
   modifican en este cierre; distinguir validación técnica local de despliegue y de prueba con usuarios.

La publicación queda bloqueada por RC aún sin commit/autorización de deploy y API pública
no saludable. El cierre de preservación técnica está realizado; no se certifica release productivo.
