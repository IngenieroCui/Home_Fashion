import { test, expect, screenshot } from '../support/fixture';
import { createHash } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { catalog } from '../fixtures/catalog';
import { rows } from '../fixtures/database';
import { ApiClient, testImage } from '../support/api-client';
import { webURL } from '../support/environment';
import { linkedChain, publicProjection } from '../support/assertions';
import { publicForm, login, uiMutation, confirm, deposit, createOrder, assign, trackingLink } from '../support/ui';

test('01 · Solicitud pública → cotización → venta → taller → entrega del mismo pedido', async ({ page, browser, request, evidence, caseKey }) => {
  const { product, make } = await catalog();
  const ids = evidence.ids;
  const liveMedia = process.env.HF_E2E_ISOLATED_CLOUDINARY === 'true';
  await test.step('Cliente selecciona catálogo/variante y conserva requestCode real', async () => {
    const form = await publicForm(page, product, make, `QA Asistida ${caseKey}`);
    const pending = page.waitForRequest(req => new URL(req.url()).pathname === '/api/public/quote-requests' && req.method() === 'POST');
    const result = await uiMutation(page, '/api/public/quote-requests', () => form.getByRole('button', { name: 'Enviar solicitud', exact: true }).click());
    ids.requestId = (await pending).postDataJSON().requestId; ids.requestCode = result.requestCode;
    expect(ids.requestCode).toMatch(/^HF-SOL-/);
    await expect(page.getByText(ids.requestCode, { exact: true })).toBeVisible();
    await screenshot(page, '01-solicitud');
  });
  await test.step('ADMIN encuentra exactamente la solicitud y completa la propuesta', async () => {
    await login(page); await page.goto('/panel/cotizaciones');
    await page.locator('input[name="q"]').fill(ids.requestCode);
    await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
    const row = page.getByRole('row').filter({ hasText: ids.requestCode }); await expect(row).toHaveCount(1);
    const link = row.getByRole('link', { name: 'Ver cotización →', exact: true });
    ids.quoteId = (await link.getAttribute('href'))!.split('/').pop()!;
    await link.click();
    await page.getByLabel('Vigencia', { exact: true }).fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    await page.getByLabel('Notas internas', { exact: true }).fill('QA-INTERNAL-PRIVATE');
    await page.getByLabel('Notas para el cliente', { exact: true }).fill('Propuesta QA enlazada');
    await uiMutation(page, `/api/admin/quotes/${ids.quoteId}`, () => page.getByRole('button', { name: 'Guardar cambios', exact: true }).click(), 'PATCH');
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Producto', exact: true })).toHaveValue(String(product.id));
    await expect(page.getByRole('combobox', { name: 'Variante', exact: true })).toHaveValue(String(make.id));
    await page.getByLabel('Precio cotizado (opcional)', { exact: true }).fill('250000');
    await uiMutation(page, `/api/admin/quotes/${ids.quoteId}/items/${(await rows('SELECT id FROM quote_items WHERE quote_id=?', [ids.quoteId]))[0].id}`,
      () => page.getByRole('button', { name: 'Guardar elemento', exact: true }).click(), 'PATCH');
    const quoted = await uiMutation(page, `/api/admin/quotes/${ids.quoteId}/status`, async () => {
      await page.getByRole('button', { name: 'Cotizada', exact: true }).click(); await confirm(page, 'Cotizar');
    });
    expect(quoted.status).toBe('QUOTED');
    const accepted = await uiMutation(page, `/api/admin/quotes/${ids.quoteId}/status`, () => page.getByRole('button', { name: 'Aceptada', exact: true }).click());
    expect(accepted.status).toBe('ACCEPTED');
    await page.reload();
  });
  await test.step('ADMIN convierte esa cotización, registra abono y crea su pedido', async () => {
    const sale = await uiMutation(page, `/api/admin/sales/from-quote/${ids.quoteId}`, async () => {
      await page.getByRole('button', { name: 'Convertir en venta', exact: true }).click(); await confirm(page, 'Crear venta');
    });
    ids.saleId = String(sale.id); await expect(page).toHaveURL(new RegExp(`/panel/ventas/${ids.saleId}$`));
    const payment = await deposit(page, ids.saleId); ids.paymentId = String(payment.id);
    const order = await createOrder(page, ids.saleId, ['MADE_TO_ORDER']); ids.orderId = String(order.id);
    const job = await assign(page); ids.jobId = String(job.id);
  });
  const workshop = new ApiClient(request);
  await test.step('WORKSHOP API real: ve asignación, STARTED, PROGRESS y multipart READY_FOR_REVIEW', async () => {
    const user = await workshop.login('workshop'); ids.workshopId = String(user.id);
    const own = await workshop.call<{ data: { id: string }[] }>('GET', '/workshop/jobs?limit=50');
    expect(own.data.map(job => String(job.id))).toContain(ids.jobId);
    const owned = await rows('SELECT id FROM workshop_jobs WHERE workshop_user_id=?', [ids.workshopId]);
    expect(own.data.every(job => owned.some(row => String(row.id) === String(job.id)))).toBe(true);
    const detail = await workshop.call('GET', `/workshop/jobs/${ids.jobId}`); expect(String(detail.id)).toBe(ids.jobId);
    const started = await workshop.call('POST', `/workshop/jobs/${ids.jobId}/progress`, { type: 'STARTED', message: 'QA-HIDDEN-STARTED', progressPercent: 0 });
    ids.startedId = String(started.id);
    const progress = await workshop.call('POST', `/workshop/jobs/${ids.jobId}/progress`, { type: 'PROGRESS', message: 'QA-HIDDEN-PROGRESS', progressPercent: 50 });
    ids.progressId = String(progress.id);
    const submission = {
      type: 'READY_FOR_REVIEW', message: 'QA-PUBLIC-APPROVED', progressPercent: '100',
      requestId: ids.jobId.padStart(32, '0'), files: testImage
    };
    const mediaPath = `/workshop/jobs/${ids.jobId}/progress-media`;
    const ready = await workshop.call('POST', mediaPath, undefined, submission);
    const replay = await workshop.call('POST', mediaPath, undefined, submission);
    expect(replay.id).toBe(ready.id);
    expect((await workshop.response('POST', mediaPath, undefined, { ...submission, message: 'QA otro contenido' })).status()).toBe(409);
    ids.reportId = String(ready.id);
    const outsider = new ApiClient(request);
    await outsider.login('otherWorkshop');
    const jobPath = `/workshop/jobs/${ids.jobId}`;
    expect((await new ApiClient(request).response('GET', jobPath)).status()).toBe(401);
    expect((await outsider.response('GET', jobPath)).status()).toBe(404);
    const ownedDetail = await workshop.call('GET', jobPath);
    expect(ownedDetail.progressReports.find((entry: { id: string }) => String(entry.id) === ids.reportId).evidenceUrls).toHaveLength(1);
    expect(ready.evidenceUrls).toHaveLength(1);
    expect(new URL(ready.evidenceUrls[0]).searchParams.get('expires_at')).toBeTruthy();
    if (liveMedia) await liveEvidenceAccess(request, ready.evidenceUrls[0], ids.reportId);
    evidence.notes.push(liveMedia
      ? 'Imagen PNG multipart enviada al Cloudinary de prueba.'
      : 'Multipart real con respuesta de Cloudinary controlada localmente.');
  });
  await test.step('ADMIN aprueba reporte y publica enlace privado del mismo pedido', async () => {
    await page.goto(`/panel/talleres/avances/${ids.reportId}`);
    const reviewed = await uiMutation(page, `/api/admin/workshop-progress/${ids.reportId}/review`, () => page.getByRole('button', { name: 'Aprobar reporte', exact: true }).click());
    expect(reviewed.reviewStatus).toBe('APPROVED');
    await screenshot(page, '02-avance-aprobado');
  });
  await page.goto(`/panel/pedidos/${ids.orderId}`);
  const tracking = await trackingLink(page, ids.orderId);
  const visitor = await browser.newContext(); const publicPage = await visitor.newPage();
  try {
    await test.step('Visitante sin sesión solo ve el avance aprobado', async () => {
      expect(await visitor.cookies()).toHaveLength(0);
      await publicPage.goto(`${webURL}${tracking.path}`);
      await expect(publicPage.getByText('QA-PUBLIC-APPROVED', { exact: true })).toBeVisible();
      await expect(publicPage.getByText('QA-HIDDEN-PROGRESS')).toHaveCount(0);
      const projection = await new ApiClient(request).call('GET', `/public/tracking/${tracking.token}`);
      publicProjection(projection, ['QA-PUBLIC-APPROVED'], ['QA-HIDDEN-STARTED', 'QA-HIDDEN-PROGRESS', 'QA-INTERNAL-PRIVATE']);
    });
    await test.step('ADMIN programa, inicia y completa la entrega', async () => {
      await page.getByLabel('Dirección de entrega', { exact: true }).fill('Dirección sintética QA');
      await page.getByLabel('Fecha programada', { exact: true }).fill(new Date().toISOString().slice(0, 10));
      await page.getByRole('combobox', { name: 'Tipo de responsable', exact: true }).selectOption('EXTERNAL_DRIVER');
      await page.getByLabel('Nombre del conductor externo', { exact: true }).fill('Conductor QA');
      const delivery = await uiMutation(page, '/api/admin/deliveries', () => page.getByRole('button', { name: 'Programar entrega', exact: true }).click());
      ids.deliveryId = String(delivery.id);
      await page.getByRole('link', { name: 'Ver y gestionar entrega', exact: true }).click();
      await uiMutation(page, `/api/admin/deliveries/${ids.deliveryId}/start`, () => page.getByRole('button', { name: 'Iniciar entrega', exact: true }).click());
      await page.getByLabel('Nombre de quien recibe', { exact: true }).fill('Receptor QA');
      await page.getByLabel('Seleccionar fotografías', { exact: true }).setInputFiles(testImage);
      const completed = await uiMutation(page, '/api/admin/deliveries/' + ids.deliveryId + '/complete-media', () => page.getByRole('button', { name: 'Confirmar entrega recibida', exact: true }).click());
      expect(completed.status).toBe('DELIVERED');
      expect(completed.evidenceUrls).toHaveLength(1);
    });
    await test.step('Tracking actualizado y cadena persistida COMPLETED en MySQL', async () => {
      await publicPage.reload(); await expect(publicPage.getByText('Completado', { exact: true }).first()).toBeVisible();
      const final = await new ApiClient(request).call('GET', `/public/tracking/${tracking.token}`);
      expect(final.orderStatus).toBe('COMPLETED'); expect(final.delivery.status).toBe('DELIVERED');
      expect(final.delivery.evidenceUrls).toBeNull();
      evidence.finalMySQL = await linkedChain(ids);
      await screenshot(publicPage, '03-pedido-completado');
    });
  } finally { await visitor.close(); }
});

