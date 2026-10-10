# Matriz de trazabilidad del MVP

Esta matriz conecta el problema y los requisitos del trabajo de grado con la implementación y su evidencia de validación. No sustituye los requisitos formales de la propuesta; sirve como base verificable para redactarlos.

Estados usados:

- **Implementado:** existe código y contrato identificable.
- **Automático aprobado:** existe una validación ejecutada con resultado satisfactorio.
- **Manual pendiente:** requiere MySQL, navegador, Android o usuario real.

## Requisitos funcionales

| ID | Actor | Requisito | Implementación principal | Evidencia actual | Validación pendiente |
| --- | --- | --- | --- | --- | --- |
| RF-01 | Cliente | Consultar y filtrar catálogo público | `catalog`, `/api/catalog/*`, `/catalogo` | API probada; web compila | Navegador, responsive y datos MySQL |
| RF-02 | Cliente | Enviar solicitud sin cuenta ni precio controlado por cliente | `public-quote-requests`, `/catalogo/[slug]` | DTO/servicio/controlador/migración probados | Doble envío y UX real |
| RF-03 | Personal/taller | Autenticarse con rol y permisos efectivos | `auth`, handlers `/api/session/*`, Flutter auth | Servicios API probados; web compila; Dart sin hallazgos | Cookies HTTPS, refresh real y Android |
| RF-04 | ADMIN/EMPLOYEE | Gestionar categorías, productos, variantes e inventario terminado | `catalog-admin`, `/panel/catalogo` | Controlador/servicio API probados; web compila | CRUD completo con MySQL |
| RF-05 | ADMIN/EMPLOYEE | Registrar, consultar y desactivar clientes | `quotes` (Customer), `/panel/clientes` | Servicios/controladores probados; web compila | Duplicados y UX con datos reales |
| RF-06 | ADMIN/EMPLOYEE | Crear, negociar y cambiar estado de cotizaciones | `Quote`, `QuoteItem`, `/panel/cotizaciones` | API probada; web compila | Recorrido REQUESTED → ACCEPTED |
| RF-07 | ADMIN/EMPLOYEE | Crear venta directa o desde cotización, conservando snapshots | `sales`, `/panel/ventas` | Servicios/controladores probados | Totales y permisos en MySQL real |
| RF-08 | Personal autorizado | Registrar y anular pagos sin borrar historial | `SalePayment`, detalle de venta | Casos de saldo/anulación probados | Concurrencia y evidencia operativa |
| RF-09 | Personal autorizado | Convertir una venta en un pedido y reservar inventario | `orders`, `/crear-pedido` | Servicio/controlador/estados probados | Competencia por stock en MySQL |
| RF-10 | Personal autorizado | Asignar un elemento fabricable a un taller elegible | `workshop-jobs`, detalle de pedido | Servicio/controlador probados | Selector y unicidad con dos sesiones |
| RF-11 | WORKSHOP | Consultar solo trabajos propios y reportar avance | `/api/workshop/jobs`, app Android | API probada; tests Flutter incluidos; Dart sin hallazgos | `flutter test`, emulador y red lenta |
| RF-12 | Personal autorizado | Aprobar/rechazar avances y actualizar el estado coherentemente | `workshop-progress`, panel de avances | Servicio/DTO probados; web compila | Rechazo/reenvío/aprobación integral |
| RF-13 | Cliente | Consultar seguimiento mediante enlace privado | `order-tracking`, `/seguimiento/[token]` | Controlador/servicio API probados; web compila | Rotación, expiración y privacidad HTTP |
| RF-14 | Personal autorizado | Programar, iniciar, completar o cancelar entrega | `deliveries`, `/panel/entregas` | Servicio/controlador/DTO/migración probados | Reprogramación y cierre integral |
| RF-15 | Sistema | Derivar el estado del pedido desde sus elementos | `order-state.ts` y transacciones consumidoras | Pruebas automáticas de estados | Confirmar cada transición en MySQL |

## Requisitos no funcionales

