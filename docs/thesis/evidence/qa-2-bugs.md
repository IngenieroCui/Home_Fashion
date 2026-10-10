# Home Fashion QA-2 — Bug Log

Fecha: 2026-09-30. 10 corregidos; 0 bugs pendientes. El runtime Android pendiente es una limitación de entorno, no un bug demostrado.

## QA2-001 — LOW: Catálogo mobile

Problema: ID mobile-sort duplicado entre toolbar y diálogo.

Reproducción/causa: Ambos controles reutilizaban el prefijo mobile; la asociación label/control era ambigua.

Corrección: Prefijo dialog independiente para los controles del modal.

Retest PASS: FILTER-MOBILE-RETEST: IDs únicos, filtros combinados y sort preservados.

Inicial: FILTER-MOBILE-APPLY. Retest: FILTER-MOBILE-RETEST.

Archivos: `apps/web/src/components/catalog-filters.tsx`.

Estado: CORREGIDO / RETEST PASS.

## QA2-002 — MEDIUM: Cotizaciones

Problema: Selector limitado a 12 productos y variante numérica no preservada.

Reproducción/causa: Sólo se cargaba la primera página; comparaciones strict con identificadores MySQL numéricos no coincidían con los valores string del select.

Corrección: Búsqueda remota, consulta de 50 resultados, búsqueda inicial por snapshot y normalización del producto/variante seleccionados.

Retest PASS: QUOTE-MULTILINE-RETEST y QUOTE-EDIT-CONTRACT-RETEST: Sofá Verona fuera de la primera página seleccionable; variante 1 preservada al editar.

Inicial: QUOTE-PRODUCT-SEARCH. Retest: QUOTE-MULTILINE-RETEST.

Archivos: `apps/web/src/components/quotes/quote-item-form.tsx`.

Estado: CORREGIDO / RETEST PASS.

## QA2-003 — MEDIUM: Venta directa

Problema: IDs numéricos de clientes no normalizados en selector.

Reproducción/causa: Comparación entre select.value string y customer.id numérico. Hallazgo de inspección, no FAIL de navegador independiente.

Corrección: Usar normalizeSelectRecord existente en carga del cliente inicial y resultados de búsqueda.

Retest PASS: SALE-CUSTOMER-SELECT: cliente QA 15 seleccionado y utilizado en venta 48; regresión automatizada de ID numérico.

Inicial: Inspección de código; sin FAIL navegador independiente. Retest: SALE-CUSTOMER-SELECT.

Archivos: `apps/web/src/components/sale-form.tsx`, `apps/web/test/qa2-regressions.test.cjs`.

Estado: CORREGIDO / RETEST PASS.

## QA2-004 — MEDIUM: Conversión cotización

Problema: Cotización vendida sigue ofreciendo Convertir en venta.

Reproducción/causa: La UI consultaba el estado ACCEPTED pero no la venta vinculada.

Corrección: Filtro autorizado quoteId en listado de ventas y consulta de existencia; mostrar venta vinculada y bloquear conversión mientras se comprueba.

Retest PASS: QUOTE-ALREADY-CONVERTED-RETEST: enlace a venta 47 y cero botones de conversión; DOUBLE-convert un POST interceptado.

Inicial: QUOTE-ALREADY-CONVERTED. Retest: QUOTE-ALREADY-CONVERTED-RETEST.

Archivos: `apps/web/src/components/quote-sale-conversion.tsx`, `apps/web/src/components/quotes/quote-detail.tsx`, `apps/api/src/modules/sales/dto/sales.dto.ts`, `apps/api/src/modules/sales/sales.service.ts`, `apps/api/src/modules/sales/sales.service.spec.ts`.

Estado: CORREGIDO / RETEST PASS.

## QA2-005 — MEDIUM: Sesión/navegación

Problema: Access expirado pierde la ruta solicitada tras refresh.

Reproducción/causa: Redirect de recuperación fijaba next=/panel.

Corrección: Middleware conserva pathname/query del panel; helper valida destino con safePanelPath y lo entrega a recuperación de sesión.

Retest PASS: ACCESS-REFRESH-NAVIGATION final: mantiene /panel/clientes con refresh válido; refresh inválido/login sin loop.

Inicial: ACCESS-REFRESH-NAVIGATION. Retest: ACCESS-REFRESH-NAVIGATION.

