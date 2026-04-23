import { z } from "zod";

// Lenient at boundary: unknown backend fields pass through (extra fields don't
// fail the parse). Missing REQUIRED fields or type-mismatched fields will.
// Drift -> safeParse().error -> Sentry, not silent data loss.

export const InvoiceSchema = z
  .object({
    id: z.string(),
    competitionId: z.string(),
    /** BE returns `totalAmount`; older contract also used `amount`. Accept either. */
    amount: z.number().optional(),
    totalAmount: z.number().optional(),
    currency: z.string(),
    status: z.enum(["DRAFT", "SENT", "PAID", "CANCELLED", "REFUNDED"]),
    invoiceNumber: z.string().optional(),
    paidAt: z.string().optional(),
    startNumber: z.number().optional(),
    dancer1Name: z.string().optional(),
  })
  .passthrough();

export const PaymentRecordSchema = z
  .object({
    id: z.string(),
    pairId: z.string(),
    dancer1Name: z.string(),
    dancer2Name: z.string().optional(),
    startNumber: z.number().optional(),
    sectionName: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.enum(["PENDING", "PAID", "REFUNDED", "WAIVED"]),
    paidAt: z.string().optional(),
    dueDate: z.string().optional(),
    invoiceNumber: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export const PaymentSummarySchema = z
  .object({
    totalExpected: z.number(),
    totalCollected: z.number(),
    totalPending: z.number(),
    currency: z.string(),
    paidCount: z.number(),
    pendingCount: z.number(),
  })
  .passthrough();

export type InvoiceDto = z.infer<typeof InvoiceSchema>;
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;
export type PaymentSummary = z.infer<typeof PaymentSummarySchema>;
