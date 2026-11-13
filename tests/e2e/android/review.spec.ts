import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { rows } from '../fixtures/database';
import { ApiClient } from '../support/api-client';
import { login, trackingLink, uiMutation } from '../support/ui';
import { webURL } from '../support/environment';
import { evidenceDir, readJobs } from './state';

// ADMIN reviews the reports that the Android emulator sent, then an anonymous
// customer checks that tracking exposes only approved progress.
const APPROVE = process.env.ANDROID_APPROVE_PREFIX ?? 'QA Android avance:';
const REJECT = process.env.ANDROID_REJECT_PREFIX ?? 'QA Android respuesta perdida';

test('Android · ADMIN aprueba/rechaza y el cliente solo ve lo aprobado', async ({ page, browser, request }) => {
  mkdirSync(evidenceDir, { recursive: true });
  const job = readJobs().find(entry => entry.jobCode === (process.env.ANDROID_JOB ?? 'HF-TAL-2026-00019'));
  if (!job) throw new Error('Falta el trabajo Android preparado.');
  const reports = await rows(
    'SELECT id, message, review_status FROM workshop_progress_reports WHERE workshop_job_id=? ORDER BY id', [job.jobId]);
  const approve = reports.find(row => String(row.message).startsWith(APPROVE));
  const reject = reports.find(row => String(row.message).startsWith(REJECT));
  if (!approve || !reject) throw new Error('Faltan los reportes enviados desde Android.');

  await login(page);
  await page.goto(`/panel/talleres/avances/${approve.id}`);
  await expect(page.getByText(APPROVE, { exact: false }).first()).toBeVisible();
  const approved = await uiMutation(page, `/api/admin/workshop-progress/${approve.id}/review`,
    () => page.getByRole('button', { name: 'Aprobar reporte', exact: true }).click());
  expect(approved.reviewStatus).toBe('APPROVED');
  await page.screenshot({ path: resolve(evidenceDir, 'admin-aprobado.png') });

  await page.goto(`/panel/talleres/avances/${reject.id}`);
  await page.getByRole('textbox').last().fill('QA rechazo: falta fotografía del tapizado');
  const rejected = await uiMutation(page, `/api/admin/workshop-progress/${reject.id}/review`,
    () => page.getByRole('button', { name: 'Rechazar reporte', exact: true }).click());
  expect(rejected.reviewStatus).toBe('REJECTED');
  await page.screenshot({ path: resolve(evidenceDir, 'admin-rechazado.png') });

  await page.goto(`/panel/pedidos/${job.orderId}`);
  const tracking = await trackingLink(page, job.orderId);
  const visitor = await browser.newContext();
  try {
    expect(await visitor.cookies()).toHaveLength(0);
    const publicPage = await visitor.newPage();
    await publicPage.goto(`${webURL}${tracking.path}`);
    await expect(publicPage.getByText(APPROVE, { exact: false }).first()).toBeVisible();
    for (const hidden of [REJECT, 'QA Android inicio con foto', 'QA Android cierre', 'QA Android fix pendiente']) {
      await expect(publicPage.getByText(hidden, { exact: false })).toHaveCount(0);
    }
    const projection = JSON.stringify(await new ApiClient(request).call('GET', `/public/tracking/${tracking.token}`));
    expect(projection).toContain(APPROVE);
    for (const hidden of [REJECT, 'QA rechazo', 'QA Android inicio con foto', 'workshop_user', 'email']) {
      expect(projection).not.toContain(hidden);
    }
    await publicPage.screenshot({ path: resolve(evidenceDir, 'cliente-seguimiento.png') });
  } finally { await visitor.close(); }
});