| ID | Atributo | Criterio propuesto | Mecanismo actual | Estado |
| --- | --- | --- | --- | --- |
| RNF-01 | Seguridad | Ninguna ruta administrativa opera sin JWT y permiso | Guards y permisos NestJS | Implementado; prueba manual pendiente |
| RNF-02 | Privacidad | El seguimiento no expone identidad, contacto, finanzas ni taller | Proyección pública explícita | API probada; inspección HTTP pendiente |
| RNF-03 | Integridad | No duplicar conversión venta→pedido ni asignación por elemento | Restricciones únicas + transacciones | Implementado; concurrencia real pendiente |
| RNF-04 | Integridad financiera | Calcular precios/saldos en backend y conservar movimientos | Decimales, snapshots y append-only | Pruebas automáticas aprobadas |
| RNF-05 | Seguridad de sesión | Rotar refresh y no exponer tokens web a JavaScript | Hash en API + cookies HttpOnly + secure storage | Implementado; recorrido real pendiente |
| RNF-06 | Usabilidad | Taller reporta un avance en menos de un minuto | Flujo móvil corto y acciones por estado | Medición con usuarios pendiente |
| RNF-07 | Adaptabilidad | Sitio público usable desde móvil a escritorio | Diseño responsive de Next/Tailwind | Inspección visual pendiente |
| RNF-08 | Mantenibilidad | Separar dominio por módulos y documentar contratos | Monolito modular + guías por aplicación | Implementado |
| RNF-09 | Despliegue | API/web compilables y Android release contra HTTPS | Builds Node y validación de URL Flutter | API/web aprobados; release real pendiente |
| RNF-10 | Recuperación | Esquema reproducible y datos respaldables | Migraciones/seeders Umzug | Restauración de backup pendiente |

## Reglas de negocio críticas trazadas

| Regla | Lugar de autoridad | Comprobación |
| --- | --- | --- |
| No confiar en precios/totales del navegador | Servicios de quotes/sales | Pruebas de servicios + pasos 4–6 del smoke test |
| `quantityReserved` no supera `quantityOnHand` | Migración, modelo y servicio orders | Pruebas de orders + paso 8 |
| Una venta produce máximo un pedido | Índice único y transacción orders | Pruebas + intento duplicado paso 7 |
| Un elemento tiene máximo un trabajo | Índice único y transacción workshop-jobs | Pruebas + paso 9 |
| Un taller solo ve lo asignado | Consulta por usuario JWT | Pruebas + paso 10 |
| Solo avances aprobados son públicos | Proyección order-tracking | Pruebas + paso 17 |
| Completar entrega exige receptor/evidencia | DTO y servicio deliveries | Pruebas + paso 20 |
| Pagos históricos no se editan ni eliminan | Modelo append-only y operación void | Pruebas + paso 6 |
| El token privado no se guarda en claro | SHA-256 en order-tracking | Pruebas + paso 16 |

## Exclusiones controladas del MVP

No deben aparecer como requisitos implementados:

- pasarela de pago o compra automática;
- materias primas o inventario de talleres;
- pagos a talleres;
- rutas GPS, mapas o geocodificación;
- chat interno;
- carga real de archivos;
- notificaciones push;
- modo offline;
- aplicación iOS;
- contabilidad completa;
- analítica avanzada o pronósticos.

## Evidencia que debe conservarse

Por cada requisito probado manualmente registra:

1. fecha, versión/commit y ambiente;
2. actor y rol, sin contraseña;
3. datos de prueba no sensibles;
4. pasos y resultado esperado;
5. resultado observado y código HTTP cuando aplique;
6. captura o video con datos privados ocultos;
7. filas/estados relevantes sin copiar secretos;
8. defecto relacionado y resultado de la repetición tras corregirlo.

Para la evaluación con usuarios, define previamente tareas y métricas. Ejemplos válidos: tiempo para reportar un avance, porcentaje de tareas completadas sin ayuda, errores por tarea y valoración de claridad. No afirmar una mejora hasta medirla.

## Relación con otros documentos

- Las definiciones del problema y alcance están en [tesis.md](tesis.md).
- El diseño que satisface estos requisitos está en [architecture.md](architecture.md).
- Los contratos técnicos están en [api.md](api.md), [web.md](web.md) y [mobile.md](mobile.md).
- El recorrido de verificación está en [smoke-test-mvp.md](smoke-test-mvp.md).
