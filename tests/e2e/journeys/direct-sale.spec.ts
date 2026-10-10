import { test, expect, screenshot } from '../support/fixture';
import { catalog } from '../fixtures/catalog';
import { rows } from '../fixtures/database';
import { login, createCustomer, directSale, deposit, createOrder } from '../support/ui';

test('03 · ADMIN registra cliente, venta directa, abono y pedido de inventario', async ({ page, evidence, caseKey }) => {
  const { product, stock } = await catalog();
  const before = (await rows('SELECT quantity_reserved FROM product_variants WHERE id=?', [stock.id]))[0].quantity_reserved;
  await login(page); const customer = await createCustomer(page, `QA Directa ${caseKey}`);
  const sale = await directSale(page, customer, product, [stock]);
  const payment = await deposit(page, String(sale.id));
  const order = await createOrder(page, String(sale.id), ['IN_STOCK']);
  Object.assign(evidence.ids, { customerId: String(customer.id), saleId: String(sale.id), paymentId: String(payment.id), orderId: String(order.id) });
  await test.step('Snapshots, saldo y reserva persistidos de la misma venta', async () => {
    const apiResponse = await page.request.get(`/api/admin/sales/${sale.id}`);
    expect(apiResponse.ok()).toBe(true);
    const apiSale = await apiResponse.json();
    expect(Number(apiSale.balance)).toBe(200000);
    expect(apiSale.paymentStatus).toBe('PARTIALLY_PAID');
    const sales = await rows('SELECT id, customer_id, quote_id, total FROM sales WHERE id=?', [sale.id]);
    const payments = await rows('SELECT id, sale_id, amount FROM sale_payments WHERE sale_id=?', [sale.id]);
    const items = await rows(`SELECT si.id sale_item_id, si.product_id, si.product_variant_id, si.product_name_snapshot sale_name,
      si.sku_snapshot, si.quantity, oi.order_id, oi.sale_item_id linked_sale_item, oi.product_name_snapshot order_name,
      oi.supply_type, oi.status FROM sale_items si JOIN order_items oi ON oi.sale_item_id=si.id WHERE si.sale_id=?`, [sale.id]);
    expect(sales).toHaveLength(1); expect(payments).toHaveLength(1); expect(items).toHaveLength(1);
    expect(String(payments[0].id)).toBe(evidence.ids.paymentId);
    expect(String(sales[0].customer_id)).toBe(String(customer.id)); expect(sales[0].quote_id).toBeNull();
    expect(Number(sales[0].total) - Number(payments[0].amount)).toBe(200000);
    expect(items[0]).toMatchObject({ sale_name: product.name, order_name: product.name, sku_snapshot: stock.sku, quantity: 1, supply_type: 'IN_STOCK', status: 'RESERVED' });
    expect(String(items[0].order_id)).toBe(String(order.id));
    const inventory = await rows('SELECT id, quantity_reserved FROM product_variants WHERE id=?', [stock.id]);
    expect(inventory[0].quantity_reserved).toBe(before + 1);
    evidence.finalMySQL = { sales, payments, items, inventory, balance: 200000 };
  });
  await screenshot(page, '05-venta-directa-pedido');
});
