# Cobros de demostración Wompi Sandbox

Estado externo: `WOMPI_EXTERNAL_SANDBOX=PENDING_CREDENTIALS`.

H05 se corrige con intención estable y restricción única en SalePayment. PaymentAttempt conserva el intento del proveedor y solo enlaza un movimiento tras aprobación verificada. La API rechaza llaves de producción y requiere MySQL aislado local.

- [Ejecución, fuentes y pendiente externo](INSTRUCCIONES_SANDBOX.md)
- [Escenarios dirigidos](ESCENARIOS_Y_RESULTADOS.md)
- [Secuencia editable](secuencia-cobro.mmd)
- [Modelo mínimo](modelo-datos.dbml)
- [Nota para revisión del director](NOTA_AMPLIACION_ALCANCE.md)

No se migró Aiven ni se activó dinero real. Los PASS de proveedor son controlados hasta completar el procedimiento externo. Las migraciones son aditivas y forward-only; revisar aplicación coordinada de esquema y nuevo DTO antes de cualquier despliegue.
