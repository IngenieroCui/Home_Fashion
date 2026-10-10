# Automated business journeys

Ejecución: 20261010204640-afd3702f. Fecha UTC: 2026-10-10T20:51:33.466Z. Resultado: passed.

Suite permanente sobre los cambios locales actuales de Home Fashion. Ninguna escritura contra Aiven. Sin DROP/TRUNCATE/reset.

| Escenario | Resultado | Duración |
| --- | --- | --- |
| 01 · Solicitud pública → cotización → venta → taller → entrega del mismo pedido | PASS | 83.5 s |
| 03 · ADMIN registra cliente, venta directa, abono y pedido de inventario | PASS | 28.3 s |
| 02 · Pedido mixto: reserva real y fabricación conservan venta y líneas | PASS | 7.5 s |
| 04 · EMPLOYEE limitado, WORKSHOP ajeno y tracking público protegen datos | PASS | 12.6 s |
| 05 · Respuesta perdida conserva requestId, refresh continúa y acciones repetidas no duplican | PASS | 19.1 s |

## Integración y límites

- Cliente y operaciones principales ADMIN en Chromium real contra Next.js y NestJS.
- WORKSHOP usa autenticación y operaciones API reales; esto no demuestra ejecución móvil.
- MySQL local dedicado: host, puerto, nombre, UUID, marcador y SHOW GRANTS verificados antes de migrar/sembrar y al abrir cada fixture.
- Cloudinary: REAL: multipart de taller y entrega en carpeta E2E; URLs persistidas en MySQL. Los happy paths no interceptan respuestas.
- Android runtime PENDIENTE. No se instaló Android SDK.
- Solo recuperación introduce fallos de red después de recibir respuestas reales; no fabrica éxitos.
- No se guardan storageState, cookies, contraseñas ni tokens. Las trazas de error son trazas semánticas JSON de test.step, sin tráfico HTTP; las trazas ZIP de Playwright se desactivan porque capturan secretos.
- Datos, relaciones, estados SQL y capturas representativas en automated-business-journeys/results.json y archivos adjuntos.

## Datos enlazados y estados MySQL

### 01 · Solicitud pública → cotización → venta → taller → entrega del mismo pedido

```json
{
  "actors": [
    "Visitante",
    "ADMIN (navegador)",
    "WORKSHOP (API)"
  ],
  "modules": [
    "Catálogo",
    "Solicitud pública",
    "Cotizaciones",
    "Ventas",
    "Abonos",
    "Pedidos",
    "Taller",
    "Revisión",
    "Tracking",
    "Entregas",
    "Cloudinary"
  ],
  "ids": {
    "requestId": "c93cc000-f1e4-4020-908c-7c5a9fade8c2",
    "requestCode": "HF-SOL-2026-00001",
    "quoteId": "1",
    "saleId": "1",
    "paymentId": "1",
    "orderId": "1",
    "jobId": "1",
    "workshopId": "3",
    "startedId": "1",
    "progressId": "2",
    "reportId": "3",
    "deliveryId": "1"
  },
  "finalMySQL": {
    "chain": [
      {
        "quote_id": "1",
        "request_code": "HF-SOL-2026-00001",
        "quote_status": "ACCEPTED",
        "request_id": "c93cc000-f1e4-4020-908c-7c5a9fade8c2",
        "quote_customer_id": "1",
        "sale_id": "1",
        "customer_id": "1",
        "sale_quote_id": "1",
        "order_id": "1",
        "order_sale_id": "1",
        "order_customer_id": "1",
        "order_status": "COMPLETED",
        "delivery_id": "1",
        "delivery_status": "DELIVERED",
        "job_id": "1",
        "job_status": "COMPLETED",
        "report_id": "3",
        "review_status": "APPROVED",
        "report_evidence": [
          "https://res.cloudinary.com/dhgcts852/image/upload/v1791665311/home-fashion-e2e/20261010204640-afd3702f/workshop-progress/HF-TAL-2026-00001/x0w7woiq7ujanmtva6bk.webp"
        ],
        "delivery_evidence": [
          "https://res.cloudinary.com/dhgcts852/image/upload/v1791665339/home-fashion-e2e/20261010204640-afd3702f/deliveries/HF-ENT-2026-00001/vmbyaywcjvugolqqdocn.webp"
        ]
      }
    ],
    "payments": [
      {
        "id": "1",
        "sale_id": "1",
        "amount": "50000.00",
        "type": "DEPOSIT"
      }
    ],
    "items": [
      {
        "product_id": "1",
        "product_variant_id": "2",
        "quote_name": "QA Mueble 20261010204640-afd3702f",
        "sale_variant": "2",
        "order_variant": "2",
        "quote_quantity": 1,
        "sale_quantity": 1,
        "order_quantity": 1,
        "sale_name": "QA Mueble 20261010204640-afd3702f",
        "order_name": "QA Mueble 20261010204640-afd3702f",
        "status": "DELIVERED"
      }
    ]
  },
  "notes": [
    "WORKSHOP: integración API real, no Android. Imagen PNG multipart enviada a Cloudinary real."
  ]
}
```

