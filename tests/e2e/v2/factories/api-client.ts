import { request } from '@playwright/test';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JudgeTokenStatus {
  id: string;
  judgeNumber: number;
  role: string;
  name?: string;
  country?: string;
}

export interface RoundResponse {
  id: string;
  roundType: 'HEAT' | 'PRELIMINARY' | 'SEMIFINAL' | 'QUARTER_FINAL' | 'FINAL' | 'SINGLE_ROUND';
  roundNumber: number;
}

export interface PairResponse {
  id: string;
  startNumber: number;
  dancer1FirstName?: string;
  dancer1LastName?: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  club?: string;
}

export interface SectionFinalSummary {
  sectionId: string;
  rankings: Array<{
    pairId: string;
    startNumber?: number;
    finalPlacement?: number | null;
    [key: string]: unknown;
  }>;
}

export interface ApiClient {
  register(body: { email: string; password: string; name: string; organizationName?: string; gdprAccepted?: boolean }): Promise<TokenResponse>;
  registerDancer(body: { email: string; password: string; firstName: string; lastName: string; gdprAccepted?: boolean }): Promise<void>;
  login(email: string, password: string): Promise<string>;
  createCompetition(token: string, body: { name: string; eventDate: string; venue: string; contactEmail?: string; federation?: string; roleMode?: string; description?: string; registrationDeadline?: string }): Promise<{ id: string }>;
  createSection(token: string, competitionId: string, body: Record<string, unknown>): Promise<{ id: string }>;

  createPair(token: string, competitionId: string, sectionId: string, body: Record<string, unknown>): Promise<{ id: string; startNumber?: number }>;
  listPairs(token: string, competitionId: string): Promise<PairResponse[]>;
  setPresence(token: string, competitionId: string, pairId: string, status: 'CHECKED_IN' | 'ABSENT' | 'WITHDRAWN'): Promise<void>;

  listJudgeTokens(token: string, competitionId: string): Promise<JudgeTokenStatus[]>;

  openRound(token: string, competitionId: string, sectionId: string): Promise<RoundResponse>;
  completeRound(token: string, competitionId: string, sectionId: string, roundId: string, pairsToAdvance: number): Promise<RoundResponse>;
  getSectionDances(token: string, competitionId: string, sectionId: string): Promise<Array<{ id: string; danceName: string; danceOrder: number }>>;

  submitCallbacks(judgeTokenId: string, roundId: string, dance: string, selectedPairIds: string[]): Promise<void>;
  submitPlacements(judgeTokenId: string, roundId: string, danceId: string, pairPlacements: Record<string, number>): Promise<void>;

  calculateRound(token: string, roundId: string): Promise<unknown>;
  calculateSectionSummary(token: string, sectionId: string): Promise<SectionFinalSummary>;
  approveResults(token: string, sectionId: string): Promise<void>;
  getSectionSummary(sectionId: string): Promise<SectionFinalSummary>;

  dispose(): Promise<void>;
}

