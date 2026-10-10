# Release checklist — Home Fashion

Fecha de revisión: 2026-10-10, America/Bogota. Estado: RC LOCAL CONSERVADO; PUBLICACIÓN BLOQUEADA.

- [x] Conservar cambios locales existentes; sin commit, push ni deploy.
- [x] Conservar QA-1 (212/212 PASS), QA-2 (153 PASS/1 Android pendiente) y journeys (5/5 PASS previos).
- [x] No repetir QA-1, QA-2, 343 tests API ni los cinco journeys.
- [x] Empaquetador de allowlist y verificación automática del tar.gz; ejemplos sólo con placeholders.
- [x] Excluir runtimes E2E, owner.json, credenciales, claves, DB/dumps, dependencias, builds, caches y sesiones.
- [x] Política selectiva de docs y listado revisable; sin git add -f ni staging masivo.
- [x] Preservar último éxito completo; bloqueos y nuevas ejecuciones en archivos independientes.
- [x] Comprobar tres unidades disponibles antes de journeys; sin modificar reservas manualmente.
- [x] Validación dirigida: 4 pruebas del runner/reporter, typecheck E2E y 3 pruebas del empaquetador PASS.
- [x] Inspeccionar proyectos Vercel existentes y probar lectura de la publicación anterior.
- [ ] Publicar el RC actual con autorización inequívoca.
- [ ] Resolver API publicada HTTP 500 y comprobar su configuración efectiva.
- [ ] Smoke autenticado de siete áreas administrativas y producto/fotografía.
- [ ] Android runtime: no hay dispositivo ni AVD.
- [x] Capítulos de tesis conservados sin modificación.

Detalle, evidencia y pasos exactos: [release-candidate-2026-10-10.md](release-candidate-2026-10-10.md).
Inventario Git: [release-documentation-inventory.md](release-documentation-inventory.md).
