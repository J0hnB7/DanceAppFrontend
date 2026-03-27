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

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const setStoreLocale = useAuthStore((s) => s.setLocale);

  // Manual locale selection (fallback when user has no preference stored on backend)
  const [manualLocale, setManualLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    return (localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null) ?? detectLocale();
  });

  // Derived: user's backend preference always wins over manual selection
  const locale = (user?.locale as Locale | undefined) ?? manualLocale;

  // Persist user.locale to localStorage when it changes — pure side-effect, no setState
  useEffect(() => {
    if (!user?.locale) return;
    try { localStorage.setItem(LOCALE_STORAGE_KEY, user.locale); } catch (e) { console.error("[i18n] Failed to persist locale", e); }
  }, [user?.locale]);

  const setLocale = useCallback((next: Locale) => {
    setManualLocale(next);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch (e) { console.error("[i18n] Failed to persist locale", e); }
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
