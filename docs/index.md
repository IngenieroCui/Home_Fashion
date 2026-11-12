# Documentación de Home Fashion

Este directorio es la referencia técnica y funcional del MVP. El código es la fuente definitiva cuando exista una discrepancia; todo cambio de rutas, estados, permisos o variables debe actualizar el documento correspondiente.

## Mapa documental

| Documento | Uso principal |
| --- | --- |
| [Contexto maestro de tesis](tesis.md) | Problema, objetivos, actores, alcance, reglas del negocio y criterio académico |
| [Arquitectura](architecture.md) | Componentes, modelo de datos, seguridad, invariantes y límites técnicos |
| [Trazabilidad](traceability.md) | Requisitos funcionales/no funcionales, implementación y evidencia pendiente |
| [API](api.md) | Endpoints, permisos, configuración, base de datos, ejecución y despliegue de NestJS |
| [Web](web.md) | Páginas, handlers BFF, sesión, compilación, uso y despliegue de Next.js |
| [Móvil](mobile.md) | Rutas Flutter, consumo de API, ejecución Android, pruebas y distribución |
| [Desarrollo](development.md) | Convenciones y recorridos de desarrollo por módulo |
| [Revisión técnica y de interfaz](revision-2026-09-04.md) | Correcciones, evidencia automática y límites de la revisión actual |
| [Smoke test](smoke-test-mvp.md) | Prueba manual integral y registro de hallazgos |
| [Espacio de trabajo de tesis](thesis/README.md) | Contexto, objetivos, requisitos, evidencias, validación y mapa del documento |
| [Inventario de base de datos](data/database-inventory.md) | Tablas, relaciones, restricciones y diferencias con el snapshot |
| [Catálogo de diagramas](thesis/diagram-catalog.md) | Diagramas propuestos, fuentes, formatos y estado |
| [Pagos y Wompi Sandbox](payments/README.md) | Intentos de cobro asistido, idempotencia y límites de validación externa |
| [Cierre técnico 28/10](release/closure-2026-10-28.md) | H03/H04, regresión H05, versión congelable, riesgos y demostración |

## Estado verificable

Fecha de corte técnico: 28 de octubre de 2026. La evidencia anterior conserva sus fechas originales.

| Componente | Implementado | Verificación disponible | Pendiente principal |
| --- | --- | --- | --- |
| API | MVP + H05/Wompi Sandbox + correcciones H03/H04 | Build, lint dirigido, 136 checks de API y regresión dirigida real MySQL 8.4 (ver cierre) | Validación del SHA final en entorno desplegado |
| Web | Público + panel + seguimiento + cobro Sandbox asistido | Build Next.js y regresiones locales; journeys históricos conservados | Prueba externa Wompi pendiente de credenciales |
| Android | Operación WORKSHOP y upload multipart de fotografías | Evidencia automática histórica; no se reejecutó Android en este cierre | Emulador/dispositivo con API HTTPS real y firma |
| Despliegue | Guía y artefactos compilables; 15 migraciones en fuente | Builds locales; ninguna migración Aiven ni despliegue en este cierre | Autorización, revisión de estado remoto y smoke del SHA publicado |

“Implementado” no equivale a “validado en producción”. Hasta completar el smoke test, el estado correcto del MVP es: **implementado y verificable automáticamente, pendiente de validación integral real**.

## Recorrido recomendado para la tesis

1. Usar `tesis.md` para problema, justificación, objetivos, actores y alcance.
2. Usar `architecture.md` para diseño de la solución, decisiones y modelo de datos.
3. Convertir `traceability.md` en la matriz formal de requisitos y evidencias de la propuesta.
4. Usar `api.md`, `web.md` y `mobile.md` para metodología de construcción e implementación.
5. Ejecutar `smoke-test-mvp.md` y conservar resultados, capturas y defectos como evidencia de validación.
6. Registrar métricas antes/después y resultados de usuarios en documentos separados; todavía no existen datos reales para afirmar mejoras cuantitativas.

## Política de actualización

- Una ruta nueva o eliminada actualiza la guía de su aplicación.
- Un cambio de entidad, relación o estado actualiza `architecture.md`.
- Un cambio de alcance, actor o regla comercial actualiza `tesis.md`.
- Una nueva validación manual actualiza el estado de este índice y el registro del smoke test.
- Nunca documentar credenciales, tokens, direcciones reales de clientes ni URLs privadas de evidencia.
