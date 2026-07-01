/**
 * i18n completeness — EN and 中文 must cover every canonical FR key so the
 * international demo never silently falls back to French mid-page. Guards the
 * FR/EN/中文 toggle promise.
 */

import { describe, it, expect } from "vitest";
import { fr } from "@/lib/i18n/fr";
import { en } from "@/lib/i18n/en";
import { zh } from "@/lib/i18n/zh";
import { SUPPORTED_LOCALES, parseLocale, DEFAULT_LOCALE } from "@/lib/i18n";

const frKeys = Object.keys(fr);

describe("locale dictionaries", () => {
  it("EN covers every FR key with a non-empty value", () => {
    const missing = frKeys.filter((k) => !(k in en) || !(en as Record<string, string>)[k]?.trim());
    expect(missing).toEqual([]);
  });

  it("中文 covers every FR key with a non-empty value", () => {
    const missing = frKeys.filter((k) => !(k in zh) || !(zh as Record<string, string>)[k]?.trim());
    expect(missing).toEqual([]);
  });

  it("exposes fr/en/zh as supported locales", () => {
    expect([...SUPPORTED_LOCALES]).toEqual(["fr", "en", "zh"]);
  });

  it("parseLocale narrows unknown values to the FR default", () => {
    expect(parseLocale("zh")).toBe("zh");
    expect(parseLocale("de")).toBe(DEFAULT_LOCALE);
    expect(parseLocale(null)).toBe(DEFAULT_LOCALE);
  });
});
