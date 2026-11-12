# Operación y protección de datos

## Servicios aislados

Para QA, usar MySQL descartable, un entorno Cloudinary dedicado, cuentas sintéticas y secretos exclusivos. Antes de ejecutar migraciones, comprobar el destino, UUID, permisos, respaldo, inventario de migraciones y ventana autorizada. Usar el guard existente de `tests/e2e/fixtures/database.ts`. Wompi permanece en Sandbox y requiere configuración explícita. El alta de una rama de código no autoriza despliegues, migraciones ni pruebas en entornos reales.

En Vercel, configurar `HF_PROXY_SECRET` con el mismo valor aleatorio de al menos 32 caracteres en web y API. La aplicación verifica la firma de IP del proxy y usa la cabecera de origen de Vercel para conexiones directas. En local usa la dirección de socket. Si el proxy no puede firmar la identidad o la API no puede verificarla, el recorrido devuelve indisponibilidad sin cargar un contador compartido. Comprobar en un preview aislado que dos clientes distintos conservan cuotas distintas, que una cabecera arbitraria no cambia la identidad y que al agotar la cuota se devuelve 429 con `Retry-After`. Referencia: [cabeceras de Vercel](https://vercel.com/docs/headers/request-headers).

## Evidencias privadas

Las nuevas cargas de taller, pago y entrega usan el tipo authenticated. Los enlaces de lectura de cinco minutos se generan tras autorizar la respuesta del recurso y son transferibles hasta su caducidad. Tracking omite estas evidencias. Las cargas del catálogo conservan entrega pública. Los enlaces antiguos quedan ocultos en la aplicación. El operador debe inventariar los activos desde registros autorizados, registrar entidad, referencia original, checksum y destino en una bitácora restringida, y clasificar evidencia privada frente a catálogo público. Copia cada evidencia privada a entrega autenticada y verifica acceso con el rol asignado. Actualiza sus referencias por recurso con respaldo y conciliación de conteos. Solicita aprobación del responsable antes de retirar o invalidar los originales públicos. Conserva el inventario de cambios y revisa el CDN después de invalidar. Comprobar acceso anónimo, accesos por rol, expiración y CDN en una cuenta de pruebas antes de habilitar datos reales. [Entrega autenticada en Cloudinary](https://cloudinary.com/documentation/upload_parameters).

Para drenar borrados, ejecutar periódicamente `POST /api/admin/media-cleanup/drain` con una cuenta ADMIN autorizada. Revisar fallos de encolado y tareas agotadas (ocho intentos) mediante alertas de logs y consulta operativa de la tabla. Reconcilia periódicamente activos por carpeta y referencias locales. No borres por coincidencia de nombre. La operación de catálogo guarda la tarea y la URL original en la misma transacción que elimina su referencia. La cola conserva activos presentes en catálogo, cotización, venta o pedido. Una tarea retenida se marca procesada. Si una política autorizada retira todos sus documentos, vuelve a comprobar referencias antes de encolarla manualmente.

## Privacidad de contacto

Validar con el responsable del tratamiento el texto, el canal, la identidad y el domicilio que deben publicarse, el plazo por finalidad y si se exige registrar la autorización. La web ofrece un aviso inicial; el responsable debe aprobar su versión y definir cómo acreditarla antes de la exposición a usuarios reales. La Ley 1581 de 2012 y los criterios de la SIC son referencias de revisión. [Aviso y política de tratamiento](https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/politicas-de-tratamiento-de-datos-personales).

Propuesta operativa. El responsable de atención registra fecha, código de solicitud y tipo de derecho. Verifica identidad por un canal separado, limita acceso a roles de atención y administración, identifica referencias en cotizaciones, ventas, pedidos, entregas, medios y respaldos, y registra la decisión. Elimina o seudonimiza información prescindible con autorización y conserva documentos sujetos a obligaciones vigentes. Aplica el mismo tratamiento cuando se restituya una copia. Evita incluir PII en la bitácora o logs y revisa el borrado con un segundo operador.

## Disponibilidad y restauración

Operaciones debe asignar responsable titular y suplente, habilitar respaldo automático y confirmar los objetivos con el negocio. Como objetivo inicial para pruebas, usar RPO de 24 horas y RTO de cuatro horas. Alertas iniciales a calibrar: cinco minutos sin disponibilidad de `/api/health`, errores 5xx superiores a 2 % durante diez minutos, latencia p95 sobre dos segundos y fallos recurrentes de colas o base. Correlacionar por `X-Request-Id`, registrar tiempos en UTC y consultar duración, ruta y estado en los logs HTTP estructurados. No almacenar cuerpos, cabeceras de autorización ni enlaces firmados en la incidencia.

Para un ejercicio, restaurar una copia cifrada en un destino separado y comprobar identidad del servidor, migraciones, integridad de tablas, acceso de solo lectura y recorrido sintético. Registrar horas de inicio/fin, punto recuperado, conteos, diferencias y responsable. Retirar el destino temporal según autorización y conservar evidencia redactada. Ante un incidente, delimitar alcance, pausar escrituras si procede, preservar evidencia, recuperar en un destino alterno y verificar antes de reabrir.

## Conciliación del kardex

1. Exporta una línea base por variante con `quantity_on_hand`, `quantity_reserved` y las líneas `IN_STOCK` que mantienen una reserva. Conserva la fecha de corte y el responsable.
2. Compara el reservado contra las líneas activas y concilia el físico con el primer movimiento documentado. Para existencias anteriores al kardex, conserva el saldo de apertura con su fuente. Si falta evidencia, marca el período como histórico sin movimientos verificables.
3. Registra diferencias confirmadas con el ajuste existente y su motivo. Conserva el identificador del ajuste y su respaldo. Verifica luego existencias, reservas y la cadena `previous_quantity` → `next_quantity`.

## Alta, restablecimiento y revocación

El administrador verifica la identidad del titular antes de cambiar la cuenta. Genera una contraseña única con un gestor y entrega el valor por un canal corporativo cifrado con enlace de un solo uso o en persona. Confirma la recepción mediante un canal independiente. Registra el evento y la fecha sin copiar la contraseña, el enlace de entrega ni los tokens. Ante sospecha de exposición, inactiva o restablece la cuenta y comprueba que las sesiones antiguas reciban 401. La aplicación no ofrece autoservicio de cambio de contraseña ni caducidad automática del secreto inicial. Un cambio posterior requiere al administrador.

## Aplicación y reversión del candidato

El despliegue por Git está deshabilitado para `fix/home-fashion-final-hardening` en ambos proyectos Vercel. Para una verificación autorizada, configura un entorno aislado con credenciales y carpetas de medios propias. Usa el mismo secreto de proxy en web y API. La web llama a su proxy del mismo origen y NestJS no emite una política CORS permisiva. Toma un respaldo y aplica las migraciones aditivas de `source_url` e idempotencia. Las funciones de Vercel limitan el cuerpo total a 4,5 MB. Verifica fotografías reales de cámara y galería en el preview y resuelve la diferencia frente al límite por archivo de NestJS antes de habilitar el flujo. [Límites de Vercel Functions](https://vercel.com/docs/functions/limitations).

Comprueba que hay 21 migraciones y repite el comando para verificar que no queden pendientes. Publica la API antes de validar web y Flutter, consulta `/api/health`, verifica `X-Request-Id` y confirma roles y límites de petición.

Si el candidato falla, pausa la cola y las escrituras afectadas. Conserva las columnas aditivas y la evidencia. Evita volver a habilitar las rutas JSON de evidencias al revertir. Si la reversión al backlog es imprescindible, deshabilita esas mutaciones antes de reabrir el tráfico. El `down` de idempotencia pierde los identificadores de reenvío. Úsalo únicamente en una copia descartable o con un plan aprobado que conserve esos datos.
