# Android QA-2 — 2026-09-30

APK build PASS. APK install/runtime PENDIENTE.

`adb devices`: listado vacío. `emulator -list-avds`: vacío; carpeta AVD sin AVD existente. `flutter devices`: Windows/Chrome/Edge, ningún Android. No se descargaron SDK/AVD.

50 tests Flutter PASS; dart analyze lib y flutter analyze sin issues. El listado tiene widget test de texto 1.5; retrieveLostData está implementado, pero no se localizó un test dedicado de recuperación del picker. Ninguno sustituye el recorrido de dispositivo.

No ejecutados en Android: login/restauración/logout/relogin, jobs/detail/KPIs, cámara/galería hasta 5/remove, upload y reflejo ADMIN, lost-data real, escala 1.5, rotación, offline/latencia. No se generan screenshots Android.

El avance real usado en revisión web es fixture API explícito; no se etiqueta como móvil. APK local para AVD: apps/mobile/build/app/outputs/flutter-apk/app-debug.apk, API_BASE_URL=http://10.0.2.2:3001/api. Warning previo Kotlin 2.0.20, build exitoso.
