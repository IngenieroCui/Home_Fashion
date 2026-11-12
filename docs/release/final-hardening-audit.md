# Auditoría inicial de Home Fashion

Base verificada `4b7ec941dc73952885b1b69b6e5fe9f0c1466e8b`, rama `backlog/2026-11-12`. La copia de trabajo partió de un árbol limpio. Las pruebas publicadas en el informe del backlog son evidencia histórica.

| Prioridad | Hallazgo | Criterio de aceptación |
| --- | --- | --- |
| P0 | Taller, entrega y abonos admiten evidencias externas por JSON. El control previo solo rechaza algunas referencias autenticadas. | La carga multipart es la única vía para adjuntar fotos. Taller y abonos sin archivos siguen operativos. Las referencias privadas se generan en el servidor y se validan contra la carpeta del recurso. El tracking omite las fotos. |
| P0 | La carga y firma privadas tienen cobertura local parcial. El backlog registra un 502 externo. | Verificar contrato, caducidad, formato y pertenencia localmente. Reservar acceso anónimo real, caducidad CDN, clientes y destrucción para una cuenta Cloudinary aislada autorizada. |
| P1 | La cola solo consulta `product_images`. Las líneas históricas conservan URLs y la selección de una foto para un nuevo documento puede coincidir con su retiro. | Retener las fotos que sigan referenciadas por cotización, venta o pedido. Serializar selección y retiro. Comprobar éxito, repetición y recuperación tras un fallo del proveedor. |
| P1 | Cancelación bloquea pedido antes de líneas y trabajos. Taller bloquea trabajo o línea antes de pedido. | Unificar el orden de adquisición y comprobar los invariantes de reservas, eventos, entrega y fabricación con MySQL aislado. |
| P1 | El flujo de alta y restablecimiento necesita un canal de entrega y cambio de credenciales temporales. | Revisar exposición, revocación y procedimiento operativo para entrega verificada y cambio. |
| P1 | El corte anterior dejó pendientes Vercel, Android real, Wompi externo y OE4. | Registrar resultados independientes y limitaciones. Usar solo datos sintéticos y entornos autorizados. |

## Revisión del backlog

| Tareas | Evidencia inicial en el árbol de referencia |
| --- | --- |
| HF-01 y HF-02 | Guardias de permisos y control por campo. Contadores MySQL y validación de IP de origen. Pendiente la prueba del proxy desplegado. |
| HF-03 | Tipo de entrega autenticado, firma temporal e interceptor. Quedaron entradas JSON externas y activos históricos públicos. |
| HF-04 y HF-05 | Cancelación y liberación de reservas transaccionales. Kardex de altas, ajustes y entregas. Pendiente conciliación de existencias anteriores. |
| HF-06 y HF-07 | Renovación Flutter con distinción de fallos transitorios. Administración de usuarios y versión de autenticación. |
| HF-08 | Cola durable de borrado con reintentos. Faltan las referencias históricas en su decisión de borrado. |
| HF-09 y HF-10 | Suites de negocio, análisis móvil y procedimientos de QA. Aviso en formulario público y página de privacidad. |
| HF-11 y HF-12 | Protocolo OE4, matriz, documentación y registro de evidencia. La evaluación requiere participantes reales. |
| HF-13 | Health check, logs con ID de solicitud y procedimiento de respaldo y restauración. |
