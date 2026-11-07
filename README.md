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

Configura las credenciales de Aiven y el certificado CA en `.env`; luego aplica `pnpm db:migrate` y `pnpm db:seed`. El esquema no usa sincronización automática.

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

Estos módulos están implementados y cuentan con validación automática. Al 23 de septiembre de 2026, API y web aprobaron lint/build, 276 pruebas de API y 26 de web; además se verificaron Aiven con TLS, las migraciones, el catálogo, el inicio de sesión y una carga y eliminación de imagen en Cloudinary. Falta repetir el flujo en el entorno desplegado y validar la app Android en un dispositivo.

La aplicación móvil contiene únicamente Android. El panel web permite subir imágenes de catálogo a Cloudinary; la carga de evidencias desde móvil sigue pendiente. La firma release, rate limiting, observabilidad y validación con usuarios permanecen pendientes antes de una puesta en producción.

## Despliegue en Vercel

Crea dos proyectos desde este mismo repositorio: uno con **Root Directory** `apps/api` (NestJS) y otro con `apps/web` (Next.js). No configures un directorio de salida manual para ninguno. Ejecuta las migraciones y seeders desde una estación autorizada antes de probar la API desplegada.

En el proyecto de la API configura `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL_MODE=REQUIRED`, `DB_SSL_CA_BASE64`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y `CLOUDINARY_FOLDER`. `DB_SSL_CA_BASE64` es la codificación Base64 del certificado CA de Aiven; el certificado y los secretos permanecen fuera de Git. En el proyecto web configura `API_SERVER_URL` y `NEXT_PUBLIC_API_URL` con la URL HTTPS de la API seguida de `/api`. Las variables secretas se guardan en la configuración del proyecto Vercel, nunca en el repositorio.

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
# Preparación de una demo aislada

La demo requiere una base MySQL **independiente**, vacía, llamada `home_fashion_demo` y un usuario MySQL limitado exclusivamente a esa base. Crear la base y verificar sus permisos en Aiven antes de ejecutar cualquier comando; el nombre o la variable de confirmación no demuestran por sí solos el aislamiento. No utilizar las credenciales de producción. No ejecutar migraciones ni seeders hasta comprobar el servidor, la base y los privilegios del usuario demo.

Configurar las variables `DB_*`, certificado CA y secretos JWT de la API para la base demo, siguiendo `.env.example`. Con esa configuración aislada, ejecutar `pnpm db:migrate` y `pnpm db:seed` desde la raíz; el catálogo ficticio y las imágenes locales autorizadas existentes forman parte de estos seeders. Establecer `CATALOG_ASSET_BASE_URL` con el origen HTTPS de la web demo antes de sembrar el catálogo.

Definir de forma privada `DEMO_CONFIRM_DATABASE=home_fashion_demo` y tres contraseñas distintas de al menos 12 caracteres en `DEMO_ADMIN_PASSWORD`, `DEMO_EMPLOYEE_PASSWORD` y `DEMO_WORKSHOP_PASSWORD`; ejecutar `pnpm --filter @home-fashion/api demo:seed`. Las cuentas son `admin@demo.home-fashion.invalid`, `empleado@demo.home-fashion.invalid` y `taller@demo.home-fashion.invalid`. El comando no cambia contraseñas existentes: para rotarlas, usar un procedimiento administrativo seguro. Guardar los valores en un gestor de secretos y compartirlos por un canal privado; no subirlos al repositorio.

Usar proyectos Vercel separados para web y API, con variables y JWT independientes y la web apuntando exclusivamente a la API demo. Mantener desactivadas las credenciales Cloudinary en la API demo: las imágenes ilustrativas se sirven desde la web, y así la demo no puede subir ni borrar recursos del Cloudinary empresarial. No usar los proyectos o variables de producción como entorno de demostración. Verificar los tres inicios de sesión y el recorrido antes de compartir la URL.

## Estado de evaluación privada

La evaluación privada actualmente usa la base sintética existente autorizada para Home Fashion. Se crearon las cuentas `ADMIN`, `EMPLOYEE` y `WORKSHOP` con el CLI de usuarios existente; sus contraseñas se conservan fuera de Git en el artefacto cifrado de credenciales del entorno de trabajo. La cuenta `WORKSHOP` inicia sesión desde la aplicación móvil Home Fashion Talleres; el acceso desde el panel web se rechaza por diseño.

El recorrido privado verificado cubre login y permisos de catálogo, cotizaciones, pedidos y trabajos de taller. La creación de cotizaciones devuelve la entidad después de confirmar su transacción para evitar lecturas prematuras. La guardia de `demo:seed` sigue exigiendo una base independiente `home_fashion_demo`; no se usa para alterar bases compartidas.
