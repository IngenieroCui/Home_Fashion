# Home Fashion

**Gestión comercial y de fabricación para una mueblería familiar de Ibagué.**

## Problema y solución

La venta de muebles requiere coordinar catálogo, cotizaciones, pagos, fabricación y entrega. Home Fashion reúne ese recorrido en una web comercial, una API y una aplicación Android para talleres, como proyecto de tesis y apoyo a la modernización de la MiPyme.

## Funcionalidades

- Catálogo público y administración de productos, variantes e imágenes.
- Solicitudes públicas, clientes, cotizaciones y conversión del proceso comercial a ventas y pedidos.
- Registro de pagos, asignación de trabajos a talleres, avances, revisión y entregas.
- Seguimiento privado de pedidos mediante accesos controlados.
- Roles **ADMIN**, **EMPLOYEE** y **WORKSHOP**, con permisos comprobados en la API.
- Flutter para consultar trabajos y reportar avances con URLs de evidencia opcionales.

## Tecnologías y arquitectura

| Capa | Implementación |
| --- | --- |
| Web | Next.js, React, TypeScript y Tailwind CSS |
| API | NestJS, Sequelize, validación de DTO y JWT |
| Datos | MySQL en Aiven con TLS; migraciones con Umzug |
| Taller | Flutter/Dart para Android; almacenamiento seguro de sesión |
| Imágenes | Cloudinary desde la API |
| Organización | Monorepo pnpm; contratos en `packages/shared` |

`Web / Flutter → API NestJS → MySQL`; la API concentra permisos, transacciones y servicios externos.

## Desarrollo local

Requiere Node.js, pnpm y una base MySQL autorizada. Copia `.env.example` a `.env` en la raíz y configura credenciales privadas. Consulta las [migraciones](apps/api/src/database/migrations/README.md) y los [seeders](apps/api/src/database/seeders/README.md) antes de preparar una base. No ejecutes esos comandos sobre una base compartida sin revisar su destino.

```bash
pnpm install
pnpm dev
```

Web: `http://localhost:3000`; API: `http://localhost:3001/api`.

Para Android, consulta [apps/mobile/README.md](apps/mobile/README.md). El emulador accede a la API local con `http://10.0.2.2:3001/api`; una compilación release requiere HTTPS.

## Estado y limitaciones

La rama principal es `master`. Los cambios recientes de evaluación privada están en `feature/portfolio-demo-accounts` (`73af0a9`): no están fusionados automáticamente en `master`.

La demo actual usa **cuentas privadas en una base existente**, sin aislamiento público completo. No se publican credenciales ni se ofrece acceso administrativo abierto. El seeder de demo exige una base independiente; su existencia no prueba que el entorno actual esté aislado.

Flutter cubre Android y el rol WORKSHOP. No incluye carga de evidencias binarias. La validación en dispositivo, operación pública, observabilidad y controles adicionales deben revisarse antes de una puesta en producción. Este sprint documental no ejecutó pruebas, builds ni operaciones de datos.

## Contribución

Juan David Reyes Cure figura en el historial como autor del desarrollo y de la validación del flujo comercial; `a430764` registra la reparación de cotizaciones/pedidos y `ff3fbb8` el cierre de validación. Se conserva también un commit con autor `unknown`, sin reasignarlo. La rama de demo conserva su propio historial.

Consulta [arquitectura, decisiones y operación](docs/ARCHITECTURE.md). Los créditos de imágenes permanecen en [CATALOG_DEMO_IMAGES.md](CATALOG_DEMO_IMAGES.md) y la evidencia histórica en [VALIDACION_TESIS_2026-09-28.md](VALIDACION_TESIS_2026-09-28.md).
