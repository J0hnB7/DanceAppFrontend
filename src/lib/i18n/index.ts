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
  if (locale === "cs") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./cs.json") as TranslationDict;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./en.json") as TranslationDict;
}

/** Use outside React (hooks, API handlers) — reads localStorage directly */
export function getT() {
  const locale = detectLocale();
  const dict = loadLocale(locale);
  return createT(dict);
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "en" || stored === "cs") return stored;
  const browserLang = navigator.language.split("-")[0];
  if (browserLang === "cs" || browserLang === "sk") return "cs";
  return DEFAULT_LOCALE;
}
