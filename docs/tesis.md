CONTEXTO MAESTRO HF-CONTEXT-01
HOME FASHION — MODELO DE NEGOCIO, PRODUCTO, MVP Y TRABAJO DE GRADO

Lee completamente este contexto antes de planificar, diseñar, delegar o modificar código.

Este documento define:

- qué problema resuelve Home Fashion;
- cómo funciona el negocio;
- quiénes usan el sistema;
- cuáles son las reglas comerciales;
- qué representa el MVP;
- qué debe demostrar el trabajo de grado;
- qué decisiones técnicas ya son permanentes;
- qué módulos existen actualmente;
- qué funcionalidades siguen pendientes;
- qué no debe incluirse en el alcance.

Después de comprenderlo, ejecuta el prompt técnico multiagente que será enviado a continuación.

No vuelvas a diseñar el producto desde cero.
No sustituyas estas reglas por supuestos genéricos de comercio electrónico.
El repositorio actual y este contexto son las fuentes principales de verdad.

==================================================
1. IDENTIDAD DEL PROYECTO
==================================================

Nombre del proyecto:

Home Fashion

Tipo de proyecto:

Sistema web y móvil para digitalizar la operación comercial y productiva de una mueblería familiar.

Contexto académico:

Trabajo de grado de Ingeniería de Sistemas de Juan David Reyes Cure en la Universidad de Ibagué.

Contexto empresarial:

Home Fashion es una mueblería familiar ubicada en Ibagué, Colombia.

Actualmente gran parte de su operación se realiza de manera manual:

- los clientes deben ir físicamente para conocer productos y precios;
- no existe un catálogo digital completo;
- las cotizaciones se preparan manualmente;
- las ventas, abonos y saldos se gestionan sin un sistema centralizado;
- la fabricación depende de talleres externos;
- la coordinación con talleres se realiza mediante llamadas o mensajería;
- los avances no se registran estructuradamente;
- el cliente debe preguntar repetidamente por el estado de su pedido;
- las entregas y evidencias de recepción se gestionan manualmente;
- no existe trazabilidad integral desde la cotización hasta la entrega.

El sistema no es una simulación académica.

Debe quedar como una herramienta real, usable y mantenible para el negocio familiar.

==================================================
2. PROBLEMA CENTRAL
==================================================

Home Fashion necesita centralizar y digitalizar:

- catálogo;
- clientes;
- cotizaciones;
- precios negociados;
- ventas;
- abonos y saldos;
- pedidos;
- inventario de muebles terminados;
- fabricación mediante talleres externos;
- avances de fabricación;
- revisión interna de avances;
- seguimiento privado para el cliente;
- programación y evidencia de entrega.

El problema no es solamente “crear una tienda virtual”.

El valor diferencial del proyecto es conectar en un mismo flujo:

CLIENTE
→ PERSONAL DE HOME FASHION
→ VENTA
→ PEDIDO
→ INVENTARIO O TALLER
→ AVANCES
→ APROBACIÓN
→ SEGUIMIENTO DEL CLIENTE
→ ENTREGA

==================================================
3. OBJETIVO GENERAL DEL PRODUCTO
==================================================

Construir una solución web y móvil que permita a Home Fashion administrar su catálogo, clientes, cotizaciones, ventas, pagos, pedidos, fabricación y entregas, mientras ofrece a los talleres una aplicación para reportar avances y a los clientes un seguimiento privado y seguro de sus pedidos.

El sistema debe:

- reducir procesos manuales;
- mejorar la organización interna;
- conservar información histórica;
- reducir llamadas repetitivas del cliente;
- mejorar la coordinación con talleres;
- proporcionar trazabilidad;
- servir como base demostrable y evaluable para el trabajo de grado.

==================================================
4. ACTORES DEL SISTEMA
==================================================

4.1 CLIENTE

No necesita una cuenta para el MVP.

Puede:

- consultar el catálogo público;
- buscar productos;
- filtrar categorías;
- ver variantes y personalizaciones;
- enviar una solicitud de compra o cotización;
- recibir un enlace privado de seguimiento;
- consultar avances aprobados;
- consultar el estado general de sus productos;
- consultar información pública de entrega cuando sea seguro.

No puede ver:

