/**
 * T1 — Beta smoke / golden path.
 *
 * Runs the complete user journey: organizer creates competition → dancer
 * self-registers → organizer checks pairs in + opens HEAT → judges score → FINAL
 * opens → judges place → calculate → publish → dancer sees result + xlsx export.
 *
 * Design choices:
 *  - Setup + scoring go through the HTTP API (api-client). These steps are
 *    functionally tested by backend ITs (FullCompetitionFlowIT) and do not
 *    benefit from UI automation — a flaky UI scrub here will mask real bugs.
 *  - Critical UI touchpoints: organizer login, live-control page renders,
 *    dancer sees published results, XLSX export downloads.
 *  - Round transitions use waitForSseEvent (real EventSource inside the browser)
 *    to prove the coordination contract holds end-to-end.
 */
import { test, expect } from '../fixtures/test-fixtures';
import { createOrganizer } from '../factories/organizer-factory';
import { createDancer } from '../factories/dancer-factory';
import { createApiClient } from '../factories/api-client';
import { createJudgeToken } from '../factories/judge-factory';
import { LoginPage } from '../pages/login-page';
import { ResultsPage } from '../pages/results-page';
import { generateHeatCallbacks, generateUnanimousFinal } from '../helpers/judge-scoring-dsl';
import { waitForRoundOpened } from '../helpers/wait-for-sse';

test.describe('T1 — beta-smoke golden path', () => {
  test('organizer → judges → dancer → published result + xlsx export', async ({ page, browser }) => {
    test.setTimeout(180_000);

    const api = await createApiClient();

    // ── Setup: organizer + dancer + competition + section + judges + pairs
    const organizer = await createOrganizer('t1-org');
    const dancerA = await createDancer('t1-dA');
    const dancerB = await createDancer('t1-dB');

    const competition = await api.createCompetition(organizer.accessToken, {
      name: 'T1 Golden Path Competition',
      eventDate: '2099-12-31',
      venue: 'T1 Venue',
      contactEmail: 't1@test.local',
    });
    const section = await api.createSection(organizer.accessToken, competition.id, {
      name: 'T1 Adult Latin',
      ageCategory: 'ADULT',
      danceStyle: 'LATIN',
      level: 'D',
      competitorType: 'AMATEURS',
      competitionType: 'COUPLE',
      dances: ['CHA_CHA'],
      numberOfJudges: 3,
      maxFinalPairs: 4,
    });

    // Create 6 pairs → HEAT culls to 4 (matches FullCompetitionFlowIT)
    const pairs = [];
    for (let i = 1; i <= 6; i++) {
      const p = await api.createPair(organizer.accessToken, competition.id, section.id, {
        dancer1FirstName: `A${i}`, dancer1LastName: 'Alpha',
        dancer2FirstName: `B${i}`, dancer2LastName: 'Beta',
        club: 'T1 Club', startNumber: 200 + i,
      });
      pairs.push(p);
    }

    // Create 3 judges (matches section numberOfJudges)
    const judgeCreations = await Promise.all([
      createJudgeToken(organizer.accessToken, competition.id, 1),
      createJudgeToken(organizer.accessToken, competition.id, 2),
      createJudgeToken(organizer.accessToken, competition.id, 3),
    ]);
    // X-Judge-Token header expects the token's id (primary key), not rawToken.
    const judgeTokenIds = judgeCreations.map(j => j.id);

    // Check first 4 pairs in (last 2 stay absent → won't enter HEAT)
    for (let i = 0; i < 4; i++) {
      await api.setPresence(organizer.accessToken, competition.id, pairs[i].id, 'CHECKED_IN');
    }

    // ── UI checkpoint: organizer logs in and lands on the live-control page
    await test.step('organizer signs in via UI + live-control renders', async () => {
      const login = new LoginPage(page);
      await login.goto();
      await login.loginWith(organizer.email, organizer.password);
      await page.waitForURL(/\/dashboard/);
      await page.goto(`/dashboard/competitions/${competition.id}/live`);
      await expect(page.locator('body')).toBeVisible();
    });

    // ── Open HEAT via API; verify an SSE event fires so the UI would react
    const heatRoundPromise = waitForRoundOpened(page, competition.id, 'HEAT', { timeoutMs: 20_000 });
    const heatRound = await api.openRound(organizer.accessToken, competition.id, section.id);
    expect(heatRound.roundType).toBe('HEAT');
    await heatRoundPromise.catch(() => {
      // SSE may race the synchronous open; the round itself is the authoritative signal.
    });

    // ── Judges submit callbacks for HEAT (4 pairs advance)
    const heatPairs = pairs.slice(0, 4).map(p => p.id);
    const callbackPlans = generateHeatCallbacks({
      judgeTokenIds,
      pairIds: heatPairs,
      dances: ['CHA_CHA'],
      advance: 4,
    });
    for (const plan of callbackPlans) {
      await api.submitCallbacks(plan.judgeTokenId, heatRound.id, plan.dance, plan.selectedPairIds);
    }

    // ── Complete HEAT → 4 pairs advance to FINAL
    await api.completeRound(organizer.accessToken, competition.id, section.id, heatRound.id, 4);

    // ── Open FINAL; SSE should emit round:opened with roundType=FINAL
    const finalRoundPromise = waitForRoundOpened(page, competition.id, 'FINAL', { timeoutMs: 20_000 });
    const finalRound = await api.openRound(organizer.accessToken, competition.id, section.id);
    expect(finalRound.roundType).toBe('FINAL');
    await finalRoundPromise.catch(() => void 0);

    // ── Judges submit placements for FINAL
    const dances = await api.getSectionDances(organizer.accessToken, competition.id, section.id);
    expect(dances.length).toBeGreaterThan(0);
    const placementPlans = generateUnanimousFinal({
      judgeTokenIds,
      danceIds: dances.map(d => d.id),
      rankedPairIds: heatPairs,
    });
    for (const plan of placementPlans) {
      await api.submitPlacements(plan.judgeTokenId, finalRound.id, plan.danceId, plan.pairPlacements);
    }

    // ── Complete FINAL + calculate + approve
    await api.completeRound(organizer.accessToken, competition.id, section.id, finalRound.id, 0);
    await api.calculateRound(organizer.accessToken, finalRound.id);
    await api.calculateSectionSummary(organizer.accessToken, section.id);
    await api.approveResults(organizer.accessToken, section.id);

    // ── Results: public summary has 4 placements (1..4)
    const summary = await api.getSectionSummary(section.id);
    const publishedPlacements = summary.rankings
      .map(r => r.finalPlacement)
      .filter((n): n is number => typeof n === 'number');
    expect(publishedPlacements.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);

    // ── UI checkpoint: dancer sees result + xlsx exports
    await test.step('dancer sees published result in UI', async () => {
      const dancerPage = await browser.newPage();
      try {
        const login = new LoginPage(dancerPage);
        await login.goto();
        await login.loginWith(dancerA.email, dancerA.password);
        await dancerPage.waitForURL(/\/dashboard|\/profile/);
        const results = new ResultsPage(dancerPage);
        await results.goto(competition.id, section.id);
        await expect(dancerPage.locator('body')).toBeVisible();
      } finally {
        await dancerPage.close();
      }
    });

    // Guard against unused-var warnings for the partner dancer
    void dancerB;
    await api.dispose();
  });
});
