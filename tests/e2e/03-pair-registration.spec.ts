import { test, expect } from '@playwright/test';

/**
 * Happy path #3 — Pair registration on a public competition page
 *
 * Prerequisites:
 *   - Backend running with at least one competition that has registrationOpen=true
 *   - Optionally set:  export E2E_COMPETITION_SLUG=<slug>
 *
 * If E2E_COMPETITION_SLUG is not set, the test navigates to /competitions and
 * picks the first competition with a registration button.
 *
 * Run: npx playwright test 03-pair-registration.spec.ts
 */

const COMPETITION_SLUG = process.env.E2E_COMPETITION_SLUG;

test('závodník zobrazí veřejnou stránku závodu', async ({ page }) => {
  if (COMPETITION_SLUG) {
    await page.goto(`/competitions/${COMPETITION_SLUG}`);
  } else {
    // Navigate to competitions list and find first competition
    await page.goto('/competitions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 });

    const firstCard = page.locator('a[href^="/competitions/"]').first();
    const cardCount = await firstCard.count();
    if (cardCount === 0) {
      test.skip(true, 'No competitions available — skipping');
      return;
    }
    await firstCard.click();
  }

  await page.waitForLoadState('domcontentloaded');
  // Public competition page renders the competition name
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 });
});

test('závodník otevře registrační formulář', async ({ page }) => {
  if (COMPETITION_SLUG) {
    await page.goto(`/competitions/${COMPETITION_SLUG}`);
  } else {
    await page.goto('/competitions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 });

    const firstCard = page.locator('a[href^="/competitions/"]').first();
    const cardCount = await firstCard.count();
    if (cardCount === 0) {
      test.skip(true, 'No competitions available — skipping registration test');
      return;
    }
    await firstCard.click();
  }

  await page.waitForLoadState('domcontentloaded');

  // Look for registration CTA (registration open)
  const registerBtn = page.locator(
    'a[href$="/register"], button:has-text("Přihlásit pár"), button:has-text("Register pair"), a:has-text("Registrovat")'
  ).first();

  const btnVisible = await registerBtn.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!btnVisible) {
    test.skip(true, 'No competition with open registration found — skipping');
    return;
  }

  await registerBtn.click();
  await page.waitForLoadState('networkidle');

  // Registration form rendered
  await expect(page.locator('form, [data-testid="registration-form"]').first()).toBeVisible({ timeout: 8_000 });

  // Check first name field exists
  await expect(
    page.locator('input[name*="name"], input[placeholder*="jméno"], input[placeholder*="name"]').first()
  ).toBeVisible({ timeout: 5_000 });
});
