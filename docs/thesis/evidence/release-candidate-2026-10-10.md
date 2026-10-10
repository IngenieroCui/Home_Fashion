# Release Candidate — Home Fashion — 2026-10-10

Revisión UTC: 2026-10-10T22:15:42.606196+00:00. Zona de trabajo: America/Bogota.
Estado: RC LOCAL COMMITADO Y VALIDADO; PUBLICACIÓN PENDIENTE DE AUTORIZACIÓN EXPRESA.

## Identidad y alcance

- Rama: master. Remote: https://github.com/IngenieroCui/Home_Fashion.git.
- Commit de código validado: `293dcc0db0f4867b4f2fe122bfbc8872d4756932`.
- Base publicada y origin/master comprobados: `ff3fbb867812617e34752d5e1cd1e0f99c211e2f`.
- La actualización posterior de este informe, checklist, inventarios y JSON de validación es sólo documental.
  El SHA de ese HEAD final se registra en el manifiesto de entrega y en la solicitud de autorización.
  Al publicar se debe comparar ese HEAD completo, y no sólo el commit anterior de código, con ambos deployments.
- Incluye los cambios locales de catálogo y fotografías, UI pública/panel, clientes, cotizaciones,
  ventas/pagos, pedidos, taller/avances, entregas, inventario y resumen operativo; cambios Flutter
  existentes; pruebas, journeys y evidencia académica. No se implementaron funciones nuevas durante este cierre.
- Las eliminaciones previas corresponden al servicio Cloudinary reemplazado por media compartido y
  la pantalla Flutter anterior sustituida por la navegación actual; no se borraron archivos adicionales.

## Validación dirigida de esta revisión

| Comprobación | Resultado |
| --- | --- |
| pnpm build (shared, API, web) | PASS; Next.js compiló y verificó tipos/rutas |
| pnpm lint (API, web) | PASS |
| pnpm test:e2e:typecheck | PASS |
| pnpm test:release | 4/4 PASS; casos sintéticos sin servicios ni journeys reales |
| pnpm test:source-package | 3/3 PASS |
| Auditoría de contenido e índice Git | PASS; allowlist, comparación con secretos locales y patrones de credenciales |
| git diff --cached --check | PASS; respetando finales de línea Windows |

No se repitieron QA-1 (212/212 PASS), QA-2 (153 ejecutados/PASS, 1 Android pendiente),
ni los cinco journeys (5/5 PASS, ejecución 20261010204640-afd3702f,
2026-10-10T20:51:33.466Z). Sus reportes y capturas se conservaron byte a byte;
la verificación de hashes queda en release-validation-2026-10-10.json.

## Seguridad de distribución

Se revisaron todos los archivos candidatos y los blobs staged. Los ejemplos contienen placeholders.
Se mantienen excluidos .env reales, .e2e-local/.e2e-results, owner.json, certificados/claves,
credenciales, tokens, cookies, sesiones/storageState, trazas HTTP/HAR, bases/dumps, dependencias,
builds y caches. qa-2-network-console.json permanece local e ignorado.
Se revisaron visualmente las 36 capturas QA/journeys mediante hojas de contacto; sin credenciales visibles.
El escaneo no sustituye revisión de futuras capturas. Los reportes y diagramas académicos seguros se incluyen.

Se corrigieron dos falsos positivos exactos de la política de nombres del empaquetador:
apps/web/src/app/tokens.css y la captura permissions-session-06-permiso-denegado.png.
Las pruebas comprueban que otros nombres de sesión/secretos permanecen excluidos.
.vercelignore también excluye explícitamente runtime E2E, bases y sesiones locales.
No se ejecutó git add -f ni se modificó historia. El archivo antiguo
Tesis/home-fashion-source.tar.gz permanece intacto y no es el paquete seguro de este RC.

## Aiven y API (sólo lectura)