export async function createApiClient(baseURL = 'http://localhost:8080'): Promise<ApiClient> {
  const ctx = await request.newContext({ baseURL });
  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function jsonOrThrow<T>(res: Awaited<ReturnType<typeof ctx.post>>, what: string): Promise<T> {
    if (!res.ok()) throw new Error(`${what} failed: ${res.status()} ${await res.text()}`);
    const body = await res.text();
    return (body ? JSON.parse(body) : {}) as T;
  }

  return {
    async register(body) {
      const res = await ctx.post('/api/v1/auth/register', { data: { gdprAccepted: true, ...body } });
      return jsonOrThrow<TokenResponse>(res, 'register');
    },

    async registerDancer(body) {
      const res = await ctx.post('/api/v1/auth/register/dancer', { data: { gdprAccepted: true, ...body } });
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
        headers: authHeader(token),
        data: { federation: 'NATIONAL', roleMode: 'ORGANIZER_ONLY', ...body },
      });
      return jsonOrThrow<{ id: string }>(res, 'createCompetition');
    },

    async createSection(token, competitionId, body) {
      const res = await ctx.post(`/api/v1/competitions/${competitionId}/sections`, { headers: authHeader(token), data: body });
      return jsonOrThrow<{ id: string }>(res, 'createSection');
    },

    async createPair(token, competitionId, sectionId, body) {
      const res = await ctx.post(`/api/v1/competitions/${competitionId}/sections/${sectionId}/pairs`, {
        headers: authHeader(token), data: body,
      });
      return jsonOrThrow<{ id: string; startNumber?: number }>(res, 'createPair');
    },

    async listPairs(token, competitionId) {
      const res = await ctx.get(`/api/v1/competitions/${competitionId}/pairs`, { headers: authHeader(token) });
      return jsonOrThrow<PairResponse[]>(res, 'listPairs');
    },

    async setPresence(token, competitionId, pairId, status) {
      const res = await ctx.put(`/api/v1/competitions/${competitionId}/pairs/${pairId}/presence`, {
        headers: authHeader(token), data: { status },
      });
      if (!res.ok()) throw new Error(`setPresence failed: ${res.status()} ${await res.text()}`);
    },

    async listJudgeTokens(token, competitionId) {
      const res = await ctx.get(`/api/v1/competitions/${competitionId}/judge-tokens`, { headers: authHeader(token) });
      return jsonOrThrow<JudgeTokenStatus[]>(res, 'listJudgeTokens');
    },

    async openRound(token, competitionId, sectionId) {
      const res = await ctx.post(`/api/v1/competitions/${competitionId}/sections/${sectionId}/rounds/open`, {
        headers: authHeader(token),
      });
      return jsonOrThrow<RoundResponse>(res, 'openRound');
    },

    async completeRound(token, competitionId, sectionId, roundId, pairsToAdvance) {
      const res = await ctx.post(`/api/v1/competitions/${competitionId}/sections/${sectionId}/rounds/${roundId}/complete`, {
        headers: authHeader(token), data: { pairsToAdvance },
      });
      return jsonOrThrow<RoundResponse>(res, 'completeRound');
    },

    async getSectionDances(token, competitionId, sectionId) {
      const res = await ctx.get(`/api/v1/competitions/${competitionId}/sections/${sectionId}/dances`, { headers: authHeader(token) });
      return jsonOrThrow<Array<{ id: string; danceName: string; danceOrder: number }>>(res, 'getSectionDances');
    },

    async submitCallbacks(judgeTokenId, roundId, dance, selectedPairIds) {
      const res = await ctx.post(`/api/v1/rounds/${roundId}/callbacks`, {
        headers: { 'X-Judge-Token': judgeTokenId },
        data: { dance, selectedPairIds },
      });
      if (!res.ok()) throw new Error(`submitCallbacks failed: ${res.status()} ${await res.text()}`);
    },

    async submitPlacements(judgeTokenId, roundId, danceId, pairPlacements) {
      const res = await ctx.post(`/api/v1/rounds/${roundId}/placements/${danceId}`, {
        headers: { 'X-Judge-Token': judgeTokenId },
        data: { pairPlacements },
      });
      if (!res.ok()) throw new Error(`submitPlacements failed: ${res.status()} ${await res.text()}`);
    },

    async calculateRound(token, roundId) {
      const res = await ctx.post(`/api/v1/rounds/${roundId}/calculate`, { headers: authHeader(token) });
      return jsonOrThrow<unknown>(res, 'calculateRound');
    },

    async calculateSectionSummary(token, sectionId) {
      const res = await ctx.post(`/api/v1/sections/${sectionId}/final-summary/calculate`, { headers: authHeader(token) });
      return jsonOrThrow<SectionFinalSummary>(res, 'calculateSectionSummary');
    },

    async approveResults(token, sectionId) {
      const res = await ctx.post(`/api/v1/sections/${sectionId}/results/approve`, { headers: authHeader(token) });
      if (!res.ok()) throw new Error(`approveResults failed: ${res.status()} ${await res.text()}`);
    },

    async getSectionSummary(sectionId) {
      const res = await ctx.get(`/api/v1/sections/${sectionId}/final-summary`);
      return jsonOrThrow<SectionFinalSummary>(res, 'getSectionSummary');
    },

    async dispose() {
      await ctx.dispose();
    },
  };
}
