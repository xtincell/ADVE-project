"use client";

import { TRPCProvider } from "@/lib/trpc/client";
import { SessionProvider } from "next-auth/react";
import { ErrorVaultListener } from "@/components/shared/error-vault-listener";
import { CookieConsent } from "@/components/shared/cookie-consent";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

export function Providers({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <SessionProvider>
        <TRPCProvider>
          <ErrorVaultListener />
          {children}
          <CookieConsent />
        </TRPCProvider>
      </SessionProvider>
    </LocaleProvider>
  );
}
