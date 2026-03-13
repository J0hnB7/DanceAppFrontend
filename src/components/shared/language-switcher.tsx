"use client";

import { useLocale } from "@/contexts/locale-context";
import type { Locale } from "@/lib/i18n";

const LABELS: Record<Locale, string> = {
  en: "EN",
  cs: "CZ",
};

const FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  cs: "🇨🇿",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  const toggle = () => setLocale(locale === "en" ? "cs" : "en");

  return (
    <button
      onClick={toggle}
      title={locale === "en" ? "Switch to Czech" : "Přepnout do angličtiny"}
      className="flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-white/70 px-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] active:scale-95"
    >
      <span className="text-sm leading-none">{FLAGS[locale === "en" ? "cs" : "en"]}</span>
      <span>{LABELS[locale === "en" ? "cs" : "en"]}</span>
    </button>
  );
}
