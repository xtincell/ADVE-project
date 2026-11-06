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
import Link from "next/link";
import { RtisCascadeModal } from "@/components/cockpit/rtis-cascade-modal";
import { trpc } from "@/lib/trpc/client";
import { useCanOperate } from "@/components/cockpit/use-can-operate";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
// ADR-0088 — reco review queue staged in the cockpit edit store (UI-local).
import { useCockpitEditStore } from "@/lib/stores/cockpit-edit-store";
import type { PillarKey } from "@/domain/pillars";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { getFieldLabel } from "@/components/cockpit/field-renderers";
import { parseRecommendationPayload } from "@/lib/types/recommendation-payload";
import { ROUTE_SPECS } from "@/lib/strategy/roadmap-routes";
import {
  Sparkles, Loader2, CheckCircle, ThumbsUp, ThumbsDown,
  ChevronRight, ChevronDown, Zap, Rocket, Route, Shield,
  AlertTriangle, RefreshCw, FileText,
} from "lucide-react";
// Phase 21 F-A.5 (ADR-0069) — source unique de vérité pour le rendu chip
// pillaire. Stale-aware via `byPillar[k]` exposé par notoria.getDashboard.
import { getPillarChipStatus, getPillarProductionState, type PillarReadinessProjection } from "./lib/pillar-chip-status";

// ── Pillar labels ─────────────────────────────────────────────────

const PILLAR_LABELS: Record<string, string> = {
  a: "Authenticité", d: "Distinction", v: "Valeur", e: "Engagement",
  r: "Risques", t: "Trajectoire", i: "Potentiel", s: "Stratégie",
};

const IMPACT_LABEL: Record<string, string> = { HIGH: "Fort", MEDIUM: "Moyen", LOW: "Faible" };
const SOURCE_LABEL: Record<string, string> = {
  R: "Risques", T: "Trajectoire", "R+T": "Risques et trajectoire", VAULT: "Sources importées",
  INTAKE: "Brief initial", CROSS_PILLAR: "Analyse croisée", SESHAT: "Observations",
};

/** Describe an executable decision; keep actual field values visible for amendments. */
function typedProposalLabel(value: unknown): string | null {
  const payload = parseRecommendationPayload(value);
  if (!payload) return null;
  switch (payload.kind) {
    case "SELECT_INITIATIVE": return "Mettre l’action en favori dans le catalogue, sans la planifier.";
    case "REJECT_INITIATIVE": return `Rejeter l’action du catalogue des propositions : ${payload.reason}`;
    case "ADD_INITIATIVE": return `Ajouter l’action « ${payload.initiative.action} » aux propositions.`;
    case "LINK_RISK": return "Associer l’action au risque indiqué.";
    case "SET_RISK_STATUS": return `Marquer le risque « ${{ UNMITIGATED: "Non atténué", MITIGATED: "Atténué", ACCEPTED: "Accepté" }[payload.status]} ».`;
    case "SELECT_ROADMAP_ROUTE": return `Choisir le scénario « ${ROUTE_SPECS.find(route => route.key === payload.routeKey)!.label} » et recalculer le plan.`;
    case "UPDATE_ADVE_FIELD": return null;
  }
}

function applicationWarningLabel(warning: string): string {
  if (warning.includes("FIELD_PROVENANCE_REFUSED")) return "Une décision humaine existante empêche ce changement. Relisez le choix conservé avant de modifier l’action.";
  if (warning.includes("PILLAR_SOURCE_VERSION_CONFLICT")) return "Vos données ont changé depuis cette proposition. Rechargez la stratégie avant de réessayer.";
  if (warning.startsWith("Validation:") || warning.startsWith("Bible[WARN]:")) return "Le plan reste partiel. Relisez et complétez votre stratégie avant de l’approuver.";
  return "Un point d’application reste à vérifier dans votre stratégie.";
}

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
// Statuts de reco traduits — plus d'enum brut à l'écran (lot 11, [M04-03]).
const STATUS_RESKIN: Record<string, string> = {
  PENDING: "En attente", ACCEPTED: "Acceptée", APPLIED: "Appliquée",
  REJECTED: "Rejetée", DISMISSED: "Écartée", EXPIRED: "Expirée",
};
const MISSION_TYPE_RESKIN: Record<string, string> = {
  ADVE_UPDATE: "Amélioration fondation",
  I_GENERATION: "Génération Potentiel (I)",
  S_SYNTHESIS: "Synthèse Stratégie (S)",
};
// Cascade canon (interne : ADVE → R+T → Jehuty → Notoria → I → S) — libellés
// client business (lot 11, [M04-01]) ; les lettres ADVE/R/T/I/S restent en
// attente de la décision Lot 0 (statut client des lettres de piliers).
const NZ_CELLFLOW = [
  { label: "Fondation", href: "/cockpit/brand/fondation" },
  { label: "Diagnostic R + T", href: "/cockpit/brand/market" },
  { label: "Gazette", href: "/cockpit/brand/jehuty" },
  { label: "Recommandations", href: "/cockpit/brand/notoria", on: true },
  { label: "Catalogue I", href: "/cockpit/brand/potential" },
  { label: "Stratégie S", href: "/cockpit/brand/roadmap" },
];

