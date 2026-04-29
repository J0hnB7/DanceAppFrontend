import { describe, it, expect } from "vitest";
import { calculatePricing } from "./pricing";

const s = (id: string, fee: number | null, currency: string | null = "CZK") =>
  ({ id, name: id, entryFee: fee, entryFeeCurrency: currency }) as const;

describe("calculatePricing", () => {
  it("returns null when discount not configured", () => {
    expect(calculatePricing([s("a", 400)], null, null)).toBeNull();
  });

  it("returns null for 0% discounts", () => {
    expect(calculatePricing([s("a", 400), s("b", 300)], 0, 0)).toBeNull();
  });

  it("returns null for single section", () => {
    expect(calculatePricing([s("a", 400)], 50, 70)).toBeNull();
  });

  it("returns null for mixed currencies", () => {
    const sections = [s("a", 400, "CZK"), s("b", 300, "EUR")];
    expect(calculatePricing(sections, 50, 70)).toBeNull();
  });

  it("sorts descending and applies 2nd discount", () => {
    const result = calculatePricing([s("b", 300), s("a", 400)], 50, 70)!;
    expect(result.items[0]).toMatchObject({ original: 400, discounted: 400 });
    expect(result.items[1]).toMatchObject({ original: 300, discounted: 150 });
    expect(result.total).toBe(550);
    expect(result.saved).toBe(150);
  });

  it("applies 3rd+ discount", () => {
    const result = calculatePricing(
      [s("b", 350), s("a", 400), s("c", 300)],
      50,
      70,
    )!;
    expect(result.total).toBe(665);
    expect(result.saved).toBe(385);
  });

  it("skips sections with null entryFee", () => {
    const sections = [
      s("a", 400),
      s("b", null),
      s("c", 300),
    ];
    const result = calculatePricing(sections, 50, 70)!;
    expect(result.items).toHaveLength(2);
  });
});
