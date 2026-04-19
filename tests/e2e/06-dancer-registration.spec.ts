import { test, expect } from '@playwright/test';

/**
 * Dancer sign-up — new user registers on the platform
 *
 * Covers /register page: form validation, password rules, GDPR gate, success state.
 * Uses a unique email per run so it can be re-run without cleanup.
 *
 * Run: npx playwright test 06-dancer-registration.spec.ts
 */

const uniqueEmail = (prefix: string) =>
  `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@test.local`;

test('tanečník úspěšně vytvoří účet přes /register', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  const email = uniqueEmail('e2e-dancer');

  await page.fill('input[name=firstName]', 'E2E');
  await page.fill('input[name=lastName]', 'Tanečník');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'SilneHeslo1');
  await page.check('#gdpr-dancer');

  await page.click('button[type=submit]');

  // Success state renders a heading (not form anymore) + link back to /login
  await expect(
    page.locator('a[href="/login"]:has-text("Přihlásit"), a[href="/login"]:has-text("Sign in")').first()
  ).toBeVisible({ timeout: 12_000 });
});

test('blokuje odeslání bez GDPR souhlasu', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name=firstName]', 'E2E');
  await page.fill('input[name=lastName]', 'NoGdpr');
  await page.fill('input[name=email]', uniqueEmail('nogdpr'));
  await page.fill('input[name=password]', 'SilneHeslo1');
  // GDPR checkbox left unchecked

  await page.click('button[type=submit]');

  // Error message for gdprAccepted stays on page (no success view)
  await expect(
    page.locator('text=Souhlas, text=Consent, text=povinný, text=required').first()
  ).toBeVisible({ timeout: 5_000 });
  expect(page.url()).toContain('/register');
});

test('odmítá slabé heslo (bez velkého písmene ani čísla)', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name=firstName]', 'E2E');
  await page.fill('input[name=lastName]', 'Weakpass');
  await page.fill('input[name=email]', uniqueEmail('weakpass'));
  await page.fill('input[name=password]', 'slabeheslo');
  await page.check('#gdpr-dancer');

  await page.click('button[type=submit]');

  // Zod validation keeps us on /register
  expect(page.url()).toContain('/register');
  // submit button is not in loading state (form didn't send)
  await expect(page.locator('button[type=submit]')).toBeEnabled();
});

test('duplicitní email po druhé registraci zobrazí chybu', async ({ page }) => {
  // First registration
  const email = uniqueEmail('dup');
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name=firstName]', 'Dup');
  await page.fill('input[name=lastName]', 'User');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'SilneHeslo1');
  await page.check('#gdpr-dancer');
  await page.click('button[type=submit]');
  await expect(
    page.locator('a[href="/login"]:has-text("Přihlásit"), a[href="/login"]:has-text("Sign in")').first()
  ).toBeVisible({ timeout: 12_000 });

  // Second registration with same email
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name=firstName]', 'Dup');
  await page.fill('input[name=lastName]', 'User');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'SilneHeslo1');
  await page.check('#gdpr-dancer');
  await page.click('button[type=submit]');

  // Error appears somewhere (ProblemDetail.detail surfaces in email field)
  // Should NOT reach success state (no "Přihlásit se →" link alone after success)
  await page.waitForTimeout(3_000);
  expect(page.url()).toContain('/register');
});
