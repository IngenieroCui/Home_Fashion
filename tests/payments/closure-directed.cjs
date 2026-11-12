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
  const catalog = service('catalog', 'catalog-admin.service', 'CatalogAdminService');
  const cleanup = service('media', 'media-cleanup.service', 'MediaCleanupService');
  const cloud = service('media', 'cloudinary-media.service', 'CloudinaryMediaService');
  const workshopJobs = service('workshop-jobs', 'workshop-jobs.service', 'WorkshopJobsService');
  const workshopProgress = service('workshop-jobs', 'workshop-progress.service', 'WorkshopProgressService');
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
  async function orderFixture(lines) {
    const sale = await sales.createDirect({ customerId, items: lines.map(x => line(x.variant, x.quantity)) }, adminId);
    return orders.createFromSale(String(sale.id), { items: sale.items.map((x, i) => ({ saleItemId: String(x.id), supplyType: lines[i].type })) }, adminId);
  }
  const schedule = id => deliveries.create({
    orderId: id, address: 'Synthetic', contactName: 'Test', contactPhone: '000',
    scheduledDate: '2026-10-29', deliveryType: 'EXTERNAL_DRIVER', externalDriverName: 'Test'
  }, adminId);
  async function deliveryFixture(lines) {
    const order = await orderFixture(lines);
    // Workshop READY is a fixture; workshop flow is outside this directed regression.
    await query("UPDATE order_items SET status = 'READY' WHERE order_id = ? AND supply_type = 'MADE_TO_ORDER'", [order.id]);
    const delivery = await schedule(order.id);
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

  const stockLine = { variant: variantIds[0], quantity: 2, type: 'IN_STOCK' };
  const makeLine = { variant: variantIds[1], quantity: 1, type: 'MADE_TO_ORDER' };
  const cancel = id => orders.cancel(id, 'Cancelación sintética', adminId);
  const cancellationCount = async id =>
    Number((await query('SELECT COUNT(*) AS n FROM order_cancellations WHERE order_id = ?', [id]))[0].n);

  await test('Cancelación concurrente con inicio de taller mantiene pedido, trabajo y reservas coherentes', async () => {
    const before = await stock();
    const order = await orderFixture([stockLine, makeLine]);
    const [actor] = await query("SELECT id FROM users WHERE email = 'workshop@e2e.invalid'");
    const item = order.items.find(entry => entry.supplyType === 'MADE_TO_ORDER');
    const job = await workshopJobs.create({ orderItemId: String(item.id), workshopUserId: String(actor.id) }, adminId);
    const [cancelled, started] = await Promise.allSettled([
      cancel(order.id),
      workshopProgress.submit(String(actor.id), String(job.id), { type: 'STARTED', message: 'Inicio sintético' })
    ]);
    assert.equal(cancelled.status, 'fulfilled');
    if (started.status === 'rejected') assert.equal(started.reason.getStatus?.(), 400);
    assert.equal((await workshopJobs.detail(job.id)).status, 'CANCELLED');
    assert.equal((await orders.detail(order.id)).status, 'CANCELLED');
    assert.equal(await cancellationCount(order.id), 1);
    assert.deepEqual(await stock(), before);
  });

  await test('Programación concurrente con cancelación deja la entrega cancelada o ausente', async () => {
    const order = await orderFixture([stockLine]);
    const [cancelled, scheduled] = await Promise.allSettled([cancel(order.id), schedule(order.id)]);
    assert.equal(cancelled.status, 'fulfilled');
    if (scheduled.status === 'rejected') assert.equal(scheduled.reason.getStatus?.(), 400);
    const records = await query('SELECT status FROM deliveries WHERE order_id = ?', [order.id]);
    assert.deepEqual(records.map(row => row.status), scheduled.status === 'fulfilled' ? ['CANCELLED'] : []);
  });

  await test('Cierre concurrente de entrega en reparto impide cancelar y consume una sola reserva', async () => {
    const before = await stock();
    const { order, delivery } = await deliveryFixture([stockLine]);
    const [cancelled, delivered] = await Promise.allSettled([cancel(order.id), complete(delivery.id)]);
    assert.equal(cancelled.status, 'rejected');
    assert.equal(cancelled.reason.getStatus?.(), 409);
    assert.equal(delivered.status, 'fulfilled');
    assert.equal((await orders.detail(order.id)).status, 'COMPLETED');
    assert.equal(await cancellationCount(order.id), 0);
    assert.deepEqual((await stock())[0], { ...before[0], h: before[0].h - stockLine.quantity });
  });

  await test('Ajuste y dos cancelaciones simultáneas conservan existencias, reserva y un evento', async () => {
    const before = await stock();
    const order = await orderFixture([stockLine]);
    const requestId = randomUUID();
    await Promise.all([
      cancel(order.id), cancel(order.id),
      catalog.adjustInventory(variantIds[0], {
        expectedQuantity: before[0].h, quantityOnHand: before[0].h + 1, reason: 'Recuento sintético', requestId
      }, adminId)
    ]);
    assert.deepEqual((await stock())[0], { ...before[0], h: before[0].h + 1 });
    assert.equal(await cancellationCount(order.id), 1);
    assert.equal((await query('SELECT delta FROM inventory_movements WHERE reference = ?', [requestId]))[0].delta, 1);
  });

  await test('Reenvío concurrente de avance devuelve el mismo reporte y una huella distinta da conflicto', async () => {
    const order = await orderFixture([makeLine]);
    const [actor] = await query("SELECT id FROM users WHERE email = 'workshop@e2e.invalid'");
    const userId = String(actor.id);
    const job = await workshopJobs.create({ orderItemId: String(order.items[0].id), workshopUserId: userId }, adminId);
    await workshopProgress.submit(userId, job.id, { type: 'STARTED', message: 'Inicio sintético' });
    const dto = { requestId: randomUUID().replaceAll('-', ''), type: 'PROGRESS', message: 'Avance sintético', progressPercent: 50 };
    const [first, second] = await Promise.all([
      workshopProgress.submit(userId, job.id, dto),
      workshopProgress.submit(userId, job.id, dto)
    ]);
    assert.equal(first.id, second.id);
    await assert.rejects(() => workshopProgress.submit(userId, job.id, { ...dto, progressPercent: 60 }), /otro reporte/);
    assert.equal(Number((await query('SELECT COUNT(*) AS n FROM workshop_progress_reports WHERE request_id = ?', [dto.requestId]))[0].n), 1);
  });

  await test('Dos instancias comparten cuotas MySQL y aíslan los contadores por cliente', async () => {
    const { requestRateLimit } = require('../../apps/api/dist/config/request-rate-limit');
    const key = randomUUID();
    const config = { getOrThrow: () => key, get: () => undefined };
    const first = requestRateLimit(OrderItem.sequelize, config);
    const second = requestRateLimit(OrderItem.sequelize, config);
    const time = Date.now;
    const minute = Math.floor(time() / 60_000) * 60_000;
    Date.now = () => minute + 1000;
    try {
      for (const [path, limit] of [['/api/auth/login', 8], ['/api/auth/refresh', 90], ['/api/public/quote-requests', 12]]) {
        const run = (limiter, address) => new Promise((resolve, reject) => {
          const headers = {};
          const res = {
            setHeader: (name, value) => { headers[name] = value; },
            status: status => ({ json: () => resolve({ status, headers }) })
          };
          limiter({ method: 'POST', path, headers: {}, socket: { remoteAddress: address }, body: { email: 'qa@e2e.invalid' } },
            res, () => resolve({ status: 200, headers })).catch(reject);
        });
        const results = await Promise.all(Array.from({ length: limit + 1 }, (_, index) =>
          run(index % 2 ? first : second, '192.0.2.10')
        ));
        assert.equal(results.filter(result => result.status === 200).length, limit);
        const denied = results.filter(result => result.status === 429);
        assert.equal(denied.length, 1);
        assert.equal(denied[0].headers['Retry-After'], '59');
        assert.equal((await run(second, '192.0.2.11')).status, 200);
      }
    } finally { Date.now = time; }
  });

  for (const table of [null, 'quote_items', 'sale_items', 'order_items']) {
    await test(table ? `Retención conserva la foto referenciada en ${table}` : 'Limpieza borra una imagen libre una sola vez', async () => {
      const asset = `home-fashion/products/${run}/${randomUUID()}`;
      const url = `https://res.cloudinary.com/qa/image/upload/v1/${asset}.webp`;
      const image = await catalog.createImage(productId, { url, publicId: asset, isPrimary: true });
      if (table) {
        const record = table === 'quote_items' ? await newQuote()
          : table === 'sale_items' ? await sales.createDirect({ customerId, items: [line()] }, adminId)
          : await orderFixture([makeLine]);
        assert.equal(record.items[0].imageUrlSnapshot, url);
        if (table === 'order_items') {
          await query('UPDATE sale_items SET image_url_snapshot = NULL WHERE sale_id = ?', [record.saleId]);
          await query('UPDATE order_items SET image_url_snapshot = ? WHERE order_id = ?', [
            url.replace('/v1/', '/v2/').replace('.webp', '.png'), record.id
          ]);
        }
      }
      await catalog.deleteImage(String(image.id));
      if (table === 'order_items') await query('UPDATE media_cleanup SET source_url = NULL WHERE public_id = ?', [asset]);
      const destroy = cloud.destroy;
      const removed = [];
      cloud.destroy = async id => { removed.push(id); };
      try {
        await cleanup.drain();
        await cleanup.drain();
      } finally { cloud.destroy = destroy; }
      assert.equal(removed.filter(id => id === asset).length, table ? 0 : 1);
      assert.ok((await query('SELECT completed_at FROM media_cleanup WHERE public_id = ?', [asset]))[0].completed_at);
    });
  }
  await test('Fallo de proveedor deja la tarea pendiente y permite completar el mismo borrado', async () => {
    const asset = `home-fashion/products/${run}/${randomUUID()}`;
    await cleanup.enqueue('products', asset);
    const destroy = cloud.destroy;
    let attempts = 0;
    cloud.destroy = async id => { if (id === asset && ++attempts === 1) throw Error('Proveedor controlado'); };
    try {
      await cleanup.drain();
      const [pending] = await query('SELECT attempts, completed_at FROM media_cleanup WHERE public_id = ?', [asset]);
      assert.deepEqual(pending, { attempts: 1, completed_at: null });
      await query('UPDATE media_cleanup SET due_at = NOW() WHERE public_id = ?', [asset]);
      await cleanup.drain();
      assert.equal(attempts, 2);
      assert.ok((await query('SELECT completed_at FROM media_cleanup WHERE public_id = ?', [asset]))[0].completed_at);
    } finally { cloud.destroy = destroy; }
  });

  await test('Una cotización concurrente al retiro conserva la imagen que acaba de registrar', async () => {
    const { ProductImage } = require('../../apps/api/dist/modules/catalog/entities/product-image.model');
    const asset = `home-fashion/products/${run}/${randomUUID()}`;
    const url = `https://res.cloudinary.com/qa/image/upload/v1/${asset}.webp`;
    const image = await catalog.createImage(productId, { url, publicId: asset, isPrimary: true });
    const lookup = ProductImage.findOne;
    const lookupById = ProductImage.findByPk;
    let signal;
    let signalDeletion;
    let release;
    const locked = new Promise(resolve => { signal = resolve; });
    const deletionStarted = new Promise(resolve => { signalDeletion = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    ProductImage.findOne = async function(options) {
      const result = await lookup.call(this, options);
      if (String(result?.id) === String(image.id) && options?.lock) {
        signal();
        await gate;
      }
      return result;
    };
    ProductImage.findByPk = function(id, options) {
      const pending = lookupById.call(this, id, options);
      if (String(id) === String(image.id) && options?.lock) signalDeletion();
      return pending;
    };
    const timeout = AbortSignal.timeout(5000);
    const quote = newQuote();
    try {
      await Promise.race([
        locked, quote.then(() => { throw Error('Cotización sin bloqueo de imagen'); }),
        new Promise((_, reject) => timeout.addEventListener('abort', () => reject(Error('Tiempo de bloqueo agotado')), { once: true }))
      ]);
      const deletion = catalog.deleteImage(String(image.id));
      await Promise.race([deletionStarted, deletion.then(() => { throw Error('Retiro sin bloqueo de imagen'); })]);
      release();
      const [saved] = await Promise.all([quote, deletion]);
      assert.equal(saved.items[0].imageUrlSnapshot, url);
    } finally { release(); ProductImage.findOne = lookup; ProductImage.findByPk = lookupById; }
    const destroy = cloud.destroy;
    const removed = [];
    cloud.destroy = async id => { removed.push(id); };
    try { await cleanup.drain(); } finally { cloud.destroy = destroy; }
    assert.ok(!removed.includes(asset));
    assert.ok((await query('SELECT completed_at FROM media_cleanup WHERE public_id = ?', [asset]))[0].completed_at);
  });
  return results;
};
