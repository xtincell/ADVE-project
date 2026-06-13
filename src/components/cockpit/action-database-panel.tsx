"use client";

/**
 * ActionDatabasePanel — homogeneous, queryable view of the I-pillar action
 * database (ADR-0094). Reads the canonical `BrandAction` projection via
 * `trpc.actions.byStrategy` instead of rendering the heterogeneous blob
 * collections (catalogueParCanal / actionsByDevotionLevel / actionsByOvertonPhase)
 * as N differently-shaped cards.
 *
 * One row shape for every action: title · touchpoint · AARRR · budget ·
 * cost template · priority · status. Honest empty state (no fabricated rows).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Loader2, RefreshCw, Star, Layers } from "lucide-react";

const TOUCHPOINT_LABELS: Record<string, string> = {
  DIGITAL: "Digital",
  ATL: "ATL",
  BTL: "BTL",
  TTL: "TTL",
  OWNED: "Owned",
  EARNED: "Earned",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PROPOSED: "Proposé",
  ACCEPTED: "Retenu",
  SCHEDULED: "Planifié",
  EXECUTED: "Exécuté",
  CANCELLED: "Écarté",
};

function fcfa(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(Math.round(n));
}

interface Props {
  strategyId: string;
  /** Operator-only projection refresh is available; founders rely on auto-sync. */
  canSync?: boolean;
}

export function ActionDatabasePanel({ strategyId, canSync = true }: Props) {
  const [touchpointFilter, setTouchpointFilter] = useState<string | null>(null);

  const summaryQuery = trpc.actions.summary.useQuery({ strategyId }, { enabled: !!strategyId });
  const listQuery = trpc.actions.byStrategy.useQuery(
    { strategyId, ...(touchpointFilter ? { touchpoint: touchpointFilter } : {}) },
    { enabled: !!strategyId },
  );
  const syncMutation = trpc.actions.sync.useMutation({
    onSuccess: () => { summaryQuery.refetch(); listQuery.refetch(); },
  });

  const summary = summaryQuery.data;
  const actions = listQuery.data ?? [];
  const touchpoints = summary ? Object.keys(summary.byTouchpoint).sort() : [];

  return (
    <div className="rounded-lg border border-white/5 bg-surface-raised p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Base d'actions</span>
          {summary ? (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-foreground-muted">
              {summary.total} action{summary.total > 1 ? "s" : ""}
              {summary.selectedCount > 0 ? ` · ${summary.selectedCount} retenue${summary.selectedCount > 1 ? "s" : ""}` : ""}
            </span>
          ) : null}
        </div>
        {canSync ? (
          <button
            type="button"
            onClick={() => syncMutation.mutate({ strategyId })}
            disabled={syncMutation.isPending}
            title="Re-matérialiser la base d'actions depuis le pilier I"
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-foreground-secondary transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
          >
            {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Synchroniser
          </button>
        ) : null}
      </div>

      {/* Touchpoint filter */}
      {touchpoints.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTouchpointFilter(null)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              touchpointFilter === null ? "bg-accent/20 text-accent" : "bg-white/5 text-foreground-muted hover:bg-white/10"
            }`}
          >
            Tout ({summary?.total ?? 0})
          </button>
          {touchpoints.map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => setTouchpointFilter(tp)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                touchpointFilter === tp ? "bg-accent/20 text-accent" : "bg-white/5 text-foreground-muted hover:bg-white/10"
              }`}
            >
              {TOUCHPOINT_LABELS[tp] ?? tp} ({summary?.byTouchpoint[tp] ?? 0})
            </button>
          ))}
        </div>
      ) : null}

      {/* List */}
      {listQuery.isLoading ? (
        <div className="flex items-center justify-center py-8 text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : actions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-xs text-foreground-muted">
            Aucune action dans la base. Lance <strong>Recalculer ce pilier</strong> (cascade I) pour générer le catalogue d'actions.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {actions.map((a) => {
            const meta = (a.metadata ?? {}) as Record<string, unknown>;
            const channel = typeof meta.channel === "string" ? meta.channel : null;
            return (
              <div
                key={a.id}
                className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${
                  a.selected ? "border-accent/30 bg-accent/5" : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {a.selected ? <Star className="h-3 w-3 flex-shrink-0 fill-accent text-accent" /> : null}
                    <span className="truncate text-xs font-medium text-foreground">{a.title}</span>
                  </div>
                  {a.description ? (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-foreground-muted">{a.description}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {a.touchpoint ? (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">
                        {TOUCHPOINT_LABELS[a.touchpoint] ?? a.touchpoint}
                      </span>
                    ) : null}
                    {channel ? (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{channel}</span>
                    ) : null}
                    {a.aarrrIntent ? (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{a.aarrrIntent}</span>
                    ) : null}
                    {a.costTemplateKey ? (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted" title="Archétype de coût Thot (ADR-0093)">
                        💰 {a.costTemplateKey}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <span className="text-[11px] font-semibold text-foreground">{fcfa(a.budgetMin)}<span className="text-[9px] font-normal text-foreground-muted"> {a.budgetCurrency ?? ""}</span></span>
                  <div className="flex items-center gap-1">
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{a.priority}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{STATUS_LABELS[a.status] ?? a.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
