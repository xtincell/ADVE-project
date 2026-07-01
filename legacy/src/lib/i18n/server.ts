// `next/headers` is inherently server-only — importing it in a client
// component is a build error, so this module is implicitly server-scoped.
import { cookies } from "next/headers";
import { parseLocale, LOCALE_COOKIE, type Locale } from "./index";

/**
 * Server-side locale resolution from the `lf-locale` cookie. Used by the
 * root layout to set `<html lang>` and seed the LocaleProvider so the first
 * paint already matches the chosen language (no hydration flash).
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    return parseLocale(store.get(LOCALE_COOKIE)?.value);
  } catch {
    return parseLocale(null);
  }
}
