import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

export const root = resolve(__dirname, '../../..');
export function loadEnvironment() {
  let values: Record<string, string>;
  try { values = parse(readFileSync(resolve(root, '.env.e2e'))); }
  catch { throw new Error('BLOQUEADO: falta .env.e2e; ejecuta pnpm test:e2e:provision o configura una instancia descartable.'); }
  // Never inherit the application's production credentials or service endpoints.
  for (const key of Object.keys(process.env)) {
    if (/^(DB_|CLOUDINARY_|JWT_|API_SERVER_URL$|NEXT_PUBLIC_API_URL$|E2E_)/.test(key)) delete process.env[key];
  }
  Object.assign(process.env, values);
  process.env.NODE_ENV = 'test';
  process.env.DB_LOGGING = 'false';
  process.env.DB_SSL_MODE = 'DISABLED';
  process.env.DB_SSL_CA_PATH = './unused-e2e-ca.pem';
  process.env.DB_SSL_CA_BASE64 = '';
  process.env.PORT = '4301';
  process.env.API_SERVER_URL = 'http://127.0.0.1:4301/api';
  process.env.NEXT_PUBLIC_API_URL = process.env.API_SERVER_URL;
  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) process.env[key] ??= '';
  process.env.CLOUDINARY_ROOT_FOLDER = `home-fashion-e2e/${required('E2E_RUN_ID')}`;
  process.env.CLOUDINARY_FOLDER = `${process.env.CLOUDINARY_ROOT_FOLDER}/products`;
  if (required('E2E_DEDICATED') !== 'true' || required('DB_HOST') !== '127.0.0.1'
    || !/^home_fashion_e2e(?:_[a-z0-9]+)?$/.test(required('DB_NAME'))
    || required('DB_USER') !== 'hf_e2e' || required('DB_PORT') === '3306'
    || !/^[a-z0-9-]{8,60}$/.test(required('E2E_RUN_ID'))) {
    throw new Error('BLOQUEADO: se requiere MySQL E2E local dedicado en un puerto distinto a 3306 y usuario hf_e2e.');
  }
  for (const key of ['DB_PASSWORD', 'E2E_SERVER_UUID', 'E2E_MARKER', 'E2E_ACTOR_PASSWORD', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) required(key);
}
export function required(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`BLOQUEADO: falta ${key} en .env.e2e.`);
  return value;
}
export const webURL = 'http://localhost:4300';
export const apiURL = 'http://127.0.0.1:4301/api';
