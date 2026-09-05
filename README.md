# Home Fashion

Home Fashion es un monorepo para digitalizar la venta, fabricación, seguimiento y entrega de muebles de una mueblería familiar de Ibagué.

## Tecnologías

- NestJS con TypeScript para la API.
- Next.js App Router con TypeScript y Tailwind CSS para la web.
- Flutter con Material 3 para Android.
- MySQL ejecutado directamente en el sistema operativo del desarrollador.
- pnpm workspaces para los proyectos TypeScript.

## Requisitos Previos

- Git
- Node.js
- pnpm
- Flutter
- Dart
- MySQL local

## Estructura

```text
home-fashion/
  apps/
    api/
    web/
    mobile/
  packages/
    shared/
  docs/
    index.md
    architecture.md
    traceability.md
    api.md
    web.md
    mobile.md
    development.md
```

## Documentación

Empieza en [`docs/index.md`](docs/index.md). Allí se separan el contexto académico, la arquitectura, las rutas y operación de API/web/móvil, el desarrollo local y la prueba manual integral.

## Variables De Entorno

Copia los archivos `.env.example` cuando necesites variables locales. No subas archivos `.env`.

`apps/api/.env.example` documenta MySQL, JWT y puerto; `apps/web/.env.example` documenta las URLs de API. Los secretos reales deben existir solo en archivos locales ignorados por Git.

## MySQL Local

Instala y ejecuta MySQL directamente en tu sistema operativo. Crea la base de datos y usuario, configura `apps/api/.env` y aplica `pnpm db:migrate` y `pnpm db:seed`. El esquema no usa sincronización automática.

## API

```bash
pnpm install
pnpm dev:api
```

URL local: `http://localhost:3001/api`

Healthcheck: `http://localhost:3001/api/health`

## Web

```bash
pnpm install
pnpm dev:web
```

URL local: `http://localhost:3000`

Para iniciar API y web en paralelo también puedes usar `pnpm dev` desde la raíz.

## Flutter

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api
```

El Android Emulator normalmente debe usar `http://10.0.2.2:3001/api` para llegar a la API del computador. Un dispositivo físico debe usar la IP local del computador en la misma red.

HTTP se habilita solo para builds Android debug. Las builds release exigen una `API_BASE_URL` HTTPS y no incluyen la excepción de red local.

La aplicación admite únicamente cuentas `WORKSHOP`, restaura la sesión desde almacenamiento seguro y permite consultar trabajos y reportar avances mediante URLs de evidencia opcionales. No existe upload de archivos en esta versión.

## Estado Del MVP

El código incluye catálogo público y administrativo, autenticación, clientes, solicitudes públicas y cotizaciones, ventas, pagos, pedidos, reservas, talleres, avances, revisión, seguimiento privado y entregas. La web incorpora los flujos públicos y el panel; Flutter incorpora el flujo operativo de talleres.

Estos módulos están implementados y cuentan con validación automática. Al 7 de agosto de 2026, API y web aprobaron lint/build, las 269 pruebas de API aprobaron y el analizador Dart no reportó problemas. Todavía se requiere la prueba integral con MySQL real, navegador y dispositivo Android; `flutter test` también debe repetirse fuera del sandbox actual. No se ha validado producción ni despliegue.

La aplicación móvil contiene únicamente Android. La firma release, rate limiting, carga real de archivos, observabilidad y validación con usuarios permanecen pendientes antes de una puesta en producción.

## Validación

```bash
pnpm --filter @home-fashion/shared build
pnpm --filter @home-fashion/api lint
pnpm --filter @home-fashion/api test
pnpm --filter @home-fashion/api build
pnpm --filter @home-fashion/web lint
pnpm --filter @home-fashion/web build
cd apps/mobile && flutter analyze && flutter test
```

## URLs Locales

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api`
- API health: `http://localhost:3001/api/health`
