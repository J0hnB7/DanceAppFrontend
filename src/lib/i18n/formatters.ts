import type { Locale } from "./translations";

const INTL_LOCALE: Record<Locale, string> = { cs: "cs-CZ", en: "en-GB" };

/**
 * Format an ISU skating score.
 * GOE:  integer, always signed (+3, -2, 0)
 * PCS:  2 decimal places, unsigned (8.75)
 */
export function formatIsuScore(value: number, type: "GOE" | "PCS", locale: Locale): string {
  const safe = Math.round(value * 100) / 100;
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: type === "PCS" ? 2 : 0,
    maximumFractionDigits: type === "PCS" ? 2 : 0,
    signDisplay: type === "GOE" ? "always" : "never",
  }).format(safe);
}
