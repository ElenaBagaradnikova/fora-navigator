"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isAppLocale, type AppLocale } from "@/lib/i18n";

const LOCALE_KEY = "fora-navigator:locale:v1";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function preferredLocale(): AppLocale {
  const queryLocale = new URLSearchParams(window.location.search).get("lang");
  if (isAppLocale(queryLocale)) return queryLocale;

  const stored = window.localStorage.getItem(LOCALE_KEY);
  if (isAppLocale(stored)) return stored;

  return "ru";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("ru");

  useEffect(() => {
    queueMicrotask(() => {
      const next = preferredLocale();
      setLocaleState(next);
      document.documentElement.lang = next;
    });
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
