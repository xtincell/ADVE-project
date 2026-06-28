"use client";

import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import superjson from "superjson";
import type { AppRouter } from "@/server/trpc/router";
import { emitToast } from "@/lib/toast-bus";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30 * 1000 } },
    // Safety net: a mutation error that the calling component does NOT handle
    // itself surfaces a toast instead of failing silently (the "bouton inerte"
    // class — e.g. escrow/commissions/pricing money-movement buttons). Mutations
    // with their own onError keep full control (no double toast).
    mutationCache: new MutationCache({
      onError: (error, _vars, _onMutateResult, mutation) => {
        if (mutation.options.onError) return;
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Une erreur est survenue. Réessaie ou contacte le support.";
        emitToast(message, "error");
      },
    }),
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
