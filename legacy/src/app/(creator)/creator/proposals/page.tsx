"use client";

/**
 * Creator — Propositions créatives (Voie B La Guilde, ADR-0120).
 *
 * Un membre de la guilde soumet une direction créative (Big Idea / insight / axe /
 * pistes) pour une marque dont une mission lui est attribuée. La proposition arrive
 * SUBMITTED dans la file de validation de l'opérateur (cockpit). Manual-first : c'est
 * l'alternative humaine à la Voie A (IA). Accès gardé côté serveur (lien mission).
 */

import { useState } from "react";
import { Lightbulb, Send, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

const ROUTE_OPTIONS: Array<{ key: "CONSERVATIVE" | "TARGET" | "AMBITIOUS"; label: string }> = [
  { key: "CONSERVATIVE", label: "Conservateur" },
  { key: "TARGET", label: "Cible" },
  { key: "AMBITIOUS", label: "Ambitieux" },
];

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600";

export default function CreatorProposalsPage() {
  const strategies = trpc.creativeProposal.guildProposableStrategies.useQuery();
  const utils = trpc.useUtils();
  const submit = trpc.creativeProposal.submitGuildProposal.useMutation({
    onSuccess: () => {
      utils.creativeProposal.guildProposableStrategies.invalidate();
      setBigIdea("");
      setInsight("");
      setAxe("");
      setPistes("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3500);
    },
  });

  const [strategyId, setStrategyId] = useState("");
  const [routeKey, setRouteKey] = useState<"CONSERVATIVE" | "TARGET" | "AMBITIOUS">("TARGET");
  const [bigIdea, setBigIdea] = useState("");
  const [insight, setInsight] = useState("");
  const [axe, setAxe] = useState("");
  const [pistes, setPistes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  if (strategies.isLoading) return <SkeletonPage />;
  const list = strategies.data ?? [];
  const canSubmit = !!strategyId && bigIdea.trim().length >= 3 && !submit.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Propositions créatives"
        description="Soumets une direction créative (Voie B) pour une marque que tu sers"
        breadcrumbs={[{ label: "Dashboard", href: "/creator" }, { label: "Propositions" }]}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Aucune marque éligible"
          description="Tu peux proposer une direction créative pour les marques dont au moins une mission t'est attribuée."
        />
      ) : (
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
          <FormField label="Marque / stratégie" required>
            <select value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className={inputCls}>
              <option value="">— choisir une marque —</option>
              {list.map((s) => (
                <option key={s.strategyId} value={s.strategyId}>
                  {s.strategyName} ({s.missionCount} mission{s.missionCount !== 1 ? "s" : ""})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Niveau d'exécution" helpText="Conservateur / Cible / Ambitieux">
            <select value={routeKey} onChange={(e) => setRouteKey(e.target.value as typeof routeKey)} className={inputCls}>
              {ROUTE_OPTIONS.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Big Idea" required helpText="L'idée directrice (1-2 phrases, mémorable)">
            <textarea value={bigIdea} onChange={(e) => setBigIdea(e.target.value)} rows={2} placeholder="L'idée qui gouverne la campagne…" className={inputCls} />
          </FormField>

          <FormField label="Insight" helpText="La tension / vérité consommateur qui la fonde">
            <input value={insight} onChange={(e) => setInsight(e.target.value)} className={inputCls} />
          </FormField>

          <FormField label="Axe créatif" helpText="Le territoire d'expression">
            <input value={axe} onChange={(e) => setAxe(e.target.value)} className={inputCls} />
          </FormField>

          <FormField label="Pistes d'exécution" helpText="Une par ligne">
            <textarea value={pistes} onChange={(e) => setPistes(e.target.value)} rows={3} className={inputCls} />
          </FormField>

          {submit.isError ? <p className="text-xs text-red-400">{submit.error.message}</p> : null}

          <button
            onClick={() =>
              submit.mutate({
                strategyId,
                routeKey,
                direction: {
                  bigIdea: bigIdea.trim(),
                  insight: insight.trim(),
                  axe: axe.trim(),
                  pistes: pistes.split("\n").map((p) => p.trim()).filter(Boolean),
                },
              })
            }
            disabled={!canSubmit}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {submit.isPending ? "Envoi…" : "Soumettre la direction"}
          </button>

          <p className="text-xs text-zinc-500">
            Ta proposition arrive en file de validation chez l'opérateur (Voie B — La Guilde). La direction validée déclenche la production.
          </p>
        </div>
      )}

      {showSuccess ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg bg-emerald-500 px-4 py-3 text-white shadow-lg">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Proposition soumise</p>
            <p className="text-xs text-emerald-100">En attente de validation par l'opérateur.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
