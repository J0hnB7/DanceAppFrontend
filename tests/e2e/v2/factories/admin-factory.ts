import { createApiClient } from './api-client';
import { testEmail } from '../helpers/test-prefix';
import { request } from '@playwright/test';

export interface AdminContext {
  email: string;
  password: string;
  accessToken: string;
  id: string;
}

/**
 * Register a user via the normal auth flow, then promote to ADMIN via the
 * @Profile("!prod") test endpoint. Refreshes the access token so it carries the
 * new role claim.
 */
export async function createAdmin(label = 'admin'): Promise<AdminContext> {
  const api = await createApiClient();
  const email = testEmail(label);
  const password = 'AdminPass1!';
  const { accessToken: initialToken } = await api.register({ email, password, name: `Admin ${label}` });

  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  const meRes = await ctx.get('/api/v1/auth/me', { headers: { Authorization: `Bearer ${initialToken}` } });
  if (!meRes.ok()) throw new Error(`createAdmin: /auth/me failed: ${meRes.status()}`);
  const me = await meRes.json() as { id: string };

  const promoteRes = await ctx.post(`/api/v1/test/make-admin/${me.id}`);
  if (!promoteRes.ok()) throw new Error(`createAdmin: promote failed: ${promoteRes.status()} ${await promoteRes.text()}`);

  // Re-login to obtain a token whose claims reflect the new role.
  const newToken = await api.login(email, password);
  await ctx.dispose();
  await api.dispose();
  return { email, password, accessToken: newToken, id: me.id };
}