- costos;
- márgenes;
- pagos internos;
- datos del taller;
- usuarios internos;
- instrucciones internas;
- avances pendientes o rechazados;
- comentarios administrativos;
- información de otros clientes.

4.2 ADMINISTRADOR O PROPIETARIO

Representa principalmente al dueño de Home Fashion.

Puede:

- administrar catálogo;
- administrar usuarios y permisos cuando exista esa interfaz;
- consultar costos;
- consultar márgenes;
- administrar clientes;
- crear cotizaciones;
- negociar precios;
- registrar ventas;
- registrar pagos;
- crear pedidos;
- clasificar elementos;
- asignar trabajos;
- revisar avances;
- gestionar seguimiento;
- gestionar entregas;
- consultar toda la operación.

ADMIN recibe todos los permisos registrados mediante la regla global actual.

4.3 EMPLEADO

Representa principalmente a la persona que opera diariamente el negocio.

Puede realizar funciones operativas según sus permisos efectivos:

- clientes;
- cotizaciones;
- ventas;
- pagos;
- pedidos;
- inventario;
- asignaciones;
- revisión de avances;
- entregas.

No debe recibir acceso financiero total de manera automática.

Los permisos deben continuar siendo configurables y validados por backend.

4.4 TALLER

Un taller no es una empresa separada dentro del modelo actual.

En la V1 se representa mediante un usuario activo con rol:

WORKSHOP

El taller:

- inicia sesión en la aplicación Flutter;
- consulta únicamente sus trabajos asignados;
- ve especificaciones necesarias;
- ve producto, variante, cantidad y personalización;
- ve instrucciones y fecha esperada;
- reporta inicio;
- reporta avances;
- marca fabricación lista para revisión;
- consulta el estado de revisión de sus reportes.

Nunca debe:

- consultar trabajos de otros talleres;
- consultar clientes completos;
- consultar precios;
- consultar pagos;
- consultar costos o márgenes;
- publicar directamente al cliente;
- aprobar sus propios avances;
- acceder al panel administrativo.

4.5 RESPONSABLE DE ENTREGA

Puede ser:

- propietario;
- empleado;
- conductor externo.

No es obligatorio crear un rol nuevo para la V1.

La asignación se representa dentro de Delivery.

==================================================
5. MODELO COMERCIAL
==================================================

Home Fashion vende muebles:

- terminados;
- personalizables;
- disponibles en inventario;
- fabricados bajo pedido.

Los productos pueden incluir:

- categoría;
- nombre;
- descripción;
- imágenes;
- variantes;
- SKU;
- precio;
- costo estimado opcional;
- cantidad disponible;
- personalizaciones.

Una variante representa una combinación vendible concreta.

Ejemplos:

- Sofá Verona de tres puestos.
- Sofá Verona de dos puestos.
- Comedor de cuatro puestos.
- Cama tamaño queen.

Las personalizaciones pueden incluir:

- dimensiones;
- cantidad de puestos;
- material;
- tela;
- color;
- acabado;
- observaciones;
- restricciones de acceso.

No todas las ventas requieren una variante exacta.

Un elemento completamente personalizado puede no tener productVariantId.

==================================================
6. INVENTARIO
==================================================

El sistema administra únicamente inventario de muebles terminados.

No se administran:

- madera;
- espuma;
- tela;
- pintura;
- tornillos;
- materias primas de talleres.

Campos importantes:

- quantityOnHand;
- quantityReserved.

Disponibilidad:

quantityOnHand - quantityReserved

Cuando un OrderItem es IN_STOCK:

- debe tener variante;
- reserva unidades aumentando quantityReserved;
- no debe reducir quantityOnHand al crear el pedido;
- la reserva debe ser transaccional;
- varias líneas con la misma variante se agregan antes de validar;
- nunca debe reservarse más de lo disponible.

Cuando un OrderItem es MADE_TO_ORDER:

- no modifica inventario;
- puede tener variante o no;
- queda pendiente de fabricación.

No inventar movimientos de materias primas.

==================================================
7. CLIENTES Y COTIZACIONES
==================================================

Customer representa un cliente identificado por el negocio.

Quote representa una cotización.

QuoteItem conserva snapshots históricos.

Las cotizaciones pueden contener:

