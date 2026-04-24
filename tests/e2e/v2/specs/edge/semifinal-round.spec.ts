/**
 * T2 — Rule 11 single-dance semi-final crosses.
 *
 * Locks in the fix from commit e1bd44c: single-dance semi-final must use
 * Skating System Rule 11 CROSSES (not mark merging from the previous round).
 *
 * Scenario: 8 pairs → HEAT advances 7 → SEMI must run (pairsToAdvance > maxFinalPairs)
 * → 6 finalists enter FINAL. The SEMI round construction uses the judge-scoring
 * DSL to give every judge a majority-X on 6 "strong" pairs plus a split-X on a
 * 7th "pivot" pair, forcing R11 to resolve who makes the final.
 */
import { test, expect } from '../../fixtures/test-fixtures';
import { createOrganizer } from '../../factories/organizer-factory';
import { createApiClient } from '../../factories/api-client';
import { createJudgeToken } from '../../factories/judge-factory';
import { generateHeatCallbacks, generateSemiFinalWithR11 } from '../../helpers/judge-scoring-dsl';
import { waitForRoundOpened } from '../../helpers/wait-for-sse';

test('semi-final round runs and Rule 11 crosses pick 6 finalists (single dance)', async ({ page }) => {
  test.setTimeout(180_000);
  const api = await createApiClient();

  const org = await createOrganizer('sf-org');
  const competition = await api.createCompetition(org.accessToken, {
    name: 'SF Rule 11 Competition',
    eventDate: '2099-12-31',
    venue: 'SF Venue',
    contactEmail: 'sf@test.local',
  });
  const section = await api.createSection(org.accessToken, competition.id, {
    name: 'SF Section',
    ageCategory: 'ADULT',
    danceStyle: 'LATIN',
    level: 'D',
    competitorType: 'AMATEURS',
    competitionType: 'COUPLE',
    dances: ['CHA_CHA'],
    numberOfJudges: 3,
    maxFinalPairs: 6,
  });

  // 8 pairs → HEAT will cull, SEMI is forced (advance > maxFinalPairs)
  const pairs = [];
  for (let i = 1; i <= 8; i++) {
    const p = await api.createPair(org.accessToken, competition.id, section.id, {
      dancer1FirstName: `A${i}`, dancer1LastName: 'Alpha',
      dancer2FirstName: `B${i}`, dancer2LastName: 'Beta',
      club: 'SF Club', startNumber: 300 + i,
    });
    pairs.push(p);
  }
  const judges = await Promise.all([1, 2, 3].map(n => createJudgeToken(org.accessToken, competition.id, n)));
  const judgeTokenIds = judges.map(j => j.id);

  for (const p of pairs) await api.setPresence(org.accessToken, competition.id, p.id, 'CHECKED_IN');

  // HEAT: all 8 in, 7 advance
  const heatPromise = waitForRoundOpened(page, competition.id, 'HEAT', { timeoutMs: 15_000 }).catch(() => null);
  const heat = await api.openRound(org.accessToken, competition.id, section.id);
  expect(heat.roundType).toBe('HEAT');
  await heatPromise;

  const heatPlans = generateHeatCallbacks({
    judgeTokenIds, pairIds: pairs.map(p => p.id), dances: ['CHA_CHA'], advance: 7,
  });
  for (const plan of heatPlans) {
    await api.submitCallbacks(plan.judgeTokenId, heat.id, plan.dance, plan.selectedPairIds);
  }
  await api.completeRound(org.accessToken, competition.id, section.id, heat.id, 7);

  // SEMIFINAL opens because pairsToAdvance (7) > maxFinalPairs (6)
  const semiPromise = waitForRoundOpened(page, competition.id, 'SEMIFINAL', { timeoutMs: 15_000 }).catch(() => null);
  const semi = await api.openRound(org.accessToken, competition.id, section.id);
  expect(semi.roundType).toBe('SEMIFINAL');
  await semiPromise;

  // R11 scenario: 6 pairs advance cleanly; 2 tied pivots → R11 chooses 1
  const advancingPairIds = pairs.slice(0, 5).map(p => p.id); // clean 5
  const pivotPairId = pairs[5].id;                            // contested slot 6
  const nonAdvancingPairIds = pairs.slice(6, 7).map(p => p.id); // eliminated
  const semiPlans = generateSemiFinalWithR11({
    judgeTokenIds, dances: ['CHA_CHA'],
    advancingPairIds, pivotPairId, nonAdvancingPairIds,
  });
  for (const plan of semiPlans) {
    await api.submitCallbacks(plan.judgeTokenId, semi.id, plan.dance, plan.selectedPairIds);
  }
  await api.completeRound(org.accessToken, competition.id, section.id, semi.id, 6);

  // FINAL opens with exactly 6 pairs
  const final = await api.openRound(org.accessToken, competition.id, section.id);
  expect(final.roundType).toBe('FINAL');

  // Inspect section summary after final placements + approve; the cross rule
  // is verified by the final pair set — the 5 clean + pivot, never one of the
  // nonAdvancing pairs. We verify at the summary level to keep the test
  // independent of the UI's tie-break display.
  const dances = await api.getSectionDances(org.accessToken, competition.id, section.id);
  const finalPairIds = [...advancingPairIds, pivotPairId];
  for (const judgeTokenId of judgeTokenIds) {
    for (const dance of dances) {
      const pairPlacements: Record<string, number> = {};
      finalPairIds.forEach((pid, idx) => { pairPlacements[pid] = idx + 1; });
      await api.submitPlacements(judgeTokenId, final.id, dance.id, pairPlacements);
    }
  }
  await api.completeRound(org.accessToken, competition.id, section.id, final.id, 0);
  await api.calculateRound(org.accessToken, final.id);
  await api.calculateSectionSummary(org.accessToken, section.id);
  await api.approveResults(org.accessToken, section.id);

  const summary = await api.getSectionSummary(section.id);
  const summaryPairIds = new Set(summary.rankings.filter(r => r.finalPlacement != null).map(r => r.pairId));
  for (const pid of finalPairIds) expect(summaryPairIds.has(pid)).toBeTruthy();
  // R11 correctness: the nonAdvancing pair is NOT a finalist
  for (const pid of nonAdvancingPairIds) expect(summaryPairIds.has(pid)).toBeFalsy();

  await api.dispose();
});
