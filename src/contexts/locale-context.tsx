"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
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
  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
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
  }, [setStoreLocale, user]);

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
