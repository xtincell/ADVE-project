"use client";

import { ADVE_STORAGE_KEYS, PILLAR_STORAGE_KEYS } from "@/domain";

/**
 * NOTORIA — Centre de Commandement des Recommandations NETERU
 *
 * 4 sections:
 *   1. Engine Health (completion levels par pilier)
 *   2. Mission Launcher (stepper R+T → ADVE → I → S + bouton primaire contextuel + dropdown avancé)
 *   3. Pending Recos (tabbed by pillar, grouped by sectionGroup)
 *   4. Batch History & KPIs
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
// ADR-0088 — reco review queue staged in the cockpit edit store (UI-local).
import { useCockpitEditStore } from "@/lib/stores/cockpit-edit-store";
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
// Phase 21 F-A.5 (ADR-0069) — source unique de vérité pour le rendu chip
// pillaire. Stale-aware via `byPillar[k]` exposé par notoria.getDashboard.
import { getPillarChipStatus, type PillarReadinessProjection } from "./lib/pillar-chip-status";

// ── Pillar labels ─────────────────────────────────────────────────

const PILLAR_LABELS: Record<string, string> = {
  a: "Authenticite", d: "Distinction", v: "Valeur", e: "Engagement",
  r: "Risk", t: "Track", i: "Potentiel", s: "Strategie",
};

// Phase 21 F-A.5 (ADR-0069) — `COMPLETION_COLORS` legacy retiré. Le mapping
// canonique vit dans `lib/pillar-chip-status.ts` qui inclut le statut PÉRIMÉ
// (stale-aware). Les chips lisent `getPillarChipStatus(byPillar[k])`.

const IMPACT_COLORS: Record<string, string> = {
  HIGH: "bg-error/15 text-error",
  MEDIUM: "bg-warning/15 text-warning",
  LOW: "bg-white/10 text-foreground-muted",
};

const OP_LABELS: Record<string, { label: string; color: string }> = {
  SET: { label: "Remplacer", color: "bg-warning/15 text-warning" },
  ADD: { label: "Ajouter", color: "bg-success/15 text-success" },
  MODIFY: { label: "Modifier", color: "bg-info/15 text-info" },
  REMOVE: { label: "Supprimer", color: "bg-error/15 text-error" },
  EXTEND: { label: "Enrichir", color: "bg-accent/15 text-accent" },
};

const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  NOW: { label: "Urgent", color: "text-error" },
  SOON: { label: "Recommande", color: "text-warning" },
  LATER: { label: "Optionnel", color: "text-foreground-muted" },
};

// ── Component ─────────────────────────────────────────────────────

export function NotoriaPage() {
  const strategyId = useCurrentStrategyId();
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  // ADR-0088 — selection/review queue lives in the Zustand cockpit edit store
  // (keyed recoId → "ACCEPT"). Server (Prisma) stays authoritative; this is
  // UI-local staging flushed via the accept/apply mutations.
  const recoQueue = useCockpitEditStore((s) => s.recoQueue);
  const stageReco = useCockpitEditStore((s) => s.stageReco);
  const unstageReco = useCockpitEditStore((s) => s.unstageReco);
  const resetRecoQueue = useCockpitEditStore((s) => s.reset);
  const selectedRecoIds = Object.keys(recoQueue);
  // The store is a global singleton — clear the staged queue when the operator
  // switches strategy so stale reco ids never leak across brands.
  useEffect(() => { resetRecoQueue(); }, [strategyId, resetRecoQueue]);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [applyFeedback, setApplyFeedback] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);

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
  // ADR-0088 — function-calling generation: typed-payload recos (by id).
  const generateTypedMutation = trpc.notoria.generateTypedRecommendations.useMutation({
    onSuccess: (data) => {
      recosQuery.refetch();
      dashboardQuery.refetch();
      setApplyFeedback(
        data.count > 0
          ? { type: "success", message: `${data.count} recommandation(s) ciblée(s) générée(s) (function-calling).` }
          : { type: "warning", message: "Aucune recommandation ciblée à générer (modèle déjà cohérent)." },
      );
    },
  });
  const acceptMutation = trpc.notoria.acceptRecos.useMutation({
    onSuccess: () => { recosQuery.refetch(); dashboardQuery.refetch(); },
  });
  const rejectMutation = trpc.notoria.rejectRecos.useMutation({
    onSuccess: () => { recosQuery.refetch(); dashboardQuery.refetch(); },
  });
  const applyMutation = trpc.notoria.applyRecos.useMutation({
    onSuccess: (data) => {
      recosQuery.refetch();
      dashboardQuery.refetch();
      if (data.applied === 0) {
        const detail = data.warnings.length > 0 ? ` — ${data.warnings[0]}` : "";
        setApplyFeedback({ type: "error", message: `Aucune recommandation appliquée${detail}` });
      } else if (data.warnings.length > 0) {
        setApplyFeedback({ type: "warning", message: `${data.applied} appliquée(s). Avertissements : ${data.warnings.join(" | ")}` });
      } else {
        setApplyFeedback({ type: "success", message: `${data.applied} recommandation(s) appliquée(s) au pilier.` });
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const isForbidden = err?.data?.code === "FORBIDDEN";
      setApplyFeedback({
        type: "error",
        message: isForbidden
          ? "Action réservée aux opérateurs — vérifiez votre rôle."
          : (err?.message ?? "Erreur lors de l'application des recommandations"),
      });
    },
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
  const isMutating = generateMutation.isPending || generateTypedMutation.isPending || acceptMutation.isPending || rejectMutation.isPending || applyMutation.isPending;

  // Split recos: actionable (PENDING + ACCEPTED) vs history (APPLIED/REJECTED/REVERTED/EXPIRED)
  const actionableRecos = allRecos.filter((r) => r.status === "PENDING" || r.status === "ACCEPTED");
  const historyRecos = allRecos.filter((r) => r.status !== "PENDING" && r.status !== "ACCEPTED");
  const recos = activeTab === "pending" ? actionableRecos : historyRecos;

  // Pillar tabs with counts (actionable, not just PENDING)
  const countByPillar: Record<string, number> = {};
  for (const r of actionableRecos) {
    countByPillar[r.targetPillarKey] = (countByPillar[r.targetPillarKey] ?? 0) + 1;
  }

  // Phase 21 F-A.5 (ADR-0069) — Source unique de vérité : `byPillar[k]`
  // dérivé côté serveur via `getStrategyReadiness()`. Shape stale-aware :
  // un pilier marqué `staleAt != null` apparaît "PÉRIMÉ" ici, jamais "COMPLET".
  const byPillar = (dashboard?.byPillar ?? {}) as Record<string, PillarReadinessProjection>;
  const chipStatus = (k: string) => {
    const p = byPillar[k];
    if (!p) {
      return getPillarChipStatus({
        completionLevel: "INCOMPLET",
        stage: "EMPTY",
        stale: false,
        displayLabel: "Vide",
        validationStatus: "DRAFT",
        rtisCascadeReady: false,
      });
    }
    return getPillarChipStatus(p);
  };

  const pillarTabs = ["a", "d", "v", "e", "i", "s"].map((k) => {
    const status = chipStatus(k);
    return {
      key: k,
      label: PILLAR_LABELS[k] ?? k,
      count: countByPillar[k] ?? 0,
      // `level` rendu legacy par le badge — on expose maintenant le label
      // canonique (peut être "PÉRIMÉ" si staleAt setté).
      level: status.label,
      chipClassName: status.className,
      shouldRegenerate: status.shouldRegenerate,
    };
  });

  const totalPending = actionableRecos.length;

  // ── Stepper state — derive from byPillar (canonical, stale-aware) ──
  // ADR-0069 — `isReady(k)` consulte maintenant `chipStatus(k).isReadyForCascade`
  // qui inclut le check stale. Cohérent avec `getStrategyReadiness().byPillar
  // [k].gates.RTIS_CASCADE.ok` côté serveur. Plus de drift entre la chip
  // (qui disait COMPLET) et le veto cascade (qui disait PILLAR_STALE).
  const isReady = (k: string) => chipStatus(k).isReadyForCascade;
  const adveReady = isReady("a") && isReady("d") && isReady("v") && isReady("e");
  const rtReady = isReady("r") && isReady("t");
  const iReady = isReady("i");
  const sReady = isReady("s");

  // Identifie la 1ère page ADVE non-prête pour CTA "Compléter ADVE".
  const ADVE_PAGE_BY_KEY: Record<string, string> = {
    a: "identity", d: "positioning", v: "offer", e: "engagement",
  };
  const firstAdveGapKey = [...ADVE_STORAGE_KEYS].find((k) => !isReady(k));
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
    // ── State DONE — pipeline ADVERTIS au plafond, mais Notoria DOIT
    //    continuer à proposer mieux. Une marque ICONE n'est jamais "finie" :
    //    le marché bouge, les superfans pivotent, l'Overton glisse. Le moteur
    //    reste actif pour produire un nouveau batch ADVE_UPDATE qui surfacera
    //    de nouvelles recommandations à arbitrer.
    primary = {
      label: "Générer de nouvelles améliorations",
      icon: goIcon ?? <Sparkles className="h-4 w-4" />,
      onClick: () => generateMutation.mutate({ strategyId: strategyId!, missionType: "ADVE_UPDATE" }),
      disabled: anyPending,
      variant: "go",
    };
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      {/* ═══ Section 1: Engine Health ═══════════════════════════════ */}
      <div className="rounded-lg border border-white/5 bg-surface-raised p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            <h1 className="text-lg font-bold text-white">Notoria</h1>
            <span className="text-xs text-foreground-muted">Moteur de Recommandation</span>
          </div>
          {totalPending > 0 && (
            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning">
              {totalPending} en attente
            </span>
          )}
        </div>

        {/* Completion levels per pillar — Phase 21 F-A.5 (ADR-0069) :
            stale-aware via `chipStatus(k)`. Un pilier `staleAt != null`
            apparaît "PÉRIMÉ" (amber) au lieu du label legacy "COMPLET". */}
        <div className="flex flex-wrap gap-2">
          {[...PILLAR_STORAGE_KEYS].map((k) => {
            const status = chipStatus(k);
            return (
              <div key={k} className="flex items-center gap-1.5">
                <span className="text-2xs font-medium text-foreground-muted uppercase">{k}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${status.className}`}
                  title={
                    // Phase 21 F-AB (ADR-0076) — tooltip différencié selon
                    // sévérité stale. Advisory = la cascade peut tourner ;
                    // Blocking = il faut compléter d'abord.
                    status.variant === "stale-advisory"
                      ? "Mise à jour recommandée — un pilier amont a muté, mais le contenu actuel reste utilisable. La cascade R+T peut tourner pour produire les recos qui rafraîchiront ce pilier."
                      : status.variant === "stale"
                        ? "Pilier périmé — contenu insuffisant ET un pilier amont a muté. Compléter d'abord pour débloquer la cascade."
                        : undefined
                  }
                >
                  {status.label}
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
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <div className="flex-1">{rtVetoMessage}</div>
            <button onClick={() => setRtVetoMessage(null)} className="text-warning/60 hover:text-warning">✕</button>
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
                  ? "bg-warning/15 text-warning disabled:opacity-100"
                  : "bg-success/15 text-success disabled:opacity-100"
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
                <Rocket className="h-3.5 w-3.5 text-warning" />
                Re-générer Potentiel (I)
              </button>
              {/* ADR-0088 — function-calling generation (typed mutations by id) */}
              <button
                onClick={() => generateTypedMutation.mutate({ strategyId: strategyId! })}
                disabled={anyPending || generateTypedMutation.isPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                <Zap className="h-3.5 w-3.5 text-accent" />
                Générer recos ciblées (function-calling)
              </button>
              <button
                onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "S_SYNTHESIS" })}
                disabled={anyPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                <Route className="h-3.5 w-3.5 text-error" />
                Re-synthétiser Stratégie (S)
              </button>
              <div className="my-1 border-t border-white/5" />
              <button
                onClick={() => pipelineMutation.mutate({ strategyId: strategyId! })}
                disabled={anyPending}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-white/5 disabled:opacity-40"
              >
                <Zap className="h-3.5 w-3.5 text-warning" />
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
          className={`pb-2 text-sm font-medium transition-colors ${activeTab === "pending" ? "text-white border-b-2 border-warning" : "text-foreground-muted hover:text-white"}`}
        >
          En attente ({totalPending})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2 text-sm font-medium transition-colors ${activeTab === "history" ? "text-white border-b-2 border-warning" : "text-foreground-muted hover:text-white"}`}
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
                {tab.count > 0 && <span className="ml-1 rounded-full bg-warning/20 px-1.5 text-[9px] text-warning">{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Apply feedback banner */}
          {applyFeedback && (
            <div className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
              applyFeedback.type === "success" ? "border-success/30 bg-success/10 text-success" :
              applyFeedback.type === "warning" ? "border-warning/30 bg-warning/10 text-warning" :
              "border-error/30 bg-error/10 text-error"
            }`}>
              <span className="flex-1">{applyFeedback.message}</span>
              <button onClick={() => setApplyFeedback(null)} className="shrink-0 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

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
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-success/20 text-success hover:bg-success/30 disabled:opacity-40"
                >
                  <CheckCircle className="h-3 w-3" /> Tout accepter ({recos.filter((r) => r.status === "PENDING").length})
                </button>
              )}
              {/* Apply all ACCEPTED */}
              {recos.some((r) => r.status === "ACCEPTED") && (
                <button
                  onClick={() => {
                    setApplyFeedback(null);
                    const ids = recos.filter((r) => r.status === "ACCEPTED").map((r) => r.id);
                    if (ids.length > 0) applyMutation.mutate({ strategyId: strategyId!, recoIds: ids });
                  }}
                  disabled={isMutating}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-info/20 text-info hover:bg-info/30 disabled:opacity-40"
                >
                  <Zap className="h-3 w-3" /> Appliquer tout ({recos.filter((r) => r.status === "ACCEPTED").length})
                </button>
              )}
              {/* Accept + Apply selection */}
              <button
                onClick={() => {
                  setApplyFeedback(null);
                  const ids = selectedRecoIds;
                  if (ids.length === 0) return;
                  const pendingIds = ids.filter((id) => recos.find((r) => r.id === id)?.status === "PENDING");
                  if (pendingIds.length > 0) {
                    acceptMutation.mutate({ strategyId: strategyId!, recoIds: pendingIds });
                  }
                  const acceptedIds = ids.filter((id) => recos.find((r) => r.id === id)?.status === "ACCEPTED");
                  if (acceptedIds.length > 0) {
                    applyMutation.mutate({ strategyId: strategyId!, recoIds: acceptedIds });
                  }
                  resetRecoQueue();
                }}
                disabled={selectedRecoIds.length === 0 || isMutating}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-accent/10 text-accent/70 hover:bg-accent/20 disabled:opacity-40"
              >
                <ThumbsUp className="h-3 w-3" /> Selection ({selectedRecoIds.length})
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
              const isSelected = !!recoQueue[reco.id];
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
                    if (isSelected) unstageReco(reco.id); else stageReco(reco.id, "ACCEPT");
                  }}
                  className={`rounded-lg border p-3 transition-colors ${
                    reco.status !== "PENDING" && reco.status !== "ACCEPTED"
                      ? "border-white/5 bg-white/[0.01] opacity-60"
                      : isSelected
                        ? "cursor-pointer border-success/30 bg-success/10"
                        : "cursor-pointer border-white/5 bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Header: op + field + pillar + impact + urgency + source + confidence */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`rounded px-1.5 py-0.5 text-2xs font-bold ${op.color}`}>{op.label}</span>
                        <span className="text-xs font-medium text-white">{getFieldLabel(reco.targetField)}</span>
                        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{PILLAR_LABELS[reco.targetPillarKey] ?? reco.targetPillarKey}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${impact}`}>{reco.impact}</span>
                        <span className={`text-[9px] font-medium ${urgency.color}`}>{urgency.label}</span>
                        <span className="rounded-full bg-white/5 px-1 py-0.5 text-[8px] text-foreground-muted">{reco.source}</span>
                        <span className={`text-[8px] ${reco.confidence >= 0.7 ? "text-success" : reco.confidence >= 0.5 ? "text-warning" : "text-error"}`}>
                          {Math.round(reco.confidence * 100)}%
                        </span>
                        {/* ADR-0090 — score pondéré déterministe (ruler + impact + confidence) */}
                        {typeof reco.weightedScore === "number" && (
                          <span
                            title={`Score pondéré ADR-0090 — ruler ${reco.rulerScore ?? "?"}/100 · impact ${reco.scoreImpactEstimate != null ? (reco.scoreImpactEstimate >= 0 ? "+" : "") + reco.scoreImpactEstimate : "n/a"} pts composite`}
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${reco.weightedScore >= 70 ? "bg-success/15 text-success" : reco.weightedScore >= 50 ? "bg-warning/15 text-warning" : "bg-error/15 text-error"}`}
                          >
                            ◈ {Math.round(reco.weightedScore)}
                          </span>
                        )}
                        {reco.validationWarning && (
                          <span title={reco.validationWarning}><AlertTriangle className="h-3 w-3 text-warning" /></span>
                        )}
                        {/* Always show status badge */}
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          reco.status === "PENDING" ? "bg-warning/15 text-warning" :
                          reco.status === "ACCEPTED" ? "bg-info/15 text-info" :
                          reco.status === "APPLIED" ? "bg-success/15 text-success" :
                          reco.status === "REJECTED" ? "bg-error/15 text-error" :
                          reco.status === "REVERTED" ? "bg-warning/15 text-warning" :
                          "bg-white/5 text-foreground-muted"
                        }`}>{reco.status}</span>
                      </div>

                      {/* Explain */}
                      <p className="text-2xs text-foreground-muted mb-1">{reco.explain}</p>

                      {/* Advantages / Disadvantages (collapsible) */}
                      {(advantages.length > 0 || disadvantages.length > 0) && (
                        <details className="mb-2">
                          <summary className="text-2xs text-foreground-muted/60 cursor-pointer hover:text-foreground-muted">
                            Avantages/Risques
                          </summary>
                          <div className="mt-1 space-y-0.5 pl-2">
                            {advantages.map((a, i) => (
                              <div key={i} className="flex items-start gap-1 text-2xs text-success/70">
                                <span className="shrink-0">+</span><span>{a}</span>
                              </div>
                            ))}
                            {disadvantages.map((d, i) => (
                              <div key={i} className="flex items-start gap-1 text-2xs text-error/70">
                                <span className="shrink-0">-</span><span>{d}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Proposed value preview */}
                      {reco.proposedValue != null && (
                        <div className="rounded border border-white/5 bg-black/20 p-2">
                          <p className="text-[9px] text-success/70 uppercase tracking-wide mb-0.5">
                            {reco.operation === "ADD" ? "A ajouter" : reco.operation === "REMOVE" ? "A supprimer" : "Propose"}
                          </p>
                          <div className="text-2xs text-white/70 line-clamp-4">
                            {typeof reco.proposedValue === "string"
                              ? reco.proposedValue
                              : JSON.stringify(reco.proposedValue, null, 1).slice(0, 200)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selection checkbox (for PENDING + ACCEPTED) */}
                    {(reco.status === "PENDING" || reco.status === "ACCEPTED") && (
                      <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isSelected ? "border-success bg-success text-black" : "border-white/20"}`}>
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
                  <span className="text-2xs text-foreground-muted">
                    {new Date(batch.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-2xs">
                  <span className="text-foreground-muted">{batch.totalRecos} recos</span>
                  {batch.appliedCount > 0 && <span className="text-success">{batch.appliedCount} appliquees</span>}
                  {batch.rejectedCount > 0 && <span className="text-error">{batch.rejectedCount} rejetees</span>}
                  {batch.pendingCount > 0 && <span className="text-warning">{batch.pendingCount} en attente</span>}
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
                  <div className="flex items-center gap-1.5 text-2xs">
                    <span className={`rounded px-1 py-0.5 font-bold ${op.color}`}>{op.label}</span>
                    <span className="text-white/70">{getFieldLabel(reco.targetField)}</span>
                    <span className="text-foreground-muted">{PILLAR_LABELS[reco.targetPillarKey]}</span>
                    <span className={`ml-auto rounded-full px-1.5 py-0.5 font-bold ${
                      reco.status === "APPLIED" ? "bg-success/15 text-success" :
                      reco.status === "REJECTED" ? "bg-error/15 text-error" :
                      reco.status === "REVERTED" ? "bg-warning/15 text-warning" :
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
