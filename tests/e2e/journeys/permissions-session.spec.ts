import { test, expect, screenshot } from '../support/fixture';
import { catalog } from '../fixtures/catalog';
import { rows } from '../fixtures/database';
import { actors } from '../fixtures/actors';
import { ApiClient, type Entity } from '../support/api-client';
import { publicProjection } from '../support/assertions';
import { login } from '../support/ui';
import { webURL } from '../support/environment';

test('04 · EMPLOYEE limitado, WORKSHOP ajeno y tracking público protegen datos', async ({ page, request, browser, evidence, caseKey }) => {
  const { product, make } = await catalog();
  const admin = new ApiClient(request); await admin.login('admin');
  // Role/privacy setup uses real business APIs, never business-state SQL writes.
  const customer = await admin.call('POST', '/admin/customers', { fullName: `QA Privacidad ${caseKey}`, phone: '0000000000', notes: 'QA-PRIVATE-CUSTOMER' });
  const sale = await admin.call('POST', '/admin/sales', { customerId: String(customer.id), notes: 'QA-PRIVATE-FINANCE',
    items: [make, make].map(variant => ({ productId: String(product.id), productVariantId: String(variant.id), quantity: 1 })) });
  const order = await admin.call('POST', `/admin/orders/from-sale/${sale.id}`, { notes: 'QA-PRIVATE-ORDER',
    items: sale.items.map((item: Entity) => ({ saleItemId: String(item.id), supplyType: 'MADE_TO_ORDER' })) });
  const workshop = new ApiClient(request), other = new ApiClient(request);
  const owner = await workshop.login('workshop'), outsider = await other.login('otherWorkshop');
  const job = await admin.call('POST', '/admin/workshop-jobs', { orderItemId: String(order.items[0].id), workshopUserId: String(owner.id), instructions: 'QA-PRIVATE-INSTRUCTIONS' });
  const foreignJob = await admin.call('POST', '/admin/workshop-jobs', { orderItemId: String(order.items[1].id), workshopUserId: String(outsider.id) });
  Object.assign(evidence.ids, { customerId: String(customer.id), saleId: String(sale.id), orderId: String(order.id), jobId: String(job.id), foreignJobId: String(foreignJob.id) });
  await test.step('EMPLOYEE navega clientes/catálogo y recibe denegación en módulos prohibidos', async () => {
    await login(page, 'employee');
    const nav = page.getByRole('navigation', { name: 'Módulos del panel' });
    await expect(nav.getByRole('link', { name: 'Clientes', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Productos', exact: true })).toBeVisible();
    for (const label of ['Ventas', 'Pedidos', 'Cotizaciones', 'Talleres', 'Revisión de avances', 'Entregas'])
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveCount(0);
    await nav.getByRole('link', { name: 'Clientes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Gestión de clientes', exact: true })).toBeVisible();
    const employee = new ApiClient(request); await employee.login('employee');
    for (const path of ['/admin/sales', '/admin/orders', '/admin/quotes', '/admin/workshop-jobs', '/admin/workshop-progress', '/admin/deliveries']) {
      expect((await employee.response('GET', path)).status(), path).toBe(403);
      const bff = await page.request.get(`/api${path}`); expect(bff.status(), `BFF ${path}`).toBe(403);
    }
    await page.goto('/panel/ventas');
    await expect(page).toHaveURL(/\/panel\?denied=sales$/);
    await expect(page.getByRole('heading', { name: 'Ventas', exact: true })).toHaveCount(0);
    await screenshot(page, '06-permiso-denegado');
  });
  await test.step('WORKSHOP no consulta ni modifica trabajo ajeno ni finanzas', async () => {
    expect((await workshop.response('GET', `/workshop/jobs/${foreignJob.id}`)).status()).toBe(404);
    expect((await other.response('GET', `/workshop/jobs/${job.id}`)).status()).toBe(404);
    expect((await workshop.response('POST', `/workshop/jobs/${foreignJob.id}/progress`, { type: 'STARTED', message: 'Intento QA prohibido' })).status()).toBe(404);
    expect((await workshop.response('GET', `/admin/sales/${sale.id}`)).status()).toBe(403);
    expect((await workshop.response('POST', `/admin/sales/${sale.id}/payments`, { type: 'DEPOSIT', method: 'CASH', amount: '1.00', paidAt: new Date().toISOString() })).status()).toBe(403);
    const listing = await workshop.call('GET', '/workshop/jobs?limit=50');
    expect(listing.data.map((item: Entity) => String(item.id))).not.toContain(String(foreignJob.id));
  });
  await test.step('Visitante solo ve datos públicos y avances aprobados, nunca pendientes/rechazados', async () => {
    const started = await workshop.call('POST', `/workshop/jobs/${job.id}/progress`, { type: 'STARTED', message: 'QA-PUBLIC-PRIVACY', progressPercent: 0 });
    await admin.call('POST', `/admin/workshop-progress/${started.id}/review`, { decision: 'APPROVE' });
    const rejected = await workshop.call('POST', `/workshop/jobs/${job.id}/progress`, { type: 'PROGRESS', message: 'QA-HIDDEN-REJECTED', progressPercent: 25 });
    await admin.call('POST', `/admin/workshop-progress/${rejected.id}/review`, { decision: 'REJECT', comment: 'Revisión QA' });
    const pending = await workshop.call('POST', `/workshop/jobs/${job.id}/progress`, { type: 'PROGRESS', message: 'QA-HIDDEN-PENDING', progressPercent: 50 });
    const tracking = await admin.call('POST', `/admin/orders/${order.id}/tracking-access`, {});
    const projection = await new ApiClient(request).call('GET', `/public/tracking/${tracking.token}`);
    publicProjection(projection, ['QA-PUBLIC-PRIVACY'], ['QA-HIDDEN-REJECTED', 'QA-HIDDEN-PENDING', 'QA-PRIVATE-CUSTOMER', 'QA-PRIVATE-FINANCE', 'QA-PRIVATE-ORDER', 'QA-PRIVATE-INSTRUCTIONS']);
    const visitor = await browser.newContext();
    try {
      expect(await visitor.cookies()).toHaveLength(0);
      const publicPage = await visitor.newPage(); await publicPage.goto(`${webURL}${tracking.path}`);
      await expect(publicPage.getByText('QA-PUBLIC-PRIVACY', { exact: true })).toBeVisible();
      await expect(publicPage.getByText('QA-HIDDEN-PENDING')).toHaveCount(0);
      await expect(publicPage.getByText('QA-HIDDEN-REJECTED')).toHaveCount(0);
    } finally { await visitor.close(); }
    const reports = await rows('SELECT id, workshop_job_id, review_status FROM workshop_progress_reports WHERE id IN (?, ?, ?) ORDER BY id', [started.id, rejected.id, pending.id]);
    expect(reports.map(row => row.review_status)).toEqual(['APPROVED', 'REJECTED', 'PENDING_REVIEW']);
    evidence.finalMySQL = { reports, foreignJob: await rows('SELECT id, status FROM workshop_jobs WHERE id=?', [foreignJob.id]) };
    expect((evidence.finalMySQL.foreignJob as Entity[])[0].status).toBe('ASSIGNED');
    evidence.notes.push('Preparación de privacidad mediante API ADMIN real. Navegación EMPLOYEE y tracking en navegador real.');
  });
});
