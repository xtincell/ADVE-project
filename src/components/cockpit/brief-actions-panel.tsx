"use client";

/**
 * BriefActionsPanel — Cockpit "brief → roadmap" surface (Phase 24, slice 2).
 *
 * The industry workflow: write a brief (intention + budget + optional channel),
 * an LLM formalizes concrete actions against the brand's REAL ADVE + R + T
 * pillars, you review the proposals and RETAIN the ones you want — retained
 * actions (selected=true) feed the S roadmap / the calendar. Manual-first parity
 * (ADR-0060): a manual "add an action" path with no LLM. Operator-confirmed
 * throughout (STOP at Jehuty — nothing writes to the roadmap without a click).
 *
 * Reuses the governed `actions.propose` engine (via="BRIEF") + `actions.setSelected`.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Lightbulb, Sparkles, Loader2, Star, Plus, Target } from "lucide-react";

const CHANNELS: Array<[string, string]> = [
  ["", "Tous canaux"],
  ["DIGITAL", "Digital"],
  ["SOCIAL", "Social"],
  ["PR_INFLUENCE", "RP / Influence"],
  ["EVENEMENTIEL", "Événementiel"],
  ["MEDIA", "Média"],
  ["RETAIL", "Retail / Distribution"],
  ["PARTENARIAT", "Partenariat"],
];
const CHANNEL_LABEL = Object.fromEntries(CHANNELS) as Record<string, string>;
const INPUT_CLS =
  "rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-accent/40 focus:outline-none";

function fcfa(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(Math.round(n));
}

export function BriefActionsPanel() {
  const strategyId = useCurrentStrategyId();
  const [intention, setIntention] = useState("");
  const [budget, setBudget] = useState("");
  const [channel, setChannel] = useState("");
  const [count, setCount] = useState(6);
  const [manualTitle, setManualTitle] = useState("");

  const proposedQuery = trpc.actions.byStrategy.useQuery(
    { strategyId: strategyId ?? "", status: "PROPOSED" },
    { enabled: !!strategyId },
  );
  const summaryQuery = trpc.actions.summary.useQuery({ strategyId: strategyId ?? "" }, { enabled: !!strategyId });
  const refetch = () => { proposedQuery.refetch(); summaryQuery.refetch(); };
  const propose = trpc.actions.propose.useMutation({ onSuccess: refetch });
  const select = trpc.actions.setSelected.useMutation({ onSuccess: refetch });

  if (!strategyId || proposedQuery.isLoading) return <SkeletonPage />;

  const proposed = proposedQuery.data ?? [];
  const summary = summaryQuery.data;

  const generate = () =>
    propose.mutate({
      strategyId,
      mode: "LLM",
      via: "BRIEF",
      briefIntention: intention.trim(),
      count,
      ...(channel ? { channel } : {}),
      ...(budget && Number(budget) > 0 ? { budgetMax: Number(budget) } : {}),
    });

  const addManual = () => {
    propose.mutate({
      strategyId,
      mode: "MANUAL",
      via: "BRIEF",
      ...(channel ? { channel } : {}),
      manualActions: [{ title: manualTitle.trim(), ...(channel ? { channel } : {}) }],
    });
    setManualTitle("");
  };

  const retainAll = async () => {
    for (const a of proposed) await select.mutateAsync({ strategyId, actionId: a.id, selected: true });
    refetch();
  };

  return (
    <article className="mx-auto max-w-[var(--maxw-content,1200px)] px-[var(--pad-page,1.5rem)] py-8 md:py-12">
      <header className="mb-8 border-b border-border-subtle pb-6">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
          <Lightbulb className="h-3.5 w-3.5 text-accent" />
          <span>Brief → roadmap · injection d&rsquo;actions</span>
        </div>
        <h1 className="font-display font-semibold tracking-tighter leading-[0.95] text-foreground" style={{ fontSize: "var(--text-display)" }}>
          Un brief, des actions.
        </h1>
        <p className="mt-3 max-w-[64ch] text-foreground-secondary" style={{ fontSize: "var(--text-lg)" }}>
          Décris l&rsquo;intention et le budget : l&rsquo;IA formalise des actions concrètes <span className="font-serif italic">ancrées dans ta marque réelle</span> (ADVE + R + T). Tu <span className="text-accent">retiens</span> celles qui alimentent la roadmap.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Brief form */}
        <div className="space-y-3 rounded-lg border border-white/5 bg-surface-raised p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Target className="h-4 w-4 text-accent" /> Le brief</div>
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            rows={4}
            placeholder="Intention — ex. « Lancer le service de mobile money en zone rurale, faire connaître l'agent de proximité, budget serré, sous 3 mois. »"
            className={`${INPUT_CLS} w-full resize-none`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={INPUT_CLS}>
              {CHANNELS.map(([v, l]) => <option key={v || "all"} value={v}>{l}</option>)}
            </select>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" placeholder="Budget max (FCFA)" className={`${INPUT_CLS} w-36`} />
            <input type="number" min={1} max={12} value={count} onChange={(e) => setCount(Math.max(1, Math.min(12, Number(e.target.value) || 6)))} className={`${INPUT_CLS} w-16`} title="Nombre d'actions" />
          </div>
          <button
            type="button"
            disabled={intention.trim().length < 8 || propose.isPending}
            onClick={generate}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {propose.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Générer {count} action{count > 1 ? "s" : ""}
          </button>

          {/* Manual-first parity */}
          <div className="border-t border-white/5 pt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-widest text-foreground-muted">ou à la main</p>
            <div className="flex gap-2">
              <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Titre d'une action" className={`${INPUT_CLS} flex-1`} />
              <button type="button" disabled={manualTitle.trim().length < 3 || propose.isPending} onClick={addManual} className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-foreground-secondary transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50">
                <Plus className="h-3 w-3" /> Ajouter
              </button>
            </div>
          </div>

          {propose.data ? (
            <p className={`text-[11px] ${propose.data.status === "OK" ? "text-success" : "text-foreground-muted"}`}>
              {propose.data.status === "OK"
                ? `${propose.data.created} action(s) proposée(s) ci-contre.`
                : propose.data.status === "DEFERRED"
                  ? `IA indisponible (${propose.data.reason ?? "pas de fournisseur"}) — utilise l'ajout manuel.`
                  : "Rien à proposer."}
            </p>
          ) : propose.isError ? (
            <p className="text-[11px] text-error">{propose.error.message}</p>
          ) : null}
        </div>

        {/* Proposed actions */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">
              Actions proposées <span className="text-foreground-muted">({proposed.length})</span>
            </span>
            {proposed.length > 0 ? (
              <button type="button" onClick={retainAll} disabled={select.isPending} className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-2.5 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50">
                <Star className="h-3 w-3" /> Tout retenir
              </button>
            ) : null}
          </div>

          {proposed.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
              <p className="text-xs text-foreground-muted">Aucune action proposée. Lance un brief à gauche pour en générer.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {proposed.map((a) => {
                const meta = (a.metadata ?? {}) as Record<string, unknown>;
                const ch = typeof meta.channel === "string" ? meta.channel : null;
                const pillar = typeof meta.pilierImpact === "string" ? meta.pilierImpact : null;
                return (
                  <div key={a.id} className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${a.selected ? "border-accent/30 bg-accent/5" : "border-white/5 bg-white/[0.02]"}`}>
                    <button type="button" onClick={() => select.mutate({ strategyId, actionId: a.id, selected: !a.selected })} title={a.selected ? "Retirer de la roadmap" : "Retenir pour la roadmap"} className="mt-0.5 flex-shrink-0">
                      <Star className={`h-3.5 w-3.5 ${a.selected ? "fill-accent text-accent" : "text-foreground-muted hover:text-accent"}`} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-foreground">{a.title}</span>
                      {a.description ? <p className="mt-0.5 line-clamp-2 text-[11px] text-foreground-muted">{a.description}</p> : null}
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {ch ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{CHANNEL_LABEL[ch] ?? ch}</span> : null}
                        {pillar ? <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent">{pillar}</span> : null}
                        {a.costTemplateKey ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">💰 {a.costTemplateKey}</span> : null}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[11px] font-semibold text-foreground">{fcfa(a.budgetMax ?? a.budgetMin)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {summary && summary.selectedCount > 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/[0.04] px-3 py-2 text-[11px] text-accent">
              <Star className="h-3.5 w-3.5 fill-accent" />
              <span><strong>{summary.selectedCount}</strong> action(s) retenue(s) alimentent la roadmap (pilier&nbsp;S) — budget {fcfa(summary.totalSelectedBudget)}.</span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