// ── Component ─────────────────────────────────────────────────────

export function NotoriaPage() {
  const strategyId = useCurrentStrategyId();
  const [cascadeOpen, setCascadeOpen] = useState(false);
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
  const [activeTab, setActiveTab] = useState<"pending" | "review" | "history">("pending");
  const [applyFeedback, setApplyFeedback] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);

  // ── Queries ──
  const dashboardQuery = trpc.notoria.getDashboard.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  // For "pending" tab: show PENDING + ACCEPTED (not yet applied)
  // For "history" tab: show all statuses
  const recosQuery = trpc.notoria.getRecos.useInfiniteQuery(
    {
      strategyId: strategyId ?? "",
      comparePending: activeTab !== "history",
      targetPillarKey: (selectedPillar?.toUpperCase() ?? undefined) as PillarKey | undefined,
      limit: 200,
    },
    { enabled: !!strategyId, getNextPageParam: page => page.nextCursor },
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
    onSuccess: () => {
      recosQuery.refetch(); dashboardQuery.refetch(); batchesQuery.refetch();
      setApplyFeedback({ type: "success", message: "Analyse terminée. Les propositions sont disponibles dans la file ci-dessous ou dans l’historique. Leur génération ne modifie pas votre marque." });
    },
    onError: (error) => setApplyFeedback({ type: "error", message: error.message }),
  });
  // ADR-0088 — function-calling generation: typed-payload recos (by id).
  const generateTypedMutation = trpc.notoria.generateTypedRecommendations.useMutation({
    onSuccess: (data) => {
      recosQuery.refetch();
      dashboardQuery.refetch();
      setApplyFeedback(
        data.count > 0
          ? { type: "success", message: `${data.count} recommandation(s) ciblée(s) générée(s).` }
          : { type: "warning", message: "Aucune proposition applicable aux actions et risques disponibles." },
      );
    },
  });
  // Recos ancrées dans les sources importées (vault) — comble le trou
  // « Notoria ignore les sources ».
  const generateFromVaultMutation = trpc.notoria.generateFromVault.useMutation({
    onSuccess: (data) => {
      recosQuery.refetch();
      dashboardQuery.refetch();
      setApplyFeedback(
        data.noSources
          ? { type: "warning", message: "Aucune source importée — ajoute des documents dans l'onglet Sources." }
          : data.count > 0
            ? { type: "success", message: `${data.count} recommandation(s) générée(s) depuis les sources importées.` }
            : { type: "warning", message: "Sources scannées — aucune divergence vs le modèle actuel." },
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
        const detail = data.warnings.length > 0 ? ` — ${applicationWarningLabel(data.warnings[0]!)}` : "";
        setApplyFeedback({ type: "error", message: `Aucune recommandation appliquée${detail}` });
      } else if (data.warnings.length > 0) {
        const details = [...new Set(data.warnings.map(applicationWarningLabel))].join(" ");
        setApplyFeedback({ type: "warning", message: `${data.applied} recommandation(s) appliquée(s). ${details}` });
      } else {
        setApplyFeedback({ type: "success", message: `${data.applied} recommandation(s) appliquée(s).` });
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
    onSuccess: (result) => {
      dashboardQuery.refetch(); recosQuery.refetch();
      const failures = Object.values(result).filter((entry) => !entry.updated || entry.error);
      setRtVetoMessage(failures.length ? "Le diagnostic reste partiel. Consultez les résultats avant de relancer." : null);
    },
    onError: (err: { message?: string }) => {
      // ADR-0030 Axe 3 — gate RTIS_CASCADE refusé : ADVE pas prêt
      const msg = err?.message ?? "Veille R+T refusée";
      if (msg.includes("readiness/RTIS_CASCADE") || msg.includes("ReadinessVetoError")) {
        setRtVetoMessage("Vos fondations ne sont pas encore assez complètes pour lancer la veille. Renseignez d'abord vos quatre piliers fondateurs.");
      } else {
        setRtVetoMessage(msg);
      }
    },
  });

  // Founders are not operators (init.ts operatorProcedure) — declared ICI avec
  // les autres hooks, AVANT l'early return, sinon Rules of Hooks violée
  // (React #310 : useCanOperate sauté au rendu !strategyId).
  const canOperate = useCanOperate();

  if (!strategyId || dashboardQuery.isLoading) return <SkeletonPage />;
  if (dashboardQuery.error || !dashboardQuery.data) return (
    <div role="alert" className="rounded-xl border border-border p-6">
      <p>Impossible de lire l’état de votre marque.</p>
      <button className="mt-3 text-accent underline" onClick={() => dashboardQuery.refetch()}>Réessayer</button>
    </div>
  );

  const dashboard = dashboardQuery.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRecos: any[] = recosQuery.data?.pages.flatMap(page => page.items) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batches: any[] = batchesQuery.data ?? [];
  // Founders are not operators (init.ts operatorProcedure) — accepting/applying
  // recommendations is handled by the UPgraders team. Surface that honestly:
  // disable the controls + show a read-only banner, instead of click→FORBIDDEN.
  // (`canOperate` déclaré plus haut avec les autres hooks — Rules of Hooks.)
  const isMutating = generateMutation.isPending || generateTypedMutation.isPending || generateFromVaultMutation.isPending || acceptMutation.isPending || rejectMutation.isPending || applyMutation.isPending || !canOperate;

  // Split recos: actionable (PENDING + ACCEPTED) vs history (APPLIED/REJECTED/REVERTED/EXPIRED)
  const pendingRecos = allRecos.filter((r) => r.status === "PENDING" || r.status === "ACCEPTED");
  const actionableRecos = pendingRecos.filter(r => r.comparison?.shortlisted);
  const toReview = pendingRecos.filter(r => !r.comparison?.shortlisted);
  const historyRecos = allRecos.filter((r) => r.status !== "PENDING" && r.status !== "ACCEPTED");
  const recos = activeTab === "history" ? historyRecos : activeTab === "review" ? toReview : actionableRecos;

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
  const eligibleRecos = actionableRecos.filter(r => r.eligibleForApplication);

  // Readiness permits a run; freshness describes its stored result. Review
  // queues are a separate workflow, never the production history of I or S.
  const isReady = (k: string) => chipStatus(k).isReadyForCascade;
  const adveReady = ADVE_STORAGE_KEYS.every(isReady);
  const firstAdveGapKey = ADVE_STORAGE_KEYS.find((k) => !isReady(k));
  const advePages: Record<string, string> = { a: "identity", d: "positioning", v: "offer", e: "engagement" };
  const stepperSteps = [
    { label: "Fondation ADVE", keys: [...ADVE_STORAGE_KEYS], href: "/cockpit/brand/fondation" },
    { label: "Diagnostic R + T", keys: ["r", "t"], href: "/cockpit/brand/market" },
    { label: "Catalogue d’actions I", keys: ["i"], href: "/cockpit/brand/potential" },
    { label: "Plan stratégique S", keys: ["s"], href: "/cockpit/brand/roadmap" },
  ].map((step) => {
    const states = step.keys.map((k) => getPillarProductionState(byPillar[k]));
    const state = states.includes("missing") ? "missing" : states.includes("stale") ? "stale" : states.includes("partial") ? "partial" : "current";
    return { ...step, state, description: { missing: "À produire", stale: "Déjà produit · à réactualiser", partial: "Produit · à compléter", current: "Renseigné · à jour" }[state] };
  });
  const needsRefresh = stepperSteps.slice(1).some((step) => step.state !== "current");
  const anyPending = isMutating || pipelineMutation.isPending || actualizeRTMutation.isPending || advanceMutation.isPending || cascadeOpen;
  const primary = !adveReady && firstAdveGapKey ? {
    label: `Compléter ${PILLAR_LABELS[firstAdveGapKey]}`,
    onClick: () => { window.location.href = `/cockpit/brand/${advePages[firstAdveGapKey]}?strategy=${encodeURIComponent(strategyId)}`; },
    disabled: false,
  } : needsRefresh ? {
    label: "Réactualiser le diagnostic et le plan",
    onClick: () => setCascadeOpen(true), disabled: anyPending,
  } : {
    label: "Chercher des améliorations à la fondation",
    onClick: () => generateMutation.mutate({ strategyId, missionType: "ADVE_UPDATE" }), disabled: anyPending,
  };
  const healthNote = !adveReady
    ? `La fondation reste à compléter : ${PILLAR_LABELS[firstAdveGapKey ?? "a"]}.`
    : needsRefresh
      ? "La fondation permet le calcul. Le diagnostic, le catalogue ou le plan doivent être réactualisés pour reprendre ses dernières évolutions."
      : "La fondation, le diagnostic, le catalogue et le plan sont à jour. Vous pouvez examiner les propositions ou demander une nouvelle analyse.";

  return (
    <div className="ck-nz">
      {/* ─ Cascade flow (ADVE → R+T → Jehuty ▸ Notoria → I → S) ─ */}
      <nav className="ck-cellflow" aria-label="Parcours de la marque">
        {NZ_CELLFLOW.map((n, i) => (
          <div key={n.label} style={{ display: "contents" }}>
            <Link href={`${n.href}?strategy=${encodeURIComponent(strategyId)}`} className="ck-cellflow__node" aria-current={n.on ? "page" : undefined} data-on={n.on ? 1 : 0}>{n.label}</Link>
            {i < NZ_CELLFLOW.length - 1 ? <span className="ck-cellflow__arr"><ChevronRight /></span> : null}
          </div>
        ))}
      </nav>

      {/* ═══ Section 1: Engine Health ═══════════════════════════════ */}
      <div className="ck-nz__card">
        <div className="ck-nz__health-head">
          <div className="ck-nz__brand">
            <span className="ck-nz__brand-ic"><Sparkles /></span>
            <h1>Recommandations</h1>
            <span className="ck-nz__brand-sub">Propositions à examiner</span>
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
                      ? "Contenu déjà produit. Une information source a évolué ; relancez le calcul pour la prendre en compte."
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
            <div className="ck-nz__step" data-st={s.state === "current" ? "done" : s.state === "stale" ? "current" : "pending"} key={i}>
              <span className="ck-nz__step-n">{s.state === "current" ? <CheckCircle /> : s.state === "stale" ? <RefreshCw /> : i + 1}</span>
              <div className="ck-nz__step-b">
                <Link href={`${s.href}?strategy=${encodeURIComponent(strategyId)}`} className="ck-nz__step-l hover:underline">{s.label}</Link>
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

        {!canOperate ? (
          <div className="ck-nz__veto">
            <Sparkles />
            <span>Ces recommandations sont préparées et validées par votre équipe UPgraders. Vous pouvez les consulter ici en lecture seule.</span>
          </div>
        ) : null}

        <p className="text-sm text-foreground-secondary">
          {needsRefresh ? "Le bouton ouvre le détail du calcul avant son lancement : diagnostic R + T, catalogue I, puis plan S. La fondation reste conservée. La Gazette se rafraîchit séparément ; l’Oracle doit ensuite être rédigé à nouveau." : "L’analyse cherche des propositions pour améliorer la fondation. Elles attendent votre décision : aucun changement n’est appliqué à leur génération."}
        </p>
        <div className="ck-nz__launch">
          <button className="ck-nz__primary" data-variant="go" onClick={primary.onClick} disabled={primary.disabled}>
            {anyPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles />}{primary.label}
          </button>

          <details className="ck-nz__adv">
            <summary className="ck-nz__adv-btn">Avancé<ChevronDown /></summary>
            <div className="ck-nz__adv-menu">
              <p className="p-3 text-xs text-foreground-secondary">« Proposer » ajoute des recommandations à examiner. « Réactualiser » recalcule et enregistre le diagnostic.</p>
              <button onClick={() => actualizeRTMutation.mutate({ strategyId: strategyId!, pillars: ["R", "T"] })} disabled={anyPending}>
                <Shield style={{ color: "var(--danger)" }} />Réactualiser uniquement le diagnostic R + T
              </button>
              <button onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "ADVE_UPDATE" })} disabled={anyPending}>
                <Sparkles style={{ color: "var(--accent)" }} />Proposer des améliorations à la fondation
              </button>
              <button onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "I_GENERATION" })} disabled={anyPending}>
                <Rocket style={{ color: "var(--warning)" }} />Proposer des changements au catalogue I
              </button>
              {/* ADR-0088 — function-calling generation (typed mutations by id) */}
              <button onClick={() => generateTypedMutation.mutate({ strategyId: strategyId! })} disabled={anyPending || generateTypedMutation.isPending}>
                <Zap style={{ color: "var(--accent)" }} />Générer des recommandations ciblées
              </button>
              {/* Recos ancrées dans les sources importées (vault) */}
              <button onClick={() => generateFromVaultMutation.mutate({ strategyId: strategyId! })} disabled={anyPending || generateFromVaultMutation.isPending}>
                <FileText style={{ color: "var(--accent)" }} />Générer depuis les sources importées
              </button>
              <button onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "S_SYNTHESIS" })} disabled={anyPending}>
                <Route style={{ color: "var(--danger)" }} />Proposer des changements au plan S
              </button>
              <div className="ck-nz__adv-sep" />
              <button onClick={() => pipelineMutation.mutate({ strategyId: strategyId! })} disabled={anyPending}>
                <Zap style={{ color: "var(--warning)" }} />Démarrer une revue guidée de propositions
              </button>
            </div>
          </details>
        </div>
      </div>

      <RtisCascadeModal open={cascadeOpen} onOpenChange={setCascadeOpen} strategyId={strategyId} onCompleted={() => {
        dashboardQuery.refetch(); recosQuery.refetch(); pipelineQuery.refetch(); batchesQuery.refetch();
      }} />

      {/* ═══ Tab bar: Pending / History ════════════════════════════ */}
      <div className="ck-nz__tabbar">
        <button data-on={activeTab === "pending" ? 1 : 0} onClick={() => setActiveTab("pending")}>Présélection ({totalPending})</button>
        <button data-on={activeTab === "review" ? 1 : 0} onClick={() => setActiveTab("review")}>Autres propositions</button>
        <button data-on={activeTab === "history" ? 1 : 0} onClick={() => setActiveTab("history")}>Historique</button>
      </div>

      {/* ═══ Section 3: Reco Panel ═════════════════════════════════ */}
      {activeTab !== "history" && (
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
          {activeTab === "pending" && recos.length > 0 && (
            <div className="ck-nz__batch">
              {eligibleRecos.some((r) => r.status === "PENDING") && (
                <button className="ck-nz__bb emerald" disabled={isMutating}
                  onClick={() => { const ids = eligibleRecos.filter((r) => r.status === "PENDING").map((r) => r.id); if (ids.length > 0) acceptMutation.mutate({ strategyId: strategyId!, recoIds: ids }); }}>
                  <CheckCircle /> Tout accepter ({eligibleRecos.filter((r) => r.status === "PENDING").length})
                </button>
              )}
              {eligibleRecos.some((r) => r.status === "ACCEPTED") && (
                <button className="ck-nz__bb blue" disabled={isMutating}
                  onClick={() => { setApplyFeedback(null); const ids = eligibleRecos.filter((r) => r.status === "ACCEPTED").map((r) => r.id); if (ids.length > 0) applyMutation.mutate({ strategyId: strategyId!, recoIds: ids }); }}>
                  <Zap /> Appliquer tout ({eligibleRecos.filter((r) => r.status === "ACCEPTED").length})
                </button>
              )}
              <button className="ck-nz__bb accent" disabled={selectedRecoIds.length === 0 || isMutating}
                onClick={() => {
                  setApplyFeedback(null);
                  const ids = selectedRecoIds;
                  if (ids.length === 0) return;
                  const pendingIds = ids.filter((id) => eligibleRecos.find((r) => r.id === id)?.status === "PENDING");
                  if (pendingIds.length > 0) acceptMutation.mutate({ strategyId: strategyId!, recoIds: pendingIds });
                  const acceptedIds = ids.filter((id) => eligibleRecos.find((r) => r.id === id)?.status === "ACCEPTED");
                  if (acceptedIds.length > 0) applyMutation.mutate({ strategyId: strategyId!, recoIds: acceptedIds });
                  resetRecoQueue();
                }}>
                <ThumbsUp /> Sélection ({selectedRecoIds.length})
              </button>
              {eligibleRecos.some((r) => r.status === "PENDING") && (
                <button className="ck-nz__bb red" disabled={isMutating}
                  onClick={() => { const ids = eligibleRecos.filter((r) => r.status === "PENDING").map((r) => r.id); if (ids.length > 0) rejectMutation.mutate({ strategyId: strategyId!, recoIds: ids }); }}>
                  <ThumbsDown /> Rejeter
                </button>
              )}
            </div>
          )}

          {/* Reco cards */}
          <div className="ck-nz__recos">
            {recos.length === 0 && <div className="ck-nz__empty">{activeTab === "pending" ? "Aucune proposition présélectionnée dans cette liste." : "Aucune autre proposition dans cette liste."}</div>}
            {recos.map((reco) => {
              const proposalLabel = typedProposalLabel(reco.proposedValue);
              const isSelected = !!recoQueue[reco.id];
              const isActionable = activeTab === "pending" && reco.eligibleForApplication && (reco.status === "PENDING" || reco.status === "ACCEPTED");
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
                      <span className="ck-nz__reco-impact" data-i={reco.impact}>{IMPACT_LABEL[reco.impact] ?? "À qualifier"}</span>
                      <span className="ck-nz__reco-urg" data-c={urg.c}>{urg.label}</span>
                      <span className="ck-nz__reco-src">{SOURCE_LABEL[reco.source] ?? "Origine à qualifier"}</span>
                      <span className="ck-nz__reco-conf" data-hi={reco.confidence >= 0.7 ? 1 : 0}>{Math.round(reco.confidence * 100)}%</span>
                      {/* ADR-0090 — score pondéré déterministe (ruler + impact + confidence) */}
                      {typeof reco.weightedScore === "number" && (
                        <span
                          className="ck-nz__reco-score" data-s={reco.weightedScore >= 70 ? "hi" : reco.weightedScore >= 50 ? "mid" : "lo"}
                          title={`Score de priorité — qualité ${reco.rulerScore ?? "?"}/100 · impact ${reco.scoreImpactEstimate != null ? (reco.scoreImpactEstimate >= 0 ? "+" : "") + reco.scoreImpactEstimate : "n/a"} pts sur le score de marque`}
                        >◈ {Math.round(reco.weightedScore)}</span>
                      )}
                      {reco.validationWarning && <span title={reco.validationWarning}><AlertTriangle className="h-3 w-3 text-warning" /></span>}
                      <span className="ck-nz__status" data-s={reco.status}>{STATUS_RESKIN[reco.status] ?? reco.status}</span>
                    </div>

                    <p className="ck-nz__reco-explain">{reco.explain}</p>
                    {reco.comparison && <div className="text-sm text-foreground-secondary">
                      <strong>{reco.comparison.objective}</strong>
                      <p>{reco.comparison.reason}</p>
                      {reco.comparison.shortlisted && !reco.eligibleForApplication && <p>Alternative à conserver. Le gain reste sous la marge requise pour remplacer la valeur en place.</p>}
                      <small>{reco.comparison.criterion} · {reco.comparison.basis === "measurement" ? "Mesuré" : reco.comparison.basis === "structural" ? "Évaluation du champ" : "Projection"}</small>
                    </div>}

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
                          {proposalLabel ?? (typeof reco.proposedValue === "string" ? reco.proposedValue : JSON.stringify(reco.proposedValue, null, 1).slice(0, 200))}
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
                <span className="ck-nz__batch-type">{MISSION_TYPE_RESKIN[batch.missionType] ?? batch.missionType}</span>
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
      {recosQuery.hasNextPage && <button type="button" disabled={recosQuery.isFetchingNextPage}
        onClick={() => recosQuery.fetchNextPage()}>Charger la suite</button>}
    </div>
  );
}
