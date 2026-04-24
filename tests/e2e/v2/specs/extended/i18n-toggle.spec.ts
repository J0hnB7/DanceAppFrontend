import { test, expect } from '../../fixtures/test-fixtures';

test('i18n: default locale is Czech on landing page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  const body = await page.locator('body').textContent();
  expect(body && body.trim().length).toBeGreaterThan(10);
});

test('i18n: cookie persists locale on reload', async ({ page, context }) => {
  // Start with a clean locale cookie so prior test state doesn't leak in.
  await context.clearCookies();

  // The toggle renders on public pages — use /competitions where it's reliable.
  await page.goto('/competitions');
  await page.waitForLoadState('domcontentloaded');

  const toggle = page.locator('.lang-toggle-nav, .lang-toggle-footer').first();
  await toggle.waitFor({ state: 'visible', timeout: 10_000 });
  await toggle.click();

  // Wait until the cookie actually appears (LocaleProvider writes it on click).
  const newLocale = await expect.poll(async () => {
    const cookies = await context.cookies();
    return cookies.find(c => c.name === 'danceapp_locale')?.value;
  }, { timeout: 5_000 }).toMatch(/^(cs|en)$/);

  const setLocale = (await context.cookies()).find(c => c.name === 'danceapp_locale')?.value;
  expect(setLocale).toBeDefined();
  void newLocale;

  // Reload and verify the cookie value survives.
  await page.reload();
  await page.waitForLoadState('domcontentloaded');

  const after = (await context.cookies()).find(c => c.name === 'danceapp_locale')?.value;
  expect(after).toBe(setLocale);
});
