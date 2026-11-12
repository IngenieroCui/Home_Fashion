import { test, expect, screenshot } from '../support/fixture';
import { catalog } from '../fixtures/catalog';
import { rows } from '../fixtures/database';
import { login, createCustomer, directSale, createOrder, assign } from '../support/ui';
import { ApiClient } from '../support/api-client';

test('02 · Pedido mixto: reserva real y fabricación conservan venta y líneas', async ({ page, request, evidence, caseKey }) => {
  const { product, stock, make } = await catalog();
  const before = (await rows('SELECT quantity_reserved FROM product_variants WHERE id=?', [stock.id]))[0];
  await login(page);
  const customer = await createCustomer(page, `QA Mixto ${caseKey}`);
  const sale = await directSale(page, customer, product, [stock, make]);
  const order = await createOrder(page, String(sale.id), ['IN_STOCK', 'MADE_TO_ORDER']);
  const job = await assign(page);
  Object.assign(evidence.ids, { customerId: String(customer.id), saleId: String(sale.id), orderId: String(order.id), jobId: String(job.id) });
  await test.step('Reserva aumentó por negocio y estados derivados cambian con STARTED', async () => {
    const inventory = await rows('SELECT id, quantity_reserved FROM product_variants WHERE id=?', [stock.id]);
    expect(inventory[0].quantity_reserved).toBe(before.quantity_reserved + 1);
    let items = await rows('SELECT id, sale_item_id, supply_type, status FROM order_items WHERE order_id=? ORDER BY id', [order.id]);
    expect(items.map(item => [item.supply_type, item.status])).toEqual([['IN_STOCK', 'RESERVED'], ['MADE_TO_ORDER', 'PENDING_PRODUCTION']]);
    expect((await rows('SELECT status FROM orders WHERE id=?', [order.id]))[0].status).toBe('OPEN');
    const api = new ApiClient(request); await api.login('workshop');
    await api.call('POST', `/workshop/jobs/${job.id}/progress`, { type: 'STARTED', message: 'QA Mixto iniciado', progressPercent: 0 });
    const orders = await rows('SELECT id, sale_id, status FROM orders WHERE id=?', [order.id]);
    expect(orders[0].status).toBe('IN_PROGRESS'); expect(String(orders[0].sale_id)).toBe(String(sale.id));
    items = await rows('SELECT id, sale_item_id, supply_type, status FROM order_items WHERE order_id=? ORDER BY id', [order.id]);
    expect(items.map(item => item.status)).toEqual(['RESERVED', 'IN_PRODUCTION']);
    const jobs = await rows('SELECT id, order_item_id, status FROM workshop_jobs WHERE id=?', [job.id]);
    expect(String(jobs[0].order_item_id)).toBe(String(items[1].id));
    evidence.finalMySQL = { orders, items, jobs, inventory, reservationBefore: before.quantity_reserved };
  });

  await page.reload(); await screenshot(page, '04-pedido-mixto');
  await test.step('Cancela un pedido mixto y el reintento no duplica el efecto', async () => {
    const admin = new ApiClient(request); await admin.login('admin');
    const cancelPath = '/admin/orders/' + order.id + '/cancel';
    await admin.call('POST', cancelPath, { reason: 'QA cancelación mixta' });
    await admin.call('POST', cancelPath, { reason: 'QA reintento' });
    const orderItems = await rows('SELECT status FROM order_items WHERE order_id = ? ORDER BY id', [order.id]);
    expect(orderItems.map(item => item.status)).toEqual(['CANCELLED', 'CANCELLED']);
    expect((await rows('SELECT status FROM workshop_jobs WHERE id = ?', [job.id]))[0].status).toBe('CANCELLED');
    expect((await rows('SELECT quantity_reserved FROM product_variants WHERE id = ?', [stock.id]))[0].quantity_reserved).toBe(before.quantity_reserved);
    expect((await rows('SELECT reason FROM order_cancellations WHERE order_id = ?', [order.id])).map(row => row.reason)).toEqual(['QA cancelación mixta']);
    expect((await rows('SELECT status FROM sales WHERE id = ?', [sale.id]))[0].status).toBe('CONFIRMED');
  });
});
