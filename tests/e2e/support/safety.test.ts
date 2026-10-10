import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnvironment } from './environment';
import { isolatedDatabase } from '../fixtures/database';

test('production/remote/shared/root settings fail closed before connecting', async () => {
  for (const [key, value] of [['DB_HOST', 'production.aivencloud.com'], ['DB_NAME', 'home_fashion'],
    ['DB_USER', 'root'], ['DB_PORT', '3306'], ['E2E_DEDICATED', 'false']]) {
    loadEnvironment(); process.env[key] = value;
    await assert.rejects(isolatedDatabase, /BLOQUEADO: conexión no dedicada/);
  }
});
test('server UUID and isolation marker are verified using read-only queries', async () => {
  for (const key of ['E2E_SERVER_UUID', 'E2E_MARKER']) {
    loadEnvironment(); process.env[key] = 'wrong-marker';
    await assert.rejects(isolatedDatabase, /BLOQUEADO: marcador, servidor o privilegios/);
  }
  loadEnvironment(); const db = await isolatedDatabase(); await db.end();
});
