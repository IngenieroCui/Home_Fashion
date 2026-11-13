import { test, expect } from '@playwright/test';
import { catalog } from '../fixtures/catalog';
import { rows } from '../fixtures/database';
import { login, createCustomer, directSale, createOrder, assign } from '../support/ui';
import { readJobs, writeJobs } from './state';

// Creates fresh ASSIGNED jobs for workshop@e2e.invalid through the real ADMIN UI/API.
const count = Number(process.env.ANDROID_JOBS ?? '2');

test('Android · prepara trabajos asignados al taller sintético', async ({ page }) => {
  const { product, make } = await catalog();
  await login(page);
  const jobs = readJobs();
  for (let i = 0; i < count; i++) {
    const customer = await createCustomer(page, `QA Android ${Date.now()}-${i}`);
    const sale = await directSale(page, customer, product, [make]);
    const order = await createOrder(page, String(sale.id), ['MADE_TO_ORDER']);
    const job = await assign(page);
    const [stored] = await rows('SELECT j.code job, j.status, o.code ord FROM workshop_jobs j JOIN order_items i ON i.id=j.order_item_id JOIN orders o ON o.id=i.order_id WHERE j.id=?', [job.id]);
    expect(stored.status).toBe('ASSIGNED');
    jobs.push({ orderId: String(order.id), jobId: String(job.id), jobCode: stored.job, orderCode: stored.ord });
    console.log(`ASSIGNED ${stored.job} pedido ${stored.ord}`);
  }
  writeJobs(jobs);
});
