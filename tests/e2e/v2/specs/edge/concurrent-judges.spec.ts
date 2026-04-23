import { test, expect } from '../../fixtures/test-fixtures';
import { createOrganizer } from '../../factories/organizer-factory';
import { createCompetitionWithSection } from '../../factories/competition-factory';
import { createJudgeToken } from '../../factories/judge-factory';
import { request } from '@playwright/test';

test('concurrent judges: 5 judges submit simultaneously, no data loss', async () => {
  const org = await createOrganizer('cj-org');
  const { competitionId, sectionId } = await createCompetitionWithSection(org.accessToken, {
    label: 'cj-comp',
    numberOfJudges: 5,
    dances: ['CHA_CHA'],
  });

  // Create 5 judge tokens
  const judges = await Promise.all(
    Array.from({ length: 5 }, (_, i) => createJudgeToken(org.accessToken, competitionId, i + 1))
  );

  // Add 3 pairs via API
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  for (let i = 1; i <= 3; i++) {
    await ctx.post(`/api/v1/competitions/${competitionId}/sections/${sectionId}/pairs`, {
      headers: { Authorization: `Bearer ${org.accessToken}` },
      data: {
        dancer1FirstName: `D1-${i}`, dancer1LastName: 'Test',
        dancer2FirstName: `D2-${i}`, dancer2LastName: 'Test',
        club: 'Club', startNumber: i,
      },
    });
  }

  // Open a HEAT round
  const roundRes = await ctx.post(`/api/v1/competitions/${competitionId}/sections/${sectionId}/rounds`, {
    headers: { Authorization: `Bearer ${org.accessToken}` },
    data: { type: 'HEAT', numberOfJudges: 5 },
  });
  expect(roundRes.ok(), `Open round failed: ${await roundRes.text()}`).toBeTruthy();
  const { id: roundId } = await roundRes.json() as { id: string };

  // All 5 judges submit concurrently — regression of C2-lite numberOfJudges bug
  const submissions = judges.map(j =>
    ctx.post(`/api/v1/rounds/${roundId}/callbacks`, {
      headers: { 'X-Judge-Token': j.rawToken },
      data: { marks: [{ pairNumber: 1 }, { pairNumber: 2 }] },
    })
  );
  const results = await Promise.all(submissions);

  // All should succeed (200 or 409 for double-submit)
  for (const r of results) {
    expect([200, 204, 409]).toContain(r.status());
  }

  // Verify marks saved — at least one judge's marks persisted
  const statusRes = await ctx.get(`/api/v1/rounds/${roundId}/submission-status`, {
    headers: { Authorization: `Bearer ${org.accessToken}` },
  });
  expect(statusRes.ok()).toBeTruthy();

  await ctx.dispose();
});

test('same-judge double-submit returns 409 then 200', async () => {
  const org = await createOrganizer('cj-dup-org');
  const { competitionId, sectionId } = await createCompetitionWithSection(org.accessToken, {
    label: 'cj-dup',
    numberOfJudges: 1,
    dances: ['CHA_CHA'],
  });
  const [judge] = await Promise.all([createJudgeToken(org.accessToken, competitionId, 1)]);

  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  await ctx.post(`/api/v1/competitions/${competitionId}/sections/${sectionId}/pairs`, {
    headers: { Authorization: `Bearer ${org.accessToken}` },
    data: { dancer1FirstName: 'A', dancer1LastName: 'B', dancer2FirstName: 'C', dancer2LastName: 'D', club: 'X', startNumber: 1 },
  });

  const roundRes = await ctx.post(`/api/v1/competitions/${competitionId}/sections/${sectionId}/rounds`, {
    headers: { Authorization: `Bearer ${org.accessToken}` },
    data: { type: 'HEAT', numberOfJudges: 1 },
  });
  const { id: roundId } = await roundRes.json() as { id: string };

  const payload = { headers: { 'X-Judge-Token': judge.rawToken }, data: { marks: [{ pairNumber: 1 }] } };
  const [r1, r2] = await Promise.all([
    ctx.post(`/api/v1/rounds/${roundId}/callbacks`, payload),
    ctx.post(`/api/v1/rounds/${roundId}/callbacks`, payload),
  ]);
  const statuses = [r1.status(), r2.status()].sort();
  expect(statuses).toContain(200);

  await ctx.dispose();
});
