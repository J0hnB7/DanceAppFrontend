import csDict from "./cs.json";
import enDict from "./en.json";

export type Locale = "en" | "cs";

export const LOCALES: Locale[] = ["en", "cs"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "danceapp_locale";

// Flat dot-notation key type for type safety (simplified)
export type TranslationKey = string;

type TranslationValue = string | Record<string, unknown>;
type TranslationDict = Record<string, TranslationValue>;

function getNestedValue(obj: TranslationDict, path: string): string | undefined {
  const parts = path.split(".");
  let current: TranslationValue = obj;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as TranslationDict)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{{${key}}}`
  );
}

export function createT(dict: TranslationDict) {
  return function t(key: string, params?: Record<string, string | number>): string {
    const value = getNestedValue(dict, key);
    if (value === undefined) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[i18n] Missing key: "${key}"`);
      }
      return key;
    }
    return interpolate(value, params);
  };
}

export function loadLocale(locale: Locale): TranslationDict {
  return (locale === "cs" ? csDict : enDict) as TranslationDict;
}

// Module-level cache so getT() doesn't rebuild the translator on every call.
const tCache = new Map<Locale, ReturnType<typeof createT>>();

/** Use outside React (hooks, API handlers) — reads localStorage directly */
export function getT() {
  const locale = detectLocale();
  if (!tCache.has(locale)) {
    tCache.set(locale, createT(loadLocale(locale)));
  }
  return tCache.get(locale)!;
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "cs") return stored;
  } catch { /* Safari private mode may deny localStorage access */ }
  const browserLang = navigator.language.split("-")[0];
  if (browserLang === "cs" || browserLang === "sk") return "cs";
  return DEFAULT_LOCALE;
}
