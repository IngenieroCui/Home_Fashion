import { expect, type Page } from '@playwright/test';
import { actors } from '../fixtures/actors';
import { required } from './environment';
import type { Entity } from './api-client';

export async function uiMutation<T = Entity>(page: Page, path: string, action: () => Promise<unknown>, method = 'POST'): Promise<T> {
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === method);
  await action(); const response = await pending;
  expect(response.ok(), `${method} ${path}: HTTP ${response.status()}`).toBe(true);
  return response.json() as Promise<T>;
}
export async function login(page: Page, actor: 'admin' | 'employee' = 'admin') {
  await page.goto('/iniciar-sesion');
  await page.locator('input[name="email"]').fill(actors[actor].email);
  await page.locator('input[name="password"]').fill(required('E2E_ACTOR_PASSWORD'));
  await uiMutation(page, '/api/session/login', () => page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click());
  await expect(page).toHaveURL(/\/panel/);
}
export async function confirm(page: Page, label: string) {
  await page.getByRole('dialog').getByRole('button', { name: label, exact: true }).click();
}
export async function publicForm(page: Page, product: Entity, variant: Entity, name: string) {
  await page.goto('/catalogo');
  await page.locator(`a[href^="/catalogo/${product.slug}"]`).first().click();
  await page.locator(`input[type="radio"][value="${variant.id}"]`).first().check();
  await page.getByRole('link', { name: 'Solicitar cotización de esta opción' }).click();
  const form = page.locator('#solicitar-cotizacion');
  await form.getByRole('button', { name: 'Continuar', exact: true }).click();
  await form.locator('input[name="fullName"]').fill(name);
  await form.locator('input[name="phone"]').fill('0000000000');
  await form.locator('input[name="email"]').fill('cliente@e2e.invalid');
  return form;
}
export async function createCustomer(page: Page, name: string) {
  await page.goto('/panel/clientes/nuevo');
  await page.getByLabel('Nombre completo', { exact: true }).fill(name);
  await page.getByLabel('Teléfono', { exact: true }).fill('0000000000');
  return uiMutation(page, '/api/admin/customers', () => page.getByRole('button', { name: 'Guardar cliente' }).click());
}
export async function directSale(page: Page, customer: Entity, product: Entity, variants: Entity[]) {
  await page.goto(`/panel/ventas/nueva?customerId=${customer.id}`);
  await page.getByLabel('Buscar cliente', { exact: true }).fill(customer.fullName);
  await expect(page.getByLabel('Cliente seleccionado').locator(`option[value="${customer.id}"]`)).toHaveCount(1);
  await page.getByLabel('Cliente seleccionado').selectOption(String(customer.id));
  for (const variant of variants) {
    await page.getByLabel('Buscar producto', { exact: true }).fill(product.name);
    await expect(page.getByRole('combobox', { name: 'Producto', exact: true }).locator(`option[value="${product.id}"]`)).toHaveCount(1);
    await page.getByRole('combobox', { name: 'Producto', exact: true }).selectOption(String(product.id));
    await page.getByRole('combobox', { name: 'Variante', exact: true }).selectOption(String(variant.id));
    await page.getByRole('button', { name: 'Añadir elemento', exact: true }).click();
  }
  const sale = await uiMutation(page, '/api/admin/sales', () => page.getByRole('button', { name: 'Crear venta', exact: true }).click());
  await expect(page).toHaveURL(new RegExp(`/panel/ventas/${sale.id}$`));
  return sale;
}
export async function deposit(page: Page, saleId: string) {
  const form = page.locator('#registrar-movimiento');
  await form.getByLabel('Monto', { exact: true }).fill('50000');
  const response = await uiMutation(page, `/api/admin/sales/${saleId}/payments-media`, () => form.getByRole('button', { name: 'Registrar movimiento', exact: true }).click());
  expect(response.payment?.id).toBeTruthy();
  return response.payment as Entity;
}
export async function createOrder(page: Page, saleId: string, supply: ('IN_STOCK' | 'MADE_TO_ORDER')[]) {
  await page.goto(`/panel/ventas/${saleId}/crear-pedido`);
  const cards = page.locator('.order-classification article'); await expect(cards).toHaveCount(supply.length);
  for (let i = 0; i < supply.length; i++) await cards.nth(i).locator(`input[value="${supply[i]}"]`).check();
  const order = await uiMutation(page, `/api/admin/orders/from-sale/${saleId}`, () => page.getByRole('button', { name: 'Crear pedido', exact: true }).click());
  await expect(page).toHaveURL(new RegExp(`/panel/pedidos/${order.id}$`));
  return order;
}
export async function assign(page: Page, actor: 'workshop' | 'otherWorkshop' = 'workshop') {
  await page.getByLabel('Buscar taller').fill(actors[actor].email);
  await page.getByRole('button', { name: `${actors[actor].name} ${actors[actor].email}`, exact: true }).click();
  return uiMutation(page, '/api/admin/workshop-jobs', () => page.getByRole('button', { name: 'Crear asignación', exact: true }).click());
}
export async function trackingLink(page: Page, orderId: string) {
  const response = await uiMutation<Entity>(page, `/api/admin/orders/${orderId}/tracking-access`,
    () => page.getByRole('button', { name: 'Generar enlace de seguimiento', exact: true }).click());
  await expect(page.getByLabel('Enlace de seguimiento')).toBeVisible();
  const link = await page.getByLabel('Enlace de seguimiento').inputValue();
  await page.getByRole('button', { name: 'Ocultar enlace', exact: true }).click();
  return { path: new URL(link).pathname, token: response.token as string };
}
