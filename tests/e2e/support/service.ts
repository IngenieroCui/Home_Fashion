import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEnvironment, root } from './environment';
import { isolatedDatabase } from '../fixtures/database';

async function main() {
  loadEnvironment();
  const guard = await isolatedDatabase(); await guard.end();
  const api = process.argv[2] === 'api';
  const controlledMedia = api && process.env.HF_E2E_ISOLATED_CLOUDINARY !== 'true';
  const nodeOptions = controlledMedia
    ? `${process.env.NODE_OPTIONS ?? ''} --require "${resolve(root, 'tests/e2e/support/controlled-cloudinary.cjs').replaceAll('\\', '/')}"`.trim()
    : process.env.NODE_OPTIONS;
  const child = spawn(process.execPath, api
    ? [resolve(root, 'apps/api/node_modules/@nestjs/cli/bin/nest.js'), 'start']
    : [resolve(root, 'apps/web/node_modules/next/dist/bin/next'), 'dev', '--hostname', 'localhost', '-p', '4300'],
  { cwd: resolve(root, api ? 'apps/api' : 'apps/web'), env: { ...process.env, NODE_OPTIONS: nodeOptions, HF_E2E_WEB: api ? 'false' : 'true', NODE_ENV: api ? 'test' : 'development' }, stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
main().catch(() => { console.error('BLOQUEADO: no fue posible iniciar el servicio E2E aislado.'); process.exitCode = 1; });
