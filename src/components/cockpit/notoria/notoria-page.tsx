"use client";

/**
 * NOTORIA — Centre de Commandement des Recommandations NETERU
 *
 * 4 sections:
 *   1. Engine Health (ADVERTIS vector + completion levels + pipeline)
 *   2. Mission Launcher (4 mission buttons + pipeline)
 *   3. Pending Recos (tabbed by pillar, grouped by sectionGroup)
 *   4. Batch History & KPIs
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import type { PillarKey } from "@/domain/pillars";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { getFieldLabel } from "@/components/cockpit/field-renderers";
import {
  Sparkles, Loader2, CheckCircle, ThumbsUp, ThumbsDown,
  ChevronRight, Zap, Rocket, Route, Eye, Shield,
  AlertTriangle, Clock, ArrowRight, Undo2,
} from "lucide-react";
import Link from "next/link";

// ── Pillar labels ─────────────────────────────────────────────────

const PILLAR_LABELS: Record<string, string> = {
  a: "Authenticite", d: "Distinction", v: "Valeur", e: "Engagement",
  r: "Risk", t: "Track", i: "Potentiel", s: "Strategie",
};

const COMPLETION_COLORS: Record<string, string> = {
  INCOMPLET: "bg-red-500/15 text-red-300",
  COMPLET: "bg-blue-500/15 text-blue-300",
  FULL: "bg-emerald-500/15 text-emerald-300",
};

const IMPACT_COLORS: Record<string, string> = {
  HIGH: "bg-red-500/15 text-red-300",
  MEDIUM: "bg-amber-500/15 text-amber-300",
  LOW: "bg-white/10 text-foreground-muted",
};

const OP_LABELS: Record<string, { label: string; color: string }> = {
  SET: { label: "Remplacer", color: "bg-orange-500/15 text-orange-300" },
  ADD: { label: "Ajouter", color: "bg-emerald-500/15 text-emerald-300" },
  MODIFY: { label: "Modifier", color: "bg-blue-500/15 text-blue-300" },
  REMOVE: { label: "Supprimer", color: "bg-red-500/15 text-red-300" },
  EXTEND: { label: "Enrichir", color: "bg-violet-500/15 text-violet-300" },
};

const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  NOW: { label: "Urgent", color: "text-red-400" },
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
  const actualizeRTMutation = trpc.notoria.actualizeRT.useMutation({
    onSuccess: () => { dashboardQuery.refetch(); recosQuery.refetch(); },
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

        {/* Pipeline progress */}
        {pipeline && pipeline.currentStage > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-foreground-muted">Pipeline:</span>
            {pipeline.stages.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                  s.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-300" :
                  s.status === "REVIEW" ? "bg-amber-500/15 text-amber-300" :
                  s.status === "IN_PROGRESS" ? "bg-blue-500/15 text-blue-300" :
                  "bg-white/5 text-foreground-muted"
                }`}>
                  {s.missionType === "ADVE_UPDATE" ? "ADVE" : s.missionType === "I_GENERATION" ? "I" : "S"}
                  {s.status === "COMPLETED" ? " ✓" : s.status === "REVIEW" ? ` (${s.pendingRecos})` : ""}
                </span>
                {i < pipeline.stages.length - 1 && <ArrowRight className="h-3 w-3 text-foreground-muted/30" />}
              </div>
            ))}
            {pipeline.currentStage < 4 && (
              <button
                onClick={() => advanceMutation.mutate({ strategyId: strategyId! })}
                disabled={advanceMutation.isPending}
                className="ml-2 rounded px-2 py-0.5 text-[10px] font-medium bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40"
              >
                Avancer
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ Section 2: Mission Launcher ═══════════════════════════ */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => pipelineMutation.mutate({ strategyId: strategyId! })}
          disabled={pipelineMutation.isPending || (pipeline?.currentStage ?? 0) > 0}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600/20 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-600/30 disabled:opacity-40"
        >
          {pipelineMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          Completion ADVERTIS
        </button>
        <button
          onClick={() => actualizeRTMutation.mutate({ strategyId: strategyId!, pillars: ["R", "T"] })}
          disabled={actualizeRTMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-600/30 disabled:opacity-40"
        >
          {actualizeRTMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
          Lancer R+T
        </button>
        <button
          onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "ADVE_UPDATE" })}
          disabled={generateMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 px-3 py-2 text-xs font-medium text-violet-300 hover:bg-violet-600/30 disabled:opacity-40"
        >
          {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Actualiser ADVE
        </button>
        <button
          onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "I_GENERATION" })}
          disabled={generateMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600/20 px-3 py-2 text-xs font-medium text-orange-300 hover:bg-orange-600/30 disabled:opacity-40"
        >
          <Rocket className="h-3.5 w-3.5" /> Generer Potentiel
        </button>
        <button
          onClick={() => generateMutation.mutate({ strategyId: strategyId!, missionType: "S_SYNTHESIS" })}
          disabled={generateMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-pink-600/20 px-3 py-2 text-xs font-medium text-pink-300 hover:bg-pink-600/30 disabled:opacity-40"
        >
          <Route className="h-3.5 w-3.5" /> Synthetiser Strategie
        </button>
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
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-violet-600/10 text-violet-300/70 hover:bg-violet-600/20 disabled:opacity-40"
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
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-red-600/20 text-red-300 hover:bg-red-600/30 disabled:opacity-40"
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
                        <span className={`text-[8px] ${reco.confidence >= 0.7 ? "text-emerald-400" : reco.confidence >= 0.5 ? "text-amber-300" : "text-red-400"}`}>
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
                          reco.status === "REJECTED" ? "bg-red-500/15 text-red-300" :
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
                              <div key={i} className="flex items-start gap-1 text-[10px] text-red-300/70">
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
                  {batch.rejectedCount > 0 && <span className="text-red-300">{batch.rejectedCount} rejetees</span>}
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
                      reco.status === "REJECTED" ? "bg-red-500/15 text-red-300" :
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
