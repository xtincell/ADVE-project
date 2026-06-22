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
import { type StepperStep } from "@/components/primitives/stepper";
import {
  Sparkles, Loader2, CheckCircle, ThumbsUp, ThumbsDown,
  ChevronRight, ChevronDown, Zap, Rocket, Route, Shield,
  AlertTriangle, ArrowRight,
} from "lucide-react";
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

// Reskin (handoff design) — op/urgency tone codes for the ck-nz markup.
const OP_RESKIN: Record<string, { label: string; c: string }> = {
  SET: { label: "Remplacer", c: "orange" }, ADD: { label: "Ajouter", c: "emerald" },
  MODIFY: { label: "Modifier", c: "blue" }, REMOVE: { label: "Supprimer", c: "red" },
  EXTEND: { label: "Enrichir", c: "accent" },
};
const URG_RESKIN: Record<string, { label: string; c: string }> = {
  NOW: { label: "Urgent", c: "ko" }, SOON: { label: "Recommandé", c: "warn" }, LATER: { label: "Optionnel", c: "muted" },
};
// Cascade canon (operator) : ADVE → R+T → Jehuty → Notoria → I → S.
const NZ_CELLFLOW: Array<{ label: string; on?: boolean; passive?: boolean }> = [
  { label: "ADVE" }, { label: "R + T" }, { label: "Jehuty", passive: true },
  { label: "Notoria", on: true }, { label: "I" }, { label: "S" },
];

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

  // ── Engine Health note (canon cascade guidance) ──
  const healthNote = !adveReady
    ? <>ADVE pas encore consolidé. <b>{firstAdveGapKey?.toUpperCase()}</b> bloque la cascade R+T — complétez-le pour débloquer le pipeline.</>
    : !rtReady
      ? <>ADVE consolidé. Lancez la <b>veille R + T</b> pour nourrir Jehuty puis Notoria.</>
      : <>Cascade ouverte — Notoria applique les recommandations issues de <b>R+T</b> vers I puis S.</>;

  return (
    <div className="ck-nz">
      {/* ─ Cascade flow (ADVE → R+T → Jehuty ▸ Notoria → I → S) ─ */}
      <div className="ck-cellflow">
        {NZ_CELLFLOW.map((n, i) => (
          <div key={n.label} style={{ display: "contents" }}>
            <span className="ck-cellflow__node" data-on={n.on ? 1 : 0} data-passive={n.passive ? 1 : 0}>{n.label}</span>
            {i < NZ_CELLFLOW.length - 1 ? <span className="ck-cellflow__arr"><ChevronRight /></span> : null}
          </div>
        ))}
      </div>

      {/* ═══ Section 1: Engine Health ═══════════════════════════════ */}
      <div className="ck-nz__card">
        <div className="ck-nz__health-head">
          <div className="ck-nz__brand">
            <span className="ck-nz__brand-ic"><Sparkles /></span>
            <h1>Notoria</h1>
            <span className="ck-nz__brand-sub">Moteur de Recommandation</span>
          </div>
          {totalPending > 0 && <span className="ck-nz__pending-pill">{totalPending} en attente</span>}
        </div>

        {/* Completion levels per pillar — Phase 21 F-A.5 (ADR-0069), stale-aware */}
        <div className="ck-nz__chips">
          {[...PILLAR_STORAGE_KEYS].map((k) => {
            const status = chipStatus(k);
            const tone = status.variant === "full" || status.variant === "complet" ? "ok"
              : status.variant === "stale" || status.variant === "stale-advisory" ? "stale"
              : "muted";
            return (
              <div key={k} className="ck-nz__chip">
                <span className="ck-nz__chip-k">{k}</span>
                <span
                  className="ck-nz__chip-v" data-tone={tone}
                  title={
                    status.variant === "stale-advisory"
                      ? "Mise à jour recommandée — un pilier amont a muté, mais le contenu actuel reste utilisable. La cascade R+T peut tourner pour produire les recos qui rafraîchiront ce pilier."
                      : status.variant === "stale"
                        ? "Pilier périmé — contenu insuffisant ET un pilier amont a muté. Compléter d'abord pour débloquer la cascade."
                        : undefined
                  }
                >{status.label}</span>
              </div>
            );
          })}
        </div>
        <p className="ck-nz__health-note"><Sparkles /> {healthNote}</p>
      </div>

      {/* ═══ Section 2: Mission Launcher ═══════════════════════════ */}
      <div className="ck-nz__card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="ck-nz__stepper">
          {stepperSteps.map((s, i) => (
            <div className="ck-nz__step" data-st={s.status} key={i}>
              <span className="ck-nz__step-n">{s.status === "done" ? <CheckCircle /> : i + 1}</span>
              <div className="ck-nz__step-b">
                <span className="ck-nz__step-l">{s.label}</span>
                <span className="ck-nz__step-d">{s.description}</span>
              </div>
              {i < stepperSteps.length - 1 ? <span className="ck-nz__step-arr"><ChevronRight /></span> : null}
            </div>
          ))}
        </div>

        {/* ADR-0030 Axe 3 — gate RTIS_CASCADE veto message */}
        {rtVetoMessage ? (
          <div className="ck-nz__veto">
            <AlertTriangle />
            <span>{rtVetoMessage}</span>
            <button onClick={() => setRtVetoMessage(null)}>✕</button>
          </div>
        ) : null}

        <div className="ck-nz__launch">
          <button className="ck-nz__primary" data-variant={primary.variant} onClick={primary.onClick} disabled={primary.disabled}>
            {primary.icon}{primary.label}
          </button>

          <details className="ck-nz__adv">
            <summary className="ck-nz__adv-btn">Avancé<ChevronDown /></summary>
            <div className="ck-nz__adv-menu">
              <button onClick={() => actualizeRTMutation.mutate({ strategyId: strategyId!, pillars: ["R", "T"] })} disabled={anyPending}>
                <Shield style={{ color: "var(--danger)" }} />Re-lancer R + T
              </button>
              <button onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "ADVE_UPDATE" })} disabled={anyPending}>
                <Sparkles style={{ color: "var(--accent)" }} />Re-générer recos ADVE
              </button>
              <button onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "I_GENERATION" })} disabled={anyPending}>
                <Rocket style={{ color: "var(--warning)" }} />Re-générer Potentiel (I)
              </button>
              {/* ADR-0088 — function-calling generation (typed mutations by id) */}
              <button onClick={() => generateTypedMutation.mutate({ strategyId: strategyId! })} disabled={anyPending || generateTypedMutation.isPending}>
                <Zap style={{ color: "var(--accent)" }} />Générer recos ciblées (function-calling)
              </button>
              <button onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "S_SYNTHESIS" })} disabled={anyPending}>
                <Route style={{ color: "var(--danger)" }} />Re-synthétiser Stratégie (S)
              </button>
              <div className="ck-nz__adv-sep" />
              <button onClick={() => pipelineMutation.mutate({ strategyId: strategyId! })} disabled={anyPending}>
                <Zap style={{ color: "var(--warning)" }} />Relancer le pipeline complet
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* ═══ Tab bar: Pending / History ════════════════════════════ */}
      <div className="ck-nz__tabbar">
        <button data-on={activeTab === "pending" ? 1 : 0} onClick={() => setActiveTab("pending")}>En attente ({totalPending})</button>
        <button data-on={activeTab === "history" ? 1 : 0} onClick={() => setActiveTab("history")}>Historique</button>
      </div>

      {/* ═══ Section 3: Reco Panel ═════════════════════════════════ */}
      {activeTab === "pending" && (
        <>
          {/* Pillar tabs */}
          <div className="ck-nz__ptabs">
            <button data-on={!selectedPillar ? 1 : 0} onClick={() => setSelectedPillar(null)}>Tous</button>
            {pillarTabs.map((tab) => (
              <button key={tab.key} data-on={selectedPillar === tab.key ? 1 : 0} onClick={() => setSelectedPillar(tab.key === selectedPillar ? null : tab.key)}>
                {tab.label}{tab.count > 0 && <span className="ck-nz__ptab-n">{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Apply feedback banner */}
          {applyFeedback && (
            <div className="ck-nz__feedback" data-t={applyFeedback.type}>
              <span>{applyFeedback.message}</span>
              <button onClick={() => setApplyFeedback(null)}>✕</button>
            </div>
          )}

          {/* Batch actions */}
          {recos.length > 0 && (
            <div className="ck-nz__batch">
              {recos.some((r) => r.status === "PENDING") && (
                <button className="ck-nz__bb emerald" disabled={isMutating}
                  onClick={() => { const ids = recos.filter((r) => r.status === "PENDING").map((r) => r.id); if (ids.length > 0) acceptMutation.mutate({ strategyId: strategyId!, recoIds: ids }); }}>
                  <CheckCircle /> Tout accepter ({recos.filter((r) => r.status === "PENDING").length})
                </button>
              )}
              {recos.some((r) => r.status === "ACCEPTED") && (
                <button className="ck-nz__bb blue" disabled={isMutating}
                  onClick={() => { setApplyFeedback(null); const ids = recos.filter((r) => r.status === "ACCEPTED").map((r) => r.id); if (ids.length > 0) applyMutation.mutate({ strategyId: strategyId!, recoIds: ids }); }}>
                  <Zap /> Appliquer tout ({recos.filter((r) => r.status === "ACCEPTED").length})
                </button>
              )}
              <button className="ck-nz__bb accent" disabled={selectedRecoIds.length === 0 || isMutating}
                onClick={() => {
                  setApplyFeedback(null);
                  const ids = selectedRecoIds;
                  if (ids.length === 0) return;
                  const pendingIds = ids.filter((id) => recos.find((r) => r.id === id)?.status === "PENDING");
                  if (pendingIds.length > 0) acceptMutation.mutate({ strategyId: strategyId!, recoIds: pendingIds });
                  const acceptedIds = ids.filter((id) => recos.find((r) => r.id === id)?.status === "ACCEPTED");
                  if (acceptedIds.length > 0) applyMutation.mutate({ strategyId: strategyId!, recoIds: acceptedIds });
                  resetRecoQueue();
                }}>
                <ThumbsUp /> Sélection ({selectedRecoIds.length})
              </button>
              {recos.some((r) => r.status === "PENDING") && (
                <button className="ck-nz__bb red" disabled={isMutating}
                  onClick={() => { const ids = recos.filter((r) => r.status === "PENDING").map((r) => r.id); if (ids.length > 0) rejectMutation.mutate({ strategyId: strategyId!, recoIds: ids }); }}>
                  <ThumbsDown /> Rejeter
                </button>
              )}
            </div>
          )}

          {/* Reco cards */}
          <div className="ck-nz__recos">
            {recos.length === 0 && <div className="ck-nz__empty">Aucune recommandation en attente.</div>}
            {recos.map((reco) => {
              const isSelected = !!recoQueue[reco.id];
              const isActionable = reco.status === "PENDING" || reco.status === "ACCEPTED";
              const op = OP_RESKIN[reco.operation] ?? { label: reco.operation, c: "blue" };
              const urg = URG_RESKIN[reco.urgency] ?? URG_RESKIN.SOON!;
              const advantages = Array.isArray(reco.advantages) ? reco.advantages as string[] : [];
              const disadvantages = Array.isArray(reco.disadvantages) ? reco.disadvantages as string[] : [];
              const hasAnalysis = advantages.length > 0 || disadvantages.length > 0;
              return (
                <div
                  key={reco.id}
                  onClick={() => { if (!isActionable) return; if (isSelected) unstageReco(reco.id); else stageReco(reco.id, "ACCEPT"); }}
                  className={`ck-nz__reco${isSelected ? " is-sel" : ""}${!isActionable ? " is-done" : ""}`}
                >
                  <div className="ck-nz__reco-b">
                    <div className="ck-nz__reco-head">
                      <span className="ck-nz__op" data-c={op.c}>{op.label}</span>
                      <span className="ck-nz__reco-field">{getFieldLabel(reco.targetField)}</span>
                      <span className="ck-nz__reco-pillar">{PILLAR_LABELS[reco.targetPillarKey] ?? reco.targetPillarKey}</span>
                      <span className="ck-nz__reco-impact" data-i={reco.impact}>{reco.impact}</span>
                      <span className="ck-nz__reco-urg" data-c={urg.c}>{urg.label}</span>
                      <span className="ck-nz__reco-src">{reco.source}</span>
                      <span className="ck-nz__reco-conf" data-hi={reco.confidence >= 0.7 ? 1 : 0}>{Math.round(reco.confidence * 100)}%</span>
                      {/* ADR-0090 — score pondéré déterministe (ruler + impact + confidence) */}
                      {typeof reco.weightedScore === "number" && (
                        <span
                          className="ck-nz__reco-score" data-s={reco.weightedScore >= 70 ? "hi" : reco.weightedScore >= 50 ? "mid" : "lo"}
                          title={`Score pondéré ADR-0090 — ruler ${reco.rulerScore ?? "?"}/100 · impact ${reco.scoreImpactEstimate != null ? (reco.scoreImpactEstimate >= 0 ? "+" : "") + reco.scoreImpactEstimate : "n/a"} pts composite`}
                        >◈ {Math.round(reco.weightedScore)}</span>
                      )}
                      {reco.validationWarning && <span title={reco.validationWarning}><AlertTriangle className="h-3 w-3 text-warning" /></span>}
                      <span className="ck-nz__status" data-s={reco.status}>{reco.status}</span>
                    </div>

                    <p className="ck-nz__reco-explain">{reco.explain}</p>

                    {hasAnalysis && (
                      <details onClick={(e) => e.stopPropagation()}>
                        <summary className="ck-nz__reco-toggle">Avantages / Risques</summary>
                        <div className="ck-nz__reco-analysis">
                          {advantages.map((a, i) => <div key={`a${i}`} className="ok"><span>+</span>{a}</div>)}
                          {disadvantages.map((d, i) => <div key={`d${i}`} className="ko"><span>−</span>{d}</div>)}
                        </div>
                      </details>
                    )}

                    {reco.proposedValue != null && (
                      <div className="ck-nz__reco-diff">
                        <div className="ck-nz__diff-prop">
                          <span className="ck-nz__diff-l ok">{reco.operation === "ADD" ? "À ajouter" : reco.operation === "REMOVE" ? "À supprimer" : "Proposé"}</span>
                          {typeof reco.proposedValue === "string" ? reco.proposedValue : JSON.stringify(reco.proposedValue, null, 1).slice(0, 200)}
                        </div>
                      </div>
                    )}
                  </div>

                  {isActionable && (
                    <div className={`ck-nz__check${isSelected ? " on" : ""}`}>{isSelected && <CheckCircle />}</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ Section 4: History ════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="ck-nz__hist">
          <h3 className="ck-nz__hist-h">Batches récents</h3>
          {batches.length === 0 && <p className="text-xs text-foreground-muted">Aucun batch généré.</p>}
          {batches.map((batch) => (
            <div key={batch.id} className="ck-nz__batchrow">
              <div>
                <span className="ck-nz__batch-type">{batch.missionType}</span>
                <span className="ck-nz__batch-date">{new Date(batch.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="ck-nz__batch-stats">
                <span className="muted">{batch.totalRecos} recos</span>
                {batch.appliedCount > 0 && <span className="ok">{batch.appliedCount} appliquées</span>}
                {batch.rejectedCount > 0 && <span className="ko">{batch.rejectedCount} rejetées</span>}
                {batch.pendingCount > 0 && <span className="warn">{batch.pendingCount} en attente</span>}
              </div>
            </div>
          ))}

          <h3 className="ck-nz__hist-h" style={{ marginTop: 18 }}>Recommandations traitées</h3>
          {recos.filter((r) => r.status !== "PENDING").map((reco) => {
            const op = OP_RESKIN[reco.operation] ?? { label: reco.operation, c: "blue" };
            return (
              <div key={reco.id} className="ck-nz__histrow">
                <span className="ck-nz__op" data-c={op.c}>{op.label}</span>
                <span className="ck-nz__hist-field">{getFieldLabel(reco.targetField)}</span>
                <span className="ck-nz__hist-pillar">{PILLAR_LABELS[reco.targetPillarKey]}</span>
                <span className="ck-nz__status" data-s={reco.status}>{reco.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
