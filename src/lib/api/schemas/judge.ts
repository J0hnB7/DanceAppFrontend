import { z } from "zod";

export const PairSchema = z.object({
  id: z.string().uuid(),
  startNumber: z.number(),
  dancer1FirstName: z.string().optional().nullable(),
  dancer1LastName: z.string().optional().nullable(),
  dancer2FirstName: z.string().optional().nullable(),
  dancer2LastName: z.string().optional().nullable(),
});

export const HeatGroupSchema = z.object({
  heatNumber: z.number(),
  pairIds: z.array(z.string().uuid()),
});

export const SectionDanceSchema = z.object({
  id: z.string().uuid(),
  danceName: z.string(),      // backend vrací danceName, ne name
  danceOrder: z.number().optional().nullable(),
  code: z.string().optional().nullable(),
});

export const RoundInfoSchema = z.object({
  id: z.string().uuid(),
  roundNumber: z.number(),
  roundType: z.string(),
  status: z.string().optional(),
  pairsToAdvance: z.number().nullable(),   // může být null — cross counter se nezobrazí
  startedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  judgeCount: z.number().optional(),
});

export const ActiveRoundResponseSchema = z.object({
  round: RoundInfoSchema,
  dances: z.array(SectionDanceSchema),
  pairs: z.array(PairSchema),
  heats: z.array(HeatGroupSchema),
});

export const JudgeSessionResponseSchema = z.object({
  id: z.string().uuid(),
  judgeNumber: z.number(),
  competitionId: z.string().uuid(),
  competitionName: z.string(),
  role: z.string(),
});

export type ActiveRoundResponse = z.infer<typeof ActiveRoundResponseSchema>;
export type JudgeSessionResponse = z.infer<typeof JudgeSessionResponseSchema>;
export type PairDto = z.infer<typeof PairSchema>;
export type HeatGroup = z.infer<typeof HeatGroupSchema>;
