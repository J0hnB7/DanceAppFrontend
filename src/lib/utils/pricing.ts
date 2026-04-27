export type PricingItem = {
  sectionId: string;
  sectionName: string;
  original: number;
  discounted: number;
  discountPct: number;
};

export type PricingBreakdown = {
  items: PricingItem[];
  total: number;
  saved: number;
  currency: string;
};

type SectionInput = {
  id: string;
  name: string;
  entryFee: number | null;
  entryFeeCurrency: string | null;
};

export function calculatePricing(
  sections: SectionInput[],
  discount2ndPct: number | null,
  discount3rdPlusPct: number | null,
): PricingBreakdown | null {
  if (discount2ndPct == null || discount3rdPlusPct == null) return null;
  if (discount2ndPct === 0 && discount3rdPlusPct === 0) return null;

  const eligible = sections.filter(
    (s) => s.entryFee != null && s.entryFee > 0,
  );
  if (eligible.length < 2) return null;

  const currencies = new Set(eligible.map((s) => s.entryFeeCurrency));
  if (currencies.size > 1) return null;
  const currency = eligible[0].entryFeeCurrency ?? "CZK";

  const sorted = [...eligible].sort(
    (a, b) => (b.entryFee ?? 0) - (a.entryFee ?? 0),
  );

  const items: PricingItem[] = sorted.map((s, i) => {
    const original = s.entryFee!;
    let discountPct = 0;
    if (i === 1) discountPct = discount2ndPct;
    else if (i >= 2) discountPct = discount3rdPlusPct;
    const discounted = Math.round(original * (1 - discountPct / 100));
    return {
      sectionId: s.id,
      sectionName: s.name,
      original,
      discounted,
      discountPct,
    };
  });

  const total = items.reduce((sum, i) => sum + i.discounted, 0);
  const saved = items.reduce((sum, i) => sum + i.original - i.discounted, 0);

  return { items, total, saved, currency };
}
