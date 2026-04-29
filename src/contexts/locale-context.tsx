"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  type Locale,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  loadLocale,
  detectLocale,
  createT,
} from "@/lib/i18n";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";

// Prefixes that live under the [locale] segment — switching locale on these
// pages must update the URL, not just the state.
const LOCALIZED_PATH_PREFIXES = ["/competitions", "/scoreboard", "/privacy"];

export function rewriteLocaleInPath(pathname: string, next: Locale): string | null {
  const stripped = pathname.replace(/^\/(en|cs)(?=\/|$)/, "") || "/";
  const isLocalized =
    stripped === "/" ||
    LOCALIZED_PATH_PREFIXES.some((p) => stripped === p || stripped.startsWith(p + "/"));
  if (!isLocalized) return null;
  // Czech is the default and gets no prefix; English is at /en/...
  return next === "cs" ? stripped : `/en${stripped === "/" ? "" : stripped}`;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// Cookie mirror of LOCALE_STORAGE_KEY so the server can read the user's locale
// before the first render (no FOUC of DEFAULT_LOCALE → chosen locale).
function writeLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  // 1 year, all paths, lax so it survives top-level nav from email links.
  // Secure flag in production so the cookie cannot be sniffed over HTTP
  // redirects or downgrade attacks (MED-15). Localhost dev served over
  // HTTP would reject Secure cookies, so omit it there.
  const isSecureContext = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureAttr = isSecureContext ? "; secure" : "";
  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${secureAttr}`;
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const user = useAuthStore((s) => s.user);
  const setStoreLocale = useAuthStore((s) => s.setLocale);
  const router = useRouter();
  const pathname = usePathname();

  // Manual locale selection (fallback when user has no preference stored on backend).
  // Server passes `initialLocale` from the cookie so SSR matches client — without
  // this, server renders DEFAULT_LOCALE and client flashes the real locale on mount.
  const [manualLocale, setManualLocale] = useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    return (localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null) ?? detectLocale();
  });

  // Derived: user's backend preference always wins over manual selection
  const locale = (user?.locale as Locale | undefined) ?? manualLocale;

  // When a nested provider under /[locale]/** gets `initialLocale` from the URL,
  // sync it to the cookie/localStorage/store so navigating to non-localized
  // routes (dashboard) carries the user's URL-expressed choice.
  useEffect(() => {
    if (!initialLocale) return;
    try { localStorage.setItem(LOCALE_STORAGE_KEY, initialLocale); } catch { /* Safari private mode */ }
    writeLocaleCookie(initialLocale);
    setStoreLocale(initialLocale);
  }, [initialLocale, setStoreLocale]);

  // Persist user.locale to localStorage AND cookie when it changes — pure side-effect, no setState
  useEffect(() => {
    if (!user?.locale) return;
    try { localStorage.setItem(LOCALE_STORAGE_KEY, user.locale); } catch (e) { console.error("[i18n] Failed to persist locale", e); }
    writeLocaleCookie(user.locale as Locale);
  }, [user?.locale]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setManualLocale(next);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch (e) { console.error("[i18n] Failed to persist locale", e); }
    writeLocaleCookie(next);
    // Sync to auth-store so locale is available via useAuthStore
    setStoreLocale(next);
    // Persist to backend only if logged in
    if (user) {
      authApi.updateProfile({ locale: next }).catch((e) => { console.error("[i18n] Failed to sync locale to backend", e); });
    }
    // On localized public routes the URL must reflect the locale choice
    // (/competitions/X ↔ /en/competitions/X). Non-localized routes (dashboard,
    // judge, auth) carry locale via cookie only — URL is untouched.
    const nextUrl = pathname ? rewriteLocaleInPath(pathname, next) : null;
    if (nextUrl && nextUrl !== pathname) router.push(nextUrl);
  }, [setStoreLocale, user, pathname, router]);

  const t = useMemo(() => {
    const dict = loadLocale(locale);
    return createT(dict);
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
