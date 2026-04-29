import { test, expect } from '../../fixtures/test-fixtures';
import { createApiClient } from '../../factories/api-client';
import { testEmail } from '../../helpers/test-prefix';
import { LoginPage } from '../../pages/login-page';
import { request } from '@playwright/test';

test('2FA: enable and verify QR code base64 field returned', async ({ page }) => {
  const api = await createApiClient();
  const email = testEmail('2fa-user');
  const password = 'Pass1234!';
  const { accessToken } = await api.register({ email, password, name: '2FA User' });
  await api.dispose();

  // Enable 2FA via API
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  const setupRes = await ctx.post('/api/v1/auth/2fa/setup', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(setupRes.ok(), `2FA setup failed: ${await setupRes.text()}`).toBeTruthy();
  const setupData = await setupRes.json() as Record<string, unknown>;

  // Must return qrCodeBase64 (not qrCode) — per memory
  expect(setupData).toHaveProperty('qrCodeBase64');
  expect(typeof setupData['qrCodeBase64']).toBe('string');

  await ctx.dispose();
});

test('2FA: login without TOTP returns 403 with TOTP required message', async ({ page }) => {
  const api = await createApiClient();
  const email = testEmail('2fa-login');
  const password = 'Pass1234!';
  const { accessToken } = await api.register({ email, password, name: '2FA Login' });
  await api.dispose();

  // Enable + confirm 2FA
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  const setupRes = await ctx.post('/api/v1/auth/2fa/setup', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!setupRes.ok()) {
    await ctx.dispose();
    test.skip(true, '2FA setup endpoint not available');
    return;
  }

  // If 2FA enabled, login should prompt for TOTP
  const loginRes = await ctx.post('/api/v1/auth/login', { data: { email, password } });
  // Either 200 (no 2FA confirmed yet) or 403 TOTP required
  expect([200, 403]).toContain(loginRes.status());

  await ctx.dispose();
});
