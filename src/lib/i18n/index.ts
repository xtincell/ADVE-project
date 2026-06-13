/**
 * Lightweight i18n — FR / EN / 中文.
 *
 * `t(key, locale?)` plus locale detection + persistence helpers. Strings
 * live in `./fr.ts`, `./en.ts`, `./zh.ts`; missing keys fall back to the FR
 * string (the canonical source). The user-chosen locale is sticky via the
 * `lf-locale` cookie (read server-side for SSR, written client-side by the
 * LocaleProvider) so the whole app — landing + cockpit — switches at once.
 *
 * No external dep — no react-intl, no next-intl. Just typed string maps.
 */

import { fr } from "./fr";
import { en } from "./en";
import { zh } from "./zh";

export type Locale = "fr" | "en" | "zh";

const DICTIONARY: Record<Locale, Record<string, string>> = { fr, en, zh };

export const DEFAULT_LOCALE: Locale = "fr";
export const SUPPORTED_LOCALES: readonly Locale[] = ["fr", "en", "zh"] as const;

/** Cookie carrying the user's chosen locale (1 year, lax). */
export const LOCALE_COOKIE = "lf-locale";

/** Human label for each locale (used by the toggle). */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  zh: "中文",
};

export function t(key: keyof typeof fr | string, locale: Locale = DEFAULT_LOCALE): string {
  const dict = DICTIONARY[locale] ?? fr;
  return (dict as Record<string, string>)[key] ?? fr[key as keyof typeof fr] ?? key;
}

/** Narrow an arbitrary string to a supported Locale, else DEFAULT_LOCALE. */
export function parseLocale(value: string | null | undefined): Locale {
  return value && SUPPORTED_LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
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
