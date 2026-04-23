import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LocaleProvider } from "@/contexts/locale-context";
import type { Locale } from "@/lib/i18n";

// Pre-render each locale for static optimization eligibility.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this segment tree.
  setRequestLocale(locale);

  // Nested LocaleProvider overrides the root cookie-based one for /[locale]/**,
  // so pages using the custom useLocale() hook read the URL-bound locale
  // instead of the cookie. next-intl's useTranslations() is available too.
  return (
    <NextIntlClientProvider>
      <LocaleProvider initialLocale={locale as Locale}>{children}</LocaleProvider>
    </NextIntlClientProvider>
  );
}
