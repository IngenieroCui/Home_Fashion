# Migraciones

Usa nombres con timestamp, por ejemplo `20260804143000-create-example.ts`. Cada migración debe exportar `up` y `down`; para cambios de varias operaciones usa transacciones explícitas. Las migraciones modifican estructura y nunca usan `sync` ni `alter`.
