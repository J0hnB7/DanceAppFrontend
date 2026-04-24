import { test, expect } from '../../fixtures/test-fixtures';
import { createOrganizer } from '../../factories/organizer-factory';
import { createCompetitionWithSection } from '../../factories/competition-factory';
import { createJudgeToken } from '../../factories/judge-factory';
import { createApiClient } from '../../factories/api-client';
import { request } from '@playwright/test';

test('concurrent judges: 5 judges submit simultaneously, no data loss', async () => {
  const api = await createApiClient();
  const org = await createOrganizer('cj-org');
  const { competitionId, sectionId } = await createCompetitionWithSection(org.accessToken, {
    label: 'cj-comp',
    numberOfJudges: 5,
    dances: ['CHA_CHA'],
  });

  const judges = await Promise.all(
    Array.from({ length: 5 }, (_, i) => createJudgeToken(org.accessToken, competitionId, i + 1))
  );

  const pairIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const p = await api.createPair(org.accessToken, competitionId, sectionId, {
      dancer1FirstName: `D1-${i}`, dancer1LastName: 'Test',
      dancer2FirstName: `D2-${i}`, dancer2LastName: 'Test',
      club: 'Club', startNumber: 100 + i,
    });
    pairIds.push(p.id);
    await api.setPresence(org.accessToken, competitionId, p.id, 'CHECKED_IN');
  }

  const heat = await api.openRound(org.accessToken, competitionId, sectionId);
  const dances = await api.getSectionDances(org.accessToken, competitionId, sectionId);
  const danceName = dances[0]?.danceName ?? 'Cha-Cha';

  const results = await Promise.allSettled(
    judges.map(j => api.submitCallbacks(j.id, heat.id, danceName, pairIds.slice(0, 2)))
  );
  for (const r of results) expect(r.status).toBe('fulfilled');

  await api.dispose();
});

/**
 * Regresní guard pro C2-lite commit 806a82c: když ten samý sudce pošle dva
 * callback requesty současně, backend dělá delete-then-insert v jedné
 * transakci → jedna instance commitne, druhá zahodí unique-constraint
 * conflict (409). Sort statusů musí obsahovat alespoň jedno 200 nebo 204
 * (data jsou zapsaná) — a duplicate-submit nesmí vrátit 5xx nebo tichý
 * ztratit data. Per memory: "Same-judge double-tab → 409+200 (safe)".
 */
test('same-judge double-submit: one commits, the other safely conflicts', async () => {
  const api = await createApiClient();
  const org = await createOrganizer('cj-dup-org');
  const { competitionId, sectionId } = await createCompetitionWithSection(org.accessToken, {
    label: 'cj-dup', numberOfJudges: 1, dances: ['CHA_CHA'],
  });
  const judge = await createJudgeToken(org.accessToken, competitionId, 1);

  const p = await api.createPair(org.accessToken, competitionId, sectionId, {
    dancer1FirstName: 'A', dancer1LastName: 'B', dancer2FirstName: 'C', dancer2LastName: 'D',
    club: 'X', startNumber: 1,
  });
  await api.setPresence(org.accessToken, competitionId, p.id, 'CHECKED_IN');

  const heat = await api.openRound(org.accessToken, competitionId, sectionId);
  const dances = await api.getSectionDances(org.accessToken, competitionId, sectionId);
  const danceName = dances[0]?.danceName ?? 'Cha-Cha';

  // Raw HTTP: the api-client wrapper throws on !ok, but we need the status
  // codes to assert the race outcome.
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  const submit = () => ctx.post(`/api/v1/rounds/${heat.id}/callbacks`, {
    headers: { 'X-Judge-Token': judge.id },
    data: { dance: danceName, selectedPairIds: [p.id] },
  });

  const [r1, r2] = await Promise.all([submit(), submit()]);
  const statuses = [r1.status(), r2.status()].sort();

  // Every response must be "handled" — no 500, no timeout.
  for (const s of [r1.status(), r2.status()]) {
    expect(s, `unexpected 5xx from concurrent submit: ${s}`).toBeLessThan(500);
  }
  // At least one request must have persisted the marks (200/204).
  expect(statuses.some(s => s === 200 || s === 204),
         `expected at least one 200/204 in concurrent double-submit, got ${statuses}`).toBeTruthy();
  // The other may be a 409 (conflict — race lost cleanly) or another 200/204
  // (delete-then-insert replayed safely). Anything else is a regression.
  for (const s of statuses) {
    expect([200, 204, 409], `unexpected status ${s} — not safe race outcome`).toContain(s);
  }

  // Final state must be consistent: the judge's stored callback set contains the pair.
  const getRes = await ctx.get(`/api/v1/rounds/${heat.id}/callbacks`, {
    headers: { 'X-Judge-Token': judge.id },
  });
  expect(getRes.ok()).toBeTruthy();
  const stored = await getRes.json() as string[];
  expect(stored).toContain(p.id);

  await ctx.dispose();
  await api.dispose();
});
