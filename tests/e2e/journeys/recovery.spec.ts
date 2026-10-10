import { test, expect } from '../support/fixture';
import { catalog } from '../fixtures/catalog';
import { rows } from '../fixtures/database';
import { publicForm, login, createCustomer, directSale, uiMutation, createOrder } from '../support/ui';
import { ApiClient } from '../support/api-client';

test('05 · Respuesta perdida conserva requestId, refresh continúa y acciones repetidas no duplican', async ({ page, context, request, evidence, caseKey }) => {
  const { product, stock, make } = await catalog();
  let originalPayload: Record<string, any> = {}, code = '', count = 0;
  await test.step('Solicitud realmente persistida pierde respuesta y conserva payload/requestId al reintentar', async () => {
    const form = await publicForm(page, product, make, `QA Recuperación ${caseKey}`);
    await page.route('**/api/public/quote-requests', async route => {
      count++; const payload = route.request().postDataJSON();
      if (count === 1) originalPayload = payload;
      else expect(payload).toEqual(originalPayload);
      const real = await route.fetch({ maxRetries: 0 }); expect(real.ok()).toBe(true);
      const result = await real.json();
      if (!code) code = result.requestCode; else expect(result.requestCode).toBe(code);
      if (count === 1) await route.abort('failed'); else await route.fulfill({ response: real });
    });
    await form.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
    await expect(form.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
    expect(count).toBe(1); // No implicit mutation retry while user inspects the uncertain state.
    expect(await rows('SELECT id FROM quotes WHERE public_request_key=?', [originalPayload.requestId])).toHaveLength(1);
    await form.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(page.getByText(code, { exact: true })).toBeVisible(); expect(count).toBe(2);
    await page.unroute('**/api/public/quote-requests');
    const repeated = await page.request.post('/api/public/quote-requests', { data: originalPayload });
    expect(repeated.ok()).toBe(true); expect((await repeated.json()).requestCode).toBe(code);
    const quotes = await rows('SELECT id, code, public_request_key, status FROM quotes WHERE public_request_key=?', [originalPayload.requestId]);
    expect(quotes).toHaveLength(1);
    Object.assign(evidence.ids, { requestId: originalPayload.requestId, requestCode: code, quoteId: String(quotes[0].id) });
    evidence.finalMySQL.publicRequest = quotes;
  });
  await test.step('Refresh de sesión real rota cookies y permite continuar en navegador', async () => {
    await login(page);
    const before = (await context.cookies()).find(cookie => cookie.name === 'hf_refresh_token')?.value;
    const rotated = page.waitForResponse(response => new URL(response.url()).pathname === '/api/session/refresh');
    await page.goto('/api/session/refresh?next=%2Fpanel%2Fclientes'); await rotated;
    await expect(page).toHaveURL(/\/panel\/clientes$/);
    await expect(page.getByRole('heading', { name: 'Gestión de clientes', exact: true })).toBeVisible();
    const after = (await context.cookies()).find(cookie => cookie.name === 'hf_refresh_token')?.value;
    expect(Boolean(before && after && before !== after)).toBe(true);
    evidence.notes.push('Cookies solo en memoria; refresh real vía ruta de sesión y NestJS, sin JWT fabricados.');
  });
  let saleId = '', paymentCount = 0;
  await test.step('Abono con respuesta perdida no se reintenta automáticamente', async () => {
    const customer = await createCustomer(page, `QA Ambigua ${caseKey}`);
    const sale = await directSale(page, customer, product, [stock]); saleId = String(sale.id);
    const path = `/api/admin/sales/${saleId}/payments-media`;
    await page.route(`**${path}`, async route => {
      paymentCount++; const response = await route.fetch({ maxRetries: 0 }); expect(response.ok()).toBe(true);
      await route.abort('failed');
    });
    const form = page.locator('#registrar-movimiento');
    await form.getByLabel('Monto', { exact: true }).fill('50000');
    await form.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
    await expect(form.getByRole('alert')).toContainText('comprueba si se guardó');
    await expect(form.getByRole('button', { name: 'Registrar movimiento', exact: true })).toBeEnabled();
    expect(paymentCount).toBe(1);
    await page.unroute(`**${path}`); await page.reload();
    await expect(form).toBeVisible(); expect(paymentCount).toBe(1);
    const payments = await rows('SELECT id, sale_id, amount FROM sale_payments WHERE sale_id=?', [saleId]);
    expect(payments).toHaveLength(1); expect(Number(payments[0].amount)).toBe(50000);
    evidence.ids.saleId = saleId; evidence.finalMySQL.payments = payments;
  });
  await test.step('Repetir creación de pedido devuelve mismo pedido o conflicto, sin duplicar reserva', async () => {
    const order = await createOrder(page, saleId, ['IN_STOCK']); evidence.ids.orderId = String(order.id);
    const inventoryBefore = (await rows('SELECT quantity_reserved FROM product_variants WHERE id=?', [stock.id]))[0].quantity_reserved;
    // Browser sends the real same business command a second time using its authenticated BFF session.
    const payload = { items: order.items.map((item: Record<string, any>) => ({ saleItemId: String(item.saleItemId), supplyType: 'IN_STOCK' })) };
    const repeated = await page.request.post(`/api/admin/orders/from-sale/${saleId}`, { data: payload });
    expect([200, 201, 409, 400]).toContain(repeated.status());
    if (repeated.ok()) expect(String((await repeated.json()).id)).toBe(String(order.id));
    const orders = await rows('SELECT id, sale_id, status FROM orders WHERE sale_id=?', [saleId]);
    expect(orders).toHaveLength(1);
    const inventory = await rows('SELECT id, quantity_reserved FROM product_variants WHERE id=?', [stock.id]);
    expect(inventory[0].quantity_reserved).toBe(inventoryBefore);
    evidence.finalMySQL.orders = orders; evidence.finalMySQL.inventory = inventory;
    evidence.notes.push('Fallos de red inducidos después de respuestas reales de negocio. No se interceptan happy paths ni se fabrican éxitos.');
  });
});