- productos;
- variantes;
- personalización;
- cantidad;
- precio original;
- precio negociado;
- motivo de negociación;
- descuento;
- entrega;
- notas.

Los precios y totales se calculan en backend.

No confiar en valores financieros enviados por el navegador.

Una solicitud pública puede reutilizar Quote con estado REQUESTED cuando sea coherente con el modelo existente.

No crear un dominio duplicado sin necesidad.

El cliente público puede enviar:

- nombre;
- teléfono;
- email cuando corresponda;
- producto;
- variante;
- cantidad;
- personalización;
- mensaje.

Nunca debe decidir:

- precio final;
- costo;
- descuento;
- margen;
- estado interno posterior.

==================================================
8. PRECIOS NEGOCIADOS Y COSTOS
==================================================

Un elemento puede venderse con precio negociado.

Debe conservarse:

- precio original;
- precio negociado;
- motivo;
- usuario responsable;
- fecha;
- snapshot histórico.

El backend es responsable de recalcular.

El costo estimado:

- es opcional;
- puede ser null;
- no debe convertirse automáticamente en cero;
- nunca se expone al cliente;
- no debe exponerse a usuarios sin permiso financiero.

Una venta por debajo del costo:

- no debe modificarse silenciosamente;
- requiere permiso específico;
- debe quedar preparada para auditoría;
- puede permitirse cuando el negocio lo autorice.

==================================================
9. VENTAS Y PAGOS
==================================================

Una venta puede crearse:

- directamente;
- a partir de una cotización aceptada.

Sale y SaleItem conservan snapshots históricos.

Una venta confirmada puede convertirse en pedido una sola vez.

Los pagos son movimientos append-only.

Tipos actuales o esperados:

- DEPOSIT;
- PAYMENT;
- FINAL_PAYMENT;
- REFUND;
- ADJUSTMENT.

Métodos posibles:

- CASH;
- CARD;
- TRANSFER;
- ADDI;
- SISTECREDITO;
- OTHER.

El saldo se calcula en backend:

total
- pagos válidos
+ devoluciones o ajustes aplicables.

No modificar pagos históricos directamente.

Las correcciones deben realizarse mediante movimientos o anulaciones controladas.

==================================================
10. PEDIDOS
==================================================

Order se crea desde una Sale CONFIRMED.

Una venta solo puede generar un pedido.

Cada SaleItem debe aparecer exactamente una vez en OrderItem.

No permitir:

- elementos omitidos;
- elementos duplicados;
- elementos de otra venta;
- cantidades modificadas;
- snapshots reconstruidos desde catálogo.

Cada OrderItem se clasifica como:

IN_STOCK
o
MADE_TO_ORDER

Estados generales actuales de Order:

- OPEN
- IN_PROGRESS
- READY
- COMPLETED
- CANCELLED

Estados actuales de OrderItem:

- RESERVED
- PENDING_PRODUCTION
- IN_PRODUCTION
- READY
- DELIVERED
- CANCELLED

El sistema debe conservar estados coherentes.

No crear transiciones automáticas que no estén definidas.

==================================================
11. FABRICACIÓN Y TALLERES
==================================================

Cada OrderItem MADE_TO_ORDER puede tener como máximo un WorkshopJob.

WorkshopJob:

- pertenece a un OrderItem;
- pertenece a un usuario WORKSHOP;
- conserva instrucciones;
- conserva fecha esperada;
- conserva quién asignó;
- conserva estado.

Estados actuales:

- ASSIGNED;
- IN_PROGRESS;
- READY_FOR_REVIEW;
- COMPLETED;
- CANCELLED.

Una asignación nueva inicia en ASSIGNED.

Asignar un trabajo:

- no cambia inmediatamente OrderItem;
- no cambia inventario;
- no crea pagos;
- no crea avances;
- no publica nada al cliente.

Un usuario ADMIN o EMPLOYEE no puede ser elegido como taller.

Un usuario WORKSHOP inactivo tampoco puede ser elegido.

==================================================
12. AVANCES DE FABRICACIÓN
==================================================

WorkshopProgressReport representa un reporte append-only.

Tipos:

- STARTED;
- PROGRESS;
- READY_FOR_REVIEW.

Estados de revisión:

- PENDING_REVIEW;
- APPROVED;
- REJECTED.

STARTED:

