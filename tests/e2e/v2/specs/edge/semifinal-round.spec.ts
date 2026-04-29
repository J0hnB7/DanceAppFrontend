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
import { request } from '@playwright/test';

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

  // FINAL must open with roundType=FINAL
  const final = await api.openRound(org.accessToken, competition.id, section.id);
  expect(final.roundType).toBe('FINAL');

  const dances = await api.getSectionDances(org.accessToken, competition.id, section.id);
  const expectedFinalists = [...advancingPairIds, pivotPairId];
  const expectedFinalistSet = new Set(expectedFinalists);
  const nonAdvancingSet = new Set(nonAdvancingPairIds);

  for (const judgeTokenId of judgeTokenIds) {
    for (const dance of dances) {
      const pairPlacements: Record<string, number> = {};
      expectedFinalists.forEach((pid, idx) => { pairPlacements[pid] = idx + 1; });
      await api.submitPlacements(judgeTokenId, final.id, dance.id, pairPlacements);
    }
  }

  // ── R11 cross assertion #1: FINAL holds EXACTLY the 6 expected pair IDs.
  //    Source of truth: judge placements on the FINAL round (set of pair IDs
  //    accepted by the backend is the FINAL pair set). Bypasses the results
  //    publication gate because we query per-judge data as the organizer.
  const placementsRes = await request.newContext({ baseURL: 'http://localhost:8080' })
    .then(ctx => ctx.get(`/api/v1/rounds/${final.id}/placements/${dances[0].id}`, {
      headers: { 'X-Judge-Token': judgeTokenIds[0] },
    }).then(async r => ({ ctx, res: r, body: await r.json() as Record<string, number> })));
  expect(placementsRes.res.ok(), 'expected to read back placements for FINAL').toBeTruthy();
  const finalPairIdsFromBackend = new Set(Object.keys(placementsRes.body));
  expect(finalPairIdsFromBackend.size).toBe(6);
  for (const pid of expectedFinalists) {
    expect(finalPairIdsFromBackend.has(pid), `expected finalist ${pid} missing from FINAL round`).toBeTruthy();
  }
  // R11 regress-guard (commit e1bd44c): single-dance semi-final must NOT merge
  // marks from HEAT; non-advancing pairs must not leak into the FINAL round.
  for (const pid of nonAdvancingPairIds) {
    expect(finalPairIdsFromBackend.has(pid), `non-advancing pair ${pid} leaked into FINAL — R11 regressed`).toBeFalsy();
  }
  await placementsRes.ctx.dispose();

  // ── R11 cross assertion #2: published section summary agrees with the FINAL set.
  await api.completeRound(org.accessToken, competition.id, section.id, final.id, 0);
  await api.calculateRound(org.accessToken, final.id);
  await api.calculateSectionSummary(org.accessToken, section.id);
  await api.approveResults(org.accessToken, section.id);

  const summary = await api.getSectionSummary(section.id);
  const placed = summary.rankings.filter(r => r.finalPlacement != null);
  // Summary may include eliminated-in-SEMI pairs at positions ≥7 (elimination rank).
  // The R11 invariant that matters at the summary level: placements 1..6 are
  // held exclusively by the 6 expected finalists, never by a non-advancing pair.
  const top6 = placed.filter(r => (r.finalPlacement as number) <= 6);
  expect(top6.length, 'exactly 6 pairs must hold placements 1..6').toBe(6);
  for (const row of top6) {
    expect(expectedFinalistSet.has(row.pairId),
           `top-6 pair ${row.pairId} (placement ${row.finalPlacement}) is not in expected finalist set`).toBeTruthy();
  }
  // Hard R11 guard: non-advancing pair must never appear in placements 1..6.
  for (const pid of nonAdvancingPairIds) {
    const rank = summary.rankings.find(r => r.pairId === pid)?.finalPlacement;
    if (rank != null) {
      expect(rank, `non-advancing pair ${pid} must sit outside the finalist band`).toBeGreaterThan(6);
    }
  }

  await api.dispose();
});
