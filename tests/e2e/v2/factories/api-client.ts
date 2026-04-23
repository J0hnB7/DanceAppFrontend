import { request } from '@playwright/test';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiClient {
  register(body: {
    email: string;
    password: string;
    name: string;
    organizationName?: string;
    gdprAccepted?: boolean;
  }): Promise<TokenResponse>;
  registerDancer(body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    gdprAccepted?: boolean;
  }): Promise<void>;
  login(email: string, password: string): Promise<string>;
  createCompetition(
    token: string,
    body: { name: string; eventDate: string; venue: string; contactEmail?: string }
  ): Promise<{ id: string }>;
  createSection(token: string, competitionId: string, body: Record<string, unknown>): Promise<{ id: string }>;
  dispose(): Promise<void>;
}

export async function createApiClient(): Promise<ApiClient> {
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });

  return {
    async register(body) {
      const res = await ctx.post('/api/v1/auth/register', {
        data: { gdprAccepted: true, ...body },
      });
      if (!res.ok()) throw new Error(`register failed: ${res.status()} ${await res.text()}`);
      return res.json() as Promise<TokenResponse>;
    },

    async registerDancer(body) {
      const res = await ctx.post('/api/v1/auth/register/dancer', {
        data: { gdprAccepted: true, ...body },
      });
      if (!res.ok()) throw new Error(`registerDancer failed: ${res.status()} ${await res.text()}`);
    },

    async login(email, password) {
      const res = await ctx.post('/api/v1/auth/login', { data: { email, password } });
      if (!res.ok()) throw new Error(`login failed: ${res.status()}`);
      const data = await res.json() as TokenResponse;
      return data.accessToken;
    },

    async createCompetition(token, body) {
      const res = await ctx.post('/api/v1/competitions', {
        headers: { Authorization: `Bearer ${token}` },
        data: body,
      });
      if (!res.ok()) throw new Error(`createCompetition failed: ${res.status()} ${await res.text()}`);
      const data = await res.json() as { id: string };
      return { id: data.id };
    },

    async createSection(token, competitionId, body) {
      const res = await ctx.post(`/api/v1/competitions/${competitionId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
        data: body,
      });
      if (!res.ok()) throw new Error(`createSection failed: ${res.status()} ${await res.text()}`);
      const data = await res.json() as { id: string };
      return { id: data.id };
    },

    async dispose() {
      await ctx.dispose();
    },
  };
}
