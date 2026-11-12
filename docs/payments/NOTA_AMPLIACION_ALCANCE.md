# Nota de ampliación de alcance para revisión del director

**Propuesta de decisión; no equivale a aprobación.** Fecha: 28/10/2026.

Se propone incorporar a Home Fashion una demostración de cobro online alojado en Wompi Sandbox, vinculada a ventas, abonos y saldos existentes. La incorporación añade PaymentAttempt, enlace público con vencimiento y confirmación por webhook. SalePayment continúa siendo el único movimiento financiero interno. La idempotencia de abonos manuales corrige H05 de la auditoría y es una medida previa de integridad.

La validación ejecutada utiliza MySQL real aislado y respuestas controladas del proveedor. La validación externa está pendiente de credenciales de comercio Sandbox y configuración HTTPS. Las capturas de confirmación adjuntas pertenecen a pruebas controladas; no acreditan un pago externo.

Se solicita al director revisar pertinencia, esfuerzo, ubicación documental y criterio de aceptación antes de incorporar este incremento a la tesis. El criterio externo propuesto es: anticipo ficticio completado en Wompi Sandbox, evento validado, exactamente un abono relacionado y disminución correcta del saldo de esa venta.

Quedan fuera carrito, checkout personalizado, wallet, facturación electrónica, conciliación bancaria, devoluciones complejas y activación de dinero real. La propuesta no sustituye la evaluación con actores, línea base, demás hallazgos de auditoría ni otros objetivos pendientes. No se modificaron el informe final ni los objetivos aprobados. Tampoco se declaró ampliado formalmente el alcance.

**Decisión del director:** pendiente. **Condiciones o ajustes:** por registrar tras revisión real.
