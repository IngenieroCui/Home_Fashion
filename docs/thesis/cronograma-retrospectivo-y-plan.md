# Cronograma retrospectivo y plan de cierre — Home Fashion

Fecha de corte: 6 de septiembre de 2026.

## Actualización de seguimiento — 22 de septiembre de 2026

El cuadro original de abajo conserva su valor como plan formulado el 6 de septiembre, pero sus fechas no demuestran ejecución. Al corte actual, el borrador de tesis y los 19 diagramas están disponibles; las pruebas automáticas de API y web se volvieron a ejecutar, y se corrigieron dos casos de validación del formulario/filtro del catálogo. MySQL descartable, migraciones en limpio, recorrido E2E, inspección web, Android contra API y sesiones con usuarios siguen sin evidencia de cierre. Por ello, los bloques del 14 al 20 y del 21 al 27 de septiembre deben leerse como metas vencidas o en riesgo, no como actividades cumplidas.

| Tramo de cierre | Estado al 22 de septiembre | Dependencia para cerrarlo |
| --- | --- | --- |
| Base técnica y documental | Verificada parcialmente; borrador y diagramas disponibles. | Resolver versionado de `docs/` y registrar versiones publicadas. |
| Validación integral | Pendiente; hito M2 vencido el 20 de septiembre. | MySQL aislado → migraciones/seed → E2E → web/Android. |
| Evaluación con usuarios | Pendiente; no hay tiempos, SUS ni mejora medida. | Protocolo y consentimiento, luego flujo real estable. |
| Documento final | Borrador para tutor; no radicado. | Formato institucional, referencias, resultados y revisión. |
| Sustentación | Pendiente. | Aprobación del documento, demo y programación institucional. |

La fecha de entrega de septiembre debe confirmarse con el tutor o la coordinación. Si sigue vigente, se requiere acordar el alcance evaluable y replanificar explícitamente las tareas dependientes; no se debe retrofechar ni cerrar evidencias pendientes.

## Criterio de integridad

El cronograma distingue trabajo realizado, reconstrucción retrospectiva y trabajo planificado. No se atribuyen actividades a junio sin evidencia contemporánea. El inicio en julio se registra como fecha declarada por el autor y debe respaldarse, cuando sea posible, con notas, correos, archivos, reuniones, prototipos o versiones fechadas. Si aparece evidencia real de junio, se incorpora como antecedente documentado, no como fecha inventada.

## Línea de tiempo

| Periodo | Naturaleza | Actividad / entregable | Evidencia mínima |
| --- | --- | --- | --- |
| Junio de 2026 | No confirmado | No registrar actividad ejecutada hasta localizar evidencia. | Nota, correo, reunión o archivo fechado. |
| Julio de 2026 | Retrospectivo, declarado por el autor | Inicio del proyecto; levantamiento inicial, alcance, decisiones de arquitectura y prototipado. | Recuperar archivos/metadatos, conversaciones y primeras pruebas. |
| 1–9 agosto de 2026 | Retrospectivo | Construcción del núcleo del MVP: API, web, móvil y modelo de datos. | Repositorio actual, documentos técnicos y pruebas. |
| 10 agosto de 2026 | Hito documental | Propuesta de trabajo de grado. | Documento radicado y constancia institucional. |
| 11 agosto–4 septiembre de 2026 | Retrospectivo | Integración de recorridos comerciales/productivos, seguridad, pruebas y revisión. | Código, pruebas, revisión del 4 de septiembre y artefactos. |
| 5–6 septiembre de 2026 | Verificado | Baseline técnico, inventario, trazabilidad, Linear, Drive y catálogo documental. | Resultados de lint/build/tests; proyecto Linear; carpeta Drive. |
| 7–13 septiembre de 2026 | Planificado | Definir versionado de `docs/`, cerrar baseline y preparar entorno MySQL. | Decisión Git, configuración y acta de ejecución. |
| 14–20 septiembre de 2026 | Planificado | Migraciones/seed en MySQL 8, smoke E2E, web en navegador y Android real/emulador. | Logs, capturas, matriz de incidencias. |
| 21–27 septiembre de 2026 | Planificado | Pruebas con usuarios y mediciones antes/después con consentimiento y anonimización. | Instrumentos, datos anonimizados y actas. |
| 21–30 septiembre de 2026 | Planificado | Consolidar diagramas, tablas, evidencias y resultados. | SVG/PDF, matriz de trazabilidad y resultados. |
| Octubre de 2026 | Planificado | Redactar, revisar con tutor y corregir documento final. | Versiones y comentarios del tutor. |
| Noviembre de 2026 | Planificado | Preparar defensa, demo y cierre. | Presentación, guion, video/capturas y versión aprobada. |

## Recomendación para el documento

- En la metodología, explicar que la cronología anterior a septiembre fue reconstruida retrospectivamente con fuentes disponibles.
- En el cronograma formal, usar julio como inicio real declarado; no moverlo a junio para aparentar mayor antigüedad.
- Diferenciar con etiquetas `REALIZADO`, `VERIFICADO` y `PLANIFICADO`.
- Validar con el director de trabajo de grado si el programa exige un formato o ventana temporal particular.
- Conservar una tabla de evidencias con fecha, responsable, fuente, enlace y qué afirmación respalda.
