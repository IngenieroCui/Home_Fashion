# Home Fashion Mobile

Aplicación Flutter para talleres.

La referencia completa de arquitectura, rutas, uso, pruebas, compilación y distribución está en [PROJECT.md](../../docs/PROJECT.md#aplicación-android).

Android Emulator normalmente usa `http://10.0.2.2:3001/api`.

Un dispositivo físico debe usar la IP local del computador, por ejemplo `http://192.168.1.10:3001/api`.

Esas URLs HTTP se aceptan únicamente en debug. Una build release exige una `API_BASE_URL` HTTPS y no incluye la configuración de cleartext de desarrollo.

La URL se define al compilar o ejecutar, sin almacenar secretos ni usar archivos `.env` en la aplicación:

```sh
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api
```

El repositorio solo contiene la plataforma Android. Antes de publicar una build release se debe configurar una firma externa al repositorio.