- solo desde WorkshopJob ASSIGNED;
- OrderItem debe estar PENDING_PRODUCTION;
- Job pasa a IN_PROGRESS;
- OrderItem pasa a IN_PRODUCTION.

PROGRESS:

- solo durante IN_PROGRESS;
- OrderItem debe estar IN_PRODUCTION;
- porcentaje opcional entre 1 y 99;
- no cambia estados.

READY_FOR_REVIEW:

- solo desde IN_PROGRESS;
- porcentaje se fuerza a 100;
- Job pasa a READY_FOR_REVIEW;
- OrderItem continúa IN_PRODUCTION;
- espera decisión administrativa.

Aprobar READY_FOR_REVIEW:

- Job pasa a COMPLETED;
- OrderItem pasa a READY.

Rechazar READY_FOR_REVIEW:

- Job vuelve a IN_PROGRESS;
- OrderItem continúa IN_PRODUCTION;
- el taller puede enviar otro reporte.

Los reportes:

- no se editan;
- no se eliminan;
- conservan mensaje;
- porcentaje;
- evidencias;
- autor;
- fecha;
- revisión.

Solo APPROVED puede mostrarse en el seguimiento del cliente.

PENDING_REVIEW y REJECTED son internos.

==================================================
13. EVIDENCIAS
==================================================

Actualmente el backend acepta evidenceUrls.

En el código actual:

- máximo cinco;
- cada valor debe ser URL válida;
- no se valida contenido remoto;
- no existe upload real todavía.

No fingir carga de imágenes.

No enviar rutas locales como URLs.

Una integración futura puede usar Cloudinary mediante una abstracción de archivos.

Cloudinary no debe bloquear el MVP técnico si no está configurado.

==================================================
14. SEGUIMIENTO DEL CLIENTE
==================================================

El cliente no necesita cuenta.

Recibe un enlace privado:

/seguimiento/{token}

El token:

- tiene alta entropía;
- se genera con randomBytes;
- se almacena únicamente como hash SHA-256;
- puede rotarse;
- puede revocarse;
- puede expirar;
- solo se muestra completo al generarlo o rotarlo.

El seguimiento público puede mostrar:

- código del pedido;
- estado general;
- fecha;
- fecha prometida;
- productos;
- variantes;
- personalización;
- cantidades;
- estado por elemento;
- fecha esperada;
- avances APPROVED;
- evidencias aprobadas.

No debe mostrar:

- nombre completo del cliente;
- documento;
- teléfono;
- email;
- dirección;
- precios;
- pagos;
- saldo;
- costos;
- márgenes;
- taller;
- usuarios internos;
- instrucciones internas;
- comentarios de revisión;
- reportes pendientes;
- reportes rechazados.

Token inválido, expirado o revocado:

- produce una respuesta genérica;
- no revela si el pedido existe.

==================================================
15. ENTREGAS
==================================================

Delivery debe cerrar el recorrido del pedido.

La entrega V1 puede contener:

- pedido;
- código;
- estado;
- dirección;
- referencia;
- contacto;
- teléfono;
- fecha;
- franja;
- tipo;
- responsable interno o conductor externo;
- tarifa opcional;
- notas;
- receptor;
- evidencias;
- fecha real de entrega.

Estados esperados:

- SCHEDULED;
- OUT_FOR_DELIVERY;
- DELIVERED;
- CANCELLED.

Una entrega completada debe exigir:

- nombre del receptor;
- al menos una evidencia válida.

No integrar:

- mapas;
- geocodificación;
- cálculo automático de rutas;
- tracking GPS;
- upload falso.

La entrega no debe modificar pagos ni inventario de manera arbitraria.

La transición de Order y OrderItem debe ser coherente con sus estados reales y estar probada.

==================================================
16. ROLES Y PERMISOS
==================================================

Roles:

- ADMIN;
- EMPLOYEE;
- WORKSHOP.

Permisos relevantes existentes:

- CATALOG_MANAGE;
- CUSTOMER_MANAGE;
- QUOTE_MANAGE;
- SALE_MANAGE;
- SALE_PRICE_OVERRIDE;
- FINANCIAL_PAYMENT_REGISTER;
- FINANCIAL_PAYMENT_CORRECT;
- ORDER_MANAGE;
- WORKSHOP_MANAGE;
- WORKSHOP_JOB_VIEW;
- WORKSHOP_PROGRESS_SUBMIT;
- PROGRESS_REVIEW.

