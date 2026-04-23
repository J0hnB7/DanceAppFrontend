import { defineRouting } from "next-intl/routing";

// Public routes only — dashboard stays on the custom cookie-based LocaleProvider.
// Czech is the default and gets NO prefix; English is at /en/... for hreflang.
export const routing = defineRouting({
  locales: ["cs", "en"] as const,
  defaultLocale: "cs",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
