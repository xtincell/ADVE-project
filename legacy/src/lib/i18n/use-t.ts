"use client";

import { useLocale } from "./locale-context";
import { type Locale } from "./index";
import { fr } from "./fr";

export type TKey = keyof typeof fr;

/**
 * Client-side hook returning a `t(key)` function bound to the user's
 * chosen locale (from the LocaleProvider) — reactive to the FR/EN/中文
 * toggle. Outside a provider it falls back to FR via {@link useLocale}.
 */
export function useT(): { t: (key: TKey | string) => string; locale: Locale } {
  const { t, locale } = useLocale();
  return { locale, t };
}