Hora de consulta: 2026-10-10T22:11:05.223Z.
Aiven ONLINE: conexión a host Aiven local configurado, certificado CA y TLS verificados,
SELECT 1 satisfactorio, 13 migraciones ejecutadas / 13 locales / 0 pendientes.
La migración 20260928110000-add-commerce-image-snapshots ya está registrada;
las columnas image_url_snapshot existen en order_items, quote_items y sale_items.
No se ejecutó Umzug status (su storage puede sincronizar tablas), migrate, seed,
UPDATE, INSERT o DDL. No se cambió Aiven.

GET https://home-fashion-api.vercel.app/api/health → 200, status=ok/service correcto.
GET https://home-fashion-api.vercel.app/api/catalog/products → 200, data/pagination válidos.
El HTTP 500 anterior no volvió a reproducirse; no se investigó nuevamente.

## Vercel actual y destino autorizado pendiente

| Proyecto existente | ID | Raíz / framework | Deployment actual | Commit actual |
| --- | --- | --- | --- | --- |
| home-fashion-api | prj_tdbYXXR52PidgJ0AIiAwwcfEtL5b | apps/api / NestJS | dpl_EQKFZkndvNQHZKXZzLvWAVx26xu5 | ff3fbb867812617e34752d5e1cd1e0f99c211e2f |
| home-fashion-web | prj_HKG4VCXuG26AKbQkwtGHClXtNRg0 | apps/web / Next.js | dpl_J2WfMUcXRXnCQyRTmzDZoixqhQee | ff3fbb867812617e34752d5e1cd1e0f99c211e2f |

Ambos READY, producción, Node 22.x, rama productiva master; equipo ingenierocuis-projects
(team_WdljsMja3hCQebqtqFBdigPe). Aliases:
https://home-fashion-api.vercel.app y https://home-fashion-web-five.vercel.app.
El conector devolvió 403 del scope; se verificó por la CLI instalada/caché usando sus propias
credenciales, sin extraerlas. Se guardaron sólo metadatos filtrados.
Los nombres de variables productivas incluyen DB/TLS/JWT/Cloudinary en API y
API_SERVER_URL/NEXT_PUBLIC_API_URL en web. No se imprimieron, descargaron ni cambiaron valores.
CLOUDINARY_ROOT_FOLDER nuevo tiene default home-fashion; no exige una nueva variable.

Tras autorización: push normal de master al origin verificado para activar la integración Git
de ambos proyectos existentes; sin force-push, proyectos nuevos, migraciones ni cambios de entorno.
Verificar los IDs y meta.githubCommitSha de los dos deployments y que los aliases los señalen.
No publicar desde un directorio local con cambios adicionales. Si cambia código o HEAD,
revisar diferencia y pedir autorización del nuevo SHA antes de producción.

## Smoke productivo del RC

PENDIENTE: el RC no se ha publicado. Los dos GET anteriores sólo acreditan la versión actual.
Plan máximo de 12 comprobaciones, con lecturas y login ADMIN autorizado:

1. API health y catálogo (una comprobación agrupada).
2. Home y sus fotografías.
3. Ficha de producto, variantes y fotografías.
4. Cotización: abrir formulario y validar disponibilidad, sin enviar una nueva solicitud.
5. Login ADMIN.
6. Dashboard.
7. Clientes.
8. Cotizaciones.
9. Ventas.
10. Pedidos.
11. Taller.
12. Entregas.

Registrar por comprobación estado, fecha, deployment y errores inesperados; observar consola/red.
No crear ventas, pedidos, pagos, entregas ni un proceso comercial nuevo. No persistir cookies,
tokens o datos privados en las evidencias. Si falta sesión ADMIN autorizada, solicitar acceso
seguro y dejar esos resultados pendientes, sin inventar PASS.

## Pendientes y Code Freeze

1. Autorización expresa del usuario para push/publicación del HEAD final comunicado.
2. Publicar y confirmar ambos deployments contra ese SHA; completar smoke anterior.
3. Android runtime PENDIENTE hasta ejecutar en Android real/AVD; WORKSHOP por API no lo demuestra.

HOME_FASHION_CODE_FREEZE = PENDING_PUBLICATION_AND_SMOKE

Declarar READY sólo al completar publicación y smoke; Android debe seguir indicado como pendiente
si todavía no se ejecuta. Los capítulos académicos no se editaron durante este cierre.