// Only with the authorized Cloudinary test account: signed link works, unsigned/tampered/expired access is refused.
async function liveEvidenceAccess(request: APIRequestContext, signedLink: string, reportId: string) {
  const signed = await request.get(signedLink, { maxRedirects: 5 });
  expect(signed.status()).toBe(200);
  expect(signed.headers()['content-type']).toMatch(/^image\//);
  const [stored] = await rows('SELECT evidence_urls FROM workshop_progress_reports WHERE id=?', [reportId]);
  const unsigned = String(stored.evidence_urls[0]).replace(/\/s--[A-Za-z0-9_-]+--\//, '/');
  expect(unsigned).not.toContain('/s--');
  expect((await request.get(unsigned, { maxRedirects: 0 })).status()).not.toBe(200);
  const tampered = new URL(signedLink);
  tampered.searchParams.set('signature', '0'.repeat(64));
  expect((await request.get(tampered.toString(), { maxRedirects: 0 })).status()).not.toBe(200);
  const expired = new URL(signedLink);
  const now = Math.floor(Date.now() / 1000) - 600;
  const fields: Record<string, string> = { expires_at: String(now + 300), format: expired.searchParams.get('format')!,
    public_id: expired.searchParams.get('public_id')!, timestamp: String(now), type: 'authenticated' };
  for (const [name, value] of Object.entries(fields)) expired.searchParams.set(name, value);
  expired.searchParams.set('signature', createHash('sha256').update(Object.entries(fields)
    .map(([name, value]) => name + '=' + value).join('&') + process.env.CLOUDINARY_API_SECRET).digest('hex'));
  expect((await request.get(expired.toString(), { maxRedirects: 0 })).status()).not.toBe(200);
}
