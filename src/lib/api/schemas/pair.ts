import { z } from "zod";

export const PairSectionAssignmentSchema = z
  .object({
    sectionId: z.string(),
    sectionName: z.string().nullish(),
    paymentStatus: z.enum(["PENDING", "PAID", "WAIVED"]),
  })
  .passthrough();

// Intentionally lenient: BE sends different subsets in list vs detail vs
// self-registration. Only the shape-critical fields are required; everything
// else is optional so a new BE field doesn't break the parse.
// Use .nullish() (= nullable + optional) for all Java nullable fields —
// JacksonConfig has no NON_NULL policy so null Java fields serialize as JSON null,
// and z.string().optional() rejects null (only accepts string | undefined).
export const PairSchema = z
  .object({
    id: z.string(),
    startNumber: z.number(),
    competitionId: z.string().nullish(),
    dancer1Name: z.string().nullish(),
    dancer2Name: z.string().nullish(),
    club: z.string().nullish(),
    email: z.string().nullish(),
    status: z.enum(["REGISTERED", "CONFIRMED", "WITHDRAWN", "DISQUALIFIED"]).nullish(),
    sections: z.array(PairSectionAssignmentSchema).optional(),
    dancer1FirstName: z.string().nullish(),
    dancer1LastName: z.string().nullish(),
    dancer1Club: z.string().nullish(),
    dancer2FirstName: z.string().nullish(),
    dancer2LastName: z.string().nullish(),
    dancer2Club: z.string().nullish(),
    registeredAt: z.string().nullish(),
    paymentStatus: z.enum(["PENDING", "PAID", "WAIVED"]).nullish(),
    registrationStatus: z.enum(["UNCONFIRMED", "CONFIRMED", "CANCELLED"]).nullish(),
    adminNote: z.string().nullish(),
    sectionId: z.string().nullish(),
    athlete1Id: z.number().nullable().optional(),
    athlete2Id: z.number().nullable().optional(),
    externalId: z.string().nullish(),
    externalSectionId: z.string().nullish(),
    country: z.string().nullish(),
    presenceDeadline: z.string().nullish(),
    feePerPerson: z.number().nullish(),
    feeTotal: z.number().nullish(),
    starts: z.boolean().optional(),
    withdrawalDate: z.string().nullish(),
    startType: z.string().nullish(),
    startsFromRound: z.number().nullish(),
    classValue: z.string().nullish(),
    finaleCount: z.number().nullish(),
    points: z.number().nullish(),
    ranklistPosition: z.number().nullish(),
  })
  .passthrough();
