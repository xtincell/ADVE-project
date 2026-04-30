"use client";

import { useEffect, useState } from "react";
import { t, detectLocaleFromNavigator, type Locale, DEFAULT_LOCALE } from "./index";
import { fr } from "./fr";

export type TKey = keyof typeof fr;

/**
 * Client-side hook returning a stable `t(key)` function bound to the
 * user's preferred locale. Locale is sticky once detected (no SSR
 * mismatch — first render uses DEFAULT_LOCALE, then re-renders once
 * navigator.language is available client-side).
 */
export function useT(): { t: (key: TKey | string) => string; locale: Locale } {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(detectLocaleFromNavigator());
  }, []);

  return {
    locale,
    t: (key) => t(key, locale),
  };
}
