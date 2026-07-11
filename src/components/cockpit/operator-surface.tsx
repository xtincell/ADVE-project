"use client";

import type { ReactNode } from "react";
import { UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Garde de surface opérateur dans le portail Cockpit (audit UX 2026-07-11,
 * lot 12 — [M06-01], [M03-04], [M04-04], [M08-01], [M09-04], [M10-01]).
 *
 * Ces routes restent joignables (deep-links, opérateur en impersonation)
 * mais un founder n'y voit pas la mécanique de production : il reçoit un
 * écran honnête « pris en charge par votre équipe » — jamais un 404, jamais
 * un clic→FORBIDDEN. Le contenu n'est monté que lorsque `auth.me.canOperate`
 * est vrai, donc les requêtes des pages enfants ne partent pas pour un
 * founder.
 */
export function OperatorSurface({ children }: { children: ReactNode }) {
  const me = trpc.auth.me.useQuery();

  if (me.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-1/3 animate-pulse rounded-md bg-background-overlay/60" />
        <div className="h-40 animate-pulse rounded-xl bg-background-overlay/40" />
      </div>
    );
  }

  if (!me.data?.canOperate) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Espace de production — pris en charge par votre équipe"
        description="Cette partie du travail (production, coordination, réglages internes) est opérée pour vous par votre équipe UPgraders. Les résultats vous arrivent dans vos campagnes, votre calendrier et vos livrables."
      />
    );
  }

  return <>{children}</>;
}
