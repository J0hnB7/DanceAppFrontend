import { test, expect } from '@playwright/test';
import { createApiClient } from '../../factories/api-client';
import { createOrganizer } from '../../factories/organizer-factory';
import { createCompetition } from '../../factories/competition-factory';
import { createSection } from '../../factories/section-factory';
import { createDancerWithProfile } from '../../factories/dancer-factory';

async function setupCompetition(label: string) {
  const organizer = await createOrganizer(`sr-${label}`);
  const competition = await createCompetition(organizer.accessToken, `sr-${label}`);
  const [adult, youth, open] = await Promise.all([
    createSection(organizer.accessToken, competition.id, {
      name: 'Dospělí D Lat', minBirthYear: 1975, maxBirthYear: 2000,
    }),
    createSection(organizer.accessToken, competition.id, {
      name: 'Mládež D Lat', minBirthYear: 2004, maxBirthYear: 2009,
    }),
    createSection(organizer.accessToken, competition.id, { name: 'Open D Lat' }),
  ]);
  const api = await createApiClient();
  await api.openRegistration(organizer.accessToken, competition.id);
  await api.dispose();
  return {
    competitionId: competition.id,
    adultSectionId: adult.id,
    youthSectionId: youth.id,
    openSectionId: open.id,
    orgToken: organizer.accessToken,
    orgEmail: organizer.email,
    orgPassword: organizer.password,
  };
}

test('T1 — eligible-sections filter vrátí jen sekce odpovídající ročníku', async () => {
  const { competitionId, adultSectionId, youthSectionId, openSectionId } = await setupCompetition('t1');
  await createDancerWithProfile('sr-t1-filter', { birthYear: 1990 });
  const api = await createApiClient();
  const eligible = await api.getEligibleSections(competitionId, 1990);
  await api.dispose();

  const ids = eligible.map((s) => s.id);
  expect(ids).toContain(adultSectionId);
  expect(ids).toContain(openSectionId);
  expect(ids).not.toContain(youthSectionId);
});

test('T2 — batch do 2 sekcí → 1 startNumber + UI potvrzení', async ({ page }) => {
  const { competitionId, adultSectionId, openSectionId } = await setupCompetition('t2');
  const dancer = await createDancerWithProfile('sr-t2-batch', { birthYear: 1990 });
  const api = await createApiClient();
  const token = await api.login(dancer.email, dancer.password);
  const result = await api.selfRegisterBatch(token, competitionId, [adultSectionId, openSectionId]);
  await api.dispose();

  expect(result.pairId).toBeTruthy();
  expect(result.startNumber).toBeGreaterThan(0);
  expect(result.sections).toHaveLength(2);

  await page.goto('/login');
  await page.locator('form.auth-light').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('input[type="email"]').fill(dancer.email);
  await page.locator('input[type="password"]').fill(dancer.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });

  await page.goto(`/competitions/${competitionId}`);
  await expect(
    page.getByText(/přihlášen|registrován|registered/i).first()
  ).toBeVisible({ timeout: 10_000 });
});

test('T3 — bulk 10 taneč. do ADULT sekce → organizer vidí počet párů', async ({ page }) => {
  const { competitionId, adultSectionId, orgToken, orgEmail, orgPassword } = await setupCompetition('t3');
  const COUNT = 10;

  // Vytvořit dancery paralelně (nezávislé operace)
  const allDancers = await Promise.all(
    Array.from({ length: COUNT }, (_, i) =>
      createDancerWithProfile(`sr-t3-${i}`, { birthYear: 1975 + i })
    )
  );

  // Registrace sekvenčně (vyhnutí race condition na startNumber)
  for (const dancer of allDancers) {
    const api = await createApiClient();
    const token = await api.login(dancer.email, dancer.password);
    await api.selfRegisterBatch(token, competitionId, [adultSectionId]);
    await api.dispose();
  }

  const api = await createApiClient();
  const pairs = await api.listPairs(orgToken, competitionId);
  await api.dispose();
  expect(pairs.length).toBeGreaterThanOrEqual(COUNT);

  await page.goto('/login');
  await page.locator('form.auth-light').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('input[type="email"]').fill(orgEmail);
  await page.locator('input[type="password"]').fill(orgPassword);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });

  await page.goto(`/dashboard/competitions/${competitionId}/sections`);
  await expect(page.getByText(/Dospělí D Lat/i)).toBeVisible({ timeout: 10_000 });
});

test('T4 — multi-sekce dancer registruje do 2 kategorií najednou', async () => {
  const { competitionId, adultSectionId, openSectionId, orgToken } = await setupCompetition('t4');
  const dancer = await createDancerWithProfile('sr-t4-multi', { birthYear: 1990 });
  const api = await createApiClient();
  const token = await api.login(dancer.email, dancer.password);
  const result = await api.selfRegisterBatch(token, competitionId, [adultSectionId, openSectionId]);
  await api.dispose();

  expect(result.sections).toHaveLength(2);

  const apiOrg = await createApiClient();
  const pairs = await apiOrg.listPairs(orgToken, competitionId);
  await apiOrg.dispose();
  expect(pairs.find((p) => p.id === result.pairId)).toBeDefined();
});
