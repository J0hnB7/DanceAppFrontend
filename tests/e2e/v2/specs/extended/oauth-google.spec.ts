/**
 * T3 — Google OAuth with a mocked provider.
 *
 * Scope: the mock OAuth server stands up on an ephemeral port and serves the
 * expected Google endpoints (/authorize, /token, /userinfo, .well-known). The
 * spec verifies two things today:
 *
 *   1. Infrastructure: the mock server starts cleanly and serves a well-formed
 *      OIDC discovery document.
 *   2. BE surface: POST /api/v1/auth/google rejects invalid/unsigned tokens
 *      with a non-2xx status (defensive, since a BE test-profile override is
 *      required before end-to-end Google login can be covered — the plan
 *      documents this as the next work item).
 *
 * When the BE gains `app.oauth.google.trust-mock=true` (test profile only)
 * plus an overridable issuer URL, the happy-path assertions below light up.
 */
import { test, expect } from '../../fixtures/test-fixtures';
import { startOAuthMockServer, type OAuthMockServer } from '../../helpers/oauth-mock-server';
import { request } from '@playwright/test';

let mock: OAuthMockServer;

test.beforeAll(async () => {
  mock = await startOAuthMockServer();
});

test.afterAll(async () => {
  await mock.close();
});

test('OAuth mock server serves a valid discovery document', async () => {
  const ctx = await request.newContext();
  const disc = await ctx.get(`${mock.baseUrl}/.well-known/openid-configuration`);
  expect(disc.ok()).toBeTruthy();
  const body = await disc.json() as Record<string, string>;
  expect(body.authorization_endpoint).toBe(`${mock.baseUrl}/authorize`);
  expect(body.token_endpoint).toBe(`${mock.baseUrl}/token`);
  expect(body.jwks_uri).toBe(`${mock.baseUrl}/jwks`);
  await ctx.dispose();
});

test('OAuth mock token endpoint returns a JWT-shaped id_token', async () => {
  const ctx = await request.newContext();
  const res = await ctx.post(`${mock.baseUrl}/token`, { data: 'grant_type=authorization_code&code=fake' });
  expect(res.ok()).toBeTruthy();
  const body = await res.json() as { id_token: string; access_token: string };
  expect(body.id_token.split('.').length).toBe(3);
  expect(mock.lastUser?.email).toMatch(/@oauth-mock\.test$/);
  await ctx.dispose();
});

test('BE /api/v1/auth/google rejects an unsigned mock id_token', async () => {
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  // Fetch a mock id_token
  const tokenRes = await ctx.post(`${mock.baseUrl}/token`, { data: 'grant_type=authorization_code&code=fake' });
  const { id_token } = await tokenRes.json() as { id_token: string };

  const authRes = await ctx.post('/api/v1/auth/google', { data: { idToken: id_token } });
  // Without a BE test-profile override the mock id_token is unsigned →
  // the Google verifier rejects. We only assert the endpoint is wired and
  // does NOT silently accept arbitrary payloads.
  expect(authRes.status()).toBeGreaterThanOrEqual(400);
  expect(authRes.status()).toBeLessThan(500);

  await ctx.dispose();
});
