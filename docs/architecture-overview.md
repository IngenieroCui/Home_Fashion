# Arquitectura de Home Fashion

## Alcance y fuentes

Descripción de `master` a partir de `ff3fbb8`, los módulos de `apps/api/src/modules`, las aplicaciones web/móvil y las migraciones. Se contrasta con `feature/portfolio-demo-accounts` en `73af0a9`, sin mezclar ramas de código. [Presentación](../README.md).

## Componentes y relaciones

```text
Next.js (catálogo y panel) ─┐
                          ├─ HTTP /api → NestJS → Sequelize → MySQL/Aiven (TLS)
Flutter Android (taller) ──┘                 └→ Cloudinary (imágenes del catálogo)
```

`apps/web` muestra el catálogo y los paneles de operación. `apps/api` aplica reglas y persiste entidades. `apps/mobile` consume la misma API para WORKSHOP. `packages/shared` contiene contratos compartidos de los proyectos TypeScript. No hay acceso directo de los clientes a MySQL.

El `AppModule` registra catálogo, autenticación, solicitudes públicas, cotizaciones, ventas, pedidos, trabajos de taller, seguimiento y entregas. Sequelize modela productos/variantes, clientes, cotizaciones, ventas/pagos, pedidos, talleres y avances. Umzug aplica migraciones explícitas: no se presupone sincronización automática de tablas.

## Datos y autenticación

El recorrido de negocio enlaza solicitud/cotización, venta, pedido, trabajo de taller, reporte/revisión y entrega. Cada módulo expone controladores y servicios; las operaciones relacionadas utilizan las transacciones implementadas en la API.

La autenticación emite JWT de acceso y renovación; las sesiones de renovación se registran en la base. Las guardias verifican autenticación y permisos. ADMIN administra; EMPLOYEE opera los procesos permitidos; WORKSHOP accede a su trabajo asignado. Flutter guarda la sesión en almacenamiento seguro. El seguimiento de pedidos usa accesos específicos y secretos cuya huella se almacena: no equivale a un catálogo público de pedidos.

Cloudinary recibe imágenes mediante el backend. Las claves de API, secretos JWT y contraseña MySQL son privados. La CA de Aiven debe configurarse para validar TLS; no debe confundirse un certificado CA público con una clave privada.

## Decisiones y cambios comprobables

- Un monorepo coordina web, API y contratos; Flutter permanece como cliente independiente de la misma API.
- NestJS separa módulos por proceso de negocio; MySQL y migraciones explícitas sostienen las relaciones y la evolución del esquema.
- `a430764` documenta en el historial una reparación del recorrido de cotizaciones/pedidos contra MySQL. `ff3fbb8` registra validación de pagos, taller, entrega y estado de tesis; ese mensaje no representa una nueva ejecución de pruebas aquí.
- La rama de demo añade `8a257e6` (preparación de cuentas), `a6e987d` (retorno de cotización después de confirmar la transacción) y `73af0a9` (estado privado de evaluación). Esas diferencias no se atribuyen a `master`.

## Configuración y operación conservadas

Copia la plantilla raíz a `.env`; la API y el CLI de base leen esa configuración. Revisa las plantillas de cada aplicación para sus parámetros. Nunca publiques `.env` ni las cuentas de evaluación.

Para una base autorizada, `pnpm db:migrate` y `pnpm db:seed` son los comandos existentes. Las condiciones, reversión y datos de cada operación permanecen en los [README de migraciones](../apps/api/src/database/migrations/README.md) y [seeders](../apps/api/src/database/seeders/README.md). No son pasos ejecutados por este cambio documental.

La infraestructura existente contempla dos proyectos Vercel con raíces `apps/api` y `apps/web`. La API necesita acceso MySQL/TLS, CORS para la web y secretos de autenticación propios. Las imágenes requieren Cloudinary. La configuración pública de la web debe apuntar a la API correcta. No se modifican despliegues desde esta documentación.

La rama de demo exige una base MySQL independiente llamada `home_fashion_demo` y un usuario limitado a ella antes de usar `demo:seed`. También requiere proyectos y secretos separados y no debe operar el Cloudinary empresarial. **El estado actual comunicado es una evaluación privada sobre una base existente; no acredita aislamiento público completo.**

## Límites y mejoras posibles

No hay upload binario de evidencias en Flutter, ni una validación Android en dispositivo acreditada por este sprint. Antes de abrir la operación deben revisarse aislamiento de demo, permisos, límites de peticiones, firma Android, observabilidad y tratamiento de datos de clientes. Las pruebas existentes se conservan; no se ejecutaron aquí.

Se sustituyeron las referencias rotas a `docs/index.md`, `docs/architecture.md` y otros documentos ausentes por los dos documentos principales actuales. Se conservan créditos, guías operativas y evidencia de tesis. La autoría se apoya en los commits y no se reasigna el historial `unknown`.

## Candidato de endurecimiento

Flutter adjunta hasta cinco fotos por avance mediante multipart. La API carga evidencias de taller, entrega y abonos en carpetas Cloudinary autenticadas por recurso. Valida que el identificador de la respuesta coincida con la carpeta y la URL de entrega. Los registros guardan la referencia del proveedor. Al consultar un recurso autorizado, la API genera enlaces temporales y envía `Cache-Control: private, no-store`. El seguimiento conserva estados y avances aprobados sin incluir evidencia fotográfica.

El pedido se bloquea antes de sus líneas y trabajos al cancelar, gestionar una entrega o registrar o revisar avances. Flutter reutiliza un identificador al reenviar un formulario sin cambios. MySQL serializa la operación y conserva el identificador junto al reporte. Los documentos comerciales mantienen las imágenes seleccionadas en su snapshot y la cola verifica esas referencias antes de destruir un recurso.

Consulta la [auditoría de la base](release/final-hardening-audit.md), el [cierre y evidencias](release/final-hardening-validation.md) y las [instrucciones operativas](release/operations-2026-11-12.md).
