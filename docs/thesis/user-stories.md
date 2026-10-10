# Historias de usuario prioritarias

| ID | Historia | Criterios principales | RF |
| --- | --- | --- | --- |
| HU-01 | Como cliente, quiero explorar el catálogo para identificar muebles disponibles o personalizables. | Filtros comprensibles; activos únicamente; precio/disponibilidad sin datos incompletos tratados como cero. | RF-01 |
| HU-02 | Como cliente, quiero enviar una solicitud sin crear cuenta para que Home Fashion me contacte. | Datos mínimos; idempotencia; no se aceptan precio/estado desde navegador. | RF-02 |
| HU-03 | Como personal de Home Fashion, quiero convertir una solicitud en cotización para conservar acuerdos y valores. | Cliente/ítems/snapshots; totales backend; transición válida. | RF-05, RF-06 |
| HU-04 | Como personal autorizado, quiero registrar una venta y sus pagos para conocer pagado y saldo sin borrar movimientos. | Conversión única; pagos append-only; anulación con motivo. | RF-07, RF-08 |
| HU-05 | Como personal autorizado, quiero crear un pedido y clasificar cada línea para decidir inventario o fabricación. | Todas las líneas una vez; reserva transaccional; clasificación válida. | RF-09, RF-15 |
| HU-06 | Como personal autorizado, quiero asignar una línea fabricable a un taller para coordinar su producción. | Taller activo; asignación única; instrucciones y fecha opcionales. | RF-10 |
| HU-07 | Como taller, quiero ver solo mis trabajos para conocer especificaciones sin acceder a información comercial sensible. | Aislamiento por JWT; sin clientes, precios, costos ni pagos. | RF-03, RF-11 |
| HU-08 | Como taller, quiero reportar inicio, progreso y listo para revisión para dejar un historial estructurado. | Transiciones válidas; mensaje; 1–99 para progreso; listo fuerza 100. | RF-11 |
| HU-09 | Como personal autorizado, quiero aprobar o rechazar avances para controlar qué información se publica. | Solo reporte pendiente; comentario de rechazo; estados coherentes. | RF-12, RF-15 |
| HU-10 | Como cliente, quiero consultar un enlace privado para conocer solo avances aprobados de mi pedido. | Token rotatable/revocable; respuesta genérica si no está disponible; minimización. | RF-13 |
| HU-11 | Como personal autorizado, quiero programar y completar la entrega para cerrar el recorrido con receptor y evidencia. | Responsable coherente; no iniciar con líneas en producción; 1–5 URLs al completar. | RF-14, RF-15 |
| HU-12 | Como investigador, quiero medir tareas antes y después para evaluar la contribución sin inventar mejoras. | Protocolo estable; tiempo/interacciones/finalización/errores; consentimiento y anonimización. | RNF-06, OE1, OE4 |

Estas historias no sustituyen los casos de prueba. Los escenarios detallados se registran en el plan de validación y en el smoke test.