### 03 · ADMIN registra cliente, venta directa, abono y pedido de inventario

```json
{
  "actors": [
    "ADMIN (navegador)"
  ],
  "modules": [
    "Clientes",
    "Catálogo",
    "Ventas",
    "Abonos",
    "Pedidos",
    "Inventario"
  ],
  "ids": {
    "customerId": "2",
    "saleId": "2",
    "paymentId": "2",
    "orderId": "2"
  },
  "finalMySQL": {
    "sales": [
      {
        "id": "2",
        "customer_id": "2",
        "quote_id": null,
        "total": "250000.00"
      }
    ],
    "payments": [
      {
        "id": "2",
        "sale_id": "2",
        "amount": "50000.00"
      }
    ],
    "items": [
      {
        "sale_item_id": "2",
        "product_id": "1",
        "product_variant_id": "1",
        "sale_name": "QA Mueble 20261010204640-afd3702f",
        "sku_snapshot": "QA-STOCK-20261010204640-afd3702f",
        "quantity": 1,
        "order_id": "2",
        "linked_sale_item": "2",
        "order_name": "QA Mueble 20261010204640-afd3702f",
        "supply_type": "IN_STOCK",
        "status": "RESERVED"
      }
    ],
    "inventory": [
      {
        "id": "1",
        "quantity_reserved": 1
      }
    ],
    "balance": 200000
  },
  "notes": []
}
```

### 02 · Pedido mixto: reserva real y fabricación conservan venta y líneas

```json
{
  "actors": [
    "ADMIN (navegador)",
    "WORKSHOP (API)"
  ],
  "modules": [
    "Clientes",
    "Ventas",
    "Pedidos",
    "Inventario",
    "Taller"
  ],
  "ids": {
    "customerId": "3",
    "saleId": "3",
    "orderId": "3",
    "jobId": "2"
  },
  "finalMySQL": {
    "orders": [
      {
        "id": "3",
        "sale_id": "3",
        "status": "IN_PROGRESS"
      }
    ],
    "items": [
      {
        "id": "3",
        "sale_item_id": "3",
        "supply_type": "IN_STOCK",
        "status": "RESERVED"
      },
      {
        "id": "4",
        "sale_item_id": "4",
        "supply_type": "MADE_TO_ORDER",
        "status": "IN_PRODUCTION"
      }
    ],
    "jobs": [
      {
        "id": "2",
        "order_item_id": "4",
        "status": "IN_PROGRESS"
      }
    ],
    "inventory": [
      {
        "id": "1",
        "quantity_reserved": 2
      }
    ],
    "reservationBefore": 1
  },
  "notes": []
}
```

### 04 · EMPLOYEE limitado, WORKSHOP ajeno y tracking público protegen datos

