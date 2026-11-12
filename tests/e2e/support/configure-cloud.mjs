import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const target = resolve(root, '.env.e2e');
const config = parse(readFileSync(target));
if (config.E2E_DEDICATED !== 'true' || config.DB_HOST !== '127.0.0.1' || !config.E2E_RUN_ID) throw new Error('Entorno no dedicado');
const source = parse(readFileSync(resolve(process.argv[2])));
for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
  if (!source[key]) throw new Error(`Falta ${key}`);
  config[key] = source[key];
}
writeFileSync(target, Object.entries(config).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n');
console.log(`Cloudinary configurado para carpeta exclusiva home-fashion-e2e/${config.E2E_RUN_ID}. Sin subidas en este paso.`);