Archivos: `apps/web/src/middleware.ts`, `apps/web/src/lib/auth/server.ts`, `apps/web/src/lib/auth/customer-quote-access.ts`, `apps/web/src/lib/auth/catalog-access.ts`, `apps/web/src/app/panel/layout.tsx`.

Estado: CORREGIDO / RETEST PASS.

## QA2-006 — MEDIUM: GET detalles

Problema: Error de trabajo/avance no ofrece reintento.

Reproducción/causa: El componente devolvía sólo un párrafo de error y exigía F5 para volver a ejecutar GET.

Corrección: ListError con callback refresh en pedido, trabajo y avance.

Retest PASS: GET-OFFLINE-RETEST-pedido/trabajo/avance: recuperación sin F5; GET-500-RETRY sin stack trace.

Inicial: GET-OFFLINE-trabajo; GET-OFFLINE-avance. Retest: GET-OFFLINE-RETEST-trabajo; GET-OFFLINE-RETEST-avance.

Archivos: `apps/web/src/components/order-detail.tsx`, `apps/web/src/components/workshop-job-detail.tsx`, `apps/web/src/components/workshop-progress-detail.tsx`.

Estado: CORREGIDO / RETEST PASS.

## QA2-007 — MEDIUM: API edición línea

Problema: PATCH de línea válido responde 400 exigiendo id inexistente.

Reproducción/causa: QuoteItemParamDto heredaba IdParamDto, pero la ruta tiene quoteId/itemId, no id.

Corrección: Eliminar la herencia y validar explícitamente los parámetros reales; dos tests de validación.

Retest PASS: QUOTE-EDIT-CONTRACT-RETEST: PATCH 200, precio negociado y motivo persistentes tras F5.

Inicial: QUOTE-EDIT-RETEST. Retest: QUOTE-EDIT-CONTRACT-RETEST.

Archivos: `apps/api/src/modules/quotes/dto/quotes.dto.ts`, `apps/api/src/modules/quotes/dto/quotes.dto.spec.ts`.

Estado: CORREGIDO / RETEST PASS.

## QA2-008 — BLOCKER: Programar entrega

Problema: BFF elimina orderId numérico y creación responde 400.

Reproducción/causa: optionalText sólo admitía strings; order.id devuelto por MySQL era number y desaparecía del payload.

Corrección: Normalización de identificadores numéricos positivos a string en orderId y assignedUserId.

Retest PASS: DELIVERY-SCHEDULE-RETEST 201 creó entrega 6; completada una sola vez con dos fotos, receptor y tracking persistentes.

Inicial: DELIVERY-SCHEDULE. Retest: DELIVERY-SCHEDULE-RETEST.

Archivos: `apps/web/src/app/api/admin/deliveries/_server.ts`.

Estado: CORREGIDO / RETEST PASS.

## QA2-009 — MEDIUM: Paginación catálogo

Problema: Siguiente/Enter deja catálogo en página 1.

Reproducción/causa: Navegación client-side recibió RSC 200 pero no aplicó URL/contenido. GET documental directo a page=2 sí renderizaba página 2. Causa más profunda de Next no establecida.

Corrección: Enlaces GET nativos, coherentes con filtros server-rendered; sin cambio de librería o arquitectura.

Retest PASS: CATALOG-PAGINATION-RETEST y CATALOG-PAGINATION finales: página 2, back/forward y query conservados.

Inicial: CATALOG-PAGINATION. Retest: CATALOG-PAGINATION-RETEST.

Archivos: `apps/web/src/components/pagination.tsx`, `apps/web/test/qa2-regressions.test.cjs`.

Estado: CORREGIDO / RETEST PASS.

## QA2-010 — LOW: Dashboard responsive

Problema: Saldo financiero se parte en medio de los grupos de miles.

Reproducción/causa: Importe largo comparte la misma columna estrecha y escala de texto que contadores pequeños; altura medida de dos líneas en 390 y captura 4K evidencia el corte.

Corrección: Valores string monetarios usan una tarjeta de ancho completo en su grid y tamaño tipográfico estable de 1.35rem.

Retest PASS: DASHBOARD-MONEY: importe en una sola línea y sin overflow en 390/1440/3840; capturas finales revisadas.

Inicial: DASHBOARD-MONEY. Retest: DASHBOARD-MONEY.

Archivos: `apps/web/src/components/dashboard-metric-card.tsx`, `apps/web/src/app/operations.css`.

Estado: CORREGIDO / RETEST PASS.
