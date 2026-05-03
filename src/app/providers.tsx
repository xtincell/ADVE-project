"use client";

import { TRPCProvider } from "@/lib/trpc/client";
import { SessionProvider } from "next-auth/react";
import { ErrorVaultListener } from "@/components/shared/error-vault-listener";
import { CookieConsent } from "@/components/shared/cookie-consent";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <ErrorVaultListener />
        {children}
        <CookieConsent />
      </TRPCProvider>
    </SessionProvider>
  );
}
