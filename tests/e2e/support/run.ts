import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEnvironment, root } from './environment';
import { prepare } from './prepare';
import { newExecutionId, preserveLastSuccess, writeRunStatus } from './history';

async function main() {
  const evidence = resolve(root, 'docs/thesis/evidence');
  const executionId = newExecutionId();
  preserveLastSuccess(evidence);
  try { loadEnvironment(); await prepare(); }
  catch (error) {
    // Emit only our known configuration errors, never a driver/credential payload.
    const raw = error instanceof Error ? error.message : '';
    const message = raw.startsWith('BLOQUEADO:') ? raw : 'BLOQUEADO: falló la preparación de MySQL E2E.';
    writeRunStatus(evidence, executionId, 'blocked', message);
    console.error(message); process.exitCode = 1; return;
  }
  process.env.E2E_EXECUTION_ID = executionId;
  writeRunStatus(evidence, executionId, 'running', 'Preflight correcto; journeys iniciados.');
  const child = spawn(process.execPath, [resolve(root, 'node_modules/@playwright/test/cli.js'), 'test',
    '-c', 'tests/e2e/playwright.config.ts', ...process.argv.slice(2)], { cwd: root, env: process.env, stdio: 'inherit' });
  child.on('error', () => {
    writeRunStatus(evidence, executionId, 'blocked', 'BLOQUEADO: no arrancó Playwright.');
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (code !== 0) writeRunStatus(evidence, executionId, 'failed', `Playwright terminó sin éxito (código ${code}, señal ${signal ?? 'ninguna'}).`);
    process.exitCode = code ?? 1;
  });
}
void main();
