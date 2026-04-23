import { z } from "zod";

export const PairFinalResultRowSchema = z
  .object({
    pairId: z.string(),
    startNumber: z.number(),
    totalSum: z.number(),
    finalPlacement: z.number(),
    tieResolution: z.string(),
    perDance: z.record(z.string(), z.number()),
    dancerName: z.string().optional(),
    club: z.string().optional(),
    reachedRound: z.string().optional(),
  })
  .passthrough();

export const SectionFinalSummarySchema = z
  .object({
    sectionId: z.string(),
    rankings: z.array(PairFinalResultRowSchema),
  })
  .passthrough();

export const PairPlacementResponseSchema = z
  .object({
    pairId: z.string(),
    startNumber: z.number(),
    dancer1Name: z.string(),
    placement: z.number(),
    ruleApplied: z.string(),
    detail: z.string(),
  })
  .passthrough();

export const DanceResultResponseSchema = z
  .object({
    danceId: z.string(),
    danceName: z.string(),
    rankings: z.array(PairPlacementResponseSchema),
  })
  .passthrough();

export const RoundResultsResponseSchema = z
  .object({
    roundId: z.string(),
    roundType: z.string(),
    dances: z.array(DanceResultResponseSchema),
  })
  .passthrough();
