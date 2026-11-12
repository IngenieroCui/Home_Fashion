import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { apiURL, required } from '../support/environment';
import { actors } from '../fixtures/actors';
import { catalog } from '../fixtures/catalog';
import { rows } from '../fixtures/database';

test('06 · Permisos financieros, ajuste auditable y revocación efectiva', async ({ request }) => {
  const health = await request.get(apiURL + '/health', { headers: { origin: 'https://isolated-client.invalid' } });
  expect(health.status()).toBe(200);
  expect(health.headers()['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
  expect(health.headers()['access-control-allow-origin']).toBeUndefined();
  const post = (path: string, data: unknown, token?: string) => request.post(apiURL + path, {
    data, ...(token ? { headers: { authorization: 'Bearer ' + token } } : {})
  });
  const login = async (email: string, password = required('E2E_ACTOR_PASSWORD')) => {
    const response = await post('/auth/login', { email, password });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const admin = (await login(actors.admin.email)).accessToken;
  const employee = (await login(actors.employee.email)).accessToken;
  const { stock, product } = await catalog();
  const path = '/admin/catalog/variants/' + stock.id;
  const patch = (path: string, data: unknown, token: string) => request.patch(apiURL + path, { data, headers: { authorization: 'Bearer ' + token } });
  const [before] = await rows('SELECT sale_price, estimated_cost, quantity_on_hand, quantity_reserved FROM product_variants WHERE id = ?', [stock.id]);
  for (const data of [{ salePrice: 10000 }, { salePrice: 0 }, { salePrice: null }, { estimatedCost: 0 }, { estimatedCost: null }])
    expect((await patch(path, data, employee)).status()).toBe(403);
  expect((await post('/admin/catalog/products/' + product.id + '/variants', { sku: 'SEC-' + randomUUID(), salePrice: 12000, quantityOnHand: 0 }, employee)).status()).toBe(403);
  expect((await rows('SELECT sale_price, estimated_cost, quantity_on_hand, quantity_reserved FROM product_variants WHERE id = ?', [stock.id]))[0]).toEqual(before);
  expect((await patch(path, { estimatedCost: before.estimated_cost }, admin)).status()).toBe(200);
  const adjust = path + '/inventory-movements';
  const dto = { quantityOnHand: before.quantity_on_hand + 1, expectedQuantity: before.quantity_on_hand, reason: 'QA recuento', requestId: randomUUID() };
  const responses = await Promise.all([
    post(adjust, dto, employee),
    post(adjust, { ...dto, requestId: randomUUID() }, employee)
  ]);
  expect(responses.map(result => result.status()).sort()).toEqual([201, 409]);
  const records = await rows("SELECT delta, previous_quantity, next_quantity, reference FROM inventory_movements WHERE variant_id = ? AND kind = 'ADJUSTMENT' ORDER BY id DESC LIMIT 1", [stock.id]);
  expect(records[0]).toMatchObject({ delta: 1, previous_quantity: before.quantity_on_hand, next_quantity: before.quantity_on_hand + 1 });
  expect((await post(adjust, { ...dto, requestId: records[0].reference }, employee)).status()).toBe(201);
  expect((await post(adjust, { ...dto, requestId: randomUUID(), expectedQuantity: dto.quantityOnHand, quantityOnHand: before.quantity_on_hand }, employee)).status()).toBe(201);

  const email = 'backlog-' + randomUUID() + '@e2e.invalid';
  const password = randomUUID();
  const user = { fullName: 'QA temporal', email, password, role: 'EMPLOYEE' };
  expect((await post('/admin/users', user, employee)).status()).toBe(403);
  const created = await post('/admin/users', user, admin);
  expect(created.status()).toBe(201);
  const account = await created.json();
  expect(account).not.toHaveProperty('passwordHash');
  const oldSession = await login(email, password);
  const resetPassword = randomUUID();
  const reset = await patch('/admin/users/' + account.id, { password: resetPassword }, admin);
  expect(reset.status()).toBe(200);
  expect(await reset.json()).not.toHaveProperty('passwordHash');
  const verifyRevoked = async (session: { accessToken: string; refreshToken: string }) => {
    expect((await request.get(apiURL + '/auth/me', { headers: { authorization: 'Bearer ' + session.accessToken } })).status()).toBe(401);
    expect((await post('/auth/refresh', { refreshToken: session.refreshToken })).status()).toBe(401);
  };
  await verifyRevoked(oldSession);
  expect((await post('/auth/login', { email, password })).status()).toBe(401);
  const session = await login(email, resetPassword);
  expect((await patch('/admin/users/' + account.id, { active: false }, admin)).status()).toBe(200);
  await verifyRevoked(session);
  expect((await rows('SELECT action FROM user_admin_events WHERE target_id = ? ORDER BY id', [account.id])).map(row => row.action)).toEqual(['CREATE', 'PASSWORD_RESET', 'UPDATE_REVOKE']);
});
