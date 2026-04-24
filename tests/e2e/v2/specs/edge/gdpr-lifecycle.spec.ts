import { test, expect } from '../../fixtures/test-fixtures';
import { testEmail } from '../../helpers/test-prefix';
import { request } from '@playwright/test';

test('GDPR export contains expected payload categories', async () => {
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  const email = testEmail('gdpr-dancer');
  const password = 'Dancer1234!';

  await ctx.post('/api/v1/auth/register/dancer', {
    data: { email, password, firstName: 'GDPR', lastName: 'Test', gdprAccepted: true },
  });
  const loginRes = await ctx.post('/api/v1/auth/login', { data: { email, password } });
  const { accessToken } = await loginRes.json() as { accessToken: string };

  const meRes = await ctx.get('/api/v1/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
  const { id: userId } = await meRes.json() as { id: string };

  const exportRes = await ctx.get(`/api/v1/users/${userId}/data-export`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(exportRes.ok(), `GDPR export failed: ${await exportRes.text()}`).toBeTruthy();
  const data = await exportRes.json() as Record<string, unknown>;
  expect(data).toHaveProperty('user');

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

  const meRes = await ctx.get('/api/v1/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
  const { id: userId } = await meRes.json() as { id: string };

  const deleteRes = await ctx.delete(`/api/v1/users/${userId}/personal-data`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect([200, 204, 202]).toContain(deleteRes.status());

  const reLoginRes = await ctx.post('/api/v1/auth/login', { data: { email, password } });
  // After anonymisation the login credentials must no longer authenticate.
  // Accept 401/403/404/422 depending on how the backend represents deleted accounts.
  expect([401, 403, 404, 422]).toContain(reLoginRes.status());

  await ctx.dispose();
});
