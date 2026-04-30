"use client";

import { TRPCProvider } from "@/lib/trpc/client";
import { SessionProvider } from "next-auth/react";
import { ErrorVaultListener } from "@/components/shared/error-vault-listener";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <ErrorVaultListener />
        {children}
      </TRPCProvider>
    </SessionProvider>
  );
}
