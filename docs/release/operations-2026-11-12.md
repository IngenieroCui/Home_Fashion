# Operación y protección de datos

## Servicios aislados

Para QA, usar MySQL descartable, un entorno Cloudinary dedicado, cuentas sintéticas y secretos exclusivos. Antes de ejecutar migraciones, comprobar el destino, UUID, permisos, respaldo, inventario de migraciones y ventana autorizada. Usar el guard existente de `tests/e2e/fixtures/database.ts`. Wompi permanece en Sandbox y requiere configuración explícita. El alta de una rama de código no autoriza despliegues, migraciones ni pruebas en entornos reales.

En Vercel, configurar `HF_PROXY_SECRET` con el mismo valor aleatorio de al menos 32 caracteres en web y API. La aplicación verifica la firma de IP del proxy y usa la cabecera de origen de Vercel para conexiones directas; en local usa la dirección de socket. Comprobar en un preview aislado que dos clientes distintos conservan cuotas distintas, que una cabecera arbitraria no cambia la identidad y que al agotar la cuota se devuelve 429 con `Retry-After`. Referencia: [cabeceras de Vercel](https://vercel.com/docs/headers/request-headers).

## Evidencias privadas

Las nuevas cargas de taller, pago y entrega usan el tipo authenticated. Los enlaces de lectura de cinco minutos se generan tras autorizar la respuesta del recurso y son transferibles hasta su caducidad. Tracking omite estas evidencias. Las cargas del catálogo conservan entrega pública. Los enlaces antiguos quedan ocultos en la aplicación. El operador debe identificar esos activos desde registros autorizados, copiarlos a entrega autenticada, actualizar referencias y eliminar o invalidar los originales públicos. Comprobar acceso anónimo, accesos por rol, expiración y CDN en una cuenta de pruebas antes de habilitar datos reales. [Entrega autenticada en Cloudinary](https://cloudinary.com/documentation/upload_parameters).

Para drenar borrados, ejecutar periódicamente `POST /api/admin/media-cleanup/drain` con una cuenta ADMIN autorizada. Revisar fallos de encolado y tareas agotadas (ocho intentos) mediante alertas de logs y consulta operativa de la tabla. Reconcilia periódicamente activos por carpeta y referencias locales. No borres por coincidencia de nombre. La operación de catálogo guarda la tarea con el borrado de su referencia en la misma transacción.

## Privacidad de contacto

Validar con el responsable del tratamiento el texto, el canal, la identidad y el domicilio que deben publicarse, el plazo por finalidad y si se exige registrar la autorización. La web ofrece un aviso inicial; el responsable debe aprobar su versión y definir cómo acreditarla antes de la exposición a usuarios reales. La Ley 1581 de 2012 y los criterios de la SIC son referencias de revisión. [Aviso y política de tratamiento](https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/politicas-de-tratamiento-de-datos-personales).

Propuesta operativa. El responsable de atención registra fecha, código de solicitud y tipo de derecho. Verifica identidad por un canal separado, limita acceso a roles de atención y administración, identifica referencias en cotizaciones, ventas, pedidos, entregas, medios y respaldos, y registra la decisión. Elimina o seudonimiza información prescindible con autorización y conserva documentos sujetos a obligaciones vigentes. Aplica el mismo tratamiento cuando se restituya una copia. Evita incluir PII en la bitácora o logs y revisa el borrado con un segundo operador.

## Disponibilidad y restauración

Operaciones debe asignar responsable titular y suplente, habilitar respaldo automático y confirmar los objetivos con el negocio. Como objetivo inicial para pruebas, usar RPO de 24 horas y RTO de cuatro horas. Alertas iniciales a calibrar: cinco minutos sin disponibilidad de `/api/health`, errores 5xx superiores a 2 % durante diez minutos, latencia p95 sobre dos segundos y fallos recurrentes de colas o base. Correlacionar por `X-Request-Id`, registrar tiempos en UTC y consultar duración, ruta y estado en los logs HTTP estructurados. No almacenar cuerpos, cabeceras de autorización ni enlaces firmados en la incidencia.

Para un ejercicio, restaurar una copia cifrada en un destino separado y comprobar identidad del servidor, migraciones, integridad de tablas, acceso de solo lectura y recorrido sintético. Registrar horas de inicio/fin, punto recuperado, conteos, diferencias y responsable. Destruir el destino temporal según autorización y conservar evidencia redactada. Ante un incidente, delimitar alcance, pausar escrituras si procede, preservar evidencia, recuperar en un destino alterno y verificar antes de reabrir.
