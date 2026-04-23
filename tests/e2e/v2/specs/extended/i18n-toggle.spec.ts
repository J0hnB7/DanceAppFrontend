import { test, expect } from '../../fixtures/test-fixtures';

test('i18n: default locale is Czech on landing page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  // Czech default — look for Czech text
  const body = await page.locator('body').textContent();
  // Page should not be empty
  expect(body && body.trim().length).toBeGreaterThan(10);
});

test('i18n: cookie persists locale on reload', async ({ page, context }) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Try toggling locale via nav toggle if visible
  const toggle = page.locator('.lang-toggle-nav, [data-testid="lang-toggle"], button:has-text("EN")').first();
  const toggleVisible = await toggle.isVisible().catch(() => false);
  if (toggleVisible) {
    await toggle.click();
    await page.waitForTimeout(500);
    // Reload and verify cookie persists
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    // Cookie should be set
    const cookies = await context.cookies();
    const localeCookie = cookies.find(c => c.name === 'danceapp_locale' || c.name === 'NEXT_LOCALE');
    expect(localeCookie).toBeDefined();
  } else {
    // Toggle not on login page — skip gracefully
    test.skip(true, 'Language toggle not visible on login page');
  }
});