Reglas:

ADMIN:

- recibe todos los permisos registrados mediante la regla global.

EMPLOYEE:

- recibe permisos operativos según seeder y overrides;
- no debe recibir automáticamente acceso a costos o correcciones sensibles.

WORKSHOP:

- únicamente consulta sus trabajos;
- envía sus avances;
- no administra asignaciones;
- no revisa avances;
- no accede a ventas o clientes.

La interfaz puede ocultar acciones según permiso.

El backend siempre es la autoridad definitiva.

==================================================
17. EXPERIENCIA DE USUARIO
==================================================

17.1 WEB PÚBLICA

Debe ser:

- responsive;
- clara;
- mobile-first;
- usable por clientes no técnicos;
- sin lenguaje interno;
- sin datos sensibles;
- sin formularios excesivamente complejos.

17.2 PANEL ADMINISTRATIVO

Debe ser usable principalmente por:

- propietario;
- empleada operativa.

Evitar:

- solicitar IDs internos;
- formularios excesivamente técnicos;
- JSON crudo;
- acciones decorativas;
- botones sin efecto;
- mensajes genéricos sin explicación;
- flujos que obliguen a memorizar códigos.

17.3 FLUTTER

Debe ser usable por talleres desde Android.

Prioridades:

- iniciar sesión fácilmente;
- consultar trabajos;
- entender especificaciones;
- reportar un avance en menos de un minuto;
- funcionar razonablemente con red lenta;
- mostrar errores claros;
- conservar formularios ante errores;
- evitar lenguaje técnico;
- acciones principales visibles.

La aplicación iOS no es prioridad del MVP.

==================================================
18. OBJETIVO ACADÉMICO
==================================================

El proyecto debe servir como trabajo de grado serio y verificable.

Debe demostrar:

- levantamiento de requerimientos reales;
- análisis del problema;
- diseño de arquitectura;
- modelado de datos;
- seguridad y autorización;
- desarrollo web y móvil;
- reglas de negocio;
- integración entre actores;
- pruebas técnicas;
- validación con usuarios;
- despliegue;
- medición de resultados.

El sistema debe producir evidencia para el documento académico:

- arquitectura;
- casos de uso;
- modelo entidad-relación;
- diagramas de secuencia;
- máquinas de estados;
- endpoints;
- decisiones técnicas;
- pruebas;
- capturas;
- resultados;
- observaciones de usuarios;
- conclusiones.

No se debe escribir código únicamente para “llenar módulos”.

Cada funcionalidad debe poder relacionarse con:

- un problema real;
- un requerimiento;
- un actor;
- un objetivo;
- una evidencia verificable.

==================================================
19. PROPUESTA DE TRABAJO DE GRADO
==================================================

La propuesta debe prepararse antes o alrededor del 15 de agosto de 2026.

La propuesta incluirá posteriormente:

- título;
- datos del estudiante y tutor;
- modalidad;
- resumen de 200–250 palabras;
- planteamiento del problema;
- justificación;
- objetivo general;
- máximo cuatro objetivos específicos;
- marco de referencia;
- metodología;
- resultados esperados;
- cronograma;
- presupuesto;
- bibliografía.

No es necesario tener la aplicación terminada para presentar la propuesta.

Sin embargo, disponer de un MVP técnico avanzado permite:

- demostrar viabilidad;
- definir mejor el alcance;
- tomar capturas;
- construir diagramas reales;
- presentar una arquitectura creíble;
- estimar mejor el cronograma;
- reducir riesgos durante el semestre.

El desarrollo técnico y la redacción académica avanzarán en paralelo.

==================================================
20. ALCANCE DEL MVP
==================================================

El MVP debe permitir demostrar este recorrido:

1. Un cliente consulta el catálogo.
2. Envía una solicitud.
3. Home Fashion registra o selecciona el cliente.
4. Crea una cotización.
5. Negocia el precio cuando corresponda.
6. Convierte la cotización o crea una venta.
7. Registra un abono.
8. Crea el pedido.
9. Clasifica cada elemento como inventario o fabricación.
10. Reserva inventario cuando corresponda.
11. Asigna elementos fabricables a talleres.
12. El taller consulta el trabajo en Flutter.
13. El taller reporta inicio y avances.
14. Home Fashion aprueba o rechaza.
15. El cliente consulta únicamente avances aprobados.
16. Home Fashion programa la entrega.
17. Se registra receptor y evidencia.
18. El pedido queda completado.

