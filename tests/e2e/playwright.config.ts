import { defineConfig } from '@playwright/test';
import { loadEnvironment, root, webURL } from './support/environment';
const executionId = process.env.E2E_EXECUTION_ID;
loadEnvironment();
if (executionId) process.env.E2E_EXECUTION_ID = executionId;
export default defineConfig({
  testDir: './journeys', fullyParallel: false, workers: 1, retries: 0,
  timeout: 240_000, expect: { timeout: 30_000 }, forbidOnly: !!process.env.CI,
  outputDir: '../../.e2e-results', reporter: [['./support/reporter.ts']],
  use: { baseURL: webURL, browserName: 'chromium', viewport: { width: 1440, height: 1000 },
    trace: 'off', screenshot: 'off', video: 'off', actionTimeout: 30_000 },
  // Guards run before either service starts; existing processes are never reused.
  webServer: [
    { command: 'pnpm exec tsx tests/e2e/support/service.ts api', cwd: root,
      url: 'http://127.0.0.1:4301/api/health', reuseExistingServer: false, timeout: 120_000 },
    { command: 'pnpm exec tsx tests/e2e/support/service.ts web', cwd: root,
      url: `${webURL}/catalogo`, reuseExistingServer: false, timeout: 180_000 }
  ]
});
