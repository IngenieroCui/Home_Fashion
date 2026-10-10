# Plan de validación

## Objetivo

Demostrar la calidad técnica y funcional del sistema y evaluar su uso en el caso Home Fashion sin confundir pruebas automáticas, integración y evaluación con usuarios.

## Etapa 1 — Verificación automática (aprobada el 2026-09-06)

- `pnpm lint`.
- `pnpm test`.
- `pnpm build`.
- `flutter analyze`.
- `flutter test`.

Resultado registrado en EV-HF-0001. Estos checks no prueban MySQL, HTTP real, navegador ni dispositivo.

## Etapa 2 — Persistencia e integración

1. Crear una base MySQL 8 descartable con usuario de mínimo privilegio.
2. Aplicar las 11 migraciones y comprobar que no quedan pendientes.
3. Aplicar seeders y verificar roles, permisos, catálogo y reservas iniciales.
4. Iniciar API/web y comprobar health, catálogo y login con datos sintéticos.
5. Conservar logs sin secretos y registrar cualquier rollback.

## Etapa 3 — Recorrido E2E

Ejecutar los 21 pasos de [`docs/smoke-test-mvp.md`](../smoke-test-mvp.md): solicitud, cotización, venta, pago, pedido, inventario, taller, avances, revisión, tracking, entrega y sesiones. No modificar estados manualmente en SQL.

## Etapa 4 — Navegador y Android

- Web: 360 px, tableta y escritorio; teclado, foco, estados de error, permisos, importes y privacidad.
- Android: emulador o dispositivo contra API real; aislamiento WORKSHOP, red lenta, refresh y conservación del formulario.
- Repetir pasos afectados después de corregir defectos reproducibles.

## Etapa 5 — Evaluación con usuarios

- Definir tareas comparables por rol y criterio de finalización.
- Levantar o confirmar línea base manual.
- Obtener consentimiento informado.
- Registrar tiempo, interacciones, finalización, errores y ayuda.
- Aplicar SUS cuando resulte pertinente y complementar con preguntas abiertas.
- Analizar de forma descriptiva; reportar muestra, contexto y limitaciones.

## Bloqueadores actuales

- MySQL descartable y credenciales locales no están configurados en este bootstrap.
- No se ha ejecutado el sistema en navegador conectado ni Android contra API real.
- No hay entorno productivo validado ni firma Android configurada.
- No existen participantes, línea base ni resultados SUS registrados.

## Estado actualizado — 2026-09-28

La lista de bloqueadores anterior describe el arranque del 6 de septiembre. Aiven y el despliegue HTTPS ya están operativos; las migraciones/seeders se aplicaron en la base existente y se completó un recorrido HTTP con datos sintéticos hasta la entrega, descrito en `VALIDACION_TESIS_2026-09-28.md`. Se probaron también Cloudinary, lint/build, 281 pruebas API, 26 web, 47 Flutter y `flutter analyze`. El recorrido exacto de 21 pasos sigue parcial: faltan el pedido mixto con reserva de stock, toda la UI de administración y Android en emulador/dispositivo. No hay todavía base descartable migrada desde cero, restauración de backup ni evaluación OE4 con usuarios.