El MVP no necesita ser un ERP completo.

Debe ser:

- coherente;
- demostrable;
- seguro;
- limitado;
- mantenible;
- desplegable;
- usable.

==================================================
21. FUERA DEL ALCANCE DEL MVP
==================================================

No convertir en requisitos obligatorios:

- inventario de materias primas;
- contabilidad completa;
- nómina;
- impuestos;
- facturación electrónica;
- integración real con bancos;
- integración directa con Addi;
- integración directa con Sistecrédito;
- integración con datáfonos;
- WhatsApp API;
- SMS obligatorio;
- mapas;
- optimización de rutas;
- comunicación directa taller-cliente;
- marketplace;
- multiempresa;
- multialmacén;
- SaaS multi-tenant;
- microservicios;
- Docker;
- Kubernetes;
- Redis;
- event sourcing;
- Nx;
- Turborepo;
- aplicación iOS antes de validar Android;
- inteligencia artificial decorativa;
- analítica avanzada;
- contabilidad de talleres;
- pasarela de pagos simulada.

Estas capacidades pueden registrarse como trabajo futuro.

==================================================
22. STACK TÉCNICO DEFINITIVO
==================================================

Monorepo:

- pnpm workspaces.

Backend:

- NestJS;
- TypeScript;
- Sequelize;
- sequelize-typescript;
- MySQL;
- JWT;
- bcrypt;
- class-validator;
- Umzug;
- Swagger posteriormente.

Web:

- Next.js;
- TypeScript;
- App Router;
- Tailwind o estilos actuales;
- cookies HttpOnly;
- Server Components y handlers internos.

Mobile:

- Flutter;
- Dart;
- Material 3;
- Dio;
- Bloc o Cubit;
- almacenamiento seguro.

Arquitectura:

- monolito modular;
- módulos de dominio;
- API REST;
- base de datos relacional;
- frontend web;
- aplicación móvil.

No usar:

- microservicios;
- Docker;
- Redis;
- Nx;
- Turborepo.

==================================================
23. ESTRUCTURA DEL REPOSITORIO
==================================================

Estructura esperada:

home-fashion/
  apps/
    api/
    web/
    mobile/
  packages/
    shared/
  docs/
    architecture.md
    development.md
  AGENTS.md
  README.md

Documentación permanente:

AGENTS.md:

- reglas permanentes para agentes;
- decisiones obligatorias;
- límites del proyecto.

docs/architecture.md:

- arquitectura actual;
- módulos;
- modelos;
- asociaciones;
- contratos;
- decisiones estructurales.

docs/development.md:

- configuración;
- comandos;
- migraciones;
- pruebas;
- ejecución;
- validaciones manuales.

No convertir estos documentos en diarios de tareas.

Actualizar de forma breve, incremental y sin duplicar.

==================================================
24. ESTADO ACTUAL DEL REPOSITORIO
==================================================

Estado verificado del repositorio al 7 de agosto de 2026:

API IMPLEMENTADA:

- configuración;
- Sequelize;
- Umzug;
- migraciones;
- seeders;
- catálogo;
- autenticación;
- roles;
- permisos;
- refresh;
- clientes;
- cotizaciones;
- ventas;
- pagos;
- pedidos;
- reserva de inventario;
- trabajos de taller;
- reportes de progreso;
- revisión administrativa;
- seguimiento público seguro;
- solicitud pública idempotente;
- entregas y cierre operativo del pedido.

La validación automática más reciente reportó:

- 32 suites y 269 pruebas de API aprobadas;
- lint correcto;
- build correcto.

Esto no equivale todavía a una prueba contra MySQL real.

WEB IMPLEMENTADA:

- inicio;
- catálogo;
- detalle;
- login;
- panel;
- catálogo administrativo;
- clientes;
- cotizaciones;
- ventas;
- pagos;
- pedidos;
- clasificación de elementos;
- asignaciones;
- trabajos;
- revisión de avances;
- creación, rotación y revocación del enlace;
- /seguimiento/[token];
- solicitud pública;
- listado, programación y operación de entregas.

