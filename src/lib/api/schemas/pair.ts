import { z } from "zod";

export const PairSectionAssignmentSchema = z
  .object({
    sectionId: z.string(),
    sectionName: z.string().optional(),
    paymentStatus: z.enum(["PENDING", "PAID", "WAIVED"]),
  })
  .passthrough();

// Intentionally lenient: BE sends different subsets in list vs detail vs
// self-registration. Only the shape-critical fields are required; everything
// else is optional so a new BE field doesn't break the parse.
export const PairSchema = z
  .object({
    id: z.string(),
    startNumber: z.number(),
    competitionId: z.string().optional(),
    dancer1Name: z.string().optional(),
    dancer2Name: z.string().optional(),
    club: z.string().optional(),
    email: z.string().optional(),
    status: z.enum(["REGISTERED", "CONFIRMED", "WITHDRAWN", "DISQUALIFIED"]).optional(),
    sections: z.array(PairSectionAssignmentSchema).optional(),
    dancer1FirstName: z.string().optional(),
    dancer1LastName: z.string().optional(),
    dancer1Club: z.string().optional(),
    dancer2FirstName: z.string().optional(),
    dancer2LastName: z.string().optional(),
    dancer2Club: z.string().optional(),
    registeredAt: z.string().optional(),
    paymentStatus: z.enum(["PENDING", "PAID", "WAIVED"]).optional(),
    registrationStatus: z.enum(["UNCONFIRMED", "CONFIRMED", "CANCELLED"]).optional(),
    adminNote: z.string().optional(),
    sectionId: z.string().optional(),
    athlete1Id: z.number().nullable().optional(),
    athlete2Id: z.number().nullable().optional(),
    externalId: z.string().optional(),
    externalSectionId: z.string().optional(),
    country: z.string().nullable().optional(),
    presenceDeadline: z.string().nullable().optional(),
    feePerPerson: z.number().optional(),
    feeTotal: z.number().optional(),
    starts: z.boolean().optional(),
    withdrawalDate: z.string().nullable().optional(),
    startType: z.string().optional(),
    startsFromRound: z.number().optional(),
    classValue: z.string().optional(),
    finaleCount: z.number().nullable().optional(),
    points: z.number().nullable().optional(),
    ranklistPosition: z.number().nullable().optional(),
  })
  .passthrough();
