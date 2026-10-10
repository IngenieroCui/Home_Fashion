# Requisitos consolidados

La especificación técnica detallada y su estado se mantienen en [`docs/traceability.md`](../traceability.md). Este catálogo agrega prioridad académica y criterio de aceptación para la tesis.

## Requisitos funcionales

| ID | Actor | Requisito | Prioridad | Criterio observable |
| --- | --- | --- | --- | --- |
| RF-01 | Cliente | Consultar y filtrar el catálogo público. | Alta | Solo aparecen productos/variantes activos y la disponibilidad calculada es correcta. |
| RF-02 | Cliente | Enviar una solicitud sin cuenta. | Alta | La solicitud es idempotente y el cliente no controla precios ni estados. |
| RF-03 | Personal/Taller | Autenticarse y renovar/cerrar sesión según rol. | Alta | Backend aplica rol/permisos; web no expone tokens y taller solo entra por móvil. |
| RF-04 | ADMIN/EMPLOYEE | Gestionar catálogo e inventario terminado. | Alta | CRUD autorizado, validado y reflejado en catálogo según estado. |
| RF-05 | ADMIN/EMPLOYEE | Gestionar clientes. | Alta | Crear, consultar, editar y desactivar sin perder historial. |
| RF-06 | ADMIN/EMPLOYEE | Crear y negociar cotizaciones. | Alta | Totales en backend, snapshots y transiciones válidas hasta aceptación/rechazo. |
| RF-07 | ADMIN/EMPLOYEE | Crear venta directa o desde cotización. | Alta | Conversión única y valores históricos persistidos. |
| RF-08 | Personal autorizado | Registrar/anular pagos sin borrar historia. | Alta | Movimientos append-only y saldo recalculado dentro de transacción. |
| RF-09 | Personal autorizado | Crear un pedido y clasificar sus elementos. | Alta | Una venta produce un pedido; cada línea aparece una vez y las reservas son coherentes. |
| RF-10 | Personal autorizado | Asignar fabricación a un taller elegible. | Alta | Solo `WORKSHOP` activo y máximo un trabajo por `OrderItem`. |
| RF-11 | WORKSHOP | Consultar trabajos propios y reportar avances. | Alta | No ve clientes/finanzas/trabajos ajenos y respeta transiciones. |
| RF-12 | Personal autorizado | Aprobar o rechazar avances. | Alta | Revisión conserva historial y actualiza trabajo/elemento/pedido coherentemente. |
| RF-13 | Cliente | Consultar seguimiento mediante enlace privado. | Alta | Token válido y proyección sin información sensible ni reportes no aprobados. |
| RF-14 | Personal autorizado | Programar, iniciar, completar o cancelar entrega. | Alta | Responsable válido, receptor/evidencia obligatorios y cierre coherente. |
| RF-15 | Sistema | Derivar el estado del pedido desde sus elementos. | Alta | Reglas centralizadas, transaccionales y cubiertas por pruebas. |

## Requisitos no funcionales

| ID | Atributo | Criterio | Estado de validación |
| --- | --- | --- | --- |
| RNF-01 | Seguridad | Ninguna ruta administrativa opera sin JWT y permiso efectivo. | Automático parcial; HTTP real pendiente. |
| RNF-02 | Privacidad | Tracking excluye identidad, contacto, finanzas, taller e información interna. | Servicio probado; inspección HTTP pendiente. |
| RNF-03 | Integridad | Unicidad y transacciones protegen conversiones, asignaciones y reservas. | Automático; concurrencia MySQL pendiente. |
| RNF-04 | Integridad financiera | Decimales, snapshots y pagos append-only; cálculos en backend. | Automático aprobado. |
| RNF-05 | Sesión | Refresh rotativo, hashes y cookies/secure storage; HTTPS en producción. | Automático; recorrido real pendiente. |
| RNF-06 | Usabilidad | Taller reporta un avance en menos de un minuto. | Medición con usuarios pendiente. |
| RNF-07 | Adaptabilidad | Web usable desde 360 px hasta escritorio. | Navegador pendiente. |
| RNF-08 | Mantenibilidad | Monolito modular, tipos estrictos y documentación actualizada. | Inspección y build aprobados. |
| RNF-09 | Despliegue | API/web compilables y Android release contra HTTPS. | Builds Node aprobados; release real pendiente. |
| RNF-10 | Recuperación | Esquema reproducible y restauración de backup ensayada. | Migraciones existen; ensayo pendiente. |

## Criterios de calidad de la especificación

- Cada requisito debe enlazar actor, objetivo, implementación y evidencia.
- Los criterios se validan con datos sintéticos o anonimizados.
- Toda ampliación de alcance requiere justificar su necesidad para OE1-OE4.
