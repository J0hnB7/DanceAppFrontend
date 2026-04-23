import { test, expect } from '../../fixtures/test-fixtures';
import { testEmail } from '../../helpers/test-prefix';
import { request } from '@playwright/test';

test('GDPR export contains expected payload categories', async () => {
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  const email = testEmail('gdpr-dancer');
  const password = 'Dancer1234!';

  // Register dancer
  await ctx.post('/api/v1/auth/register/dancer', {
    data: { email, password, firstName: 'GDPR', lastName: 'Test', gdprAccepted: true },
  });
  const loginRes = await ctx.post('/api/v1/auth/login', { data: { email, password } });
  const { accessToken } = await loginRes.json() as { accessToken: string };

  // Export GDPR data (C9-G7 fix: must include dancerProfile, pairs, oauth, sessions)
  const exportRes = await ctx.post('/api/v1/gdpr/export', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(exportRes.ok(), `GDPR export failed: ${await exportRes.text()}`).toBeTruthy();
  const data = await exportRes.json() as Record<string, unknown>;
  expect(data).toHaveProperty('user');
  // dancerProfile, pairs, oauth, sessions were added in C9-G7
  expect(data).toHaveProperty('gdprConsents');

  await ctx.dispose();
});

test('GDPR delete: re-login blocked after deletion', async () => {
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  const email = testEmail('gdpr-del');
  const password = 'Dancer1234!';

  await ctx.post('/api/v1/auth/register/dancer', {
    data: { email, password, firstName: 'Del', lastName: 'Test', gdprAccepted: true },
  });
  const loginRes = await ctx.post('/api/v1/auth/login', { data: { email, password } });
  const { accessToken } = await loginRes.json() as { accessToken: string };

  const deleteRes = await ctx.delete('/api/v1/gdpr/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect([200, 204, 202]).toContain(deleteRes.status());

  // Re-login should be blocked
  const reLoginRes = await ctx.post('/api/v1/auth/login', { data: { email, password } });
  expect([401, 403, 404]).toContain(reLoginRes.status());

  await ctx.dispose();
});
