import { test, expect, type Page } from '@playwright/test';

/**
 * Live control + judging — admin spouští live řízení, porotce skóruje.
 *
 * Complementary to 02-judge-scoring (PIN flow). Here we check:
 *   1) admin /live page interaktivně komunikuje (activate slot / select round)
 *   2) porotce po PIN zadání vidí dance tabs a grid párů
 *   3) párové čísla v gridu jsou vzestupně seřazené (CLAUDE.md pravidlo)
 *
 * Prerequisites:
 *   - Backend s běžící soutěží, aspoň jeden slot + jeden aktivní judge token
 *   - export E2E_JUDGE_TOKEN=<uuid>
 *   - export E2E_JUDGE_PIN=<pin>       # default 1234
 *   - export E2E_COMPETITION_ID=<uuid> # volitelné
 *
 * Run: E2E_JUDGE_TOKEN=... npx playwright test 09-live-control-judging.spec.ts
 */

const ADMIN_EMAIL = 'admin@danceapp.local';
const ADMIN_PASSWORD = 'Admin123!';
const COMPETITION_ID = process.env.E2E_COMPETITION_ID;
const JUDGE_TOKEN = process.env.E2E_JUDGE_TOKEN;
const JUDGE_PIN = process.env.E2E_JUDGE_PIN ?? '1234';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('[name=email]', ADMIN_EMAIL);
  await page.fill('[name=password]', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15_000 });
}

async function resolveCompetitionId(page: Page): Promise<string | null> {
  if (COMPETITION_ID) return COMPETITION_ID;
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  const link = page.locator('a[href*="/dashboard/competitions/"]').first();
  if (await link.count() === 0) return null;
  const href = await link.getAttribute('href');
  const match = href?.match(/\/dashboard\/competitions\/([^/]+)/);
  return match ? match[1] : null;
}

test.describe('admin live control', () => {
  test('live řízení reaguje na výběr kola', async ({ page }) => {
    await loginAsAdmin(page);
    const id = await resolveCompetitionId(page);
    if (!id) {
      test.skip(true, 'No competitions in dashboard');
      return;
    }

    await page.goto(`/dashboard/competitions/${id}/live`);
    await page.waitForLoadState('domcontentloaded');

    // Pokud jsou v harmonogramu sloty, musí být klikatelné
    const roundOptions = page.locator(
      '[data-testid="round-selector"] button, [role="tab"], button[aria-pressed]'
    );
    const count = await roundOptions.count();
    if (count === 0) {
      test.skip(true, 'No schedule slots available — seed data first');
      return;
    }

    await roundOptions.first().click();
    // Po kliknutí na kolo se objeví tanec nebo heat selector
    await expect(
      page.locator(
        '[data-testid="dance-selector"], [data-testid="heat-selector"], text=Tanec, text=Heat'
      ).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('competition sidebar obsahuje odkazy check-in / harmonogram / live', async ({ page }) => {
    await loginAsAdmin(page);
    const id = await resolveCompetitionId(page);
    if (!id) {
      test.skip(true, 'No competitions in dashboard');
      return;
    }

    await page.goto(`/dashboard/competitions/${id}`);
    await page.waitForLoadState('domcontentloaded');

    // Všechny tři sekce musí být dosažitelné z sidebaru
    for (const hrefPart of ['/presence', '/schedule', '/live']) {
      await expect(
        page.locator(`a[href*="${hrefPart}"]`).first()
      ).toBeVisible({ timeout: 6_000 });
    }
  });
});

test.describe('judge scoring', () => {
  test.beforeEach(async ({}) => {
    if (!JUDGE_TOKEN) {
      test.skip(true, 'E2E_JUDGE_TOKEN not set');
    }
  });

  test('porotce se přihlásí PINem a uvidí scoring grid nebo čekárnu', async ({ page }) => {
    await page.goto(`/judge/${JUDGE_TOKEN}`);
    await page.waitForLoadState('networkidle');

    const pinInput = page.locator('input[inputmode="numeric"]').first();
    if (await pinInput.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await pinInput.fill(JUDGE_PIN);
      await page.locator('button:has-text("Přihlásit"), button:has-text("Sign in")').first().click();
    }

    // Buď scoring grid, nebo lobby "čekám na kolo"
    await expect(
      page.locator('.grid button, text=Čekám, text=Waiting, button:has-text("Odeslat")').first()
    ).toBeVisible({ timeout: 12_000 });
  });

  test('čísla párů v gridu jsou seřazená vzestupně', async ({ page }) => {
    await page.goto(`/judge/${JUDGE_TOKEN}`);
    await page.waitForLoadState('networkidle');

    const pinInput = page.locator('input[inputmode="numeric"]').first();
    if (await pinInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await pinInput.fill(JUDGE_PIN);
      await page.locator('button:has-text("Přihlásit"), button:has-text("Sign in")').first().click();
    }

    const gridButtons = page.locator('.grid button');
    const visible = await gridButtons.first().isVisible({ timeout: 8_000 }).catch(() => false);
    if (!visible) {
      test.skip(true, 'No active round — grid not rendered');
      return;
    }

    const labels = await gridButtons.allTextContents();
    const numbers = labels
      .map(l => parseInt(l.replace(/\D+/g, ''), 10))
      .filter(n => Number.isFinite(n));

    if (numbers.length < 2) {
      test.skip(true, 'Grid has < 2 pairs');
      return;
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    expect(numbers).toEqual(sorted);
  });

  test('judge header má jazykový přepínač a ikonu "Hlásit"', async ({ page }) => {
    await page.goto(`/judge/${JUDGE_TOKEN}`);
    await page.waitForLoadState('networkidle');

    const pinInput = page.locator('input[inputmode="numeric"]').first();
    if (await pinInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await pinInput.fill(JUDGE_PIN);
      await page.locator('button:has-text("Přihlásit"), button:has-text("Sign in")').first().click();
    }

    // Jazykový přepínač (EN/CZ) nebo incident button
    await expect(
      page.locator(
        'button:has-text("EN"), button:has-text("CZ"), button[aria-label*="Hlásit"], button[aria-label*="Report"]'
      ).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
