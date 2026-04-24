import http from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * Tiny HTTP server that plays the role of Google's OAuth endpoints for tests.
 * Serves:
 *   - GET  /authorize      → 302 back to redirect_uri with a fake code
 *   - POST /token          → JSON { access_token, id_token }
 *   - GET  /userinfo       → JSON { sub, email, name, email_verified }
 *   - GET  /.well-known/openid-configuration
 *   - GET  /jwks           → empty keyset (backend must treat this profile leniently)
 *
 * The backend must be configured to trust this issuer in its test profile —
 * without a BE-side override the full OAuth flow cannot succeed in CI. Specs
 * should treat the mock as an infrastructure stub until that override exists;
 * they can still exercise request/response framing.
 */
export interface OAuthMockServer {
  port: number;
  baseUrl: string;
  lastUser: { sub: string; email: string; name: string } | null;
  close(): Promise<void>;
}

export async function startOAuthMockServer(preferredPort = 0): Promise<OAuthMockServer> {
  const state: OAuthMockServer = {
    port: 0,
    baseUrl: '',
    lastUser: null,
    close: async () => { /* replaced below */ },
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost`);
    const path = url.pathname;

    if (req.method === 'GET' && path === '/authorize') {
      const redirectUri = url.searchParams.get('redirect_uri') ?? '/';
      const sep = redirectUri.includes('?') ? '&' : '?';
      res.writeHead(302, { Location: `${redirectUri}${sep}code=fake-code-123&state=${url.searchParams.get('state') ?? ''}` });
      res.end();
      return;
    }

    if (req.method === 'POST' && path === '/token') {
      const sub = 'mock-sub-' + Math.random().toString(36).slice(2, 10);
      const email = `mock-${sub}@oauth-mock.test`;
      state.lastUser = { sub, email, name: 'Mock User' };
      // id_token: unsigned JWT-shaped payload. The BE will reject this under
      // normal configuration — the BE's test profile must opt in to accept it.
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub, email, email_verified: true, name: state.lastUser.name, iss: state.baseUrl })).toString('base64url');
      const idToken = `${header}.${payload}.`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'mock-access', id_token: idToken, token_type: 'Bearer', expires_in: 3600 }));
      return;
    }

    if (req.method === 'GET' && path === '/userinfo') {
      const user = state.lastUser ?? { sub: 'anon', email: 'anon@oauth-mock.test', name: 'Anon' };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...user, email_verified: true }));
      return;
    }

    if (req.method === 'GET' && path === '/.well-known/openid-configuration') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        issuer: state.baseUrl,
        authorization_endpoint: `${state.baseUrl}/authorize`,
        token_endpoint: `${state.baseUrl}/token`,
        userinfo_endpoint: `${state.baseUrl}/userinfo`,
        jwks_uri: `${state.baseUrl}/jwks`,
      }));
      return;
    }

    if (req.method === 'GET' && path === '/jwks') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [] }));
      return;
    }

    res.writeHead(404);
    res.end('not found');
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(preferredPort, '127.0.0.1', () => resolve());
  });

  const addr = server.address() as AddressInfo;
  state.port = addr.port;
  state.baseUrl = `http://127.0.0.1:${addr.port}`;
  state.close = () => new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });
  return state;
}
