// Actual Next UI -> proxy -> Nest -> isolated MySQL. Only provider state is controlled.
const { chromium, expect } = require("@playwright/test");
const { mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
module.exports = async function verifyBrowser({
  saleId,
  email,
  password,
  approve,
  count,
  balance,
}) {
  const output = resolve(
    process.env.PAYMENT_EVIDENCE_DIR || ".e2e-results/payments/screenshots",
  );
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  const origin = "http://127.0.0.1:3300";
  const scenarios = [];
  try {
    const login = await context.request.post(`${origin}/api/session/login`, {
      data: { email, password },
    });
    expect(login.status()).toBe(200);
    await page.goto(`${origin}/panel/ventas/${saleId}`);
    await expect(
      page.getByRole("heading", { name: "Generar cobro", exact: true }),
    ).toBeVisible({ timeout: 60000 });
    const section = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Generar cobro", exact: true }),
      });
    await section.getByLabel("Importe en COP").fill("50000");
    const created = page.waitForResponse(
      (response) =>
        response
          .url()
          .endsWith(`/api/admin/sales/${saleId}/payment-attempts`) &&
        response.request().method() === "POST",
    );
    await section
      .getByRole("button", { name: "Generar cobro", exact: true })
      .click();
    const response = await created;
    expect(response.status()).toBe(201);
    const attempt = await response.json();
    await expect(
      section.getByText(attempt.reference, { exact: false }),
    ).toBeVisible();
    const row = section.locator("tr").filter({ hasText: attempt.reference });
    await row.getByRole("button", { name: "Copiar enlace" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      attempt.url,
    );
    expect(await count(saleId)).toBe(0);
    await page.screenshot({
      path: resolve(output, "01-admin-cobro-pendiente.png"),
      fullPage: true,
    });
    scenarios.push("ADMIN genera anticipo y copia enlace; PENDING no abona");
    const publicContext = await browser.newContext({
      viewport: { width: 1100, height: 900 },
    });
    const customer = await publicContext.newPage();
    const publicPath = new URL(attempt.url).pathname;
    await customer.goto(`${origin}${publicPath}?id=FORGED_APPROVED`);
    await expect(
      customer.getByRole("button", { name: "Continuar a Wompi" }),
    ).toBeVisible({ timeout: 60000 });
    await expect(
      customer.getByText("Estado: PENDING", { exact: true }),
    ).toBeVisible();
    expect(await count(saleId)).toBe(0);
    await customer.screenshot({
      path: resolve(output, "02-cobro-publico-antes-de-wompi.png"),
      fullPage: true,
    });
    // Inspect the real server-generated outbound contract. Do not fake Wompi's hosted checkout.
    let outbound;
    await customer.route("https://checkout.wompi.co/**", async (route) => {
      outbound = new URL(route.request().url());
      await route.abort();
    });
    await customer.getByRole("button", { name: "Continuar a Wompi" }).click();
    await expect
      .poll(() => outbound?.searchParams.get("reference"))
      .toBe(attempt.reference);
    expect(outbound.searchParams.get("amount-in-cents")).toBe("5000000");
    await customer.unroute("https://checkout.wompi.co/**");
    await customer.goto(`${origin}${publicPath}`);
    scenarios.push(
      "Cliente sin cuenta abre cobro; retorno falso no abona; salida apunta al checkout oficial",
    );
    await approve(attempt);
    await customer.getByRole("button", { name: "Consultar estado" }).click();
    await expect(
      customer.getByText(
        "Pago aprobado y abono confirmado. Gracias por tu compra.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      customer.getByRole("button", { name: "Continuar a Wompi" }),
    ).toHaveCount(0);
    await customer.screenshot({
      path: resolve(output, "03-confirmacion-controlada.png"),
      fullPage: true,
    });
    await customer.setViewportSize({ width: 390, height: 844 });
    await customer.screenshot({
      path: resolve(output, "04-confirmacion-movil.png"),
      fullPage: true,
    });
    await section
      .getByRole("button", { name: "Actualizar intentos y saldo" })
      .click();
    await expect(
      section.getByText("APPROVED · Abono registrado", { exact: true }),
    ).toBeVisible();
    expect(await balance(saleId)).toBe("200000.00");
    await page.screenshot({
      path: resolve(output, "05-admin-abono-confirmado.png"),
      fullPage: true,
    });
    scenarios.push(
      "Webhook firmado con proveedor controlado produce un abono y saldo 200000 COP en la UI",
    );
    // Real committed request, then network failure visible to the browser; reload recovers IndexedDB.
    const form = page.locator("#registrar-movimiento");
    await form.getByLabel("Monto", { exact: true }).fill("50000");
    await page.route(
      `**/api/admin/sales/${saleId}/payments-media`,
      async (route) => {
        const upstream = await route.fetch();
        expect(upstream.status()).toBe(201);
        await route.abort("connectionreset");
      },
    );
    await form
      .getByRole("button", { name: "Registrar movimiento", exact: true })
      .click();
    await expect(
      form.getByRole("button", { name: "Reenviar la misma intención" }),
    ).toBeEnabled({ timeout: 20000 });
    expect(await count(saleId)).toBe(2);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Reenviar la misma intención" }),
    ).toBeEnabled({ timeout: 20000 });
    await page.screenshot({
      path: resolve(output, "06-h05-intencion-recuperada.png"),
      fullPage: true,
    });
    await page.unroute(`**/api/admin/sales/${saleId}/payments-media`);
    await page
      .getByRole("button", { name: "Reenviar la misma intención" })
      .click();
    await expect(
      page.getByRole("button", { name: "Reenviar la misma intención" }),
    ).toHaveCount(0, { timeout: 20000 });
    expect(await count(saleId)).toBe(2);
    expect(await balance(saleId)).toBe("150000.00");
    expect(runtimeErrors).toEqual([]);
    scenarios.push(
      "H05 desde navegador: commit, pérdida de respuesta, reload y reenvío conservan 2 movimientos totales",
    );
    const report = {
      provider: "CONTROLLED_NOT_EXTERNAL",
      status: "PASS",
      scenarios,
      runtimeErrors,
      hostedCheckoutScreenshot: "PENDING_CREDENTIALS",
    };
    writeFileSync(
      resolve(output, "../browser-results.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `BROWSER_DIRECTED_RESULT ${scenarios.length} PASS (Wompi controlled; hosted checkout pending credentials)`,
    );
    await publicContext.close();
  } finally {
    await browser.close();
  }
};