```json
{
  "actors": [
    "ADMIN (API setup)",
    "EMPLOYEE (navegador/API)",
    "WORKSHOP (API)",
    "Visitante"
  ],
  "modules": [
    "Sesión",
    "Permisos",
    "Navegación",
    "Finanzas",
    "Taller",
    "Revisión",
    "Tracking"
  ],
  "ids": {
    "customerId": "4",
    "saleId": "4",
    "orderId": "4",
    "jobId": "3",
    "foreignJobId": "4"
  },
  "finalMySQL": {
    "reports": [
      {
        "id": "5",
        "workshop_job_id": "3",
        "review_status": "APPROVED"
      },
      {
        "id": "6",
        "workshop_job_id": "3",
        "review_status": "REJECTED"
      },
      {
        "id": "7",
        "workshop_job_id": "3",
        "review_status": "PENDING_REVIEW"
      }
    ],
    "foreignJob": [
      {
        "id": "4",
        "status": "ASSIGNED"
      }
    ]
  },
  "notes": [
    "Preparación de privacidad mediante API ADMIN real. Navegación EMPLOYEE y tracking en navegador real."
  ]
}
```

### 05 · Respuesta perdida conserva requestId, refresh continúa y acciones repetidas no duplican

```json
{
  "actors": [
    "Visitante",
    "ADMIN (navegador)"
  ],
  "modules": [
    "Solicitud pública",
    "Sesión/refresh",
    "Ventas",
    "Abonos",
    "Pedidos",
    "Inventario",
    "Red"
  ],
  "ids": {
    "requestId": "da5c8f28-930e-4d5f-8399-74b25e7bbc06",
    "requestCode": "HF-SOL-2026-00002",
    "quoteId": "2",
    "saleId": "5",
    "orderId": "5"
  },
  "finalMySQL": {
    "publicRequest": [
      {
        "id": "2",
        "code": "HF-SOL-2026-00002",
        "public_request_key": "da5c8f28-930e-4d5f-8399-74b25e7bbc06",
        "status": "REQUESTED"
      }
    ],
    "payments": [
      {
        "id": "3",
        "sale_id": "5",
        "amount": "50000.00"
      }
    ],
    "orders": [
      {
        "id": "5",
        "sale_id": "5",
        "status": "OPEN"
      }
    ],
    "inventory": [
      {
        "id": "1",
        "quantity_reserved": 3
      }
    ]
  },
  "notes": [
    "Cookies solo en memoria; refresh real vía ruta de sesión y NestJS, sin JWT fabricados.",
    "Fallos de red inducidos después de respuestas reales de negocio. No se interceptan happy paths ni se fabrican éxitos."
  ]
}
```


## Validación complementaria y pendientes

- Typecheck E2E: PASS. Guard de aislamiento: 2/2 PASS. Regresión Umzug: 3/3 PASS. Lint de migraciones: PASS.
- Bug corregido: el import dinámico de Umzug no resolvía exports TypeScript bajo tsx (up is not a function). Se añadió resolver compatible y prueba de regresión, preservando historial js/ts.
- Flutter devices se ejecutó: Windows, Chrome y Edge; 0 dispositivos Android. Android runtime PENDIENTE; no se instaló SDK ni se afirma ejecución móvil. No se preparó integration_test móvil al no existir dispositivo para verificarlo.
- Escaneo de secretos de evidencia: PASS. Seis capturas revisadas; ninguna contraseña, JWT o enlace privado persistido.
- Cloudinary REAL: imágenes sintéticas de taller y entrega; carpeta home-fashion-e2e/20261010204640-afd3702f. Activos QA conservados como evidencia.
- Comando: pnpm test:e2e:journey desde la raíz de Home Fashion. MySQL descartable permanece disponible en 127.0.0.1:33307; pnpm test:e2e:stop lo detiene verificando UUID/datadir.
- No se repitió la suite exhaustiva de 343 tests API. Se conservaron los tests existentes y los cambios locales del usuario.
