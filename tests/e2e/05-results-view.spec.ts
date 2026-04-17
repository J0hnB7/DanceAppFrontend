import { test, expect, type Page } from '@playwright/test';

/**
 * Public results page — viewing competition results
 *
 * Prerequisites: backend running
 * Optional: export E2E_COMPETITION_SLUG=<slug> to test a specific competition
 *
 * Run: npx playwright test 05-results-view.spec.ts
 */

const COMPETITION_SLUG = process.env.E2E_COMPETITION_SLUG;
const ADMIN_EMAIL = 'admin@danceapp.local';
const ADMIN_PASSWORD = 'Admin123!';

async function gotoCompetition(page: Page): Promise<boolean> {
  if (COMPETITION_SLUG) {
    await page.goto(`/competitions/${COMPETITION_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    return true;
  }

  await page.goto('/competitions');
  await page.waitForLoadState('domcontentloaded');
  const firstCard = page.locator('a[href^="/competitions/"]').first();
  if (await firstCard.count() === 0) return false;
  await firstCard.click();
  await page.waitForLoadState('domcontentloaded');
  return true;
}

test('veřejná stránka soutěže se načte', async ({ page }) => {
  const found = await gotoCompetition(page);
  if (!found) {
    test.skip(true, 'No competitions available');
    return;
  }

  // Page title visible
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 });
  // URL contains /competitions/
  expect(page.url()).toContain('/competitions/');
});

test('stránka výsledků zobrazuje sekce', async ({ page }) => {
  const found = await gotoCompetition(page);
  if (!found) {
    test.skip(true, 'No competitions available');
    return;
  }

  // Navigate to results tab/page
  const resultsLink = page.locator(
    'a[href*="/results"], button:has-text("Výsledky"), [role=tab]:has-text("Výsledky"), a:has-text("Results")'
  ).first();

  const resultsVisible = await resultsLink.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!resultsVisible) {
    test.skip(true, 'No results tab on this competition');
    return;
  }
  await resultsLink.click();
  await page.waitForLoadState('domcontentloaded');

  // Results page heading or section list visible
  await expect(
    page.locator('h1, h2, [data-testid="results-section"], text=Výsledky, text=Results').first()
  ).toBeVisible({ timeout: 8_000 });
});

test('admin vidí výsledky v dashboard', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', ADMIN_EMAIL);
  await page.fill('[name=password]', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15_000 });

  // Go to first competition in dashboard
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  const compLink = page.locator('a[href*="/dashboard/competitions/"]').first();
  if (await compLink.count() === 0) {
    test.skip(true, 'No competitions in dashboard');
    return;
  }
  await compLink.click();
  await page.waitForURL(url => url.href.includes('/dashboard/competitions/'), { timeout: 10_000 });

  // Competition detail loads
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 });
});

test('scoreboard stránka se načte', async ({ page }) => {
  const found = await gotoCompetition(page);
  if (!found) {
    test.skip(true, 'No competitions available');
    return;
  }

  // Extract slug from URL
  const url = page.url();
  const match = url.match(/\/competitions\/([^/]+)/);
  if (!match) {
    test.skip(true, 'Could not extract competition slug');
    return;
  }
  const slug = match[1];

  await page.goto(`/scoreboard/${slug}`);
  await page.waitForLoadState('domcontentloaded');

  // Scoreboard renders something (heading or live indicator)
  await expect(
    page.locator('h1, h2, text=Live, text=Scoreboard, text=Výsledky').first()
  ).toBeVisible({ timeout: 8_000 });
});
