import { test, expect } from '@playwright/test';

/**
 * Happy path #2 — Judge PIN login + scoring
 *
 * Prerequisites:
 *   - Backend running with an active round
 *   - Judge token seeded; export env vars before running:
 *       export E2E_JUDGE_TOKEN=<token-uuid>
 *       export E2E_JUDGE_PIN=<4-digit-pin>
 *
 * Skip with:  E2E_JUDGE_TOKEN not set → test.skip()
 *
 * Run: E2E_JUDGE_TOKEN=xxx E2E_JUDGE_PIN=1234 npx playwright test 02-judge-scoring.spec.ts
 */

const JUDGE_TOKEN = process.env.E2E_JUDGE_TOKEN;
const JUDGE_PIN   = process.env.E2E_JUDGE_PIN ?? '1234';

test.describe('judge scoring flow', () => {
  test.beforeEach(async ({}) => {
    if (!JUDGE_TOKEN) {
      test.skip(true, 'E2E_JUDGE_TOKEN not set — skipping judge test');
    }
  });

  test('rozhodčí zadá PIN a otevře se scoring UI', async ({ page }) => {
    await page.goto(`/judge/${JUDGE_TOKEN}`);
    await page.waitForLoadState('networkidle');

    // PIN prompt should appear (judge has no device token yet)
    const pinInput = page.locator('input[inputmode="numeric"], input[type="text"]').first();
    await expect(pinInput).toBeVisible({ timeout: 8_000 });

    await pinInput.fill(JUDGE_PIN);

    // Click the login button (cs: "Přihlásit se", en: "Sign in")
    const loginBtn = page.locator('button:has-text("Přihlásit se"), button:has-text("Sign in")').first();
    await loginBtn.click();

    // After successful PIN → either scoring page or lobby (waiting for round)
    await expect(
      page.locator('.grid button, button:has-text("Odeslat"), :text("Čekám"), :text("Waiting for round")').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('rozhodčí odešle hodnocení výběrového kola', async ({ page }) => {
    await page.goto(`/judge/${JUDGE_TOKEN}`);
    await page.waitForLoadState('networkidle');

    // If PIN is needed, enter it
    const pinInput = page.locator('input[inputmode="numeric"]').first();
    if (await pinInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await pinInput.fill(JUDGE_PIN);
      await page.locator('button:has-text("Přihlásit se"), button:has-text("Sign in")').first().click();
    }

    // Wait for scoring grid to appear (pair buttons in a grid)
    const gridButtons = page.locator('.grid button');
    await expect(gridButtons.first()).toBeVisible({ timeout: 12_000 });

    // Select first two pairs
    await gridButtons.nth(0).click();
    await gridButtons.nth(1).click();

    // Counter should show 2 selected
    await expect(page.locator('text=2').first()).toBeVisible();
  });
});
