# Registro de evidencia

## Convención

Cada evidencia usa `EV-HF-XXXX`. Un registro `verificado` requiere observación directa y ubicación recuperable. Los registros `pendiente` no se presentan como resultados.

## EV-HF-0001

- Fecha: 2026-09-06.
- Linear issue: HF-VAL-01 / TGH-21.
- Objetivo: OE3.
- Tipo: test.
- Fuente: repositorio local actual, commit base `72ebd78`; working tree con modificación previa solo en `.gitignore`.
- Resultado: lint API/web aprobado; API 32 suites y 270/270 pruebas; web 24/24 pruebas; build shared/API/web aprobado; `flutter analyze` sin hallazgos; Flutter 47/47 pruebas.
- Ubicación repo: suites bajo `apps/api`, `apps/web/test` y `apps/mobile/test`.
- Ubicación Drive: pendiente de cargar log/captura estable en `06_Pruebas_y_Resultados/Automaticas`.
- Estado: verificado.
- Notas de privacidad: no contiene credenciales ni datos de clientes.

## EV-HF-0002

- Fecha: 2026-09-06.
- Linear issue: HF-DATA-01 / TGH-24.
- Objetivo: OE2.
- Tipo: diagrama/documentación.
- Fuente: 11 migraciones en `apps/api/src/database/migrations`.
- Resultado: 22 tablas confirmadas; no se encontraron diferencias de tablas frente al snapshot preliminar.
- Ubicación repo: `docs/data/database-inventory.md`, `docs/data/data-dictionary.md`, `docs/data/database.dbml`.
- Ubicación Drive: carpeta `04_Modelos_y_Diagramas/02_Modelo_Datos`; archivos pendientes de publicación.
- Estado: verificado.
- Notas de privacidad: solo metadatos del esquema; no contiene filas.

## EV-HF-0003

- Fecha: pendiente.
- Linear issue: HF-VAL-04 / TGH-25.
- Objetivo: OE3.
- Tipo: integración.
- Fuente: MySQL 8 descartable.
- Resultado: pendiente de ejecutar migraciones y seeders en limpio.
- Ubicación repo: `docs/smoke-test-mvp.md`.
- Ubicación Drive: `06_Pruebas_y_Resultados/Integracion`.
- Estado: pendiente.
- Notas de privacidad: usar datos sintéticos y ocultar secretos.

## EV-HF-0004

- Fecha: pendiente.
- Linear issue: HF-VAL-05 / TGH-29.
- Objetivo: OE3.
- Tipo: test/captura.
- Fuente: recorrido E2E completo.
- Resultado: pendiente.
- Ubicación repo: `docs/smoke-test-mvp.md`.
- Ubicación Drive: `05_Evidencias/E2E`.
- Estado: pendiente.
- Notas de privacidad: anonimizar contactos, direcciones y tokens.

## EV-HF-0005

- Fecha: pendiente.
- Linear issue: HF-EV-02 / TGH-35 y HF-EV-04 a HF-EV-08.
- Objetivo: OE1/OE4.
- Tipo: medición/acta.
- Fuente: línea base y sesiones con usuarios.
- Resultado: pendiente; no existen cifras de mejora ni SUS verificadas.
- Ubicación repo: por definir después de anonimización.
- Ubicación Drive: `06_Pruebas_y_Resultados/Usabilidad_SUS` y `Datos_Analisis`.
- Estado: pendiente.
- Notas de privacidad: consentimiento, seudonimización y acceso restringido según necesidad.

## EV-HF-0006

- Fecha: 2026-09-22.
- Linear issue: HF-VAL-01 / TGH-21 (revalidación incremental).
- Objetivo: OE3.
- Tipo: pruebas automáticas y corrección de regresión web.
- Fuente: repositorio local actual, sin incluir el cambio previo del usuario en `.gitignore`.
- Resultado: API 32 suites y 270/270 pruebas; web 26/26 pruebas tras añadir dos regresiones de catálogo; lint API/web aprobado; build shared/API/web aprobado. Flutter no se volvió a ejecutar en esta fecha.
- Ubicación repo: `apps/web/src/lib/admin-catalog-utils.ts` y `apps/web/test/regressions.test.cjs`.
- Estado: verificado para pruebas automáticas locales; no equivale a validación E2E ni con usuarios.
- Notas de privacidad: pruebas con datos sintéticos; sin credenciales ni datos de clientes.

## EV-HF-0007

