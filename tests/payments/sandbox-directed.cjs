/* Directed integration: real isolated MySQL + Nest HTTP; Wompi responses explicitly controlled.
 * Run after API build: node tests/payments/sandbox-directed.cjs
 * Never loads .env, never connects Aiven, never calls a payment provider.
 */
const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { createRequire } = require("node:module");
const { randomUUID, createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const root = resolve(__dirname, "../..");
const apiRequire = createRequire(resolve(root, "apps/api/package.json"));
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const { hash } = require("bcryptjs");
const { Sequelize } = apiRequire("sequelize");
const results = [];
const providerTransactions = new Map();
let app, db, standalone, adminId, employeeId, customerId, token, employeeToken;
let fixtureNumber = 0;
const run = randomUUID().slice(0, 8);
const sha = (value) => createHash("sha256").update(value).digest("hex");
async function scenario(name, fn) {
  await fn();
  results.push({
    scenario: name,
    status: "PASS",
    provider: "CONTROLLED",
    database: "MYSQL_8_4_ISOLATED",
  });
  console.log(`PASS ${name}`);
}
async function query(sql, params = []) {
  return (await db.execute(sql, params))[0];
}
async function newSale(total = "250000.00", status = "CONFIRMED") {
  const result = await query(
    `INSERT INTO sales (code, customer_id, quote_id, status, subtotal, discount_total, delivery_fee, total, created_by_user_id, created_at, updated_at)
    VALUES (?, ?, NULL, ?, ?, 0, 0, ?, ?, NOW(), NOW())`,
    [
      `HF-TEST-${run}-${++fixtureNumber}`,
      customerId,
      status,
      total,
      total,
      adminId,
    ],
  );
  return String(result.insertId);
}
const manual = (amount = "50000.00", overrides = {}) => ({
  intentId: randomUUID(),
  type: "PAYMENT",
  method: "CASH",
  amount,
  paidAt: "2026-10-28T15:00:00.000Z",
  ...overrides,
});
async function request(
  path,
  body,
  expected = 200,
  access = token,
  method = "POST",
  extraHeaders = {},
) {
  const response = await fetch(`http://127.0.0.1:3301/api${path}`, {
    method,
    headers: {
      ...(access ? { authorization: `Bearer ${access}` } : {}),
      "content-type": "application/json",
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => null);
  assert.equal(
    response.status,
    expected,
    `${method} ${path.replace(/public\/[^/]+/, "public/[opaque]")}: ${JSON.stringify(result)}`,
  );
  return result;
}
const pay = (saleId, dto, expected = 201) =>
  request(`/admin/sales/${saleId}/payments`, dto, expected);
const count = async (saleId) =>
  Number(
    (
      await query("SELECT COUNT(*) n FROM sale_payments WHERE sale_id = ?", [
        saleId,
      ])
    )[0].n,
  );
const balance = async (saleId) =>
  (await request(`/admin/sales/${saleId}`, undefined, 200, token, "GET"))
    .balance;
async function attempt(saleId, amount = "50000.00", intentId = randomUUID()) {
  return request(
    `/admin/sales/${saleId}/payment-attempts`,
    { amount, intentId },
    201,
  );
}
function eventFor(attempt, status = "APPROVED", overrides = {}) {
  const transaction = {
    id: `test-${randomUUID()}`,
    reference: attempt.reference,
    amount_in_cents: Math.round(Number(attempt.amount) * 100),
    currency: "COP",
    status,
    created_at: new Date().toISOString(),
    finalized_at: status === "APPROVED" ? new Date().toISOString() : null,
    ...overrides,
  };
  providerTransactions.set(transaction.id, { ...transaction });
  return signed(transaction);
}
function signed(
  transaction,
  properties = [
    "transaction.id",
    "transaction.status",
    "transaction.amount_in_cents",
  ],
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const content = properties
    .map((path) => transaction[path.slice("transaction.".length)])
    .join("");
  return {
    event: "transaction.updated",
    data: { transaction },
    environment: "test",
    timestamp,
    signature: {
      properties,
      checksum: sha(content + timestamp + process.env.WOMPI_EVENTS_SECRET),
    },
  };
}
const webhook = (event, expected = 200) =>
  request("/payments/wompi/events", event, expected, null);
function publicPath(attempt) {
  return `/payments/public/${new URL(attempt.url).pathname.split("/").pop()}`;
}

async function main() {
  const isolated = dotenv.parse(readFileSync(resolve(root, ".env.e2e")));
  const owner = JSON.parse(
    readFileSync(resolve(root, ".e2e-local/owner.json")),
  );
  assert.equal(isolated.DB_HOST, "127.0.0.1");
  assert.equal(isolated.DB_NAME, "home_fashion_e2e");
  assert.equal(isolated.DB_PORT, "33307");
  assert.equal(isolated.E2E_DEDICATED, "true");
  Object.assign(process.env, isolated, {
    NODE_ENV: "test",
    DB_SSL_MODE: "DISABLED",
    DB_LOGGING: "false",
    WOMPI_ENABLED: "true",
    WOMPI_PUBLIC_KEY: "pub_test_CONTROLLED_NOT_A_REAL_KEY",
    WOMPI_PRIVATE_KEY: "prv_test_CONTROLLED_NOT_A_REAL_KEY",
    WOMPI_INTEGRITY_SECRET: "test_integrity_CONTROLLED",
    WOMPI_EVENTS_SECRET: "test_events_CONTROLLED",
    WOMPI_LINK_SECRET: "CONTROLLED_TEST_LINK_SECRET_32_CHARACTERS",
    WOMPI_PUBLIC_WEB_URL: "https://demo.home-fashion.invalid",
    WOMPI_SANDBOX_DATABASE_ISOLATED: "true",
    CLOUDINARY_CLOUD_NAME: "",
    CLOUDINARY_API_KEY: "",
    CLOUDINARY_API_SECRET: "",
  });
  db = await mysql.createConnection({
    host: isolated.DB_HOST,
    port: Number(isolated.DB_PORT),
    user: isolated.DB_USER,
    password: isolated.DB_PASSWORD,
    database: isolated.DB_NAME,
  });
  const identity = (
    await query("SELECT @@server_uuid uuid, @@datadir datadir")
  )[0];
  assert.equal(identity.uuid, isolated.E2E_SERVER_UUID);
  assert.equal(identity.uuid, owner.uuid);
  assert.equal(resolve(identity.datadir), resolve(owner.runtime, "data"));
  assert.equal(
    (await query("SELECT marker FROM e2e_isolation WHERE id = 1"))[0].marker,
    isolated.E2E_MARKER,
  );
  standalone = new Sequelize(
    isolated.DB_NAME,
    isolated.DB_USER,
    isolated.DB_PASSWORD,
    { dialect: "mysql", host: "127.0.0.1", port: 33307, logging: false },
  );
  const {
    createMigrator,
  } = require("../../apps/api/dist/database/umzug.factory");
  const migrator = createMigrator(standalone);
  const tables = await query("SHOW TABLES LIKE 'sale_payments'");
  if (!tables.length)
    await migrator.up({ to: "20260928110000-add-commerce-image-snapshots.js" });
  if (!(await query("SELECT id FROM roles LIMIT 1")).length)
    await require("../../apps/api/dist/database/seeders/20260804170500-seed-auth-roles-permissions").up(
      { context: standalone.getQueryInterface() },
    );
  const passwordHash = await hash(isolated.E2E_ACTOR_PASSWORD, 10);
  for (const [role, email, name] of [
    ["ADMIN", `payments-${run}@e2e.invalid`, "ADMIN demo pagos"],
    ["EMPLOYEE", `payments-employee-${run}@e2e.invalid`, "Empleado prueba"],
  ]) {
    const roleId = (
      await query("SELECT id FROM roles WHERE code = ?", [role])
    )[0].id;
    const result = await query(
      "INSERT INTO users (role_id, full_name, email, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())",
      [roleId, name, email, passwordHash],
    );
    if (role === "ADMIN") adminId = String(result.insertId);
    else employeeId = String(result.insertId);
  }
  customerId = String(
    (
      await query(
        "INSERT INTO customers (full_name, phone, is_active, created_by_user_id, created_at, updated_at) VALUES ('Cliente sintético', '0000000000', 1, ?, NOW(), NOW())",
        [adminId],
      )
    ).insertId,
  );
  const historicSale = await newSale();
  const historic = await query(
    `INSERT INTO sale_payments (sale_id, customer_id, type, method, amount, paid_at, status, created_by_user_id, created_at, updated_at)
    VALUES (?, ?, 'DEPOSIT', 'CASH', 100, NOW(), 'REGISTERED', ?, NOW(), NOW())`,
    [historicSale, customerId, adminId],
  );
  const before = (
    await query("SELECT * FROM sale_payments WHERE id = ?", [historic.insertId])
  )[0];
  await migrator.up();
  await scenario(
    "Migración aditiva conserva íntegro el pago histórico",
    async () => {
      const after = (
        await query("SELECT * FROM sale_payments WHERE id = ?", [
          historic.insertId,
        ])
      )[0];
      for (const [field, value] of Object.entries(before))
        assert.deepEqual(after[field], value);
      assert.equal(after.intent_id, null);
      assert.equal(after.intent_fingerprint, null);
      await require("../../apps/api/dist/database/migrations/20261028000000-payment-intentions").up(
        { context: standalone.getQueryInterface() },
      );
    },
  );
  apiRequire("reflect-metadata");
  const { NestFactory } = apiRequire("@nestjs/core");
  const { ValidationPipe } = apiRequire("@nestjs/common");
  const { AppModule } = require("../../apps/api/dist/app.module");
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Test harness only: destroy the socket at response end, AFTER the controller has committed.
  app.use((req, res, next) => {
    if (req.headers["x-hf-test-drop-response"] === "after-commit")
      res.end = () => {
        res.socket.destroy();
        return res;
      };
    next();
  });
  const {
    WompiAdapter,
  } = require("../../apps/api/dist/modules/payments/wompi.adapter");
  const adapter = app.get(WompiAdapter);
  const realLookup = adapter.transaction.bind(adapter);
  let providerQueries = 0;
  adapter.transaction = async (id) => {
    providerQueries++;
    if (!providerTransactions.has(id))
      throw new Error("Controlled transaction missing");
    return providerTransactions.get(id);
  };
  const {
    CloudinaryMediaService,
  } = require("../../apps/api/dist/modules/media/cloudinary-media.service");
  const media = app.get(CloudinaryMediaService);
  let uploads = 0;
  media.uploadImage = async () => ({
    secureUrl: `https://evidence.invalid/${++uploads}.png`,
    publicId: `controlled-${uploads}`,
  });
  media.destroyMany = async () => {};
  await app.listen(3301, "127.0.0.1");
  token = (
    await request(
      "/auth/login",
      {
        email: `payments-${run}@e2e.invalid`,
        password: isolated.E2E_ACTOR_PASSWORD,
      },
      201,
      null,
    )
  ).accessToken;
  employeeToken = (
    await request(
      "/auth/login",
      {
        email: `payments-employee-${run}@e2e.invalid`,
        password: isolated.E2E_ACTOR_PASSWORD,
      },
      201,
      null,
    )
  ).accessToken;
  await scenario(
    "Adaptador consulta Sandbox con llave privada, sin aceptar redirecciones",
    async () => {
      const originalFetch = global.fetch;
      const tx = eventFor({ reference: "adapter-contract", amount: "100.00" })
        .data.transaction;
      global.fetch = async (url, options) => {
        assert.equal(url, `https://sandbox.wompi.co/v1/transactions/${tx.id}`);
        assert.equal(
          options.headers.Authorization,
          `Bearer ${process.env.WOMPI_PRIVATE_KEY}`,
        );
        assert.equal(options.redirect, "error");
        return { ok: true, json: async () => ({ data: tx }) };
      };
      try {
        assert.deepEqual(await realLookup(tx.id), tx);
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
  await scenario("Rechaza llaves prod y base no aislada", async () => {
    assert.throws(() =>
      new WompiAdapter({
        get: (key) =>
          key === "WOMPI_PUBLIC_KEY" ? "pub_prod_FORBIDDEN" : process.env[key],
      }).settings(),
    );
    assert.throws(() =>
      new WompiAdapter({
        get: (key) =>
          key === "DB_HOST" ? "shared.aiven.invalid" : process.env[key],
      }).settings(),
    );
  });
  const lostSale = await newSale();
  const lostDto = manual();
  await scenario(
    "H05: respuesta perdida después del commit y reenvío produce un abono",
    async () => {
      await assert.rejects(() =>
        request(
          `/admin/sales/${lostSale}/payments`,
          lostDto,
          201,
          token,
          "POST",
          { "x-hf-test-drop-response": "after-commit" },
        ),
      );
      assert.equal(await count(lostSale), 1);
      const replay = await pay(lostSale, lostDto);
      assert.equal(replay.balance, "200000.00");
      assert.equal(await count(lostSale), 1);
    },
  );
  await scenario(
    "H05: clave igual con contenido distinto devuelve 409; intención nueva sí abona",
    async () => {
      await pay(lostSale, { ...lostDto, amount: "49999.00" }, 409);
      await pay(lostSale, manual());
      assert.equal(await count(lostSale), 2);
      assert.equal(await balance(lostSale), "150000.00");
      await pay(await newSale(), lostDto, 409);
    },
  );
  await scenario(
    "MySQL impide físicamente insertar dos movimientos con el mismo intent_id",
    async () => {
      await assert.rejects(
        () =>
          query(
            `INSERT INTO sale_payments (sale_id, customer_id, type, method, amount, paid_at, status, created_by_user_id, created_at, updated_at, intent_id, intent_fingerprint)
      SELECT sale_id, customer_id, type, method, amount, paid_at, status, created_by_user_id, created_at, updated_at, intent_id, intent_fingerprint
      FROM sale_payments WHERE intent_id = ?`,
            [lostDto.intentId],
          ),
        { code: "ER_DUP_ENTRY" },
      );
    },
  );
  await scenario(
    "H05: 12 requests concurrentes con la misma intención producen una fila",
    async () => {
      const sale = await newSale();
      const dto = manual();
      const responses = await Promise.all(
        Array.from({ length: 12 }, () => pay(sale, dto)),
      );
      assert.equal(
        new Set(responses.map((result) => result.payment.id)).size,
        1,
      );
      assert.equal(await count(sale), 1);
    },
  );
  await scenario(
    "H05: pago de saldo completo admite reenvío con saldo cero y conserva anulación",
    async () => {
      const sale = await newSale();
      const dto = manual("250000.00", { type: "FINAL_PAYMENT" });
      const first = await pay(sale, dto);
      assert.equal((await pay(sale, dto)).payment.id, first.payment.id);
      await request(
        `/admin/sales/${sale}/payments/${first.payment.id}/void`,
        { reason: "Prueba dirigida" },
        201,
      );
      assert.equal((await pay(sale, dto)).payment.status, "VOIDED");
      assert.equal(await count(sale), 1);
    },
  );
  await scenario(
    "H05: multipart con mismo archivo no duplica; archivo distinto causa conflicto",
    async () => {
      const sale = await newSale();
      const dto = manual();
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQEBAKr2l1EAAAAASUVORK5CYII=",
        "base64",
      );
      async function upload(bytes, expected) {
        const form = new FormData();
        for (const [name, value] of Object.entries(dto)) form.set(name, value);
        form.set(
          "file",
          new Blob([bytes], { type: "image/png" }),
          "prueba.png",
        );
        const response = await fetch(
          `http://127.0.0.1:3301/api/admin/sales/${sale}/payments-media`,
          {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            body: form,
          },
        );
        assert.equal(response.status, expected);
        return response.json();
      }
      const beforeUploads = uploads;
      await upload(png, 201);
      await upload(png, 201);
      await upload(Buffer.concat([png, Buffer.from("different")]), 409);
      assert.equal(await count(sale), 1);
      assert.equal(uploads - beforeUploads, 1);
    },
  );
  await scenario(
    "Permisos: visitante 401 y EMPLOYEE 403 en endpoints administrativos",
    async () => {
      await request(
        `/admin/sales/${lostSale}/payment-attempts`,
        undefined,
        401,
        null,
        "GET",
      );
      await request(
        `/admin/sales/${lostSale}/payment-attempts`,
        { intentId: randomUUID(), amount: "1.00" },
        403,
        employeeToken,
      );
      await pay(lostSale, { ...manual(), intentId: undefined }, 400);
    },
  );
  const partialSale = await newSale();
  let partial;
  await scenario(
    "Anticipo parcial crea intento PENDING, enlace opaco y ningún abono",
    async () => {
      partial = await attempt(partialSale);
      assert.equal(partial.status, "PENDING");
      assert.equal(await count(partialSale), 0);
      assert.equal(await balance(partialSale), "250000.00");
      assert.match(
        new URL(partial.url).pathname,
        /^\/cobro\/[A-Za-z0-9_-]{43}$/,
      );
      const detail = await request(
        publicPath(partial),
        undefined,
        200,
        null,
        "GET",
      );
      assert.equal(detail.canPay, true);
      for (const field of [
        "saleId",
        "customerId",
        "balance",
        "amountPaid",
        "notes",
        "reference",
      ])
        assert.equal(detail[field], undefined);
      assert.equal(
        (await attempt(partialSale, partial.amount, partial.id)).url,
        partial.url,
      );
      await request(
        `/admin/sales/${partialSale}/payment-attempts`,
        { intentId: partial.id, amount: "1.00" },
        409,
      );
    },
  );
  await scenario(
    "Checkout: importe/referencia/vencimiento firmados; retorno no confirma",
    async () => {
      const checkout = await request(
        `${publicPath(partial)}/checkout`,
        undefined,
        200,
        null,
      );
      const url = new URL(checkout.url);
      assert.equal(url.origin, "https://checkout.wompi.co");
      assert.equal(url.pathname, "/p/");
      const params = url.searchParams;
      assert.equal(params.get("amount-in-cents"), "5000000");
      assert.equal(params.get("reference"), partial.reference);
      assert.equal(
        params.get("signature:integrity"),
        sha(
          partial.reference +
            "5000000COP" +
            params.get("expiration-time") +
            process.env.WOMPI_INTEGRITY_SECRET,
        ),
      );
      await request(
        publicPath(partial) + "?id=FAKE_APPROVED",
        undefined,
        200,
        null,
        "GET",
      );
      assert.equal(await count(partialSale), 0);
      await request(
        `${publicPath(partial)}/checkout`,
        { amount: "1", saleId: lostSale },
        200,
        null,
      );
      assert.equal(await count(partialSale), 0);
    },
  );
  await scenario(
    "Validación: sobrepago, monto cero, centavos inválidos y venta cancelada",
    async () => {
      for (const amount of ["250000.01", "0", "-1", "1.001"])
        await request(
          `/admin/sales/${partialSale}/payment-attempts`,
          { intentId: randomUUID(), amount },
          400,
        );
      await request(
        `/admin/sales/${await newSale("250000.00", "CANCELLED")}/payment-attempts`,
        { intentId: randomUUID(), amount: "1" },
        400,
      );
    },
  );
  await scenario(
    "Firma inválida y ambiente prod son rechazados sin abono ni consulta externa",
    async () => {
      const event = eventFor(partial);
      const before = providerQueries;
      await webhook(
        {
          ...event,
          signature: { ...event.signature, checksum: "0".repeat(64) },
        },
        401,
      );
      await webhook({ ...event, environment: "prod" }, 401);
      assert.equal(providerQueries, before);
      assert.equal(await count(partialSale), 0);
    },
  );
  await scenario(
    "Importe alterado, referencia/venta incorrecta y respuesta de proveedor distinta",
    async () => {
      await webhook(eventFor(partial, "APPROVED", { amount_in_cents: 1 }), 409);
      await webhook(
        eventFor(partial, "APPROVED", { reference: "OTHER_SALE" }),
        404,
      );
      const event = eventFor(partial);
      providerTransactions.set(event.data.transaction.id, {
        ...event.data.transaction,
        reference: "WRONG_REFERENCE",
      });
      await webhook(event, 409);
      assert.equal(await count(partialSale), 0);
      providerTransactions.set(event.data.transaction.id, {
        ...event.data.transaction,
        id: "WRONG_ID",
      });
      await webhook(event, 409);
      providerTransactions.set(event.data.transaction.id, {
        ...event.data.transaction,
        amount_in_cents: 1,
      });
      await webhook(event, 409);
      await webhook(eventFor(partial, "APPROVED", { currency: "USD" }), 400);
    },
  );
  let approved;
  await scenario(
    "Aprobación controlada y 16 webhooks concurrentes crean exactamente un abono",
    async () => {
      approved = eventFor(partial);
      await Promise.all(Array.from({ length: 16 }, () => webhook(approved)));
      assert.equal(await count(partialSale), 1);
      assert.equal(await balance(partialSale), "200000.00");
      const detail = await request(
        publicPath(partial),
        undefined,
        200,
        null,
        "GET",
      );
      assert.equal(detail.confirmed, true);
      assert.equal(detail.canPay, false);
    },
  );
  await scenario(
    "Eventos fuera de orden y repetidos no degradan APPROVED ni crean reversos",
    async () => {
      await webhook(
        signed({ ...approved.data.transaction, status: "PENDING" }),
      );
      assert.equal(
        (
          await query("SELECT status FROM payment_attempts WHERE id = ?", [
            partial.id,
          ])
        )[0].status,
        "APPROVED",
      );
      providerTransactions.set(approved.data.transaction.id, {
        ...approved.data.transaction,
        status: "VOIDED",
      });
      await webhook(signed({ ...approved.data.transaction, status: "VOIDED" }));
      assert.equal(await count(partialSale), 1);
      assert.equal(await balance(partialSale), "200000.00");
      assert.equal(
        (
          await query(
            "SELECT review_required FROM payment_attempts WHERE id = ?",
            [partial.id],
          )
        )[0].review_required,
        1,
      );
    },
  );
  await scenario(
    "DECLINED, ERROR y PENDING actualizan intento sin abono (contratos simulados)",
    async () => {
      for (const status of ["DECLINED", "ERROR", "PENDING"]) {
        const sale = await newSale();
        const a = await attempt(sale);
        const event = eventFor(a, status);
        await webhook(event);
        assert.equal(await count(sale), 0);
        if (status === "DECLINED") {
          providerTransactions.set(event.data.transaction.id, {
            ...event.data.transaction,
            status: "PENDING",
          });
          await webhook(
            signed({ ...event.data.transaction, status: "PENDING" }),
          );
        }
        assert.equal(
          (
            await query("SELECT status FROM payment_attempts WHERE id = ?", [
              a.id,
            ])
          )[0].status,
          status,
        );
      }
    },
  );
  await scenario(
    "Firma usa propiedades dinámicas y acepta hexadecimal mayúscula",
    async () => {
      const sale = await newSale();
      const a = await attempt(sale);
      const event = eventFor(a);
      const dynamic = signed(event.data.transaction, [
        "transaction.reference",
        "transaction.id",
        "transaction.currency",
        "transaction.amount_in_cents",
        "transaction.status",
      ]);
      dynamic.signature.checksum = dynamic.signature.checksum.toUpperCase();
      await webhook(dynamic);
      assert.equal(await count(sale), 1);
    },
  );
  await scenario(
    "Vencimiento impide iniciar checkout y admite confirmación tardía verificada",
    async () => {
      const sale = await newSale();
      const a = await attempt(sale);
      await query(
        "UPDATE payment_attempts SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE id = ?",
        [a.id],
      );
      await request(`${publicPath(a)}/checkout`, undefined, 409, null);
      await webhook(eventFor(a));
      assert.equal(await count(sale), 1);
    },
  );
  await scenario(
    "Pago manual previo + Wompi de saldo completo deja saldo cero",
    async () => {
      const sale = await newSale();
      await pay(sale, manual("50000.00"));
      const a = await attempt(sale, "200000.00");
      await webhook(eventFor(a));
      assert.equal(await balance(sale), "0.00");
      assert.equal(await count(sale), 2);
    },
  );
  await scenario(
    "Concurrencia de intenciones legítimas manual + Wompi comparte bloqueo y saldo",
    async () => {
      const sale = await newSale();
      const a = await attempt(sale, "150000.00");
      await Promise.all([pay(sale, manual("100000.00")), webhook(eventFor(a))]);
      assert.equal(await balance(sale), "0.00");
      assert.equal(await count(sale), 2);
    },
  );
  await scenario(
    "Aprobación tras pago manual completo queda auditada para revisión sin sobrepago",
    async () => {
      const sale = await newSale();
      const a = await attempt(sale, "250000.00");
      await pay(sale, manual("250000.00"));
      await webhook(eventFor(a));
      await webhook(
        eventFor(a, "APPROVED", {
          id: (
            await query(
              "SELECT provider_transaction_id FROM payment_attempts WHERE id = ?",
              [a.id],
            )
          )[0].provider_transaction_id,
        }),
      );
      assert.equal(await count(sale), 1);
      assert.equal(await balance(sale), "0.00");
      const record = (
        await query(
          "SELECT status, review_required, sale_payment_id FROM payment_attempts WHERE id = ?",
          [a.id],
        )
      )[0];
      assert.equal(record.status, "APPROVED");
      assert.equal(record.review_required, 1);
      assert.equal(record.sale_payment_id, null);
    },
  );
  await scenario(
    "Fallo antes de enlazar SalePayment revierte el abono y permite reenvío seguro",
    async () => {
      const sale = await newSale();
      const a = await attempt(sale);
      const event = eventFor(a);
      const {
        PaymentAttempt,
      } = require("../../apps/api/dist/modules/payments/payment-attempt.model");
      const hook = `rollback-${run}`;
      PaymentAttempt.addHook("beforeUpdate", hook, (record) => {
        if (record.id === a.id && record.salePaymentId)
          throw new Error("CONTROLLED failure before transaction commit");
      });
      try {
        await webhook(event, 500);
        assert.equal(await count(sale), 0);
      } finally {
        PaymentAttempt.removeHook("beforeUpdate", hook);
      }
      await webhook(event);
      assert.equal(await count(sale), 1);
    },
  );
  await scenario(
    "Webhook con respuesta perdida tras commit se reenvía sin duplicar abono",
    async () => {
      const sale = await newSale();
      const a = await attempt(sale);
      const event = eventFor(a);
      await assert.rejects(() =>
        request("/payments/wompi/events", event, 200, null, "POST", {
          "x-hf-test-drop-response": "after-commit",
        }),
      );
      assert.equal(await count(sale), 1);
      await webhook(event);
      assert.equal(await count(sale), 1);
    },
  );
  if (process.argv.includes('--closure')) {
    const closure = await require('./closure-directed.cjs')({ app, query, adminId, customerId });
    results.push(...closure.map(row => ({ ...row, provider: 'NOT_USED', database: 'MYSQL_8_4_ISOLATED' })));
  }
  const report = {
    date: "2026-10-28",
    baseCommit: "261a08cecc4780d35f40eda8239aae54698ff856",
    WOMPI_EXTERNAL_SANDBOX: "PENDING_CREDENTIALS",
    provider: "CONTROLLED_NOT_EXTERNAL",
    database: {
      host: "127.0.0.1",
      port: 33307,
      name: isolated.DB_NAME,
      version: (await query("SELECT VERSION() v"))[0].v,
    },
    pass: results.length,
    fail: 0,
    results,
    pendingExternal: [
      "Tarjeta APPROVED",
      "Tarjeta DECLINED",
      "Nequi APPROVED/DECLINED",
      "PSE según habilitación",
      "Webhook HTTPS real",
      "Captura checkout Wompi alojado",
    ],
  };
  const out = resolve(root, ".e2e-results/payments");
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, process.argv.includes('--closure') ? 'closure-results.json' : 'results.json'), JSON.stringify(report, null, 2));
  console.log(
    `DIRECTED_RESULT ${results.length} PASS; WOMPI_EXTERNAL_SANDBOX=PENDING_CREDENTIALS`,
  );
  if (process.argv.includes("--browser")) {
    const saleId = await newSale();
    await require("./browser-directed.cjs")({
      saleId,
      email: `payments-${run}@e2e.invalid`,
      password: isolated.E2E_ACTOR_PASSWORD,
      approve: (a) => webhook(eventFor(a)),
      count,
      balance,
    });
  }
  if (process.argv.includes("--serve")) {
    const saleId = await newSale();
    const demoAttempt = await attempt(saleId, "50000.00");
    // Private fixture exchange; ignored, never included in the user report.
    writeFileSync(
      resolve(out, "demo-private.json"),
      JSON.stringify({
        saleId,
        attempt: demoAttempt,
        email: `payments-${run}@e2e.invalid`,
        password: isolated.E2E_ACTOR_PASSWORD,
        token,
      }),
    );
    console.log(
      "CONTROLLED_DEMO_READY http://127.0.0.1:3301 (provider simulated; no external money)",
    );
    process.on("SIGTERM", async () => {
      await app.close();
      await db.end();
      await standalone.close();
      process.exit(0);
    });
    return;
  }
  await app.close();
  await db.end();
  await standalone.close();
}
main().catch(async (error) => {
  console.error(
    `DIRECTED_FAIL ${error.message}; ${error.stack?.split("\n").slice(1, 3).join(" ")}`,
  );
  if (app) await app.close().catch(() => {});
  if (db) await db.end().catch(() => {});
  if (standalone) await standalone.close().catch(() => {});
  process.exitCode = 1;
});
