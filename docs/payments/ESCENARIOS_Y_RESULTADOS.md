# Escenarios y resultados

| Escenario dirigido | Resultado | Naturaleza |
|---|---|---|
| Migración aditiva conserva íntegro el pago histórico | PASS | MySQL real / proveedor controlado |
| Adaptador consulta Sandbox con llave privada, sin aceptar redirecciones | PASS | MySQL real / proveedor controlado |
| Rechaza llaves prod y base no aislada | PASS | MySQL real / proveedor controlado |
| H05: respuesta perdida después del commit y reenvío produce un abono | PASS | MySQL real / proveedor controlado |
| H05: clave igual con contenido distinto devuelve 409; intención nueva sí abona | PASS | MySQL real / proveedor controlado |
| MySQL impide físicamente insertar dos movimientos con el mismo intent_id | PASS | MySQL real / proveedor controlado |
| H05: 12 requests concurrentes con la misma intención producen una fila | PASS | MySQL real / proveedor controlado |
| H05: pago de saldo completo admite reenvío con saldo cero y conserva anulación | PASS | MySQL real / proveedor controlado |
| H05: multipart con mismo archivo no duplica; archivo distinto causa conflicto | PASS | MySQL real / proveedor controlado |
| Permisos: visitante 401 y EMPLOYEE 403 en endpoints administrativos | PASS | MySQL real / proveedor controlado |
| Anticipo parcial crea intento PENDING, enlace opaco y ningún abono | PASS | MySQL real / proveedor controlado |
| Checkout: importe/referencia/vencimiento firmados; retorno no confirma | PASS | MySQL real / proveedor controlado |
| Validación: sobrepago, monto cero, centavos inválidos y venta cancelada | PASS | MySQL real / proveedor controlado |
| Firma inválida y ambiente prod son rechazados sin abono ni consulta externa | PASS | MySQL real / proveedor controlado |
| Importe alterado, referencia/venta incorrecta y respuesta de proveedor distinta | PASS | MySQL real / proveedor controlado |
| Aprobación controlada y 16 webhooks concurrentes crean exactamente un abono | PASS | MySQL real / proveedor controlado |
| Eventos fuera de orden y repetidos no degradan APPROVED ni crean reversos | PASS | MySQL real / proveedor controlado |
| DECLINED, ERROR y PENDING actualizan intento sin abono (contratos simulados) | PASS | MySQL real / proveedor controlado |
| Firma usa propiedades dinámicas y acepta hexadecimal mayúscula | PASS | MySQL real / proveedor controlado |
| Vencimiento impide iniciar checkout y admite confirmación tardía verificada | PASS | MySQL real / proveedor controlado |
| Pago manual previo + Wompi de saldo completo deja saldo cero | PASS | MySQL real / proveedor controlado |
| Concurrencia de intenciones legítimas manual + Wompi comparte bloqueo y saldo | PASS | MySQL real / proveedor controlado |
| Aprobación tras pago manual completo queda auditada para revisión sin sobrepago | PASS | MySQL real / proveedor controlado |
| Fallo antes de enlazar SalePayment revierte el abono y permite reenvío seguro | PASS | MySQL real / proveedor controlado |
| Webhook con respuesta perdida tras commit se reenvía sin duplicar abono | PASS | MySQL real / proveedor controlado |

| Validación externa pendiente | Resultado |
|---|---|
| Tarjeta APPROVED | PENDING_CREDENTIALS / configuración HTTPS |
| Tarjeta DECLINED | PENDING_CREDENTIALS / configuración HTTPS |
| Nequi APPROVED/DECLINED | PENDING_CREDENTIALS / configuración HTTPS |
| PSE según habilitación | PENDING_CREDENTIALS / configuración HTTPS |
| Webhook HTTPS real | PENDING_CREDENTIALS / configuración HTTPS |
| Captura checkout Wompi alojado | PENDING_CREDENTIALS / configuración HTTPS |

Los PASS internos no se cuentan como aprobación externa. No se repitieron QA-1/QA-2 completos.
