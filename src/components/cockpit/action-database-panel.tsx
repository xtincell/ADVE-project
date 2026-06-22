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
import { Loader2, RefreshCw, Star, Layers, Plus, Sparkles } from "lucide-react";

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

const CHANNELS: Array<[string, string]> = [
  ["DIGITAL", "Digital"],
  ["SOCIAL", "Social"],
  ["PR_INFLUENCE", "RP / Influence"],
  ["EVENEMENTIEL", "Événementiel"],
  ["MEDIA", "Média"],
  ["RETAIL", "Retail / Distribution"],
  ["PARTENARIAT", "Partenariat"],
];

const INPUT_CLS =
  "rounded-lg border border-white/10 bg-background px-2 py-1 text-xs text-foreground placeholder:text-foreground-muted focus:border-accent/40 focus:outline-none";

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

  const refetchAll = () => { summaryQuery.refetch(); listQuery.refetch(); };
  const proposeMutation = trpc.actions.propose.useMutation({ onSuccess: refetchAll });
  const selectMutation = trpc.actions.setSelected.useMutation({ onSuccess: refetchAll });

  const [showPropose, setShowPropose] = useState(false);
  const [proposeMode, setProposeMode] = useState<"LLM" | "MANUAL">("LLM");
  const [channel, setChannel] = useState("DIGITAL");
  const [count, setCount] = useState(5);
  const [intention, setIntention] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualBudget, setManualBudget] = useState("");

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
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-2xs text-foreground-muted">
              {summary.total} action{summary.total > 1 ? "s" : ""}
              {summary.selectedCount > 0 ? ` · ${summary.selectedCount} retenue${summary.selectedCount > 1 ? "s" : ""}` : ""}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPropose((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-2xs font-medium transition-colors ${showPropose ? "bg-accent/20 text-accent" : "bg-white/5 text-foreground-secondary hover:bg-white/10 hover:text-foreground"}`}
          >
            <Plus className="h-3 w-3" /> Proposer
          </button>
          {canSync ? (
            <button
              type="button"
              onClick={() => syncMutation.mutate({ strategyId })}
              disabled={syncMutation.isPending}
              title="Re-matérialiser la base d'actions depuis le pilier I"
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-2xs font-medium text-foreground-secondary transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
            >
              {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Synchroniser
            </button>
          ) : null}
        </div>
      </div>

      {/* Propose actions (Phase 24) — generate-more (IA, brand-aware) or manual */}
      {showPropose ? (
        <div className="mb-3 rounded-lg border border-accent/20 bg-accent/[0.04] p-3">
          <div className="mb-2 flex gap-1.5">
            <button type="button" onClick={() => setProposeMode("LLM")} className={`rounded-full px-2.5 py-0.5 text-2xs font-medium transition-colors ${proposeMode === "LLM" ? "bg-accent/20 text-accent" : "bg-white/5 text-foreground-muted hover:bg-white/10"}`}>Générer (IA)</button>
            <button type="button" onClick={() => setProposeMode("MANUAL")} className={`rounded-full px-2.5 py-0.5 text-2xs font-medium transition-colors ${proposeMode === "MANUAL" ? "bg-accent/20 text-accent" : "bg-white/5 text-foreground-muted hover:bg-white/10"}`}>Ajouter manuellement</button>
          </div>

          {proposeMode === "LLM" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={INPUT_CLS}>
                  {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input type="number" min={1} max={12} value={count} onChange={(e) => setCount(Math.max(1, Math.min(12, Number(e.target.value) || 5)))} className={`${INPUT_CLS} w-16`} title="Nombre d'actions" />
                <span className="text-2xs text-foreground-muted">action(s) cohérentes ADVE+R+T</span>
              </div>
              <textarea value={intention} onChange={(e) => setIntention(e.target.value)} rows={2} placeholder="Brief / intention (optionnel) — ex. « lancer le mobile money en zone rurale, budget serré »" className={`${INPUT_CLS} w-full resize-none`} />
              <button
                type="button"
                disabled={proposeMutation.isPending}
                onClick={() => proposeMutation.mutate({ strategyId, mode: "LLM", channel, count, ...(intention.trim() ? { briefIntention: intention.trim(), via: "BRIEF" as const } : { via: "GENERATE_MORE" as const }) })}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-2xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {proposeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Générer {count} action{count > 1 ? "s" : ""}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Titre de l'action" className={`${INPUT_CLS} w-full`} />
              <div className="flex flex-wrap items-center gap-2">
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={INPUT_CLS}>
                  {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input value={manualBudget} onChange={(e) => setManualBudget(e.target.value)} inputMode="numeric" placeholder="Budget (optionnel)" className={`${INPUT_CLS} w-32`} />
                <button
                  type="button"
                  disabled={manualTitle.trim().length < 3 || proposeMutation.isPending}
                  onClick={() => { proposeMutation.mutate({ strategyId, mode: "MANUAL", channel, manualActions: [{ title: manualTitle.trim(), channel, ...(manualBudget && Number(manualBudget) > 0 ? { budget: Number(manualBudget) } : {}) }] }); setManualTitle(""); setManualBudget(""); }}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-2xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" /> Ajouter
                </button>
              </div>
            </div>
          )}

          {proposeMutation.data ? (
            <p className={`mt-2 text-2xs ${proposeMutation.data.status === "OK" ? "text-success" : "text-foreground-muted"}`}>
              {proposeMutation.data.status === "OK"
                ? `${proposeMutation.data.created} action(s) proposée(s) — clique l'étoile pour les retenir dans la roadmap.`
                : proposeMutation.data.status === "DEFERRED"
                  ? `IA indisponible (${proposeMutation.data.reason ?? "pas de fournisseur configuré"}) — aucune action créée. Utilise « Ajouter manuellement ».`
                  : "Rien à ajouter."}
            </p>
          ) : proposeMutation.isError ? (
            <p className="mt-2 text-2xs text-error">{proposeMutation.error.message}</p>
          ) : null}
        </div>
      ) : null}

      {/* Touchpoint filter */}
      {touchpoints.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTouchpointFilter(null)}
            className={`rounded-full px-2 py-0.5 text-2xs font-medium transition-colors ${
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
              className={`rounded-full px-2 py-0.5 text-2xs font-medium transition-colors ${
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
                    <button
                      type="button"
                      onClick={() => selectMutation.mutate({ strategyId, actionId: a.id, selected: !a.selected })}
                      title={a.selected ? "Retirer de la roadmap" : "Retenir pour la roadmap"}
                      className="flex-shrink-0"
                    >
                      <Star className={`h-3 w-3 ${a.selected ? "fill-accent text-accent" : "text-foreground-muted hover:text-accent"}`} />
                    </button>
                    <span className="truncate text-xs font-medium text-foreground">{a.title}</span>
                  </div>
                  {a.description ? (
                    <p className="mt-0.5 line-clamp-1 text-2xs text-foreground-muted">{a.description}</p>
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
                  <span className="text-2xs font-semibold text-foreground">{fcfa(a.budgetMin)}<span className="text-[9px] font-normal text-foreground-muted"> {a.budgetCurrency ?? ""}</span></span>
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