- Fecha: 2026-09-27.
- Objetivo: OE1/OE3.
- Tipo: catálogo publicado, prueba automática y captura.
- Fuente: commits `b69c9cd`, `7106ea4` y API/web en Vercel conectadas a Aiven.
- Resultado: nueve productos y nueve imágenes WebP visibles en el catálogo; tres categorías representadas en portada; disponibilidad pública calculada sin exponer cantidades internas. API: 35 suites y 279 pruebas; web: 26 pruebas; lint y build aprobados.
- Ubicación: `CATALOG_DEMO_IMAGES.md` y `outputs/evidencias_tesis/verificaciones/despliegue-2026-09-27/{portada,catalogo,sofa-verona,cotizacion-resumen}.png`.
- Estado: verificado para el catálogo y las capturas; las imágenes son referencias de demostración.
- Notas de privacidad: las capturas no contienen nombres, teléfonos ni cuentas reales.

## EV-HF-0008

- Fecha: 2026-09-27.
- Objetivo: OE3.
- Tipo: integración HTTP y base de datos.
- Fuente: commit publicado `a430764`, API `https://home-fashion-api.vercel.app/api` y MySQL Aiven.
- Resultado: migraciones 12/12 y seeders 3/3; la solicitud pública `HF-SOL-2026-00002` devolvió `201`, el reenvío idéntico `201` con el mismo código y un contenido distinto con la misma clave `409`. La cotización pasó a `ACCEPTED`, la venta `HF-VTA-2026-00002` quedó `CONFIRMED`, el pedido `HF-PED-2026-00002` quedó `OPEN` con un elemento `MADE_TO_ORDER`, y la conversión duplicada devolvió `409`. Los listados internos encontraron la venta y el pedido.
- Estado: verificado para solicitud, cotización, venta y creación de pedido con datos sintéticos. No equivale al recorrido E2E completo de taller, pago y entrega.
- Notas de privacidad: contacto ficticio `example.test`; cuentas administrativas temporales desactivadas y sesiones revocadas. No se almacenan contraseñas ni tokens en este registro.

## EV-HF-0009

- Fecha: 2026-09-28.
- Objetivo: OE3.
- Tipo: integración HTTP, MySQL real, pruebas automáticas y verificación de servicio externo.
- Fuente: API local conectada a Aiven, script de evidencia `outputs/evidencias_tesis/verificaciones/despliegue-2026-09-28/e2e-operations.cjs`, Cloudinary y código del repositorio.
- Resultado: depósito registrado, anulado y reemplazado por otro sintético; saldo recalculado. Trabajo de taller asignado; STARTED, PROGRESS 60 %, READY_FOR_REVIEW, rechazo, reenvío y aprobación. Pedido `HF-PED-2026-00002`: OPEN → IN_PROGRESS → READY → COMPLETED. Token privado rotado/revocado (anterior 404); entrega `HF-ENT-2026-00001`: SCHEDULED → OUT_FOR_DELIVERY → DELIVERED. WORKSHOP obtuvo 403 en ventas; refresh anterior obtuvo 401 tras rotación. Cloudinary cargó y eliminó imagen temporal. API 36 suites/281 pruebas, web 26, Flutter 47, análisis Flutter sin hallazgos, lint y build aprobados.
- Estado: verificado para estos pasos por API y MySQL real; UI administrativa y Android real pendientes.
- Notas de privacidad: todas las personas, contactos, direcciones y evidencias del recorrido fueron ficticias; no se imprimieron tokens ni contraseñas. Las cuentas temporales terminaron inactivas con sesiones revocadas. No hubo pago ni entrega física reales.

## EV-HF-0010

- Fecha: 2026-09-28.
- Objetivo: OE3.
- Tipo: despliegue y regresión en producción.
- Fuente: commit `ff3fbb867812617e34752d5e1cd1e0f99c211e2f`, estados GitHub/Vercel y API HTTPS publicada.
- Resultado: Vercel informó `success` para API y web; `/api/health` y `/catalogo` devolvieron 200. La API publicada aceptó un movimiento decimal ficticio `0.01` y lo anuló; cero cuentas temporales activas y cero sesiones abiertas después de la prueba.
- Ubicación: `outputs/evidencias_tesis/verificaciones/despliegue-2026-09-28/README.md`.
- Estado: verificado para despliegue y validador decimal; no equivale a compras o pagos reales.

Para el corte del 12 de noviembre, consulta el [protocolo OE4](evidence/oe4-session-protocol.md) y el [registro de cierre](../release/backlog-2026-11-12.md). Las cifras previas corresponden a los cortes históricos indicados.