La web ha aprobado lint y build de producción sin API activa.

Aún no se ha probado de punta a punta.

FLUTTER:

- aplicación Android funcional para WORKSHOP;
- login y restauración segura de sesión;
- refresh coordinado;
- listado, búsqueda, filtros y paginación de trabajos propios;
- detalle, especificaciones e historial;
- envío de STARTED, PROGRESS y READY_FOR_REVIEW;
- visualización de aprobación o rechazo;
- pruebas automatizadas incluidas;
- análisis Dart sin hallazgos en la revisión actual.

`flutter test` debe repetirse en una terminal local: dentro del sandbox actual la herramienta se bloqueó antes de emitir resultados. Esto no se registra como prueba aprobada ni como defecto confirmado.

PENDIENTES PRINCIPALES:

- integración real con MySQL;
- smoke test completo con API, navegador y Android;
- búsqueda y corrección de bugs de integración;
- revisión responsive, accesibilidad y ajustes UI/UX;
- configuración y validación de despliegue;
- firma y distribución Android;
- rate limiting, observabilidad y estrategia de backup;
- carga real de archivos;
- validación con usuarios.

==================================================
25. REGLAS TÉCNICAS CRÍTICAS
==================================================

25.1 DATOS HISTÓRICOS

Cotizaciones, ventas, pedidos y trabajos deben conservar snapshots.

No reconstruir información histórica desde entidades actuales.

25.2 FINANZAS

- cálculos en backend;
- decimales seguros;
- costos nunca públicos;
- precios no confiados al navegador;
- pagos append-only;
- correcciones trazables.

25.3 TRANSACCIONES

Usar transacciones y locks en:

- conversión de cotización;
- creación de venta;
- pagos;
- creación de pedido;
- reserva de inventario;
- asignación;
- reportes;
- revisión;
- entregas cuando cambian varios estados.

25.4 CONCURRENCIA

Usar:

- restricciones únicas;
- locks;
- revalidación después del lock;
- errores públicos coherentes.

25.5 SEGURIDAD

- autorización en backend;
- cookies HttpOnly en web;
- almacenamiento seguro en Flutter;
- refresh controlado;
- tokens públicos hasheados;
- respuestas públicas minimizadas;
- no exponer stack traces;
- no exponer metadata ORM;
- no guardar secretos en repositorio.

25.6 CONSULTAS

- paginación SQL;
- no cargar tablas completas;
- evitar N+1;
- no usar slice para paginación;
- asociaciones o consultas agrupadas.

25.7 CALIDAD

- no mocks en funcionalidades finales;
- no placeholders;
- no TODO;
- no FIXME;
- no NotImplemented;
- no botones sin acción;
- no catches vacíos;
- no desactivar lint;
- no reducir pruebas para que pasen.

==================================================
26. ESTADO “IMPLEMENTADO” VS “FUNCIONAL”
==================================================

Una funcionalidad puede estar implementada en código, compilar y aprobar pruebas unitarias.

Eso no significa que funcione de punta a punta.

Hasta probar contra:

- MySQL real;
- API real;
- navegador;
- Android;
- variables reales;

debe considerarse:

IMPLEMENTADA, PERO PENDIENTE DE VALIDACIÓN REAL.

No inventar:

- migraciones ejecutadas;
- conexiones exitosas;
- pruebas HTTP;
- pruebas Android;
- despliegue;
- datos de producción.

La siguiente etapa se dedicará a pruebas manuales e integración.

El repositorio debe conservar el código terminado y verificable automáticamente mientras se corrigen los defectos encontrados.

==================================================
27. PRIORIDAD DE LA ETAPA ACTUAL
==================================================

Prioridad máxima:

1. Documentación técnica y trazabilidad para la propuesta de tesis.
2. Configuración de MySQL real y ejecución de migraciones/seeders en una base descartable.
3. Smoke test completo de catálogo a entrega.
4. Pruebas manuales de permisos, concurrencia, navegador y Android.
5. Registro, priorización y corrección de bugs reproducibles.
6. Revisión responsive, accesibilidad y ajustes UI/UX basados en evidencia.
7. Preparación y ensayo de despliegue con HTTPS, secretos y backup.
8. Validación con usuarios del negocio y conservación de resultados académicos.

