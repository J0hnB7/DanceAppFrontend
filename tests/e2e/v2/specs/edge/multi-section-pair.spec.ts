import { test, expect } from '../../fixtures/test-fixtures';
import { createOrganizer } from '../../factories/organizer-factory';
import { createCompetition } from '../../factories/competition-factory';
import { createSection } from '../../factories/section-factory';
import { testEmail } from '../../helpers/test-prefix';
import { request } from '@playwright/test';

test('multi-section pair: sectionIds contains both section UUIDs', async () => {
  const org = await createOrganizer('msp-org');
  const { id: competitionId } = await createCompetition(org.accessToken, 'msp-comp');
  const { id: sectionAId } = await createSection(org.accessToken, competitionId, { name: 'Section A', dances: ['CHA_CHA'] });
  const { id: sectionBId } = await createSection(org.accessToken, competitionId, { name: 'Section B', dances: ['WALTZ'] });

  const dancerEmail = testEmail('msp-dancer');
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });

  await ctx.post('/api/v1/auth/register/dancer', {
    data: { email: dancerEmail, password: 'Dancer1!', firstName: 'Multi', lastName: 'Section', gdprAccepted: true },
  });

  const pairBody = {
    dancer1FirstName: 'Multi', dancer1LastName: 'Section',
    dancer2FirstName: 'Partner', dancer2LastName: 'Two',
    club: 'Test Club', email: dancerEmail,
  };

  const resA = await ctx.post(`/api/v1/competitions/${competitionId}/sections/${sectionAId}/pairs/public-registration`, { data: pairBody });
  expect(resA.ok(), `Pair reg A failed: ${await resA.text()}`).toBeTruthy();

  await ctx.post(`/api/v1/competitions/${competitionId}/sections/${sectionBId}/pairs/public-registration`, { data: pairBody });

  const presRes = await ctx.get(`/api/v1/competitions/${competitionId}/pairs/presence`, {
    headers: { Authorization: `Bearer ${org.accessToken}` },
  });
  expect(presRes.ok()).toBeTruthy();
  const pairs = await presRes.json() as Array<{ sectionIds: string[] }>;
  const multiPair = pairs.find(p => Array.isArray(p.sectionIds) && p.sectionIds.length > 1);
  expect(multiPair, 'Expected a pair registered in multiple sections').toBeTruthy();
  expect(multiPair!.sectionIds).toContain(sectionAId);
  expect(multiPair!.sectionIds).toContain(sectionBId);

  await ctx.dispose();
});
