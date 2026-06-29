"use client";

/**
 * CreativeProposalPanel — la gate de génération de production (ADR-0120).
 *
 * Entre les frames canon (cadre) et les actions de production. L'opérateur crée une
 * Proposition Créative (direction Big Idea + niveau d'exécution), puis la VALIDE : la
 * validation génère les actions + briefs de production dans les frames canon au niveau
 * choisi. Voie B (saisie manuelle / La Guilde) est la baseline ici ; la Voie A (La
 * Fusée IA, Glory) pré-remplira ce formulaire dans une itération suivante.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { Button } from "@/components/primitives/button";
import {
  CREATIVE_PROPOSAL_SOURCE_LABEL,
  type CreativeProposalSource,
} from "@/lib/types/creative-proposal";
import { Loader2, Lightbulb, CheckCircle2, Plus, XCircle, Send } from "lucide-react";

const ROUTE_LABEL: Record<string, string> = {
  CONSERVATIVE: "Conservateur",
  TARGET: "Cible",
  AMBITIOUS: "Ambitieux",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumise",
  VALIDATED: "Validée",
  REJECTED: "Rejetée",
};
const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-white/5 text-foreground-muted",
  SUBMITTED: "bg-accent/15 text-accent",
  VALIDATED: "bg-success/15 text-success",
  REJECTED: "bg-error/15 text-error",
};

function fmtBudget(n: number): string {
  if (!n || !Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
}

// Repli pendant le chargement des niveaux (toujours 3, ADR-0089).
const FALLBACK_LEVELS = [
  { key: "CONSERVATIVE", label: "Conservateur", recommended: false, selected: false, projectedGrowthPct: null as number | null, actionCount: 0, totalBudget: 0 },
  { key: "TARGET", label: "Cible", recommended: true, selected: false, projectedGrowthPct: null as number | null, actionCount: 0, totalBudget: 0 },
  { key: "AMBITIOUS", label: "Ambitieux", recommended: false, selected: false, projectedGrowthPct: null as number | null, actionCount: 0, totalBudget: 0 },
];

export function CreativeProposalPanel() {
  const strategyId = useCurrentStrategyId();
  const utils = trpc.useUtils();
  const { data: proposals, isLoading } = trpc.creativeProposal.listByStrategy.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );
  const { data: levels } = trpc.creativeProposal.executionLevels.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );
  const invalidate = () => {
    utils.creativeProposal.listByStrategy.invalidate({ strategyId: strategyId ?? "" });
    utils.campaign.canonByStrategy.invalidate({ strategyId: strategyId ?? "" });
  };

  const create = trpc.creativeProposal.create.useMutation({ onSuccess: () => { invalidate(); setOpen(false); resetForm(); } });
  const validate = trpc.creativeProposal.validate.useMutation({ onSuccess: invalidate });
  const submit = trpc.creativeProposal.submit.useMutation({ onSuccess: invalidate });
  const reject = trpc.creativeProposal.reject.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [routeKey, setRouteKey] = useState<"CONSERVATIVE" | "TARGET" | "AMBITIOUS">("TARGET");
  const [source, setSource] = useState<CreativeProposalSource>("LAGUILDE_HUMAN");
  const [bigIdea, setBigIdea] = useState("");
  const [insight, setInsight] = useState("");
  const [axe, setAxe] = useState("");
  const [pistes, setPistes] = useState("");

  function resetForm() {
    setRouteKey("TARGET"); setSource("LAGUILDE_HUMAN"); setBigIdea(""); setInsight(""); setAxe(""); setPistes("");
  }

  if (!strategyId) return null;
  const list = proposals ?? [];

  return (
    <section className="rounded-xl border border-white/5 bg-surface-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="h-4 w-4 text-accent" /> Direction créative (gate de production)
          </h2>
          <p className="mt-0.5 text-xs text-foreground-muted">
            Valide une direction créative pour amorcer la production : les actions + briefs se génèrent dans les frames canon au <span className="text-foreground-secondary">niveau d'exécution</span> choisi.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Nouvelle proposition
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-background/40 p-3">
          <div>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-foreground-muted">
              Niveau d'exécution <span className="font-normal normal-case text-foreground-muted/70">(dérivé de l'Advertis — preview des actions générées)</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(levels ?? FALLBACK_LEVELS).map((lvl) => {
                const active = routeKey === lvl.key;
                return (
                  <button
                    key={lvl.key}
                    type="button"
                    onClick={() => setRouteKey(lvl.key as typeof routeKey)}
                    className={`rounded-lg border p-2 text-left transition-colors ${active ? "border-accent/50 bg-accent/10" : "border-white/10 bg-background hover:border-white/20"}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground">{lvl.label}</span>
                      {lvl.recommended ? <span className="rounded bg-accent/15 px-1 py-0.5 text-[8px] font-bold text-accent">conseillé</span> : null}
                    </div>
                    <p className="mt-0.5 text-[10px] text-foreground-muted">
                      {lvl.actionCount} action(s){lvl.projectedGrowthPct != null ? ` · +${lvl.projectedGrowthPct}%` : ""}
                    </p>
                    <p className="text-[10px] text-foreground-secondary">{fmtBudget(lvl.totalBudget)}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex w-fit flex-col gap-1 text-[9px] font-bold uppercase tracking-widest text-foreground-muted">
            Voie
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as CreativeProposalSource)}
              className="rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent/40 focus:outline-none"
            >
              <option value="LAGUILDE_HUMAN">La Guilde (humain)</option>
              <option value="LAFUSEE_AI">La Fusée (IA)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-widest text-foreground-muted">
            Big Idea *
            <textarea
              value={bigIdea}
              onChange={(e) => setBigIdea(e.target.value)}
              rows={2}
              placeholder="L'idée directrice qui gouverne la campagne…"
              className="rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent/40 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-widest text-foreground-muted">
            Insight
            <input value={insight} onChange={(e) => setInsight(e.target.value)} className="rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent/40 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-widest text-foreground-muted">
            Axe créatif
            <input value={axe} onChange={(e) => setAxe(e.target.value)} className="rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent/40 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-widest text-foreground-muted">
            Pistes (une par ligne)
            <textarea value={pistes} onChange={(e) => setPistes(e.target.value)} rows={2} className="rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent/40 focus:outline-none" />
          </label>
          {create.isError ? <p className="text-xs font-medium text-error">{create.error.message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>Annuler</Button>
            <Button
              size="sm"
              variant="primary"
              disabled={create.isPending || bigIdea.trim().length < 3}
              onClick={() => create.mutate({
                strategyId,
                routeKey,
                source,
                direction: {
                  bigIdea: bigIdea.trim(),
                  insight: insight.trim(),
                  axe: axe.trim(),
                  pistes: pistes.split("\n").map((p) => p.trim()).filter(Boolean),
                },
              })}
            >
              {create.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Créer la proposition
            </Button>
          </div>
        </div>
      ) : null}

      {validate.data ? (
        <p className="mt-2 text-xs font-medium text-success">
          Direction validée · {validate.data.actionsAttached} action(s) + {validate.data.briefsGenerated} brief(s) de production générés dans {validate.data.frames} frame(s) canon ({ROUTE_LABEL[validate.data.routeKey] ?? validate.data.routeKey}).
        </p>
      ) : validate.isError ? (
        <p className="mt-2 text-xs font-medium text-error">Échec validation : {validate.error.message}</p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-xs text-foreground-muted">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="mt-4 text-xs text-foreground-muted">
          Aucune proposition créative. Crée-en une pour choisir une direction et amorcer la production des frames canon.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {list.map((p) => {
            const direction = (p.direction ?? {}) as { bigIdea?: string };
            const validated = p.status === "VALIDATED";
            const closed = validated || p.status === "REJECTED";
            return (
              <li key={p.id} className="rounded-lg border border-white/5 bg-background/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{direction.bigIdea || "(sans Big Idea)"}</p>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${STATUS_CLASS[p.status] ?? "bg-white/5 text-foreground-muted"}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{ROUTE_LABEL[p.routeKey] ?? p.routeKey}</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{CREATIVE_PROPOSAL_SOURCE_LABEL[p.source as CreativeProposalSource] ?? p.source}</span>
                </div>
                {!closed ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" disabled={validate.isPending} onClick={() => validate.mutate({ id: p.id })}>
                      {validate.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                      Valider la direction
                    </Button>
                    {p.status === "DRAFT" ? (
                      <Button size="sm" variant="outline" disabled={submit.isPending} onClick={() => submit.mutate({ id: p.id })}>
                        <Send className="mr-1 h-3.5 w-3.5" /> Soumettre
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" disabled={reject.isPending} onClick={() => { const r = window.prompt("Motif du rejet :"); if (r && r.trim()) reject.mutate({ id: p.id, reason: r.trim() }); }}>
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Rejeter
                    </Button>
                  </div>
                ) : p.rejectedReason ? (
                  <p className="mt-2 text-[10px] text-foreground-muted">Rejetée : {p.rejectedReason}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
