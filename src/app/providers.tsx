"use client";

import { TRPCProvider } from "@/lib/trpc/client";
import { SessionProvider } from "next-auth/react";
import { ErrorVaultListener } from "@/components/shared/error-vault-listener";
import { ToastProvider } from "@/components/shared/notification-toast";
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
          <ToastProvider>
            <ErrorVaultListener />
            {children}
            <CookieConsent />
          </ToastProvider>
        </TRPCProvider>
      </SessionProvider>
    </LocaleProvider>
  );
}
