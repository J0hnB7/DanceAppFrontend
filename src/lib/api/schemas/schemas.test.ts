import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InvoiceSchema } from "./invoice";
import { PairSchema } from "./pair";
import { SectionFinalSummarySchema } from "./results";
import { parseApiList, parseApiResponse } from "./parse";

describe("InvoiceSchema", () => {
  it("accepts BE payload with totalAmount (no `amount`)", () => {
    const wire = {
      id: "inv-1",
      competitionId: "c-1",
      totalAmount: 500,
      currency: "CZK",
      status: "SENT",
    };
    expect(InvoiceSchema.parse(wire).totalAmount).toBe(500);
  });

  it("allows unknown BE fields (passthrough, forward-compat)", () => {
    const wire = {
      id: "inv-1",
      competitionId: "c-1",
      currency: "CZK",
      status: "PAID",
      futureBackendField: "new",
    };
    expect(() => InvoiceSchema.parse(wire)).not.toThrow();
  });

  it("rejects wrong type on required field", () => {
    const wire = { id: 42, competitionId: "c-1", currency: "CZK", status: "PAID" };
    expect(InvoiceSchema.safeParse(wire).success).toBe(false);
  });
});

describe("PairSchema", () => {
  it("accepts minimal payload (id + startNumber)", () => {
    expect(PairSchema.parse({ id: "p-1", startNumber: 42 }).id).toBe("p-1");
  });

  it("passes unknown fields through", () => {
    const wire = { id: "p-1", startNumber: 42, newField: "ok" };
    expect(PairSchema.safeParse(wire).success).toBe(true);
  });
});

describe("SectionFinalSummarySchema", () => {
  it("accepts valid result rankings", () => {
    const wire = {
      sectionId: "s-1",
      rankings: [
        {
          pairId: "p-1",
          startNumber: 1,
          totalSum: 10,
          finalPlacement: 1,
          tieResolution: "NONE",
          perDance: { SW: 1, TG: 1 },
        },
      ],
    };
    expect(SectionFinalSummarySchema.parse(wire).rankings).toHaveLength(1);
  });
});

describe("parseApiResponse drift logging", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("logs drift and returns raw data on parse failure (no crash)", () => {
    const broken = { id: 42, competitionId: "c-1", currency: "CZK", status: "PAID" };
    const result = parseApiResponse(InvoiceSchema, broken, "test.ctx");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[api-drift] test.ctx"),
      expect.objectContaining({ issues: expect.any(Array) }),
    );
    // Fallback: raw data returned so UI doesn't go blank
    expect(result).toBe(broken);
  });

  it("returns empty array when list endpoint returns non-array", () => {
    const result = parseApiList(InvoiceSchema, { error: "oops" } as unknown, "test.listCtx");
    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("test.listCtx: expected array"),
    );
  });
});
