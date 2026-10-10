# Contexto académico y empresarial

## Identidad

- Proyecto: Home Fashion.
- Estudiante: Juan David Reyes Cure.
- Programa: Ingeniería de Sistemas, Universidad de Ibagué.
- Tutor: Steven Alexander Correa del Castillo.
- Modalidad: investigación aplicada / estudio de caso.
- Título: **Desarrollo y evaluación de una plataforma web y móvil para la digitalización de la gestión comercial y la trazabilidad de pedidos en Home Fashion**.

## Problema

Home Fashion combina venta de muebles terminados con fabricación y personalización bajo pedido. La información de catálogo, negociación, pagos, fabricación, avances y entrega se ha gestionado mediante conversaciones y registros separados. La contribución central del proyecto es conectar el recorrido completo y conservar un historial verificable, no limitarse a publicar una tienda virtual.

`CLIENTE → SOLICITUD/COTIZACIÓN → VENTA/PAGO → PEDIDO → INVENTARIO/TALLER → AVANCES/REVISIÓN → TRACKING → ENTREGA`

## Caso de estudio

La solución se evalúa dentro de una mueblería familiar de Ibagué. La muestra es intencional y los resultados se interpretan en este contexto; no se pretende inferencia estadística para todo el sector mobiliario.

## Solución actual

- API NestJS + TypeScript + Sequelize + MySQL.
- Web Next.js para catálogo, personal interno y seguimiento privado.
- Aplicación Flutter Android para usuarios `WORKSHOP`.
- Arquitectura de monolito modular en monorepo pnpm.
- JWT, refresh rotativo, RBAC/permisos y minimización de datos públicos.
- Migraciones como autoridad del esquema (`synchronize: false`).

## Fuentes de autoridad

1. Repositorio local actual.
2. Migraciones y pruebas para comportamiento técnico verificable.
3. Propuesta final revisada para objetivos, alcance y metodología.
4. Documentación vigente del repositorio.
5. Linear y Drive como índices/evidencias.
6. Tesis externas solo como referencia de presentación.
