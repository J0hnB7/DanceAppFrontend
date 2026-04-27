import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

// Load seed-generated env vars when present (created by tests/e2e/seed-e2e-data.sh)
const envFile = path.resolve(__dirname, '.env.test.local');
if (existsSync(envFile)) dotenvConfig({ path: envFile });

/**
 * E2E tests — run with real backend (NEXT_PUBLIC_MOCK_API=false).
 *
 * Prerequisites:
 *   - Backend running on http://localhost:8080
 *   - For judge tests: seed a judge token and export E2E_JUDGE_TOKEN + E2E_JUDGE_PIN
 *
 * Run:
 *   npx playwright test
 *
 * Run with visible browser:
 *   npx playwright test --headed
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,       // sequential — tests share backend state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'NEXT_PUBLIC_MOCK_API=false npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
