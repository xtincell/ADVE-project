"use client";

/**
 * BrandComparablesPanel — UI block listing semantically similar brands.
 *
 * Calls strategy.comparables via tRPC. Shows top peers with their composite
 * score, financial capacity tier, and similarity score. Drops in cleanly
 * to any cockpit/console page where peer context is useful.
 *
 * Empty state when no embeddings exist yet — guides operator to wait for
 * indexing or shows a "no peers in store yet" message.
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

  if (!data || data.length === 0) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-foreground-muted" />
          <h3 className="text-sm font-semibold">Marques voisines</h3>
        </div>
        <p className="text-xs text-foreground-muted">
          Aucune marque comparable indexée pour l'instant. Le store Seshat se remplit
          au fil des intakes — repasse plus tard.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-foreground-muted" />
        <h3 className="text-sm font-semibold">Marques voisines</h3>
        <span className="ml-auto text-xs text-foreground-muted">{data.length} pairs</span>
      </div>
      <div className="space-y-2">
        {data.map((peer) => {
          const fin = (peer.financialCapacity ?? null) as
            | { reconciled?: number; currency?: string }
            | null;
          const biz = (peer.businessContext ?? null) as
            | { sector?: string; country?: string; businessModel?: string }
            | null;
          return (
            <div
              key={peer.strategyId}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border border-border"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {peer.name ?? peer.strategyId.slice(0, 12) + "…"}
                </div>
                <div className="text-xs text-foreground-muted truncate">
                  {biz?.sector && <span className="mr-2">{biz.sector}</span>}
                  {biz?.country && <span className="mr-2">{biz.country}</span>}
                  {biz?.businessModel && <span className="mr-2">{biz.businessModel}</span>}
                  {fin?.reconciled != null && (
                    <span className="font-mono">
                      ~{Math.round(fin.reconciled / 1_000_000)}M {fin.currency ?? "XAF"}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {peer.composite != null && (
                  <div className="text-xs font-mono text-foreground">
                    {peer.composite.toFixed(0)}/200
                  </div>
                )}
                <div className="text-xs font-mono text-foreground-muted">
                  sim {peer.topSimilarity.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
