import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

// Reuse the existing app dictionary so we don't maintain two sets of translations.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages =
    locale === "cs"
      ? (await import("@/lib/i18n/cs.json")).default
      : (await import("@/lib/i18n/en.json")).default;
  return { locale, messages };
});
