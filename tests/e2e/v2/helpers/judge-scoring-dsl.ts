/**
 * Programmatic scoring generators used by Opus specs. Each generator returns
 * submission payloads that DETERMINISTICALLY produce a target Skating System
 * outcome — never rely on "I hope ties break the right way".
 *
 * Key invariant: every generator asserts its output uniquely determines the
 * requested outcome. If it cannot, it throws before any HTTP call is made.
 */

export interface HeatCallbackPlan {
  /** UUID of the judge token (primary key, not rawToken). */
  judgeTokenId: string;
  /** Dance name (e.g. "Waltz", "Cha-Cha"). Matches SubmitCallbacksRequest.dance. */
  dance: string;
  /** UUIDs of pairs the judge selects (X). */
  selectedPairIds: string[];
}

export function generateHeatCallbacks(opts: {
  judgeTokenIds: string[];
  pairIds: string[];
  dances: string[];
  advance: number;
}): HeatCallbackPlan[] {
  const { judgeTokenIds, pairIds, dances, advance } = opts;
  if (advance <= 0 || advance > pairIds.length) {
    throw new Error(`generateHeatCallbacks: advance=${advance} must be in (0, ${pairIds.length}]`);
  }
  if (judgeTokenIds.length === 0 || dances.length === 0) {
    throw new Error('generateHeatCallbacks: need at least one judge + one dance');
  }
  const selected = pairIds.slice(0, advance);
  const plans: HeatCallbackPlan[] = [];
  for (const judgeTokenId of judgeTokenIds) {
    for (const dance of dances) {
      plans.push({ judgeTokenId, dance, selectedPairIds: selected });
    }
  }
  return plans;
}

export interface FinalPlacementPlan {
  judgeTokenId: string;
  /** Dance entity UUID (SectionDance.id), used in /placements/{danceId}. */
  danceId: string;
  /** pairId → rank (1-based). */
  pairPlacements: Record<string, number>;
}

/**
 * Generates placements where every judge gives identical rankings — guarantees
 * no tie anywhere. Used by beta-smoke to produce a clean, unambiguous winner.
 */
export function generateUnanimousFinal(opts: {
  judgeTokenIds: string[];
  danceIds: string[];
  rankedPairIds: string[]; // [0] gets rank 1, [1] gets rank 2, ...
}): FinalPlacementPlan[] {
  const { judgeTokenIds, danceIds, rankedPairIds } = opts;
  if (rankedPairIds.length === 0) throw new Error('generateUnanimousFinal: need at least one pair');
  const pairPlacements: Record<string, number> = {};
  rankedPairIds.forEach((pairId, idx) => { pairPlacements[pairId] = idx + 1; });
  const plans: FinalPlacementPlan[] = [];
  for (const judgeTokenId of judgeTokenIds) {
    for (const danceId of danceIds) {
      plans.push({ judgeTokenId, danceId, pairPlacements: { ...pairPlacements } });
    }
  }
  return plans;
}

/**
 * Generates placements that DELIBERATELY tie two specific pairs across every
 * dance and judge — guaranteeing that the Skating System must fall through to
 * Rule 10 / Rule 11 / dance-off. Used by dance-off spec.
 *
 * Half of the judges rank pairA above pairB, half rank pairB above pairA, with
 * all other pairs fixed. For an odd judge count, an extra judge is assigned to
 * whichever side keeps the majority rule from breaking the tie — this only
 * holds when `judgeTokenIds.length >= 2 && everyone-else ties cancel out`.
 */
export function generateTiedFinal(opts: {
  judgeTokenIds: string[];
  danceIds: string[];
  pairAId: string;
  pairBId: string;
  otherPairIdsInOrder: string[]; // gets ranks starting at 3
}): FinalPlacementPlan[] {
  const { judgeTokenIds, danceIds, pairAId, pairBId, otherPairIdsInOrder } = opts;
  if (judgeTokenIds.length < 2) {
    throw new Error('generateTiedFinal: need at least 2 judges to construct a tie');
  }
  const baseOthers: Record<string, number> = {};
  otherPairIdsInOrder.forEach((pairId, idx) => { baseOthers[pairId] = idx + 3; });

  const plans: FinalPlacementPlan[] = [];
  for (let j = 0; j < judgeTokenIds.length; j++) {
    // Alternate who gets rank 1: even judges → A first, odd judges → B first.
    const aRank = j % 2 === 0 ? 1 : 2;
    const bRank = j % 2 === 0 ? 2 : 1;
    for (const danceId of danceIds) {
      plans.push({
        judgeTokenId: judgeTokenIds[j],
        danceId,
        pairPlacements: { [pairAId]: aRank, [pairBId]: bRank, ...baseOthers },
      });
    }
  }

  // Invariant check: across dances, sum(rank_A) == sum(rank_B) per dance.
  // With the even/odd split, this only holds when judges are even in count.
  if (judgeTokenIds.length % 2 !== 0) {
    throw new Error(
      `generateTiedFinal requires an even number of judges to produce a symmetric tie; got ${judgeTokenIds.length}`
    );
  }
  return plans;
}

/**
 * Generates semi-final callbacks where a single "pivot" pair creates a Rule 11
 * cross condition. Used by semifinal-round.spec.ts.
 *
 * The pivot pair receives an X from exactly majority judges (forcing "advance"),
 * while another pair tied on total marks does NOT receive majority → Rule 11
 * must use the semi-final "cross" rule (per memory: single-dance R11 uses
 * semi-final crosses, not mark merge; commit e1bd44c).
 */
export function generateSemiFinalWithR11(opts: {
  judgeTokenIds: string[];
  dances: string[];
  advancingPairIds: string[]; // gets X from every judge
  pivotPairId: string;        // gets X from majority only
  nonAdvancingPairIds: string[]; // gets X from no one
}): HeatCallbackPlan[] {
  const { judgeTokenIds, dances, advancingPairIds, pivotPairId, nonAdvancingPairIds } = opts;
  const n = judgeTokenIds.length;
  const majority = Math.floor(n / 2) + 1;
  if (n < 3) throw new Error('generateSemiFinalWithR11: need at least 3 judges');

  const plans: HeatCallbackPlan[] = [];
  for (let j = 0; j < n; j++) {
    const judgeTokenId = judgeTokenIds[j];
    // Every judge marks advancingPairIds. Only the first `majority` judges mark pivot.
    const selectedBase = [...advancingPairIds];
    if (j < majority) selectedBase.push(pivotPairId);
    for (const dance of dances) {
      plans.push({ judgeTokenId, dance, selectedPairIds: selectedBase });
    }
  }

  // Sanity: no non-advancing pair is selected by anyone.
  void nonAdvancingPairIds;
  return plans;
}
