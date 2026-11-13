import { defineConfig } from '@playwright/test';
import { loadEnvironment, webURL } from './support/environment';

// Support for the manual Android emulator journey (see tests/e2e/README.md).
// It never starts services: API 4301 and web 4300 must already be running through
// tests/e2e/support/service.ts, which revalidates the isolated MySQL instance.
loadEnvironment();
export default defineConfig({
  testDir: './android', fullyParallel: false, workers: 1, retries: 0,
  timeout: 180_000, expect: { timeout: 30_000 }, forbidOnly: !!process.env.CI,
  outputDir: '../../.e2e-results/android', reporter: 'list',
  globalSetup: './android/global-setup.ts',
  use: { baseURL: webURL, browserName: 'chromium', viewport: { width: 1440, height: 1000 },
    trace: 'off', screenshot: 'off', video: 'off', actionTimeout: 30_000 }
});
