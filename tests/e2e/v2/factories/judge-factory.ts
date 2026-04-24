import { request } from '@playwright/test';

export interface JudgeTokenContext {
  id: string;
  rawToken: string;
  pin: string;
  judgeNumber: number;
}

export async function createJudgeToken(
  organizerToken: string,
  competitionId: string,
  judgeNumber: number,
  role: 'JUDGE' | 'CHAIR' | 'TECH_SUPPORT' | 'MODERATOR' | 'DJ' = 'JUDGE'
): Promise<JudgeTokenContext> {
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  const res = await ctx.post(`/api/v1/competitions/${competitionId}/judge-tokens`, {
    headers: { Authorization: `Bearer ${organizerToken}` },
    data: { judgeNumber, role },
  });
  if (!res.ok()) throw new Error(`createJudgeToken failed: ${res.status()} ${await res.text()}`);
  const data = await res.json() as { id: string; rawToken: string; pin: string; judgeNumber: number };
  await ctx.dispose();
  return { id: data.id, rawToken: data.rawToken, pin: data.pin, judgeNumber: data.judgeNumber };
}
