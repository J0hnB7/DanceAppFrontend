import { test, expect } from '@playwright/test';

/**
 * Happy path #1 — Admin login + dashboard
 *
 * Prerequisites: backend running, admin user seeded (admin@danceapp.local / Admin123!)
 * Run: npx playwright test 01-login-dashboard.spec.ts
 */
test('admin se přihlásí a vidí dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('[name=email]', 'admin@danceapp.local');
  await page.fill('[name=password]', 'Admin123!');
  await page.click('button[type=submit]');

  // Should land on dashboard
  await page.waitForURL('/dashboard', { timeout: 10_000 });

  // Dashboard renders a primary heading
  await expect(page.locator('h1').first()).toBeVisible();
});

test('neplatné přihlásenie vrátí chybovou hlášku', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('[name=email]', 'neexistuje@test.local');
  await page.fill('[name=password]', 'wrongpassword');
  await page.click('button[type=submit]');

  // Error message appears, URL stays on login
  await expect(page.locator('[role=alert], .text-red-500, .text-destructive').first()).toBeVisible({ timeout: 5_000 });
  expect(page.url()).toContain('/login');
});
