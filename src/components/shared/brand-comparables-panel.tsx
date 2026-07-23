"use client";

/**
 * BrandComparablesPanel — repère ANONYME de maturité vs les marques voisines.
 *
 * round-16b : ne rend PLUS de lignes par-pair (nom / budget / score d'une AUTRE
 * marque = fuite cross-tenant). `strategy.comparables` renvoie un agrégat k-anonyme
 * ({ peerCount, medianComposite, topSimilarity }) ; ce panel affiche « N marques
 * voisines · maturité médiane du groupe X/200 ». Empty state sans embeddings.
 */

import { trpc } from "@/lib/trpc/client";
import { Users } from "lucide-react";

interface Props {
  strategyId: string;
  topK?: number;
  className?: string;
}

export function BrandComparablesPanel({ strategyId, topK = 6, className = "" }: Props) {
  const { data, isLoading } = trpc.strategy.comparables.useQuery(
    { strategyId, topK },
    { staleTime: 60_000 },
  );

  if (isLoading) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-foreground-muted" />
          <h3 className="text-sm font-semibold">Marques voisines</h3>
        </div>
        <div className="text-xs text-foreground-muted">Chargement…</div>
      </div>
    );
  }

  if (!data || data.peerCount === 0) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-foreground-muted" />
          <h3 className="text-sm font-semibold">Marques voisines</h3>
        </div>
        <p className="text-xs text-foreground-muted">
          Aucune marque comparable indexée pour l'instant. Notre base de marques
          comparables se remplit au fil des intakes — repasse plus tard.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-foreground-muted" />
        <h3 className="text-sm font-semibold">Marques voisines</h3>
        <span className="ml-auto text-xs text-foreground-muted">{data.peerCount} pairs</span>
      </div>
      <div className="px-3 py-2 rounded-lg bg-background border border-border">
        {data.medianComposite != null ? (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-foreground-muted">Maturité médiane du groupe</span>
            <span className="text-sm font-mono text-foreground">{data.medianComposite}/200</span>
          </div>
        ) : (
          <div className="text-xs text-foreground-muted">
            Groupe trop restreint pour un repère anonyme (moins de 3 pairs).
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 mt-1">
          <span className="text-xs text-foreground-muted">Proximité maximale</span>
          <span className="text-xs font-mono text-foreground-muted">sim {data.topSimilarity.toFixed(2)}</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-foreground-muted">
        Repère agrégé et anonyme — aucune marque tierce n'est nommée.
      </p>
    </div>
  );
}
