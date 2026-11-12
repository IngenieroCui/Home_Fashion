// Runs only inside sandbox-directed.cjs, AFTER UUID/datadir/marker validation.
// Real migrated MySQL, production services; hooks only coordinate races or inject failure.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
module.exports = async function closure({ app, query, adminId, customerId }) {
  const service = (folder, file, name) => app.get(require(`../../apps/api/dist/modules/${folder}/${file}`)[name]);
  const quotes = service('quotes', 'quotes.service', 'QuotesService');
  const sales = service('sales', 'sales.service', 'SalesService');
  const orders = service('orders', 'orders.service', 'OrdersService');
  const deliveries = service('deliveries', 'deliveries.service', 'DeliveriesService');
  const { Quote } = require('../../apps/api/dist/modules/quotes/entities/quote.model');
  const { OrderItem } = require('../../apps/api/dist/modules/orders/entities/order-item.model');
  const results = [];
  async function test(name, fn) { await fn(); results.push({ scenario: name, status: 'PASS' }); console.log(`PASS ${name}`); }
  const run = randomUUID().slice(0, 8);
  const categoryId = String((await query('INSERT INTO categories (name, slug, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', ['Release', `release-${run}`])).insertId);
  const productId = String((await query('INSERT INTO products (category_id, name, slug, description, allows_customization, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())', [categoryId, 'Snapshot original', `release-${run}`, 'Synthetic'])).insertId);
  const variantIds = [];
  for (let i = 0; i < 2; i++) variantIds.push(String((await query('INSERT INTO product_variants (product_id, sku, name, sale_price, estimated_cost, quantity_on_hand, quantity_reserved, created_at, updated_at) VALUES (?, ?, ?, 100, 50, 30, 0, NOW(), NOW())', [productId, `release-${run}-${i}`, `Variant ${i}`])).insertId));
  const line = (variant = variantIds[0], quantity = 1) => ({ productId, productVariantId: variant, quantity });
  const newQuote = () => quotes.createQuote({ customerId, items: [line()] }, adminId);
  const status = (id, value) => quotes.changeStatus(id, value, adminId);
  const stock = () => query('SELECT id, quantity_on_hand h, quantity_reserved r FROM product_variants WHERE product_id = ? ORDER BY id', [productId]);
  async function deliveryFixture(lines) {
    const sale = await sales.createDirect({ customerId, items: lines.map(x => line(x.variant, x.quantity)) }, adminId);
    const order = await orders.createFromSale(String(sale.id), { items: sale.items.map((x, i) => ({ saleItemId: String(x.id), supplyType: lines[i].type })) }, adminId);
    // Workshop READY is a fixture; workshop flow is outside this directed regression.
    await query("UPDATE order_items SET status = 'READY' WHERE order_id = ? AND supply_type = 'MADE_TO_ORDER'", [order.id]);
    const delivery = await deliveries.create({ orderId: order.id, address: 'Synthetic', contactName: 'Test', contactPhone: '000', scheduledDate: '2026-10-29', deliveryType: 'EXTERNAL_DRIVER', externalDriverName: 'Test' }, adminId);
    await deliveries.start(delivery.id, adminId);
    return { delivery, order };
  }
  const complete = id => deliveries.complete(id, { receiverName: 'Synthetic', evidenceUrls: ['https://evidence.invalid/test.png'] }, adminId);
  await test('H03 reserva, agrupa líneas de misma variante y consume pedido mixto; MTO no toca stock', async () => {
    const before = await stock();
    const { delivery, order } = await deliveryFixture([
      { variant: variantIds[0], quantity: 2, type: 'IN_STOCK' },
      { variant: variantIds[0], quantity: 3, type: 'IN_STOCK' },
      { variant: variantIds[1], quantity: 4, type: 'MADE_TO_ORDER' }
    ]);
    const reserved = await stock();
    assert.equal(reserved[0].h, before[0].h); assert.equal(reserved[0].r, before[0].r + 5);
    assert.deepEqual(reserved[1], before[1]);
    await complete(delivery.id);
    const after = await stock();
    assert.equal(after[0].h, before[0].h - 5); assert.equal(after[0].r, before[0].r);
    assert.deepEqual(after[1], before[1]);
    assert.equal((await query('SELECT status FROM orders WHERE id = ?', [order.id]))[0].status, 'COMPLETED');
    assert.ok((await query('SELECT status FROM order_items WHERE order_id = ?', [order.id])).every(x => x.status === 'DELIVERED'));
    await assert.rejects(() => complete(delivery.id), /OUT_FOR_DELIVERY/);
    assert.deepEqual(await stock(), after);
  });
  await test('H03 completaciones concurrentes consumen una sola vez', async () => {
    const { delivery } = await deliveryFixture([{ variant: variantIds[0], quantity: 2, type: 'IN_STOCK' }]);
    const before = await stock();
    const done = await Promise.allSettled([complete(delivery.id), complete(delivery.id)]);
    assert.equal(done.filter(x => x.status === 'fulfilled').length, 1);
    const after = await stock(); assert.equal(after[0].h, before[0].h - 2); assert.equal(after[0].r, before[0].r - 2);
  });
  await test('H03 pedido solo MADE_TO_ORDER completa sin consumir ni reservar stock terminado', async () => {
    const before = await stock();
    const { delivery } = await deliveryFixture([{ variant: variantIds[0], quantity: 3, type: 'MADE_TO_ORDER' }]);
    assert.deepEqual(await stock(), before);
    await complete(delivery.id);
    assert.deepEqual(await stock(), before);
  });
  await test('H03 fallo después de descontar stock revierte variantes, ítems, pedido y entrega', async () => {
    const { delivery, order } = await deliveryFixture([{ variant: variantIds[0], quantity: 2, type: 'IN_STOCK' }, { variant: variantIds[1], quantity: 3, type: 'IN_STOCK' }]);
    const before = await stock();
    const original = OrderItem.prototype.update;
    OrderItem.prototype.update = async function(values, options) {
      if (String(this.orderId) === String(order.id) && values.status === 'DELIVERED') throw Error('INJECTED_AFTER_STOCK');
      return original.call(this, values, options);
    };
    try { await assert.rejects(() => complete(delivery.id), /INJECTED_AFTER_STOCK/); }
    finally { OrderItem.prototype.update = original; }
    assert.deepEqual(await stock(), before);
    assert.equal((await query('SELECT status FROM deliveries WHERE id = ?', [delivery.id]))[0].status, 'OUT_FOR_DELIVERY');
    assert.equal((await query('SELECT status FROM orders WHERE id = ?', [order.id]))[0].status, 'IN_PROGRESS');
    assert.ok((await query('SELECT status FROM order_items WHERE order_id = ?', [order.id])).every(x => x.status === 'RESERVED'));
    await complete(delivery.id);
  });
  await test('H03 reservas insuficientes rechazan sin cambios parciales', async () => {
    const { delivery } = await deliveryFixture([{ variant: variantIds[0], quantity: 2, type: 'IN_STOCK' }]);
    const original = await stock();
    await query('UPDATE product_variants SET quantity_reserved = 0 WHERE id = ?', [variantIds[0]]);
    const broken = await stock();
    await assert.rejects(() => complete(delivery.id), /inconsistent/);
    assert.deepEqual(await stock(), broken);
    await query('UPDATE product_variants SET quantity_reserved = ? WHERE id = ?', [original[0].r, variantIds[0]]);
    await complete(delivery.id);
  });
  // Gate pauses a production header SELECT FOR UPDATE after acquisition.
  async function gateHeader(id, fn) {
    const original = Quote.findByPk;
    let signal, release;
    const entered = new Promise(r => signal = r), gate = new Promise(r => release = r);
    let first = true;
    Quote.findByPk = async function(key, options) {
      const row = await original.call(this, key, options);
      if (String(key) === String(id) && options?.lock && first) { first = false; signal(); await gate; }
      return row;
    };
    try { await fn(entered, release); } finally { release(); Quote.findByPk = original; }
  }
  // Observe a second SELECT being issued before releasing the first transaction.
  async function startsLocked(id, action) {
    const original = Quote.findByPk;
    let signal;
    const entered = new Promise(r => signal = r);
    Quote.findByPk = function(key, options) {
      const pending = original.call(this, key, options);
      if (String(key) === String(id) && options?.lock) signal();
      return pending;
    };
    const pending = action();
    await Promise.race([entered, pending.then(() => { throw Error('Mutation did not lock header'); })]);
    Quote.findByPk = original;
    return { pending };
  }
  for (const operation of ['header', 'add', 'update', 'delete', 'status']) {
    await test(`H04 aceptación gana carrera contra ${operation}; revalidación impide mutación`, async () => {
      const q = await newQuote(); await status(q.id, 'QUOTED');
      const before = await quotes.getQuote(q.id);
      await gateHeader(q.id, async (entered, release) => {
        const accepted = status(q.id, 'ACCEPTED'); await entered;
        const action = () => ({
          header: () => quotes.updateQuote(q.id, { deliveryFee: '999.00' }, adminId),
          add: () => quotes.addItem(q.id, line(), adminId),
          update: () => quotes.updateItem(q.id, before.items[0].id, line(variantIds[0], 5), adminId),
          delete: () => quotes.deleteItem(q.id, before.items[0].id, adminId),
          status: () => status(q.id, 'CANCELLED')
        })[operation]();
        const { pending } = await startsLocked(q.id, action);
        const rejected = assert.rejects(() => pending, /after quoted|Invalid quote status/);
        release(); await accepted; await rejected;
      });
      const after = await quotes.getQuote(q.id);
      assert.equal(after.status, 'ACCEPTED'); assert.equal(after.total, before.total);
      assert.deepEqual(after.items, before.items);
    });
  }
  await test('H04 edición gana carrera contra QUOTED y totales quedan coherentes', async () => {
    const q = await newQuote();
    await gateHeader(q.id, async (entered, release) => {
      const edited = quotes.addItem(q.id, line(variantIds[0], 2), adminId); await entered;
      const { pending } = await startsLocked(q.id, () => status(q.id, 'QUOTED'));
      release(); await edited; await pending;
    });
    const after = await quotes.getQuote(q.id);
    assert.equal(after.status, 'QUOTED'); assert.equal(after.total, '300.00'); assert.equal(after.items.length, 2);
  });
  await test('H04 conversiones concurrentes únicas; edición bloqueada y snapshots conservados', async () => {
    const q = await newQuote(); await status(q.id, 'QUOTED'); await status(q.id, 'ACCEPTED');
    const before = await quotes.getQuote(q.id);
    await query('UPDATE products SET name = ? WHERE id = ?', ['Catalog renamed', productId]);
    await query('UPDATE product_variants SET sale_price = 999 WHERE id = ?', [variantIds[0]]);
    await gateHeader(q.id, async (entered, release) => {
      const converted = sales.createFromQuote(q.id, adminId); await entered;
      const { pending } = await startsLocked(q.id, () => quotes.updateQuote(q.id, { internalNotes: 'Race' }, adminId));
      const rejected = assert.rejects(() => pending, /after quoted/);
      const second = sales.createFromQuote(q.id, adminId);
      const duplicate = assert.rejects(() => second, /already converted/);
      release(); const sale = await converted; await rejected; await duplicate;
      assert.equal(sale.total, before.total);
      assert.equal(sale.items[0].productNameSnapshot, before.items[0].productNameSnapshot);
      assert.equal(sale.items[0].unitSalePrice, before.items[0].unitQuotedPrice);
      assert.equal(sale.items[0].quantity, before.items[0].quantity);
    });
    assert.equal(Number((await query('SELECT COUNT(*) n FROM sales WHERE quote_id = ?', [q.id]))[0].n), 1);
  });
  await test('H04 reemplazo fallido revierte ítem eliminado y totales', async () => {
    const q = await newQuote(); const before = await quotes.getQuote(q.id);
    await assert.rejects(() => quotes.updateItem(q.id, before.items[0].id, { productId: '999999999', quantity: 1 }, adminId), /Product not found/);
    const after = await quotes.getQuote(q.id); assert.deepEqual(after.items, before.items); assert.equal(after.total, before.total);
  });
  return results;
};
