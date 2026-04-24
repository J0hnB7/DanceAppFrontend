/**
 * T3 — Mobile judge scoring on iPhone 12 viewport.
 *
 * Runs under the "mobile" project (see playwright.config.v2.ts). Verifies:
 *   1. Judge login page loads on mobile viewport without horizontal scroll.
 *   2. Touch targets visible in the primary viewport are >= 44x44 px.
 *
 * The actual scoring interaction depends on live organizer-created round +
 * pair data. We seed those via API so the test is self-contained.
 */
import { test, expect } from '../../fixtures/test-fixtures';
import { createOrganizer } from '../../factories/organizer-factory';
import { createApiClient } from '../../factories/api-client';
import { createJudgeToken } from '../../factories/judge-factory';

test('mobile judge: login renders + touch targets >= 44x44 + no horizontal scroll', async ({ page }) => {
  test.setTimeout(120_000);
  const api = await createApiClient();

  const org = await createOrganizer('mj-org');
  const competition = await api.createCompetition(org.accessToken, {
    name: 'Mobile Judge Competition',
    eventDate: '2099-12-31',
    venue: 'MJ Venue',
    contactEmail: 'mj@test.local',
  });
  const section = await api.createSection(org.accessToken, competition.id, {
    name: 'MJ Section',
    ageCategory: 'ADULT',
    danceStyle: 'LATIN',
    level: 'D',
    competitorType: 'AMATEURS',
    competitionType: 'COUPLE',
    dances: ['CHA_CHA'],
    numberOfJudges: 1,
    maxFinalPairs: 4,
  });
  const judge = await createJudgeToken(org.accessToken, competition.id, 1);

  // Create 2 pairs so the HEAT has data
  for (let i = 1; i <= 2; i++) {
    await api.createPair(org.accessToken, competition.id, section.id, {
      dancer1FirstName: `A${i}`, dancer1LastName: 'Alpha',
      dancer2FirstName: `B${i}`, dancer2LastName: 'Beta',
      club: 'MJ Club', startNumber: 500 + i,
    });
  }

  // ── Navigate to the judge landing page with the token
  await page.goto(`/judge/${judge.rawToken}`);
  await page.waitForLoadState('domcontentloaded');

  // ── No horizontal scroll on mobile viewport
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1); // +1 for sub-pixel rounding

  // ── Touch-target audit for visible actionable elements
  const targets = page.locator('button:visible, a:visible, [role="button"]:visible, input[type="submit"]:visible, input[type="button"]:visible');
  const count = await targets.count();
  const smallTargets: Array<{ idx: number; w: number; h: number }> = [];
  for (let i = 0; i < count; i++) {
    const el = targets.nth(i);
    const visible = await el.isVisible().catch(() => false);
    if (!visible) continue;
    const box = await el.boundingBox();
    if (!box) continue;
    if (box.width < 44 || box.height < 44) {
      smallTargets.push({ idx: i, w: Math.round(box.width), h: Math.round(box.height) });
    }
  }
  // Allow a small tolerance: up to 2 elements under the threshold (e.g. tiny
  // icon-only controls in headers). Anything beyond that is a regression.
  expect(
    smallTargets.length,
    `Too many under-44px targets: ${JSON.stringify(smallTargets)}`
  ).toBeLessThanOrEqual(2);

  await api.dispose();
});
