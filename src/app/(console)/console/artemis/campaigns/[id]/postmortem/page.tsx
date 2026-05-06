"use client";

/**
 * Console /console/artemis/campaigns/[id]/postmortem — Phase 19 Vague 3, ADR-0052-E.
 *
 * UI 12-step wizard pour conduire le postmortem canonique d'une Campaign.
 * Format de stockage : `CampaignReport.postmortemStructured: Json?` selon ADR-0052-E §2.
 *
 * Workflow ADR-0052-E §3 :
 *   1. Opérateur ouvre cette page à POST_CAMPAIGN (J+7 stabilisation Seshat)
 *   2. UI affiche les 12 questions canoniques (avec hint Glory tool LLM si dispo)
 *   3. Opérateur valide / amende les réponses
 *   4. Submit déclenche cascade :
 *      - reconcileCampaignToOracle → propose OPERATOR_AMEND_PILLAR_PROPOSAL[]
 *      - enrichVariableBibleFromCampaign → propose VBEnrichmentProposal[]
 *      - evaluateCrewPerformance → score CrewPerformance par membre
 *      - proposeSequencePromotionFromCampaign → si Q10 indique sequence
 *
 * Cf. docs/governance/adr/0056-postmortem-12q.md
 */

import { useParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertCircle,
  CheckCircle2,
  ScrollText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// 12 questions canoniques (ADR-0052-E §1)
// ─────────────────────────────────────────────────────────────────────────

interface PostmortemQuestion {
  readonly id: string;
  readonly axis: "Narrative" | "Mécanismes" | "Opérationnel" | "Capitalisation";
  readonly question: string;
  readonly hint?: string;
}

const QUESTIONS_12: readonly PostmortemQuestion[] = [
  {
    id: "q1",
    axis: "Narrative",
    question: "La Big Idea s'est-elle imposée ?",
    hint: "Preuve : adoption tokens sectoriels, mémorisation panel, share of voice.",
  },
  {
    id: "q2",
    axis: "Narrative",
    question: "Le Manifesto a-t-il été respecté par toutes les actions ?",
    hint: "Gap measurable : combien d'actions divergent du Manifesto fondateur ?",
  },
  {
    id: "q3",
    axis: "Mécanismes",
    question: "Quel mode manipulation a dominé en pratique vs prévu ?",
    hint: "Drift entre Strategy.manipulationMix et CampaignAction.manipulationModeApplied.",
  },
  {
    id: "q4",
    axis: "Mécanismes",
    question: "Combien d'évangélistes produits ?",
    hint: "Devotion ladder transitions tracées vers EVANGELISTE.",
  },
  {
    id: "q5",
    axis: "Mécanismes",
    question: "Combien de détracteurs émergents ?",
    hint: "Anti-superfans, polarisation sentiment.",
  },
  {
    id: "q6",
    axis: "Mécanismes",
    question: "L'axe Overton a-t-il bougé ?",
    hint: "Sectoriel : vocabulaire + sentiment + références médias post-LIVE.",
  },
  {
    id: "q7",
    axis: "Mécanismes",
    question: "Quels signaux faibles Tarsis non anticipés ?",
    hint: "Capture culturelle pendant LIVE — mèmes, communautés émergentes.",
  },
  {
    id: "q8",
    axis: "Opérationnel",
    question: "Quelle action a sur-performé / sous-performé ?",
    hint: "Postmortem KPI — meilleure et pire CampaignAction.",
  },
  {
    id: "q9",
    axis: "Opérationnel",
    question: "Quel pillar a régressé silencieusement ?",
    hint: "Loi 1 audit : altitudeRegression flag, byPillar deltas.",
  },
  {
    id: "q10",
    axis: "Capitalisation",
    question: "Quelle séquence Glory mérite promotion DRAFT→STABLE ?",
    hint: "Capitalisation : sequence runtime utilisée + tierDelta + reuses.",
  },
  {
    id: "q11",
    axis: "Capitalisation",
    question: "Quel apprentissage entre dans la variable-bible ?",
    hint: "Typed entry : claim X performe sur audience Y dans contexte Z.",
  },
  {
    id: "q12",
    axis: "Capitalisation",
    question: "Quelle est la prochaine campagne suggérée pour cette trajectoire ?",
    hint: "Chapter N+1 — myth arc continuity.",
  },
];

const AXIS_COLORS: Record<string, string> = {
  Narrative: "bg-violet-400/10 text-violet-400 ring-violet-400/30",
  Mécanismes: "bg-cyan-400/10 text-cyan-400 ring-cyan-400/30",
  Opérationnel: "bg-amber-400/10 text-amber-400 ring-amber-400/30",
  Capitalisation: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/30",
};

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

interface AnswerState {
  answer: string;
  score: number;
  evidenceUrls: string[];
}

export default function CampaignPostmortemPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Array.isArray(id) ? id[0] : id;

  const campaignQuery = trpc.campaign.get.useQuery(
    { id: campaignId ?? "" },
    { enabled: Boolean(campaignId) },
  );

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    Object.fromEntries(QUESTIONS_12.map((q) => [q.id, { answer: "", score: 0.5, evidenceUrls: [] }])),
  );
  const [submitted, setSubmitted] = useState(false);

  const reconcileQuery = trpc.campaignTracker.reconcileCampaignToOracle.useQuery(
    {
      strategyId: campaignQuery.data?.strategyId ?? "",
      campaignId: campaignId ?? "",
    },
    { enabled: submitted && Boolean(campaignQuery.data?.strategyId) },
  );

  const enrichVbQuery = trpc.campaignTracker.enrichVariableBibleFromCampaign.useQuery(
    {
      strategyId: campaignQuery.data?.strategyId ?? "",
      campaignId: campaignId ?? "",
    },
    { enabled: submitted && Boolean(campaignQuery.data?.strategyId) },
  );

  if (!campaignId) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Campaign introuvable"
        description="L'identifiant est manquant dans l'URL."
      />
    );
  }
  if (campaignQuery.isLoading) return <SkeletonPage />;
  if (!campaignQuery.data) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Campaign introuvable"
        description={`Aucune Campaign avec l'id ${campaignId}`}
      />
    );
  }

  const campaign = campaignQuery.data;
  const currentQ = QUESTIONS_12[step]!;
  const currentAns = answers[currentQ.id]!;
  const totalSteps = QUESTIONS_12.length;
  const isLast = step === totalSteps - 1;
  const completedCount = Object.values(answers).filter((a) => a.answer.length > 0).length;

  const updateAnswer = (field: keyof AnswerState, value: string | number | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: { ...prev[currentQ.id]!, [field]: value },
    }));
  };

  if (submitted) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title={`Postmortem ${campaign.name} — soumis`}
          description="Cascade en cours : reconcileCampaignToOracle + enrichVariableBibleFromCampaign + evaluateCrewPerformance."
        />

        <div className="flex items-center gap-2 rounded-lg bg-emerald-400/10 p-4 text-sm font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/30">
          <CheckCircle2 className="h-5 w-5" />
          Postmortem 12q soumis. Voir les propositions ci-dessous.
        </div>

        <section className="space-y-3">
          <header className="text-sm font-semibold text-foreground-secondary">
            Oracle reconciler — propositions OPERATOR_AMEND_PILLAR
          </header>
          {reconcileQuery.isLoading ? (
            <SkeletonPage />
          ) : reconcileQuery.data?.ok ? (
            reconcileQuery.data.proposals.length === 0 ? (
              <div className="rounded-lg bg-surface p-4 text-sm text-foreground-secondary ring-1 ring-inset ring-border">
                Aucune proposition générée.
              </div>
            ) : (
              <ul className="space-y-2">
                {reconcileQuery.data.proposals.map((p, i) => (
                  <li key={i} className="rounded-lg bg-surface p-3 text-xs ring-1 ring-inset ring-border">
                    <div className="font-mono text-cyan-400">
                      {p.pillarKey.toUpperCase()}.{p.fieldPath} — {p.mode}
                    </div>
                    <div className="mt-1 text-foreground-secondary">{p.rationale}</div>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </section>

        <section className="space-y-3">
          <header className="text-sm font-semibold text-foreground-secondary">
            Variable Bible — propositions enrichissement
          </header>
          {enrichVbQuery.isLoading ? (
            <SkeletonPage />
          ) : enrichVbQuery.data?.ok ? (
            enrichVbQuery.data.proposals.length === 0 ? (
              <div className="rounded-lg bg-surface p-4 text-sm text-foreground-secondary ring-1 ring-inset ring-border">
                Aucune action ≥0.7 coherence — pas de pattern à capitaliser.
              </div>
            ) : (
              <ul className="space-y-2">
                {enrichVbQuery.data.proposals.map((p, i) => (
                  <li key={i} className="rounded-lg bg-surface p-3 text-xs ring-1 ring-inset ring-border">
                    <div className="font-mono text-emerald-400">
                      {p.bibleScope} — confiance {p.confidence.toFixed(2)}
                    </div>
                    <div className="mt-1 text-foreground">{p.summary}</div>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </section>

        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="rounded bg-surface px-4 py-2 text-sm text-foreground ring-1 ring-inset ring-border hover:bg-surface-secondary"
        >
          Re-éditer le postmortem
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Postmortem ${campaign.name}`}
        description="12 questions canoniques (ADR-0052-E §1). Format machine-readable alimentant Oracle + variable-bible + Imhotep crew loop + sequences promoter."
      />

      {/* Progress + axe */}
      <div className="flex items-center justify-between rounded-lg bg-surface p-3 ring-1 ring-inset ring-border">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-foreground-secondary">
            {step + 1} / {totalSteps}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
              AXIS_COLORS[currentQ.axis] ?? AXIS_COLORS.Narrative
            }`}
          >
            {currentQ.axis}
          </span>
        </div>
        <div className="text-xs text-foreground-secondary">
          {completedCount} / {totalSteps} répondues
        </div>
      </div>

      {/* Question */}
      <div className="rounded-lg bg-surface p-6 ring-1 ring-inset ring-border">
        <div className="flex items-start gap-3">
          <ScrollText className="mt-1 h-5 w-5 flex-shrink-0 text-cyan-400" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{currentQ.question}</h3>
            {currentQ.hint && (
              <p className="mt-1 text-xs text-foreground-secondary">{currentQ.hint}</p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="text-xs font-medium text-foreground-secondary">Réponse</label>
          <textarea
            value={currentAns.answer}
            onChange={(e) => updateAnswer("answer", e.target.value)}
            rows={5}
            placeholder="Réponse factuelle — citations, chiffres, évidence URLs si dispo."
            className="w-full rounded border border-border bg-surface-secondary px-3 py-2 text-sm text-foreground"
          />

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-foreground-secondary">Score (0-1)</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={currentAns.score}
              onChange={(e) => updateAnswer("score", parseFloat(e.target.value))}
              className="w-24 rounded border border-border bg-surface-secondary px-2 py-1 text-sm text-foreground"
            />
            <span className="text-xs text-foreground-secondary">
              0 = totalement échoué · 1 = parfait
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground-secondary">
              Evidence URLs (1 par ligne)
            </label>
            <textarea
              value={currentAns.evidenceUrls.join("\n")}
              onChange={(e) =>
                updateAnswer(
                  "evidenceUrls",
                  e.target.value.split("\n").filter((u) => u.trim().length > 0),
                )
              }
              rows={2}
              placeholder="https://..."
              className="mt-1 w-full rounded border border-border bg-surface-secondary px-3 py-2 text-xs text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="inline-flex items-center gap-1 rounded bg-surface px-3 py-1.5 text-sm text-foreground ring-1 ring-inset ring-border hover:bg-surface-secondary disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </button>

        {!isLast ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
            className="inline-flex items-center gap-1 rounded bg-cyan-400/15 px-3 py-1.5 text-sm font-semibold text-cyan-400 ring-1 ring-inset ring-cyan-400/30 hover:bg-cyan-400/25"
          >
            Suivant
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={completedCount < 12}
            className="inline-flex items-center gap-1 rounded bg-emerald-400/15 px-4 py-1.5 text-sm font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-400/30 hover:bg-emerald-400/25 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Soumettre le postmortem
          </button>
        )}
      </div>
    </div>
  );
}
