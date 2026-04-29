/**
 * Lightweight i18n — Tier 3.6 of the residual debt.
 *
 * Default-export a translation function `t(key, locale?)` plus locale
 * detection helpers. Strings live in `./fr.ts` and `./en.ts`; missing
 * keys fall back to the FR string (the canonical source).
 *
 * No external dep — no react-intl, no next-intl. Just typed string maps.
 * If we need richer features later (plurals, ICU), this module is the
 * single boundary to swap.
 */

import { fr } from "./fr";
import { en } from "./en";

export type Locale = "fr" | "en";

const DICTIONARY: Record<Locale, Record<string, string>> = { fr, en };

export const DEFAULT_LOCALE: Locale = "fr";
export const SUPPORTED_LOCALES: readonly Locale[] = ["fr", "en"] as const;

export function t(key: keyof typeof fr | string, locale: Locale = DEFAULT_LOCALE): string {
  const dict = DICTIONARY[locale] ?? fr;
  return (dict as Record<string, string>)[key] ?? fr[key as keyof typeof fr] ?? key;
}

/**
 * Server-side: extract the user's preferred locale from the
 * Accept-Language header, falling back to FR.
 */
export function detectLocaleFromHeader(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const langs = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase().slice(0, 2))
    .filter((l): l is string => !!l);
  for (const lang of langs) {
    if (SUPPORTED_LOCALES.includes(lang as Locale)) return lang as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Client-side: extract the user's preferred locale from `navigator.language`.
 */
export function detectLocaleFromNavigator(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const lang = (navigator.language ?? "").toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.includes(lang as Locale) ? (lang as Locale) : DEFAULT_LOCALE;
}
