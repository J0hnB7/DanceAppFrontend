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
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // On mount: prefer user.locale from backend, then localStorage, then browser
  useEffect(() => {
    if (user?.locale) {
      setLocaleState(user.locale);
      try { localStorage.setItem(LOCALE_STORAGE_KEY, user.locale); } catch (e) { console.error("[i18n] Failed to persist locale", e); }
    } else {
      setLocaleState(detectLocale());
    }
  }, [user?.locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
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
