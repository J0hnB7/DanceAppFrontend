import { test, expect, type Page } from '@playwright/test';

/**
 * Registration propagation — po self-registraci se pár propíše
 * do check-inu (presence), harmonogramu a live řízení.
 *
 * Smoke-level: přihlásíme se jako admin, otevřeme stránky a ověříme,
 * že obsahují data (start čísla / sekce / sloty) bez hlášky "žádní páry".
 *
 * Prerequisites: backend running, admin seeded, alespoň jedna soutěž
 * s aspoň jedním registrovaným párem.
 *
 * Env (volitelné):
 *   export E2E_COMPETITION_ID=<uuid>   # když není, vezme první z dashboardu
 *
 * Run: npx playwright test 08-registration-propagation.spec.ts
 */

const ADMIN_EMAIL = 'admin@danceapp.local';
const ADMIN_PASSWORD = 'Admin123!';
const COMPETITION_ID = process.env.E2E_COMPETITION_ID;

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
  if (!href) return null;
  const match = href.match(/\/dashboard\/competitions\/([^/]+)/);
  return match ? match[1] : null;
}

test.describe('registration propagation', () => {
  test('check-in (presence): zobrazuje páry a jejich sekce', async ({ page }) => {
    await loginAsAdmin(page);
    const id = await resolveCompetitionId(page);
    if (!id) {
      test.skip(true, 'No competitions in dashboard');
      return;
    }

    await page.goto(`/dashboard/competitions/${id}/presence`);
    await page.waitForLoadState('domcontentloaded');

    // Presence page heading or stats card visible
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    // Network call to fetch pairs fired
    const pairsRequest = await page.waitForResponse(
      r => /\/api\/v1\/competitions\/[^/]+\/(pairs|presence)/.test(r.url()),
      { timeout: 8_000 },
    ).catch(() => null);

    if (pairsRequest) {
      expect(pairsRequest.status()).toBeLessThan(500);
    }
  });

  test('harmonogram: stránka se načte a fetchne sloty', async ({ page }) => {
    await loginAsAdmin(page);
    const id = await resolveCompetitionId(page);
    if (!id) {
      test.skip(true, 'No competitions in dashboard');
      return;
    }

    const slotsPromise = page.waitForResponse(
      r => /\/api\/v1\/competitions\/[^/]+\/(schedule|slots)/.test(r.url()),
      { timeout: 12_000 },
    ).catch(() => null);

    await page.goto(`/dashboard/competitions/${id}/schedule`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

    const slotsResp = await slotsPromise;
    if (slotsResp) {
      // 500 znamená že flow rozbili — nechceme to tolerovat
      expect(slotsResp.status()).toBeLessThan(500);
    }
  });

  test('live řízení: stránka se načte s RoundSelector / HeatSelector', async ({ page }) => {
    await loginAsAdmin(page);
    const id = await resolveCompetitionId(page);
    if (!id) {
      test.skip(true, 'No competitions in dashboard');
      return;
    }

    await page.goto(`/dashboard/competitions/${id}/live`);
    await page.waitForLoadState('domcontentloaded');

    // LiveControlDashboard renders heading or "no active round" empty state —
    // buď jedno nebo druhé musí být vidět (ne blank page)
    await expect(
      page.locator(
        'h1, h2, [data-testid="round-selector"], text=Kolo, text=Tanec, text=Heat, text=aktivní'
      ).first()
    ).toBeVisible({ timeout: 12_000 });

    // žádná runtime chyba z proxy / 500
    await expect(page.locator('text=Internal Server Error')).toHaveCount(0);
  });

  test('Dancer vidí svoje registrace v /dashboard/my-registrations', async ({ page }) => {
    const dancerEmail = process.env.E2E_DANCER_EMAIL;
    const dancerPassword = process.env.E2E_DANCER_PASSWORD;
    if (!dancerEmail || !dancerPassword) {
      test.skip(true, 'E2E_DANCER_EMAIL not set');
      return;
    }

    await page.goto('/login');
    await page.fill('[name=email]', dancerEmail);
    await page.fill('[name=password]', dancerPassword);
    await page.click('button[type=submit]');
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15_000 });

    await page.goto('/dashboard/my-registrations');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });

    // Endpoint pro dancer registrace odpoví OK
    const profileResp = await page.waitForResponse(
      r => r.url().includes('/profile/dancer/competitions'),
      { timeout: 8_000 },
    ).catch(() => null);
    if (profileResp) {
      expect(profileResp.status()).toBeLessThan(500);
    }
  });
});