No ampliar esta etapa con:

- rediseños globales;
- infraestructura no requerida;
- mejoras cosméticas extensas;
- módulos POST-MVP;
- optimizaciones prematuras.

==================================================
28. RESULTADO ALCANZADO Y SIGUIENTE ETAPA
==================================================

El código quedó en el siguiente estado:

API:

- núcleo comercial completo;
- solicitud pública;
- entregas;
- pruebas automáticas;
- sin errores de lint o build.

WEB:

- flujo público;
- flujo administrativo;
- seguimiento;
- entregas;
- sin errores de lint o build.

MOBILE:

- login WORKSHOP;
- sesión segura;
- listado;
- detalle;
- reportes;
- historial;
- validaciones;
- pruebas automatizadas incluidas;
- análisis Dart sin hallazgos.

La documentación técnica se organiza en:

- `docs/index.md`;
- `docs/architecture.md`;
- `docs/traceability.md`;
- `docs/api.md`;
- `docs/web.md`;
- `docs/mobile.md`;
- `docs/development.md`;
- `docs/smoke-test-mvp.md`.

La siguiente etapa realizará:

- configuración real;
- MySQL;
- migraciones;
- seeders;
- login;
- pruebas manuales;
- corrección de contratos;
- cambios funcionales solicitados;
- ajustes UI/UX;
- preparación y ensayo del despliegue;
- ejecución local de `flutter test` y prueba Android;
- recolección de evidencia para la tesis.

==================================================
29. CRITERIO DE ÉXITO DEL MVP
==================================================

El MVP será técnicamente demostrable cuando pueda ejecutarse este recorrido sin modificar datos manualmente en la base:

1. Crear o encontrar producto.
2. Enviar solicitud pública.
3. Convertirla en cotización.
4. Confirmar venta.
5. Registrar pago.
6. Crear pedido.
7. Reservar elemento disponible.
8. Asignar elemento fabricable.
9. Login del taller.
10. Enviar avances.
11. Revisar avances.
12. Generar seguimiento.
13. Consultar seguimiento.
14. Programar entrega.
15. Registrar recepción.
16. Completar pedido.

Debe existir evidencia mediante:

- pruebas;
- capturas;
- datos demo;
- documentación;
- video;
- validación con actores.

==================================================
30. TRAZABILIDAD PARA LA TESIS
==================================================

Mientras implementas, conserva suficiente claridad para relacionar:

Problema:
procesos manuales y falta de trazabilidad.

Requerimiento:
funcionalidad implementada.

Módulo:
API, web o Flutter.

Actor:
cliente, administrador, empleado o taller.

Evidencia:
prueba, pantalla, endpoint o flujo.

Resultado esperado:
mejor organización, seguimiento y reducción de incertidumbre.

No es necesario redactar ahora el documento completo de tesis.

Sí es necesario evitar decisiones que dificulten:

- diagramas;
- explicación de arquitectura;
- trazabilidad;
- pruebas;
- medición;
- mantenimiento.

==================================================
31. PRINCIPIO RECTOR
==================================================

Primero:

verticales completas, integrables y demostrables.

Después:

infraestructura adicional, pulido y módulos secundarios.

El producto debe mantenerse:

- simple;
- modular;
- seguro;
- realista;
- alineado con el negocio;
- defendible académicamente.

No sobreingenierizar.

No inflar alcance.

No sacrificar reglas comerciales para avanzar más rápido.

No sacrificar integración para producir muchos archivos.

==================================================
32. INSTRUCCIÓN FINAL
==================================================

Internaliza este contexto.

Después ejecuta el siguiente prompt técnico multiagente como agente principal Sol High.

Durante esa ejecución:

- utiliza este contexto para resolver decisiones funcionales;
- utiliza el repositorio como fuente de verdad técnica;
- preserva módulos estables;
- consulta el código antes de asumir contratos;
- prioriza el recorrido completo del MVP;
- corrige defectos verificables;
- no inventes funcionamiento real;
- no hagas commit;
- no hagas push.

No respondas únicamente con un resumen del contexto.

Cuando recibas el siguiente prompt, comienza la ejecución técnica.
