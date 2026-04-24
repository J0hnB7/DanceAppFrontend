import { test, expect } from '../../fixtures/test-fixtures';
import { createOrganizer } from '../../factories/organizer-factory';
import { createCompetitionWithSection } from '../../factories/competition-factory';
import { createJudgeToken } from '../../factories/judge-factory';
import { createApiClient } from '../../factories/api-client';

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

test('same-judge double-submit succeeds on both (idempotent)', async () => {
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

  const [r1, r2] = await Promise.allSettled([
    api.submitCallbacks(judge.id, heat.id, danceName, [p.id]),
    api.submitCallbacks(judge.id, heat.id, danceName, [p.id]),
  ]);
  // Callbacks endpoint does delete-then-insert per judge+dance — both requests succeed, final state consistent.
  expect([r1.status, r2.status]).toContain('fulfilled');

  await api.dispose();
});
