# Matriz académica de trazabilidad

| Objetivo | Problema / necesidad | Requisitos e historias | Implementación principal | Evidencia actual | Evidencia pendiente |
| --- | --- | --- | --- | --- | --- |
| OE1 | Información dispersa, actores y pérdidas de trazabilidad no formalizados. | RF-01 a RF-15; HU-01 a HU-12. | `docs/tesis.md`, requisitos y procesos documentados. | Propuesta final y documentación de contexto. | Entrevistas/observación, mapa AS-IS y línea base medida. |
| OE2 | Se necesita una solución integrada y protegida. | RF-01 a RF-15; RNF-01 a RNF-05, RNF-08/RNF-09. | `apps/api`, `apps/web`, `apps/mobile`, migraciones y modelos. | Código, 22 tablas inventariadas, lint/test/build y arquitectura. | Capturas reales, diagramas finales, MySQL y entorno de validación. |
| OE3 | Debe demostrarse calidad técnica y recorrido completo. | RF-03, RF-08 a RF-15; RNF-01 a RNF-05, RNF-09/RNF-10. | Suites automáticas y `docs/smoke-test-mvp.md`. | API 270, web 24 y Flutter 47 pruebas; builds/análisis aprobados el 2026-09-06. | Migraciones/seeders MySQL, E2E, navegador, Android y concurrencia real. |
| OE4 | Debe evaluarse usabilidad y contribución operativa. | HU-01, HU-02, HU-07 a HU-12; RNF-06/RNF-07. | Flujos web/móvil y plan de evaluación. | Instrumentos y tareas aún por preparar. | Línea base, sesiones por rol, SUS si aplica y análisis descriptivo. |

## Cadena de evidencia crítica

`MySQL limpio → migraciones/seeders → smoke E2E → correcciones → E2E aprobado → validación con usuarios → análisis → resultados → conclusiones`

## Estado

- Implementación: avanzada y verificada automáticamente.
- Validación integral: pendiente.
- Evaluación con usuarios: pendiente.
- Documento final: estructura iniciada; resultados no redactables hasta obtener evidencia.
