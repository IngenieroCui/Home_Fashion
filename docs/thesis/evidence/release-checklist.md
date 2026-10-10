# Release checklist — Home Fashion

Fecha: 2026-10-10, America/Bogota. Estado: RC COMMITADO; PENDIENTE DE AUTORIZACIÓN DE PUBLICACIÓN.
Commit de código validado: `293dcc0db0f4867b4f2fe122bfbc8872d4756932` (master). El commit posterior de evidencia sólo modifica documentación.

- [x] Raíz local, rama master, identidad Git y origin IngenieroCui/Home_Fashion verificados.
- [x] Consolidar sprints, pruebas, journeys y evidencias seguras en commit local; conservar cambios legítimos.
- [x] Auditar archivos e índice: sin .env reales, runtime E2E, credenciales, claves, tokens, cookies ni bases locales.
- [x] Preservar QA-1 212/212 PASS, QA-2 153 PASS y journeys 5/5 PASS sin reejecutarlos.
- [x] Build de shared/API/web y lint API/web PASS.
- [x] Typecheck E2E, 4 pruebas sintéticas de release y 3 pruebas de empaquetado PASS.
- [x] Aiven ONLINE mediante SELECT con TLS verificado; 13/13 migraciones aplicadas, 0 pendientes.
- [x] Columnas image_url_snapshot presentes en quote_items, sale_items y order_items; no aplicar migraciones.
- [x] API productiva /api/health y /api/catalog/products responden 200 con estructura válida.
- [x] Proyectos Vercel existentes, raíces apps/api y apps/web, master y deployments actuales verificados.
- [x] Sin cambios de variables productivas, Aiven o Cloudinary; no crear infraestructura.
- [x] Actualizar informe RC, validación e inventario; registrar SHA de código y deployments actuales.
- [ ] Autorización expresa del usuario para push master y publicación de API/web.
- [ ] Confirmar SHA completo del nuevo deployment de cada proyecto contra el HEAD autorizado.
- [ ] Smoke del RC desplegado: máximo 12 comprobaciones, fotografías y errores; sin nuevo proceso comercial.
- [ ] Android runtime: PENDIENTE hasta prueba real en dispositivo/AVD.
- [ ] HOME_FASHION_CODE_FREEZE = READY sólo después de publicación y smoke satisfactorios.

El HTTP 500 anterior no se reprodujo; dejó de ser un bloqueo y no se reinvestigó.
Los GET actuales son prepublicación de la versión anterior, no certifican todavía el RC desplegado.

Detalle: [release-candidate-2026-10-10.md](release-candidate-2026-10-10.md).
Inventario: [release-git-inventory.md](release-git-inventory.md).
