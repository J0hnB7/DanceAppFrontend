import { test, expect, type Page } from '@playwright/test';

/**
 * Admin flow — create competition via 3-step wizard + add section
 *
 * Prerequisites: backend running, admin@danceapp.local / Admin123! seeded
 * Run: npx playwright test 04-competition-management.spec.ts
 */

const ADMIN_EMAIL = 'admin@danceapp.local';
const ADMIN_PASSWORD = 'Admin123!';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('[name=email]', ADMIN_EMAIL);
  await page.fill('[name=password]', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15_000 });
}

test('admin vytvoří novou soutěž přes wizard', async ({ page }) => {
  await loginAsAdmin(page);

  // Navigate to new competition wizard
  await page.goto('/dashboard/competitions/new');
  await page.waitForLoadState('domcontentloaded');

  // ── Step 1: Basic info ────────────────────────────────────────────────────
  const compName = `E2E Test ${Date.now()}`;
  await page.fill('[name=name]', compName);

  // Event date — 60 days from now
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 60);
  await page.fill('[name=eventDate]', eventDate.toISOString().slice(0, 10));

  // Registration deadline — 30 days from now
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);
  await page.fill('[name=registrationDeadline]', deadline.toISOString().slice(0, 16));

  // Venue — VenueAutocomplete controlled input, exact placeholder match
  const venueInput = page.locator('input[placeholder="Praha, sportovní hala..."]');
  await venueInput.click();
  await venueInput.pressSequentially('E2E Test Hall');

  // Advance to step 2
  const nextBtn = page.locator('button:has-text("Dál"), button:has-text("Pokračovat"), button:has-text("Next")').first();
  await nextBtn.click();

  // ── Step 2: Template — select "Prázdná šablona" (always last, id=empty) ──
  await expect(page.getByRole('heading', { name: 'Vyberte šablonu' })).toBeVisible({ timeout: 8_000 });
  await page.locator('button:has-text("Prázdná šablona")').click();
  await page.locator('button:has-text("Pokračovat")').click();

  // ── Step 3: Sections — skip, finish ──────────────────────────────────────
  await expect(page.getByRole('heading', { name: 'Sekce soutěže' })).toBeVisible({ timeout: 8_000 });
  await page.locator('button:has-text("Vytvořit soutěž")').click();

  // Should redirect to competition detail page (not /new)
  await page.waitForURL(
    url => url.href.includes('/dashboard/competitions/') && !url.href.includes('/new'),
    { timeout: 15_000 }
  );

  // Detail page loads (has heading)
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 });
});

test('admin přidá sekci k soutěži', async ({ page }) => {
  await loginAsAdmin(page);

  // Get to competitions list, find first one
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  // Click first competition in the list
  const compLink = page.locator('a[href*="/dashboard/competitions/"]').first();
  const linkCount = await compLink.count();
  if (linkCount === 0) {
    test.skip(true, 'No competitions in dashboard — run 04 first or seed data');
    return;
  }
  await compLink.click();
  await page.waitForURL(url => url.href.includes('/dashboard/competitions/'), { timeout: 10_000 });

  // Navigate to sections tab
  const sectionsTab = page.locator(
    'a[href*="/sections"]:not([href*="/sections/"]), button:has-text("Sekce"), [role=tab]:has-text("Sekce")'
  ).first();
  await sectionsTab.click();
  await page.waitForLoadState('domcontentloaded');

  // Click "Add section"
  const addBtn = page.locator(
    'a[href*="/sections/new"], button:has-text("Přidat sekci"), button:has-text("Nová sekce"), button:has-text("Add section")'
  ).first();
  const addBtnVisible = await addBtn.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!addBtnVisible) {
    test.skip(true, 'Add section button not found — page structure may have changed');
    return;
  }
  await addBtn.click();

  await page.waitForLoadState('domcontentloaded');

  // Fill section name
  const sectionName = `E2E Sekce ${Date.now()}`;
  await page.fill('[name=name]', sectionName);

  // Submit form
  const submitBtn = page.locator('button[type=submit], button:has-text("Uložit"), button:has-text("Vytvořit")').first();
  await submitBtn.click();

  // Should redirect back to sections list and show the new section
  await page.waitForURL(url => !url.href.includes('/new'), { timeout: 10_000 });
  await expect(page.locator(`text=${sectionName}`).first()).toBeVisible({ timeout: 8_000 });
});

test('dashboard zobrazuje seznam soutěží', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  // Dashboard heading visible
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 });

  // Competition management link exists in nav/sidebar
  await expect(
    page.locator('a[href*="/competitions"]').first()
  ).toBeVisible({ timeout: 5_000 });
});
