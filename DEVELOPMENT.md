# Home Fashion

Home Fashion es un monorepo para digitalizar la venta, fabricación, seguimiento y entrega de muebles de una mueblería familiar de Ibagué.

## Tecnologías

- NestJS con TypeScript para la API.
- Next.js App Router con TypeScript y Tailwind CSS para la web.
- Flutter con Material 3 para Android.
- MySQL administrado en Aiven con TLS.
- pnpm workspaces para los proyectos TypeScript.

## Requisitos Previos

- Git
- Node.js
- pnpm
- Flutter
- Dart
- Servicio MySQL en Aiven

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

Copia `.env.example` a `.env` en la raíz. La API, los comandos de migración y la web leen ese archivo. No subas `.env` a Git.

Completa `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD` con los datos de conexión de Aiven. Descarga el certificado CA desde **Overview → Connection information → CA Certificate**, guárdalo como `certs/aiven-ca.pem` y deja `DB_SSL_MODE=REQUIRED` y `DB_SSL_CA_PATH=./certs/aiven-ca.pem` en `.env`. Si usas otra ubicación, indica su ruta absoluta o una ruta relativa a la raíz del proyecto. En Vercel, configura `DB_SSL_CA_BASE64` con el contenido Base64 del certificado en lugar de subir el archivo. La API y las migraciones exigirán TLS y verificarán el servidor con esa CA; fallarán al iniciar si el certificado falta. Para subir imágenes desde el panel, completa `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` desde tu cuenta de Cloudinary. `CLOUDINARY_FOLDER` define la carpeta remota. Las claves JWT deben ser secretas y tener al menos 32 caracteres. El navegador nunca recibe la clave secreta de Cloudinary.

## MySQL en Aiven

El esquema contiene **19 migraciones** y no usa sincronización automática. Las dos adiciones de H05/Wompi son `20261028000000-payment-intentions.ts` y `20261028001000-payment-attempts.ts`; H03/H04 no añaden migraciones. En Aiven, aplicar migraciones/seeders requiere autorización y revisión del estado remoto; este cierre no ejecuta ninguna operación allí. Para regresión usa exclusivamente MySQL descartable (instrucciones en el cierre técnico).

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

La aplicación admite únicamente cuentas `WORKSHOP`, restaura la sesión desde almacenamiento seguro y permite consultar trabajos y reportar avances con hasta cinco fotografías de cámara o galería mediante `POST /workshop/jobs/:id/progress-media` (multipart).

## Estado Del MVP

El código incluye catálogo público y administrativo, autenticación, clientes, solicitudes públicas y cotizaciones, ventas, pagos, pedidos, reservas, talleres, avances, revisión, seguimiento privado y entregas. La web incorpora los flujos públicos y el panel; Flutter incorpora el flujo operativo de talleres.

Corte técnico del 28 de octubre de 2026: H03 consume `quantityOnHand` y `quantityReserved` al entregar líneas IN_STOCK dentro de la misma transacción; MADE_TO_ORDER no consume inventario terminado. H04 serializa edición, estado y conversión con lock de cabecera y revalidación. Los snapshots de venta se conservan. La regresión dirigida usa MySQL 8.4 descartable; no sustituye validación en producción ni Android en dispositivo. Véanse resultados, riesgos y repetición en [el cierre técnico](docs/release/closure-2026-10-28.md).

La aplicación móvil contiene únicamente Android. Panel y móvil usan upload de imágenes a través de la API y Cloudinary; su verificación en Android real/HTTPS sigue pendiente. La firma release, rate limiting, observabilidad y validación con usuarios permanecen pendientes antes de una puesta en producción.

## Despliegue en Vercel

Crea dos proyectos desde este mismo repositorio: uno con **Root Directory** `apps/api` (NestJS) y otro con `apps/web` (Next.js). No configures un directorio de salida manual para ninguno. Ejecuta las migraciones y seeders desde una estación autorizada antes de probar la API desplegada.

En el proyecto de la API configura `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL_MODE=REQUIRED`, `DB_SSL_CA_BASE64`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y `CLOUDINARY_FOLDER`. `DB_SSL_CA_BASE64` es la codificación Base64 del certificado CA de Aiven; el certificado y los secretos permanecen fuera de Git. En el proyecto web configura `API_SERVER_URL` y `NEXT_PUBLIC_API_URL` con la URL HTTPS de la API seguida de `/api`. Las variables secretas se guardan en la configuración del proyecto Vercel, nunca en el repositorio.

## Wompi Sandbox

El módulo `payments` genera PaymentAttempt y enlaces de cobro asistido. El retorno del navegador no confirma pagos: la aprobación exige webhook validado y consulta de transacción, y registra el abono mediante el servicio financiero idempotente. Solo se permite Sandbox sobre base aislada. **No se acredita procesamiento de pagos reales ni una prueba externa exitosa**: faltan credenciales test y webhook HTTPS real. Consulta [pagos](docs/payments/README.md) y [validación externa pendiente](docs/thesis/evidence/wompi-external-sandbox.md).

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
