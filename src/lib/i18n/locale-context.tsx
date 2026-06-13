"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  t as translate,
  parseLocale,
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  type Locale,
} from "./index";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function persist(locale: Locale) {
  if (typeof document === "undefined") return;
  // 1-year cookie so SSR + future visits start in the chosen locale.
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  try {
    localStorage.setItem(LOCALE_COOKIE, locale);
  } catch {
    /* private mode — cookie is enough */
  }
  document.documentElement.lang = locale;
}

/**
 * App-wide locale provider. `initialLocale` comes from the server (cookie
 * read in the root layout) so the first paint matches the chosen language
 * with no hydration flash.
 */
export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Reconcile with localStorage on mount — ONLY when an explicit prior choice
  // exists there (otherwise we'd clobber the cookie-seeded SSR locale with the
  // FR default). No reactive deps referenced → stable [] effect.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCALE_COOKIE);
      if (!raw) return;
      const stored = parseLocale(raw);
      setLocaleState((cur) => (stored !== cur ? stored : cur));
      persist(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persist(next);
  }, []);

  const t = useCallback((key: string) => translate(key, locale), [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Read the locale context. Returns a safe FR-default fallback when used
 * outside a provider (e.g. isolated unit renders) so components never crash.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => undefined,
    t: (key: string) => translate(key, DEFAULT_LOCALE),
  };
}
