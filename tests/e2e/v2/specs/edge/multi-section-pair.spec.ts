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

  // Open registration on the competition — required by pair public-registration gate.
  const patchRes = await ctx.put(`/api/v1/competitions/${competitionId}`, {
    headers: { Authorization: `Bearer ${org.accessToken}`, 'Content-Type': 'application/json' },
    data: { registrationOpen: true },
  });
  expect(patchRes.ok(), `Open registration failed: ${await patchRes.text()}`).toBeTruthy();

  const body = {
    sectionIds: [sectionAId, sectionBId],
    dancer1FirstName: 'Multi', dancer1LastName: 'Section',
    dancer2FirstName: 'Partner', dancer2LastName: 'Two',
    dancer1Club: 'Test Club',
    dancer2Club: 'Test Club',
    email: dancerEmail,
    gdpr: true,
  };
  const regRes = await ctx.post(`/api/v1/competitions/${competitionId}/pairs/public-registration`, { data: body });
  expect(regRes.ok(), `Public registration failed: ${await regRes.text()}`).toBeTruthy();

  const presRes = await ctx.get(`/api/v1/competitions/${competitionId}/presence`, {
    headers: { Authorization: `Bearer ${org.accessToken}` },
  });
  expect(presRes.ok()).toBeTruthy();
  const presBody = await presRes.json();
  const pairs = Array.isArray(presBody) ? presBody as Array<{ sectionIds: string[] }>
                                        : (presBody.content as Array<{ sectionIds: string[] }>) ?? [];
  const multiPair = pairs.find(p => Array.isArray(p.sectionIds) && p.sectionIds.length > 1);
  expect(multiPair, 'Expected a pair registered in multiple sections').toBeTruthy();
  expect(multiPair!.sectionIds).toContain(sectionAId);
  expect(multiPair!.sectionIds).toContain(sectionBId);

  await ctx.dispose();
});
