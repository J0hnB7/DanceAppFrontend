import { test, expect } from '../../fixtures/test-fixtures';
import { createApiClient } from '../../factories/api-client';
import { testEmail } from '../../helpers/test-prefix';
import { request } from '@playwright/test';

test('password reset: forgot-password endpoint returns 200', async () => {
  const api = await createApiClient();
  const email = testEmail('pw-reset');
  await api.register({ email, password: 'OldPass1!', name: 'Reset User' });
  await api.dispose();

  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  // Request password reset
  const resetReqRes = await ctx.post('/api/v1/auth/forgot-password', {
    data: { email },
  });
  // Should return 200 even if email doesn't exist (prevents enumeration)
  expect([200, 204]).toContain(resetReqRes.status());

  await ctx.dispose();
});

test('password reset page uses /reset-password path (not /auth/reset-password)', async ({ page }) => {
  // Regression: BE previously sent /auth/reset-password but FE page is at /reset-password
  // This test verifies the FE page exists at the correct path (commit 917e270 + d33f533)
  await page.goto('/reset-password?token=invalid-token-for-test');
  await page.waitForLoadState('domcontentloaded');
  // Should render the reset password form (not 404)
  const heading = page.getByRole('heading');
  await expect(heading.first()).toBeVisible({ timeout: 8_000 });
});
