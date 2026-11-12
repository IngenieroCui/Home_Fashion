import { test as base, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { isolatedDatabase } from '../fixtures/database';
import { loadEnvironment } from './environment';

export type Evidence = { actors: string[]; modules: string[]; ids: Record<string, string>; finalMySQL: Record<string, unknown>; operations: string[]; notes: string[] };
export const test = base.extend<{ evidence: Evidence; caseKey: string }>({
  caseKey: async ({}, use) => { await use(randomUUID().slice(0, 8)); },
  evidence: [async ({ page }, use, info) => {
    loadEnvironment(); const guard = await isolatedDatabase(); await guard.end();
    const metadata: Record<string, { actors: string[]; modules: string[] }> = {
      '01': { actors: ['Visitante', 'ADMIN (navegador)', 'WORKSHOP (API)'], modules: ['Catálogo', 'Solicitud pública', 'Cotizaciones', 'Ventas', 'Abonos', 'Pedidos', 'Taller', 'Revisión', 'Tracking', 'Entregas', 'Cloudinary'] },
      '02': { actors: ['ADMIN (navegador)', 'WORKSHOP (API)'], modules: ['Clientes', 'Ventas', 'Pedidos', 'Inventario', 'Taller'] },
      '03': { actors: ['ADMIN (navegador)'], modules: ['Clientes', 'Catálogo', 'Ventas', 'Abonos', 'Pedidos', 'Inventario'] },
      '04': { actors: ['ADMIN (API setup)', 'EMPLOYEE (navegador/API)', 'WORKSHOP (API)', 'Visitante'], modules: ['Sesión', 'Permisos', 'Navegación', 'Finanzas', 'Taller', 'Revisión', 'Tracking'] },
      '05': { actors: ['Visitante', 'ADMIN (navegador)'], modules: ['Solicitud pública', 'Sesión/refresh', 'Ventas', 'Abonos', 'Pedidos', 'Inventario', 'Red'] }
    };
    const evidence: Evidence = { ...metadata[info.title.slice(0, 2)], ids: {}, finalMySQL: {}, operations: [], notes: [] };
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (path.startsWith('/api/')) evidence.operations.push(`${response.request().method()} ${path.replace(/(\/tracking\/)[\w-]+/, '$1[redacted]')} HTTP ${response.status()}`);
    });
    try { await use(evidence); }
    finally { await info.attach('journey-evidence', { body: Buffer.from(JSON.stringify(evidence)), contentType: 'application/json' }); }
  }, { auto: true }]
});
export { expect };
export async function screenshot(page: Page, name: string) {
  const info = test.info();
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: false, mask: [page.locator('input[aria-label="Enlace de seguimiento"]')] });
  await info.attach(name, { path, contentType: 'image/png' });
}
