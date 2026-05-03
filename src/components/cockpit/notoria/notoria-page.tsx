"use client";

/**
 * NOTORIA — Centre de Commandement des Recommandations NETERU
 *
 * 4 sections:
 *   1. Engine Health (completion levels par pilier)
 *   2. Mission Launcher (stepper R+T → ADVE → I → S + bouton primaire contextuel + dropdown avancé)
 *   3. Pending Recos (tabbed by pillar, grouped by sectionGroup)
 *   4. Batch History & KPIs
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import type { PillarKey } from "@/domain/pillars";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { getFieldLabel } from "@/components/cockpit/field-renderers";
import { Stepper, type StepperStep } from "@/components/primitives/stepper";
import {
  Sparkles, Loader2, CheckCircle, ThumbsUp, ThumbsDown,
  ChevronRight, ChevronDown, Zap, Rocket, Route, Eye, Shield,
  AlertTriangle, Clock, ArrowRight, Undo2,
} from "lucide-react";
import Link from "next/link";

// ── Pillar labels ─────────────────────────────────────────────────

const PILLAR_LABELS: Record<string, string> = {
  a: "Authenticite", d: "Distinction", v: "Valeur", e: "Engagement",
  r: "Risk", t: "Track", i: "Potentiel", s: "Strategie",
};

const COMPLETION_COLORS: Record<string, string> = {
  INCOMPLET: "bg-error/15 text-error",
  COMPLET: "bg-blue-500/15 text-blue-300",
  FULL: "bg-emerald-500/15 text-emerald-300",
};

const IMPACT_COLORS: Record<string, string> = {
  HIGH: "bg-error/15 text-error",
  MEDIUM: "bg-amber-500/15 text-amber-300",
  LOW: "bg-white/10 text-foreground-muted",
};

const OP_LABELS: Record<string, { label: string; color: string }> = {
  SET: { label: "Remplacer", color: "bg-orange-500/15 text-orange-300" },
  ADD: { label: "Ajouter", color: "bg-emerald-500/15 text-emerald-300" },
  MODIFY: { label: "Modifier", color: "bg-blue-500/15 text-blue-300" },
  REMOVE: { label: "Supprimer", color: "bg-error/15 text-error" },
  EXTEND: { label: "Enrichir", color: "bg-accent/15 text-accent" },
};

const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  NOW: { label: "Urgent", color: "text-error" },
  SOON: { label: "Recommande", color: "text-amber-300" },
  LATER: { label: "Optionnel", color: "text-foreground-muted" },
};

// ── Component ─────────────────────────────────────────────────────

export function NotoriaPage() {
  const strategyId = useCurrentStrategyId();
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [selectedRecos, setSelectedRecos] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  // ── Queries ──
  const dashboardQuery = trpc.notoria.getDashboard.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  // For "pending" tab: show PENDING + ACCEPTED (not yet applied)
  // For "history" tab: show all statuses
  const recosQuery = trpc.notoria.getRecos.useQuery(
    {
      strategyId: strategyId ?? "",
      status: activeTab === "history" ? undefined : undefined, // no status filter — we filter client-side
      targetPillarKey: (selectedPillar?.toUpperCase() ?? undefined) as PillarKey | undefined,
      limit: 200,
    },
    { enabled: !!strategyId },
  );

  const pipelineQuery = trpc.notoria.getPipelineStatus.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  const batchesQuery = trpc.notoria.getBatches.useQuery(
    { strategyId: strategyId ?? "", limit: 10 },
    { enabled: !!strategyId },
  );

  // ── Mutations ──
  const generateMutation = trpc.notoria.generateBatch.useMutation({
    onSuccess: () => { recosQuery.refetch(); dashboardQuery.refetch(); },
  });
  const acceptMutation = trpc.notoria.acceptRecos.useMutation({
    onSuccess: () => { recosQuery.refetch(); dashboardQuery.refetch(); },
  });
  const rejectMutation = trpc.notoria.rejectRecos.useMutation({
    onSuccess: () => { recosQuery.refetch(); dashboardQuery.refetch(); },
  });
  const applyMutation = trpc.notoria.applyRecos.useMutation({
    onSuccess: () => { recosQuery.refetch(); dashboardQuery.refetch(); },
  });
  const pipelineMutation = trpc.notoria.launchPipeline.useMutation({
    onSuccess: () => pipelineQuery.refetch(),
  });
  const advanceMutation = trpc.notoria.advancePipeline.useMutation({
    onSuccess: () => pipelineQuery.refetch(),
  });
  const [rtVetoMessage, setRtVetoMessage] = useState<string | null>(null);
  const actualizeRTMutation = trpc.notoria.actualizeRT.useMutation({
    onSuccess: () => { dashboardQuery.refetch(); recosQuery.refetch(); setRtVetoMessage(null); },
    onError: (err: { message?: string }) => {
      // ADR-0030 Axe 3 — gate RTIS_CASCADE refusé : ADVE pas prêt
      const msg = err?.message ?? "Veille R+T refusée";
      if (msg.includes("readiness/RTIS_CASCADE") || msg.includes("ReadinessVetoError")) {
        setRtVetoMessage("ADVE n'est pas prêt pour la cascade R+T. Compléter A/D/V/E à 100% (au moins ENRICHED) avant de lancer la veille.");
      } else {
        setRtVetoMessage(msg);
      }
    },
  });

  if (!strategyId) return <SkeletonPage />;

  const dashboard = dashboardQuery.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRecos: any[] = recosQuery.data?.items ?? [];
  const pipeline = pipelineQuery.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batches: any[] = batchesQuery.data ?? [];
  const isMutating = generateMutation.isPending || acceptMutation.isPending || rejectMutation.isPending || applyMutation.isPending;

  // Split recos: actionable (PENDING + ACCEPTED) vs history (APPLIED/REJECTED/REVERTED/EXPIRED)
  const actionableRecos = allRecos.filter((r) => r.status === "PENDING" || r.status === "ACCEPTED");
  const historyRecos = allRecos.filter((r) => r.status !== "PENDING" && r.status !== "ACCEPTED");
  const recos = activeTab === "pending" ? actionableRecos : historyRecos;

  // Pillar tabs with counts (actionable, not just PENDING)
  const countByPillar: Record<string, number> = {};
  for (const r of actionableRecos) {
    countByPillar[r.targetPillarKey] = (countByPillar[r.targetPillarKey] ?? 0) + 1;
  }

  const pillarTabs = ["a", "d", "v", "e", "i", "s"].map((k) => ({
    key: k,
    label: PILLAR_LABELS[k] ?? k,
    count: countByPillar[k] ?? 0,
    level: (dashboard?.completionLevels?.[k] ?? "INCOMPLET") as string,
  }));

  const totalPending = actionableRecos.length;

  // ── Stepper state — derive from pipeline + completion levels ──────
  // ADR-0030 Axe 3 — ADVE est step 1 (socle fondateur). R+T n'est step 2 que
  // si ADVE est prêt (adveReady). C'est cohérent avec gate RTIS_CASCADE côté
  // serveur (notoria.actualizeRT throw ReadinessVetoError sinon).
  const cl = dashboard?.completionLevels ?? {};
  const isReady = (k: string) => cl[k] === "COMPLET" || cl[k] === "FULL";
  // adveReady accepte aussi le seuil RTIS_CASCADE canonique (ENRICHED via stage)
  // — mais le dashboard ne renvoie que completionLevel, donc on s'en tient au
  // plus strict (COMPLET|FULL) côté UI. Cohérent avec notoria-page existant.
  const adveReady = isReady("a") && isReady("d") && isReady("v") && isReady("e");
  const rtReady = isReady("r") && isReady("t");
  const iReady = isReady("i");
  const sReady = isReady("s");

  // Identifie la 1ère page ADVE non-prête pour CTA "Compléter ADVE".
  const ADVE_PAGE_BY_KEY: Record<string, string> = {
    a: "identity", d: "positioning", v: "offer", e: "engagement",
  };
  const firstAdveGapKey = ["a", "d", "v", "e"].find((k) => !isReady(k));
  const firstAdveGapHref = firstAdveGapKey
    ? `/cockpit/brand/${ADVE_PAGE_BY_KEY[firstAdveGapKey]}`
    : null;

  const stage = pipeline?.currentStage ?? 0;
  const stageInReview = (n: number) =>
    pipeline?.stages.find((s) => s.stage === n)?.status === "REVIEW";
  const stagePending = (n: number) =>
    pipeline?.stages.find((s) => s.stage === n)?.pendingRecos ?? 0;

  type Step = 1 | 2 | 3 | 4 | "DONE";
  let currentStep: Step = "DONE";
  if (!adveReady || stageInReview(1)) currentStep = 1;
  else if (!rtReady) currentStep = 2;
  else if (!iReady || stageInReview(2)) currentStep = 3;
  else if (!sReady || stageInReview(3)) currentStep = 4;

  const stepStatus = (n: 1 | 2 | 3 | 4): StepperStep["status"] => {
    if (currentStep === n) return "current";
    if (currentStep === "DONE") return "done";
    if (typeof currentStep === "number" && currentStep > n) return "done";
    return "pending";
  };

  const stepperSteps: StepperStep[] = [
    { label: "ADVE", description: "Authenticité, Distinction, Valeur, Engagement (socle fondateur)", status: stepStatus(1) },
    { label: "Risque + Track", description: "Veille marché + signaux concurrentiels", status: stepStatus(2) },
    { label: "Potentiel (I)", description: "Innovation cataloguée", status: stepStatus(3) },
    { label: "Stratégie (S)", description: "Synthèse + roadmap", status: stepStatus(4) },
  ];

  // ── Primary contextual action ─────────────────────────────────────
  type PrimaryAction = {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled: boolean;
    variant: "go" | "wait" | "done";
  };
  const goIcon = generateMutation.isPending || pipelineMutation.isPending || actualizeRTMutation.isPending || advanceMutation.isPending
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : null;
  const anyPending = generateMutation.isPending || pipelineMutation.isPending || actualizeRTMutation.isPending || advanceMutation.isPending;

  let primary: PrimaryAction;
  if (currentStep === 1) {
    // ADR-0030 Axe 3 — step 1 ADVE : guider vers piliers ADVE incomplets.
    if (!adveReady && firstAdveGapHref) {
      // Au moins un pilier ADVE pas COMPLET → CTA navigation vers la page pilier
      // (où le panneau needsHuman ADR-0030 PR-1 guide la saisie).
      primary = {
        label: `Compléter ${firstAdveGapKey?.toUpperCase()} (pilier non prêt)`,
        icon: <ChevronRight className="h-4 w-4" />,
        onClick: () => { window.location.href = firstAdveGapHref; },
        disabled: false,
        variant: "go",
      };
    } else if (stage === 0) {
      // ADVE prêt mais pipeline pas démarré → option de raffiner ADVE via Notoria.
      primary = {
        label: "Démarrer le pipeline ADVERTIS",
        icon: goIcon ?? <Zap className="h-4 w-4" />,
        onClick: () => pipelineMutation.mutate({ strategyId: strategyId! }),
        disabled: anyPending,
        variant: "go",
      };
    } else if (stage === 1 && stagePending(1) > 0) {
      primary = {
        label: `Traitez les ${stagePending(1)} reco(s) ADVE ci-dessous`,
        icon: <ChevronRight className="h-4 w-4" />,
        onClick: () => {},
        disabled: true,
        variant: "wait",
      };
    } else if (stage === 1) {
      primary = {
        label: "Avancer → lancer la veille R+T",
        icon: goIcon ?? <ArrowRight className="h-4 w-4" />,
        onClick: () => advanceMutation.mutate({ strategyId: strategyId! }),
        disabled: anyPending,
        variant: "go",
      };
    } else {
      primary = {
        label: "Actualiser ADVE",
        icon: goIcon ?? <Sparkles className="h-4 w-4" />,
        onClick: () => generateMutation.mutate({ strategyId: strategyId!, missionType: "ADVE_UPDATE" }),
        disabled: anyPending,
        variant: "go",
      };
    }
  } else if (currentStep === 2) {
    // Step 2 = R+T (gate RTIS_CASCADE côté serveur garantit ADVE prêt en amont)
    primary = {
      label: "Lancer la veille R + T",
      icon: goIcon ?? <Shield className="h-4 w-4" />,
      onClick: () => actualizeRTMutation.mutate({ strategyId: strategyId!, pillars: ["R", "T"] }),
      disabled: anyPending,
      variant: "go",
    };
  } else if (currentStep === 3) {
    if (stage === 2 && stagePending(2) > 0) {
      primary = {
        label: `Traitez les ${stagePending(2)} reco(s) Potentiel ci-dessous`,
        icon: <ChevronRight className="h-4 w-4" />,
        onClick: () => {},
        disabled: true,
        variant: "wait",
      };
    } else if (stage === 2) {
      primary = {
        label: "Avancer → synthétiser Stratégie (S)",
        icon: goIcon ?? <ArrowRight className="h-4 w-4" />,
        onClick: () => advanceMutation.mutate({ strategyId: strategyId! }),
        disabled: anyPending,
        variant: "go",
      };
    } else {
      primary = {
        label: "Générer Potentiel (I)",
        icon: goIcon ?? <Rocket className="h-4 w-4" />,
        onClick: () => generateMutation.mutate({ strategyId: strategyId!, missionType: "I_GENERATION" }),
        disabled: anyPending,
        variant: "go",
      };
    }
  } else if (currentStep === 4) {
    if (stage === 3 && stagePending(3) > 0) {
      primary = {
        label: `Traitez les ${stagePending(3)} reco(s) Stratégie ci-dessous`,
        icon: <ChevronRight className="h-4 w-4" />,
        onClick: () => {},
        disabled: true,
        variant: "wait",
      };
    } else if (stage === 3) {
      primary = {
        label: "Finaliser le pipeline",
        icon: goIcon ?? <CheckCircle className="h-4 w-4" />,
        onClick: () => advanceMutation.mutate({ strategyId: strategyId! }),
        disabled: anyPending,
        variant: "go",
      };
    } else {
      primary = {
        label: "Synthétiser Stratégie (S)",
        icon: goIcon ?? <Route className="h-4 w-4" />,
        onClick: () => generateMutation.mutate({ strategyId: strategyId!, missionType: "S_SYNTHESIS" }),
        disabled: anyPending,
        variant: "go",
      };
    }
  } else {
    primary = {
      label: "ADVERTIS complété ✓",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => {},
      disabled: true,
      variant: "done",
    };
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      {/* ═══ Section 1: Engine Health ═══════════════════════════════ */}
      <div className="rounded-lg border border-white/5 bg-surface-raised p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h1 className="text-lg font-bold text-white">Notoria</h1>
            <span className="text-xs text-foreground-muted">Moteur de Recommandation</span>
          </div>
          {totalPending > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
              {totalPending} en attente
            </span>
          )}
        </div>

        {/* Completion levels per pillar */}
        <div className="flex flex-wrap gap-2">
          {["a", "d", "v", "e", "r", "t", "i", "s"].map((k) => {
            const level = (dashboard?.completionLevels?.[k] ?? "INCOMPLET") as string;
            return (
              <div key={k} className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-foreground-muted uppercase">{k}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${COMPLETION_COLORS[level] ?? "bg-white/5 text-foreground-muted"}`}>
                  {level}
                </span>
              </div>
            );
          })}
        </div>

      </div>

      {/* ═══ Section 2: Mission Launcher ═══════════════════════════ */}
      <div className="rounded-lg border border-white/5 bg-surface-raised p-4 space-y-4">
        <div className="overflow-x-auto">
          <Stepper steps={stepperSteps} className="min-w-fit" />
        </div>

        {/* ADR-0030 Axe 3 — gate RTIS_CASCADE veto message */}
        {rtVetoMessage ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <div className="flex-1">{rtVetoMessage}</div>
            <button onClick={() => setRtVetoMessage(null)} className="text-amber-300/60 hover:text-amber-200">✕</button>
          </div>
        ) : null}

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={primary.onClick}
            disabled={primary.disabled}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed ${
              primary.variant === "go"
                ? "bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                : primary.variant === "wait"
                  ? "bg-amber-500/15 text-amber-300 disabled:opacity-100"
                  : "bg-emerald-500/15 text-emerald-300 disabled:opacity-100"
            }`}
          >
            {primary.icon}
            {primary.label}
          </button>

          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground-muted hover:bg-white/10 [&::-webkit-details-marker]:hidden">
              Avancé
              <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-lg border border-white/10 bg-surface-raised p-1 shadow-xl">
              <button
                onClick={() => actualizeRTMutation.mutate({ strategyId: strategyId!, pillars: ["R", "T"] })}
                disabled={anyPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                <Shield className="h-3.5 w-3.5 text-error" />
                Re-lancer R + T
              </button>
              <button
                onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "ADVE_UPDATE" })}
                disabled={anyPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Re-générer recos ADVE
              </button>
              <button
                onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "I_GENERATION" })}
                disabled={anyPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                <Rocket className="h-3.5 w-3.5 text-orange-300" />
                Re-générer Potentiel (I)
              </button>
              <button
                onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "S_SYNTHESIS" })}
                disabled={anyPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                <Route className="h-3.5 w-3.5 text-pink-300" />
                Re-synthétiser Stratégie (S)
              </button>
              <div className="my-1 border-t border-white/5" />
              <button
                onClick={() => pipelineMutation.mutate({ strategyId: strategyId! })}
                disabled={anyPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                Relancer le pipeline complet
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* ═══ Tab bar: Pending / History ════════════════════════════ */}
      <div className="flex gap-4 border-b border-white/5">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-2 text-sm font-medium transition-colors ${activeTab === "pending" ? "text-white border-b-2 border-amber-400" : "text-foreground-muted hover:text-white"}`}
        >
          En attente ({totalPending})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2 text-sm font-medium transition-colors ${activeTab === "history" ? "text-white border-b-2 border-amber-400" : "text-foreground-muted hover:text-white"}`}
        >
          Historique
        </button>
      </div>

      {/* ═══ Section 3: Reco Panel ═════════════════════════════════ */}
      {activeTab === "pending" && (
        <>
          {/* Pillar tabs */}
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedPillar(null)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${!selectedPillar ? "bg-white/10 text-white" : "text-foreground-muted hover:text-white"}`}
            >
              Tous
            </button>
            {pillarTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedPillar(tab.key === selectedPillar ? null : tab.key)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${selectedPillar === tab.key ? "bg-white/10 text-white" : "text-foreground-muted hover:text-white"}`}
              >
                {tab.label}
                {tab.count > 0 && <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 text-[9px] text-amber-300">{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Batch actions */}
          {recos.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Accept all PENDING */}
              {recos.some((r) => r.status === "PENDING") && (
                <button
                  onClick={() => {
                    const ids = recos.filter((r) => r.status === "PENDING").map((r) => r.id);
                    if (ids.length > 0) acceptMutation.mutate({ strategyId: strategyId!, recoIds: ids });
                  }}
                  disabled={isMutating}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40"
                >
                  <CheckCircle className="h-3 w-3" /> Tout accepter ({recos.filter((r) => r.status === "PENDING").length})
                </button>
              )}
              {/* Apply all ACCEPTED */}
              {recos.some((r) => r.status === "ACCEPTED") && (
                <button
                  onClick={() => {
                    const ids = recos.filter((r) => r.status === "ACCEPTED").map((r) => r.id);
                    if (ids.length > 0) applyMutation.mutate({ strategyId: strategyId!, recoIds: ids });
                  }}
                  disabled={isMutating}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 disabled:opacity-40"
                >
                  <Zap className="h-3 w-3" /> Appliquer tout ({recos.filter((r) => r.status === "ACCEPTED").length})
                </button>
              )}
              {/* Accept + Apply selection */}
              <button
                onClick={() => {
                  const ids = Array.from(selectedRecos);
                  if (ids.length === 0) return;
                  // Accept PENDING ones, then apply all selected
                  const pendingIds = ids.filter((id) => recos.find((r) => r.id === id)?.status === "PENDING");
                  if (pendingIds.length > 0) {
                    acceptMutation.mutate({ strategyId: strategyId!, recoIds: pendingIds });
                  }
                  // Apply ACCEPTED ones
                  const acceptedIds = ids.filter((id) => recos.find((r) => r.id === id)?.status === "ACCEPTED");
                  if (acceptedIds.length > 0) {
                    applyMutation.mutate({ strategyId: strategyId!, recoIds: acceptedIds });
                  }
                  setSelectedRecos(new Set());
                }}
                disabled={selectedRecos.size === 0 || isMutating}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-accent/10 text-accent/70 hover:bg-accent/20 disabled:opacity-40"
              >
                <ThumbsUp className="h-3 w-3" /> Selection ({selectedRecos.size})
              </button>
              {/* Reject all PENDING */}
              {recos.some((r) => r.status === "PENDING") && (
                <button
                  onClick={() => {
                    const ids = recos.filter((r) => r.status === "PENDING").map((r) => r.id);
                    if (ids.length > 0) rejectMutation.mutate({ strategyId: strategyId!, recoIds: ids });
                  }}
                  disabled={isMutating}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-error/20 text-error hover:bg-error/30 disabled:opacity-40"
                >
                  <ThumbsDown className="h-3 w-3" /> Rejeter
                </button>
              )}
            </div>
          )}

          {/* Reco cards */}
          <div className="space-y-2 max-h-[36rem] overflow-y-auto">
            {recos.length === 0 && (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-foreground-muted">
                Aucune recommandation en attente.
              </div>
            )}
            {recos.map((reco) => {
              const isSelected = selectedRecos.has(reco.id);
              const op = OP_LABELS[reco.operation] ?? { label: reco.operation, color: "bg-white/10 text-foreground-muted" };
              const impact = IMPACT_COLORS[reco.impact] ?? IMPACT_COLORS.LOW!;
              const urgency = URGENCY_LABELS[reco.urgency] ?? URGENCY_LABELS.SOON!;
              const advantages = Array.isArray(reco.advantages) ? reco.advantages as string[] : [];
              const disadvantages = Array.isArray(reco.disadvantages) ? reco.disadvantages as string[] : [];

              return (
                <div
                  key={reco.id}
                  onClick={() => {
                    if (reco.status !== "PENDING" && reco.status !== "ACCEPTED") return;
                    const s = new Set(selectedRecos);
                    if (isSelected) s.delete(reco.id); else s.add(reco.id);
                    setSelectedRecos(s);
                  }}
                  className={`rounded-lg border p-3 transition-colors ${
                    reco.status !== "PENDING" && reco.status !== "ACCEPTED"
                      ? "border-white/5 bg-white/[0.01] opacity-60"
                      : isSelected
                        ? "cursor-pointer border-emerald-500/30 bg-emerald-500/10"
                        : "cursor-pointer border-white/5 bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Header: op + field + pillar + impact + urgency + source + confidence */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${op.color}`}>{op.label}</span>
                        <span className="text-xs font-medium text-white">{getFieldLabel(reco.targetField)}</span>
                        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{PILLAR_LABELS[reco.targetPillarKey] ?? reco.targetPillarKey}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${impact}`}>{reco.impact}</span>
                        <span className={`text-[9px] font-medium ${urgency.color}`}>{urgency.label}</span>
                        <span className="rounded-full bg-white/5 px-1 py-0.5 text-[8px] text-foreground-muted">{reco.source}</span>
                        <span className={`text-[8px] ${reco.confidence >= 0.7 ? "text-emerald-400" : reco.confidence >= 0.5 ? "text-amber-300" : "text-error"}`}>
                          {Math.round(reco.confidence * 100)}%
                        </span>
                        {reco.validationWarning && (
                          <span title={reco.validationWarning}><AlertTriangle className="h-3 w-3 text-amber-400" /></span>
                        )}
                        {/* Always show status badge */}
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          reco.status === "PENDING" ? "bg-amber-500/15 text-amber-300" :
                          reco.status === "ACCEPTED" ? "bg-blue-500/15 text-blue-300" :
                          reco.status === "APPLIED" ? "bg-emerald-500/15 text-emerald-300" :
                          reco.status === "REJECTED" ? "bg-error/15 text-error" :
                          reco.status === "REVERTED" ? "bg-orange-500/15 text-orange-300" :
                          "bg-white/5 text-foreground-muted"
                        }`}>{reco.status}</span>
                      </div>

                      {/* Explain */}
                      <p className="text-[11px] text-foreground-muted mb-1">{reco.explain}</p>

                      {/* Advantages / Disadvantages (collapsible) */}
                      {(advantages.length > 0 || disadvantages.length > 0) && (
                        <details className="mb-2">
                          <summary className="text-[10px] text-foreground-muted/60 cursor-pointer hover:text-foreground-muted">
                            Avantages/Risques
                          </summary>
                          <div className="mt-1 space-y-0.5 pl-2">
                            {advantages.map((a, i) => (
                              <div key={i} className="flex items-start gap-1 text-[10px] text-emerald-300/70">
                                <span className="shrink-0">+</span><span>{a}</span>
                              </div>
                            ))}
                            {disadvantages.map((d, i) => (
                              <div key={i} className="flex items-start gap-1 text-[10px] text-error/70">
                                <span className="shrink-0">-</span><span>{d}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Proposed value preview */}
                      {reco.proposedValue != null && (
                        <div className="rounded border border-white/5 bg-black/20 p-2">
                          <p className="text-[9px] text-emerald-400/70 uppercase tracking-wide mb-0.5">
                            {reco.operation === "ADD" ? "A ajouter" : reco.operation === "REMOVE" ? "A supprimer" : "Propose"}
                          </p>
                          <div className="text-[11px] text-white/70 line-clamp-4">
                            {typeof reco.proposedValue === "string"
                              ? reco.proposedValue
                              : JSON.stringify(reco.proposedValue, null, 1).slice(0, 200)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selection checkbox (for PENDING + ACCEPTED) */}
                    {(reco.status === "PENDING" || reco.status === "ACCEPTED") && (
                      <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isSelected ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/20"}`}>
                        {isSelected && <CheckCircle className="h-3 w-3" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ Section 4: History ════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {/* Recent batches */}
          <h3 className="text-sm font-semibold text-foreground-muted">Batches recents</h3>
          {batches.length === 0 && (
            <p className="text-xs text-foreground-muted/50">Aucun batch genere.</p>
          )}
          {batches.map((batch) => (
            <div key={batch.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">{batch.missionType}</span>
                  <span className="text-[10px] text-foreground-muted">
                    {new Date(batch.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-foreground-muted">{batch.totalRecos} recos</span>
                  {batch.appliedCount > 0 && <span className="text-emerald-300">{batch.appliedCount} appliquees</span>}
                  {batch.rejectedCount > 0 && <span className="text-error">{batch.rejectedCount} rejetees</span>}
                  {batch.pendingCount > 0 && <span className="text-amber-300">{batch.pendingCount} en attente</span>}
                </div>
              </div>
            </div>
          ))}

          {/* Applied recos list (from the general query with no status filter) */}
          <h3 className="text-sm font-semibold text-foreground-muted mt-4">Recommandations traitees</h3>
          <div className="space-y-2 max-h-[24rem] overflow-y-auto">
            {recos.filter((r) => r.status !== "PENDING").map((reco) => {
              const op = OP_LABELS[reco.operation] ?? { label: reco.operation, color: "bg-white/10" };
              return (
                <div key={reco.id} className="rounded border border-white/5 bg-white/[0.01] p-2 opacity-70">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className={`rounded px-1 py-0.5 font-bold ${op.color}`}>{op.label}</span>
                    <span className="text-white/70">{getFieldLabel(reco.targetField)}</span>
                    <span className="text-foreground-muted">{PILLAR_LABELS[reco.targetPillarKey]}</span>
                    <span className={`ml-auto rounded-full px-1.5 py-0.5 font-bold ${
                      reco.status === "APPLIED" ? "bg-emerald-500/15 text-emerald-300" :
                      reco.status === "REJECTED" ? "bg-error/15 text-error" :
                      reco.status === "REVERTED" ? "bg-orange-500/15 text-orange-300" :
                      "bg-white/5 text-foreground-muted"
                    }`}>{reco.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
