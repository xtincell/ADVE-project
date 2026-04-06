"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { AiBadge } from "@/components/shared/ai-badge";
import {
  Shield, Crosshair, Rocket, Brain, RefreshCw, Check, X,
  AlertTriangle, ChevronDown, ChevronUp, Zap, BarChart3,
  Target, TrendingUp, DollarSign, Users, Calendar, Layers,
  Eye, Activity, Gauge, FileText, ArrowRight, Play, Fingerprint,
  Sparkles, ThumbsUp, ThumbsDown, Trash2, Loader2, CheckCircle2, Circle, Lock,
} from "lucide-react";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type RTISKey = "R" | "T" | "I" | "S";

const RTIS_META: Record<RTISKey, { label: string; full: string; icon: React.ElementType; accent: string; border: string; bg: string; description: string }> = {
  R: {
    label: "R", full: "Risk", icon: Shield, accent: "text-red-400", border: "border-red-800/40", bg: "bg-red-500/10",
    description: "SWOT interne : forces, faiblesses, menaces et opportunites de la marque",
  },
  T: {
    label: "T", full: "Track", icon: Crosshair, accent: "text-sky-400", border: "border-sky-800/40", bg: "bg-sky-500/10",
    description: "SWOT externe : marche, concurrence, tendances, validation terrain, TAM/SAM/SOM",
  },
  I: {
    label: "I", full: "Implementation", icon: Rocket, accent: "text-orange-400", border: "border-orange-800/40", bg: "bg-orange-500/10",
    description: "Catalogue exhaustif du potentiel d'action : assets, formats, canaux, activations",
  },
  S: {
    label: "S", full: "Strategy", icon: Brain, accent: "text-pink-400", border: "border-pink-800/40", bg: "bg-pink-500/10",
    description: "Fenetre d'Overton, plan d'action, roadmap pour creer des superfans",
  },
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-zinc-500/15 text-zinc-400 border-zinc-600/30" },
  AI_PROPOSED: { label: "IA Propose", color: "bg-amber-500/15 text-amber-300 border-amber-600/30" },
  VALIDATED: { label: "Valide", color: "bg-emerald-500/15 text-emerald-300 border-emerald-600/30" },
  LOCKED: { label: "Verrouille", color: "bg-violet-500/15 text-violet-300 border-violet-600/30" },
};

function safeStr(val: unknown, fb = ""): string {
  return typeof val === "string" ? val : typeof val === "number" ? String(val) : fb;
}
function safeNum(val: unknown, fb = 0): number {
  return typeof val === "number" ? val : fb;
}
function safeArr(val: unknown): Record<string, unknown>[] {
  return Array.isArray(val) ? val : [];
}

// ============================================================================
// ADVE RECOMMENDATIONS PANEL (must be before RTISPage for Turbopack)
// ============================================================================

type ADVEKey = "A" | "D" | "V" | "E";
const ADVE_META: Record<ADVEKey, { label: string; full: string; accent: string; border: string; bg: string }> = {
  A: { label: "A", full: "Authenticite", accent: "text-violet-400", border: "border-violet-800/40", bg: "bg-violet-500/10" },
  D: { label: "D", full: "Distinction", accent: "text-blue-400", border: "border-blue-800/40", bg: "bg-blue-500/10" },
  V: { label: "V", full: "Valeur", accent: "text-emerald-400", border: "border-emerald-800/40", bg: "bg-emerald-500/10" },
  E: { label: "E", full: "Engagement", accent: "text-amber-400", border: "border-amber-800/40", bg: "bg-amber-500/10" },
};

const IMPACT_COLORS: Record<string, string> = {
  HIGH: "bg-red-500/15 text-red-300 border-red-600/30",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-600/30",
  LOW: "bg-zinc-500/15 text-zinc-400 border-zinc-600/30",
};

const SOURCE_COLORS: Record<string, string> = {
  R: "bg-red-500/10 text-red-400",
  T: "bg-sky-500/10 text-sky-400",
  "R+T": "bg-purple-500/10 text-purple-400",
};

interface RecoItem {
  field: string;
  currentSummary: string;
  proposedValue: unknown;
  justification: string;
  source: "R" | "T" | "R+T";
  impact: "LOW" | "MEDIUM" | "HIGH";
  accepted?: boolean;
}

function ADVERecommendationsPanel({ strategyId, onApplied }: { strategyId: string; onApplied: () => void }) {
  const [activeTab, setActiveTab] = useState<ADVEKey>("A");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const recosQuery = trpc.pillar.getRecos.useQuery(
    { strategyId, key: activeTab },
    { enabled: !!strategyId },
  );

  const acceptMutation = trpc.pillar.acceptRecos.useMutation({
    onSuccess: () => { recosQuery.refetch(); onApplied(); setSelected(new Set()); },
  });

  const rejectMutation = trpc.pillar.rejectRecos.useMutation({
    onSuccess: () => { recosQuery.refetch(); onApplied(); },
  });

  const recos = (recosQuery.data ?? []) as RecoItem[];
  const pendingRecos = recos.filter((r) => r.accepted !== true);
  const hasRecos = pendingRecos.length > 0;

  // Count pending recos per ADVE pillar
  const recosA = trpc.pillar.getRecos.useQuery({ strategyId, key: "A" }, { enabled: !!strategyId });
  const recosD = trpc.pillar.getRecos.useQuery({ strategyId, key: "D" }, { enabled: !!strategyId });
  const recosV = trpc.pillar.getRecos.useQuery({ strategyId, key: "V" }, { enabled: !!strategyId });
  const recosE = trpc.pillar.getRecos.useQuery({ strategyId, key: "E" }, { enabled: !!strategyId });
  const counts: Record<ADVEKey, number> = {
    A: ((recosA.data ?? []) as RecoItem[]).filter((r) => r.accepted !== true).length,
    D: ((recosD.data ?? []) as RecoItem[]).filter((r) => r.accepted !== true).length,
    V: ((recosV.data ?? []) as RecoItem[]).filter((r) => r.accepted !== true).length,
    E: ((recosE.data ?? []) as RecoItem[]).filter((r) => r.accepted !== true).length,
  };
  const totalPending = counts.A + counts.D + counts.V + counts.E;

  if (totalPending === 0) return null;

  const toggleField = (field: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(pendingRecos.map((r) => r.field)));
  const selectNone = () => setSelected(new Set());

  return (
    <div className="rounded-xl border border-violet-800/40 bg-gradient-to-b from-violet-950/20 to-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-violet-800/20">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <span className="font-semibold text-violet-300">Recommandations R+T pour ADVE</span>
          <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-bold text-violet-300">{totalPending}</span>
        </div>
      </div>

      <div className="flex border-b border-zinc-800">
        {(["A", "D", "V", "E"] as ADVEKey[]).map((k) => {
          const meta = ADVE_META[k];
          const count = counts[k];
          return (
            <button
              key={k}
              onClick={() => { setActiveTab(k); setSelected(new Set()); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === k ? `${meta.accent} border-current` : "text-zinc-500 border-transparent hover:text-zinc-300"}`}
            >
              {meta.full}
              {count > 0 && (
                <span className={`rounded-full ${meta.bg} px-1.5 py-0.5 text-[10px] font-bold ${meta.accent}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {hasRecos ? (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Tout selectionner</button>
            <span className="text-zinc-700">|</span>
            <button onClick={selectNone} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Deselectionner</button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => acceptMutation.mutate({ strategyId, key: activeTab, fields: Array.from(selected) })}
                disabled={selected.size === 0 || acceptMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Accepter ({selected.size})
              </button>
              <button
                onClick={() => rejectMutation.mutate({ strategyId, key: activeTab })}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-400 hover:border-red-800/40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Tout rejeter
              </button>
            </div>
          </div>

          {pendingRecos.map((reco, i) => {
            const isSelected = selected.has(reco.field);
            const meta = ADVE_META[activeTab];
            return (
              <div
                key={`${reco.field}-${i}`}
                onClick={() => toggleField(reco.field)}
                className={`rounded-lg border p-4 cursor-pointer transition-all ${isSelected ? `${meta.border} bg-zinc-800/60 ring-1 ring-white/10` : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${isSelected ? "bg-emerald-600 border-emerald-500" : "border-zinc-600 bg-zinc-800"}`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-sm font-semibold ${meta.accent}`}>{reco.field}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${IMPACT_COLORS[reco.impact] ?? IMPACT_COLORS.LOW}`}>
                        {reco.impact}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${SOURCE_COLORS[reco.source] ?? SOURCE_COLORS.R}`}>
                        {reco.source}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed mb-2">{reco.justification}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-2.5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Actuel</span>
                        <p className="text-[11px] text-zinc-400 line-clamp-3">{reco.currentSummary || "\u2014"}</p>
                      </div>
                      <div className={`rounded-lg ${meta.bg} border ${meta.border} p-2.5`}>
                        <span className={`text-[10px] font-bold ${meta.accent} uppercase block mb-1`}>Propose</span>
                        <p className="text-[11px] text-zinc-200 line-clamp-3">
                          {typeof reco.proposedValue === "string"
                            ? reco.proposedValue.slice(0, 200) + (reco.proposedValue.length > 200 ? "..." : "")
                            : Array.isArray(reco.proposedValue)
                              ? `[${(reco.proposedValue as unknown[]).length} elements]`
                              : typeof reco.proposedValue === "object" && reco.proposedValue
                                ? JSON.stringify(reco.proposedValue).slice(0, 200) + "..."
                                : String(reco.proposedValue ?? "\u2014")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-zinc-500">Aucune recommandation en attente pour {ADVE_META[activeTab].full}.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CASCADE WORKFLOW — Guided step-by-step with operator validation
// ============================================================================

// The cascade flow:
// 1. Generate R → operator reviews → validates R
// 2. Generate T → operator reviews → validates T
// 3. Generate R+T Recos → operator accepts/rejects per field
// 4. Generate I → operator reviews → validates I
// 5. Generate S → operator reviews → validates S (dedicated page)

type WorkflowPhase = "R" | "T" | "RECOS" | "I" | "S" | "COMPLETE";

const WORKFLOW_STEPS: { phase: WorkflowPhase; label: string; description: string; accent: string; border: string; bg: string; icon: React.ElementType }[] = [
  { phase: "R", label: "1. Risk", description: "SWOT interne — forces, faiblesses, menaces, opportunites", accent: "text-red-400", border: "border-red-800/40", bg: "bg-red-500/10", icon: Shield },
  { phase: "T", label: "2. Track", description: "SWOT externe — marche, concurrence, validation terrain", accent: "text-sky-400", border: "border-sky-800/40", bg: "bg-sky-500/10", icon: Crosshair },
  { phase: "RECOS", label: "3. Recos R+T", description: "R+T recalibrent ADVE — accepter ou rejeter", accent: "text-violet-400", border: "border-violet-800/40", bg: "bg-violet-500/10", icon: Sparkles },
  { phase: "I", label: "4. Implementation", description: "Catalogue exhaustif — tout ce que la marque peut faire", accent: "text-orange-400", border: "border-orange-800/40", bg: "bg-orange-500/10", icon: Rocket },
  { phase: "S", label: "5. Strategy", description: "Fenetre d'Overton — plan d'action + roadmap superfan", accent: "text-pink-400", border: "border-pink-800/40", bg: "bg-pink-500/10", icon: Brain },
];

type PillarData = { content: unknown; score: number; completion: number; errors: number; validationStatus?: string } | undefined;

function computeCurrentPhase(data: Record<string, PillarData>): WorkflowPhase {
  const r = data["R"];
  const t = data["T"];
  const i = data["I"];
  const s = data["S"];

  const isValidated = (p: PillarData) => p?.validationStatus === "VALIDATED" || p?.validationStatus === "LOCKED";
  const hasContent = (p: PillarData) => !!p?.content;

  // Step 1: R must be generated and validated
  if (!hasContent(r)) return "R";
  if (!isValidated(r)) return "R"; // Generated but not yet validated

  // Step 2: T must be generated and validated
  if (!hasContent(t)) return "T";
  if (!isValidated(t)) return "T";

  // Step 3: R+T recos → ADVE enrichment
  // Move to I only if I has content (operator chose to move on)
  if (!hasContent(i)) return "RECOS";

  // Step 4: I must be generated and validated
  if (!isValidated(i)) return "I";

  // Step 5: S must be generated and validated
  if (!hasContent(s)) return "S";
  if (!isValidated(s)) return "S";

  return "COMPLETE";
}

function CascadeWorkflowTracker({
  currentPhase,
  generatingStep,
}: {
  currentPhase: WorkflowPhase;
  generatingStep: string | null;
}) {
  const phaseOrder: WorkflowPhase[] = ["R", "T", "RECOS", "I", "S", "COMPLETE"];
  const currentIdx = phaseOrder.indexOf(currentPhase);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-violet-400" />
          <span className="font-semibold text-violet-300">Workflow Cascade RTIS</span>
          {currentPhase === "COMPLETE" && (
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">Complet</span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2">
        {WORKFLOW_STEPS.map((step, i) => {
          const stepIdx = phaseOrder.indexOf(step.phase);
          const isDone = stepIdx < currentIdx;
          const isCurrent = step.phase === currentPhase;
          const isGenerating = generatingStep === step.phase;
          const isLocked = stepIdx > currentIdx;

          return (
            <div
              key={step.phase}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                isCurrent
                  ? `${step.border} ${step.bg} ring-1 ring-white/10`
                  : isDone
                    ? "border-emerald-800/30 bg-emerald-500/5"
                    : "border-zinc-800 bg-zinc-900/40 opacity-50"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : isGenerating ? (
                <Loader2 className="h-5 w-5 shrink-0 text-violet-400 animate-spin" />
              ) : isCurrent ? (
                <step.icon className={`h-5 w-5 shrink-0 ${step.accent}`} />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-zinc-600" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-semibold ${isDone ? "text-emerald-300" : isCurrent ? step.accent : "text-zinc-500"}`}>
                  {step.label}
                </span>
                <p className="text-xs text-zinc-500">{step.description}</p>
              </div>
              {isDone && <span className="text-[10px] text-emerald-400 font-bold uppercase">Valide</span>}
              {isCurrent && !isGenerating && <ArrowRight className={`h-4 w-4 ${step.accent}`} />}
              {isGenerating && <span className="text-[10px] text-violet-400 font-bold uppercase">Generation...</span>}
              {isLocked && <Lock className="h-4 w-4 text-zinc-600" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function RTISPage() {
  const strategyId = useCurrentStrategyId();
  const [expandedPillar, setExpandedPillar] = useState<RTISKey | null>("R");
  const [generatingStep, setGeneratingStep] = useState<string | null>(null);
  const [actualizingKey, setActualizingKey] = useState<RTISKey | null>(null);

  const pillarsQuery = trpc.pillar.getAll.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const utils = trpc.useUtils();

  const [lastError, setLastError] = useState<string | null>(null);

  // Individual step mutations
  const actualizeMutation = trpc.pillar.actualize.useMutation({
    onSuccess: () => { pillarsQuery.refetch(); setGeneratingStep(null); setActualizingKey(null); setLastError(null); },
    onError: (err) => { setGeneratingStep(null); setActualizingKey(null); setLastError(err.message); },
  });

  const generateRecosMut = trpc.pillar.generateRecos.useMutation();

  const transitionMutation = trpc.pillar.transitionStatus.useMutation({
    onSuccess: (result) => {
      pillarsQuery.refetch();
      if (result && typeof result === "object" && "error" in result) {
        setLastError((result as { error: string }).error);
      } else {
        setLastError(null);
      }
    },
    onError: (err) => setLastError(err.message),
  });

  // Generate recos for all 4 ADVE pillars sequentially
  const generateAllRecos = useCallback(async () => {
    if (!strategyId) return;
    setGeneratingStep("RECOS");
    try {
      for (const key of ["A", "D", "V", "E"] as const) {
        await generateRecosMut.mutateAsync({ strategyId, key });
      }
    } catch {
      // Error handled by mutation
    }
    setGeneratingStep(null);
    pillarsQuery.refetch();
    utils.pillar.getRecos.invalidate();
  }, [strategyId, generateRecosMut, pillarsQuery, utils]);

  if (!strategyId) {
    return (
      <div className="p-8">
        <PageHeader title="RTIS — Risk, Track, Implementation, Strategy" badge={<AiBadge />} />
        <p className="mt-4 text-sm text-zinc-500">Aucune strategie selectionnee.</p>
      </div>
    );
  }

  if (pillarsQuery.isLoading) return <SkeletonPage />;

  const data = pillarsQuery.data ?? {};

  // ADVE validation status check
  const adveKeys = ["A", "D", "V", "E"] as const;
  const adveAllPresent = adveKeys.every((k) => data[k] && (data[k] as { content: unknown }).content);
  const rtisKeys: RTISKey[] = ["R", "T", "I", "S"];

  // Compute guided workflow phase
  const currentPhase = computeCurrentPhase(data as Record<string, { content: unknown; score: number; completion: number; errors: number } | undefined>);

  return (
    <div className="p-8 space-y-6">
      <PageHeader title="RTIS — Risk, Track, Implementation, Strategy" badge={<AiBadge />} />

      {/* ── Pillar Status Row (content-first, scores tertiary) ──────── */}
      <div className="flex flex-wrap gap-2">
        {rtisKeys.map((k) => {
          const meta = RTIS_META[k];
          const p = data[k] as { content: unknown; completion: number; validationStatus?: string } | undefined;
          const hasContent = !!p?.content;
          const status = p?.validationStatus ?? "DRAFT";
          const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE.DRAFT!;

          return (
            <button
              key={k}
              onClick={() => setExpandedPillar(expandedPillar === k ? null : k)}
              className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left transition-all hover:brightness-125 ${expandedPillar === k ? `${meta.border} ${meta.bg} ring-1 ring-white/10` : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"}`}
            >
              <meta.icon className={`h-4 w-4 ${meta.accent}`} />
              <span className={`text-sm font-medium ${expandedPillar === k ? meta.accent : "text-zinc-300"}`}>{meta.full}</span>
              {hasContent ? (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusBadge.color}`}>{statusBadge.label}</span>
              ) : (
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-600">Vide</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Workflow Tracker + Actions ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Workflow phases */}
        <div className="lg:col-span-1">
          <CascadeWorkflowTracker currentPhase={currentPhase} generatingStep={generatingStep} />
        </div>

        {/* Right: Current step action */}
        <div className="lg:col-span-2 space-y-4">
          {!adveAllPresent && (
            <div className="rounded-xl border border-amber-800/40 bg-amber-500/5 p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300">Remplissez d&apos;abord les 4 piliers ADVE avant de lancer la cascade RTIS.</p>
            </div>
          )}

          {adveAllPresent && currentPhase !== "COMPLETE" && currentPhase !== "RECOS" && (
            <div className={`rounded-xl border ${RTIS_META[currentPhase as RTISKey]?.border ?? "border-zinc-800"} ${RTIS_META[currentPhase as RTISKey]?.bg ?? "bg-zinc-900/60"} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {(() => { const Icon = RTIS_META[currentPhase as RTISKey]?.icon ?? Shield; return <Icon className={`h-5 w-5 ${RTIS_META[currentPhase as RTISKey]?.accent ?? ""}`} />; })()}
                  <span className={`font-semibold ${RTIS_META[currentPhase as RTISKey]?.accent ?? ""}`}>
                    Etape: Generer {RTIS_META[currentPhase as RTISKey]?.full ?? currentPhase}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setGeneratingStep(currentPhase);
                      actualizeMutation.mutate({ strategyId, key: currentPhase as RTISKey });
                    }}
                    disabled={!!generatingStep}
                    className={`flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
                  >
                    {generatingStep === currentPhase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {generatingStep === currentPhase ? "Generation..." : `Generer ${RTIS_META[currentPhase as RTISKey]?.full ?? ""}`}
                  </button>
                  {Boolean(data[currentPhase]?.content) && (
                    <button
                      onClick={() => transitionMutation.mutate({ strategyId, key: currentPhase as RTISKey, targetStatus: "VALIDATED" })}
                      disabled={transitionMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-800/40 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Valider {RTIS_META[currentPhase as RTISKey]?.full ?? ""}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                {RTIS_META[currentPhase as RTISKey]?.description ?? ""}
                {" — "}Generez le contenu puis validez-le pour passer a l&apos;etape suivante.
              </p>
              {lastError && (
                <div className="mt-3 rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                  <p className="font-medium">Erreur de generation</p>
                  <p className="mt-1 text-xs text-red-400">{lastError}</p>
                </div>
              )}
              {/* Preview of generated content */}
              {Boolean(data[currentPhase]?.content) && (
                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Contenu genere</p>
                  <div className="space-y-1.5 text-xs text-zinc-400">
                    {Object.entries(data[currentPhase]?.content as Record<string, unknown> ?? {}).slice(0, 6).map(([key, val]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="shrink-0 font-mono text-zinc-600">{key}</span>
                        <span className="text-zinc-300 line-clamp-1">
                          {typeof val === "string" ? val.substring(0, 100) : typeof val === "object" ? `{${Object.keys(val as object).length} champs}` : String(val)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(data[currentPhase]?.content as Record<string, unknown> ?? {}).length > 6 && (
                      <p className="text-zinc-600">... et {Object.keys(data[currentPhase]?.content as Record<string, unknown> ?? {}).length - 6} champs de plus</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {adveAllPresent && currentPhase === "RECOS" && (
            <div className="rounded-xl border border-violet-800/40 bg-violet-500/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  <span className="font-semibold text-violet-300">Etape: Recommandations R+T pour ADVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generateAllRecos}
                    disabled={!!generatingStep}
                    className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {generatingStep === "RECOS" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {generatingStep === "RECOS" ? "Generation des recos..." : "Generer les recommandations"}
                  </button>
                  <button
                    onClick={() => {
                      setGeneratingStep("I");
                      actualizeMutation.mutate({ strategyId, key: "I" });
                    }}
                    disabled={!!generatingStep}
                    className="flex items-center gap-2 rounded-lg border border-orange-800/40 px-4 py-2 text-sm font-medium text-orange-400 hover:bg-orange-500/10 disabled:opacity-40 transition-colors"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Passer a Implementation
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                R et T sont valides. Generez les recommandations puis acceptez/rejetez chaque proposition ci-dessous.
                Une fois traite, passez a l&apos;etape I.
              </p>
            </div>
          )}

          {currentPhase === "COMPLETE" && (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-500/5 p-5 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              <div>
                <span className="font-semibold text-emerald-300">Cascade RTIS complete</span>
                <p className="text-xs text-zinc-500">Tous les piliers RTIS sont generes et valides. Consultez L'Oracle pour la proposition strategique.</p>
              </div>
            </div>
          )}

          {/* ADVE Recommendations (shows when recos exist, regardless of phase) */}
          <ADVERecommendationsPanel strategyId={strategyId} onApplied={() => pillarsQuery.refetch()} />
        </div>
      </div>

      {/* ── Pillar Detail Panels ────────────────────────────────────── */}
      <div className="space-y-4">
        {rtisKeys.map((k) => {
          const meta = RTIS_META[k];
          const pillarData = data[k] as { content: unknown; score: number; completion: number; errors: number } | undefined;
          const content = (pillarData?.content ?? {}) as Record<string, unknown>;
          const isExpanded = expandedPillar === k;
          const isActualizing = actualizingKey === k;

          return (
            <div key={k} className={`rounded-xl border ${meta.border} bg-zinc-900/60 overflow-hidden`}>
              {/* Header */}
              <button
                onClick={() => setExpandedPillar(isExpanded ? null : k)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <meta.icon className={`h-5 w-5 ${meta.accent}`} />
                  <span className={`font-semibold ${meta.accent}`}>{meta.full}</span>
                  <span className="text-xs text-zinc-500">{meta.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-zinc-800 p-5 space-y-5">
                  {/* Actions row */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setActualizingKey(k); actualizeMutation.mutate({ strategyId, key: k }); }}
                      disabled={isActualizing}
                      className={`flex items-center gap-1.5 rounded-lg border ${meta.border} px-3 py-1.5 text-xs font-medium ${meta.accent} hover:bg-zinc-800 disabled:opacity-40 transition-colors`}
                    >
                      {isActualizing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      {isActualizing ? "Generation..." : `Generer ${meta.full}`}
                    </button>
                    <button
                      onClick={() => transitionMutation.mutate({ strategyId, key: k, targetStatus: "VALIDATED" })}
                      disabled={transitionMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-800/40 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Valider
                    </button>
                    {transitionMutation.error && (
                      <span className="text-xs text-red-400">{transitionMutation.error.message}</span>
                    )}
                  </div>

                  {/* Content rendering per pillar */}
                  {!pillarData?.content ? (
                    <p className="text-sm text-zinc-600 italic">Pilier vide — lancez la cascade ou generez individuellement.</p>
                  ) : (
                    <PillarContent pillarKey={k} content={content} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// PILLAR CONTENT RENDERERS
// ============================================================================

function PillarContent({ pillarKey, content }: { pillarKey: RTISKey; content: Record<string, unknown> }) {
  switch (pillarKey) {
    case "R": return <RiskContent content={content} />;
    case "T": return <TrackContent content={content} />;
    case "I": return <ImplementationContent content={content} />;
    case "S": return <SyntheseContent content={content} />;
  }
}

// ── R — Risk ───────────────────────────────────────────────────────────────

function RiskContent({ content }: { content: Record<string, unknown> }) {
  const swot = (content.globalSwot ?? {}) as Record<string, unknown>;
  const matrix = safeArr(content.probabilityImpactMatrix);
  const mitigations = safeArr(content.mitigationPriorities);
  const riskScore = safeNum(content.riskScore);

  return (
    <div className="space-y-5">
      {/* Risk Score */}
      <div className="flex items-center gap-4">
        <Gauge className="h-5 w-5 text-red-400" />
        <span className="text-sm text-zinc-400">Score de risque global:</span>
        <span className={`text-2xl font-bold ${riskScore > 70 ? "text-red-400" : riskScore > 40 ? "text-amber-400" : "text-emerald-400"}`}>
          {riskScore}/100
        </span>
      </div>

      {/* SWOT */}
      <div>
        <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" /> SWOT
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {(["strengths", "weaknesses", "opportunities", "threats"] as const).map((cat) => {
            const items = safeArr(swot[cat] as unknown);
            const labels: Record<string, { label: string; color: string }> = {
              strengths: { label: "Forces", color: "text-emerald-400 border-emerald-800/40" },
              weaknesses: { label: "Faiblesses", color: "text-red-400 border-red-800/40" },
              opportunities: { label: "Opportunites", color: "text-sky-400 border-sky-800/40" },
              threats: { label: "Menaces", color: "text-amber-400 border-amber-800/40" },
            };
            const meta = labels[cat]!;
            return (
              <div key={cat} className={`rounded-lg border ${meta.color.split(" ")[1]} bg-zinc-900/80 p-3`}>
                <h5 className={`text-xs font-bold uppercase mb-2 ${meta.color.split(" ")[0]}`}>{meta.label}</h5>
                <ul className="space-y-1">
                  {items.length === 0 && <li className="text-xs text-zinc-600 italic">-</li>}
                  {items.map((item, i) => (
                    <li key={i} className="text-xs text-zinc-300">• {typeof item === "string" ? item : safeStr((item as Record<string, unknown>).text)}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Probability/Impact Matrix */}
      {matrix.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Matrice Probabilite / Impact
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 uppercase">
                  <th className="text-left p-2">Risque</th>
                  <th className="text-center p-2">Probabilite</th>
                  <th className="text-center p-2">Impact</th>
                  <th className="text-left p-2">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i} className="border-t border-zinc-800/50">
                    <td className="p-2 text-zinc-300">{safeStr(row.risk)}</td>
                    <td className="p-2 text-center">
                      <ProbBadge level={safeStr(row.probability, "MEDIUM")} />
                    </td>
                    <td className="p-2 text-center">
                      <ProbBadge level={safeStr(row.impact, "MEDIUM")} />
                    </td>
                    <td className="p-2 text-zinc-400">{safeStr(row.mitigation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mitigations */}
      {mitigations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" /> Priorites de Mitigation
          </h4>
          <div className="space-y-2">
            {mitigations.map((m, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-bold text-red-400">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs text-zinc-300">{safeStr(m.action)}</p>
                  <div className="flex gap-4 mt-1 text-[10px] text-zinc-500">
                    {safeStr(m.owner) && <span>Responsable: {safeStr(m.owner)}</span>}
                    {safeStr(m.timeline) && <span>Echeance: {safeStr(m.timeline)}</span>}
                    {safeStr(m.investment) && <span>Invest: {safeStr(m.investment)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── T — Track ──────────────────────────────────────────────────────────────

function TrackContent({ content }: { content: Record<string, unknown> }) {
  const triangulation = (content.triangulation ?? {}) as Record<string, unknown>;
  const hypotheses = safeArr(content.hypothesisValidation);
  const tamSamSom = (content.tamSamSom ?? {}) as Record<string, unknown>;
  const bmfScore = safeNum(content.brandMarketFitScore);

  return (
    <div className="space-y-5">
      {/* Brand Market Fit */}
      <div className="flex items-center gap-4">
        <Gauge className="h-5 w-5 text-sky-400" />
        <span className="text-sm text-zinc-400">Brand-Market Fit Score:</span>
        <span className={`text-2xl font-bold ${bmfScore > 70 ? "text-emerald-400" : bmfScore > 40 ? "text-amber-400" : "text-red-400"}`}>
          {bmfScore}/100
        </span>
      </div>

      {/* Triangulation */}
      <div>
        <h4 className="text-sm font-semibold text-sky-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Crosshair className="h-4 w-4" /> Triangulation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(["customerInterviews", "competitiveAnalysis", "trendAnalysis", "financialBenchmarks"] as const).map((field) => {
            const labels: Record<string, { label: string; icon: React.ElementType }> = {
              customerInterviews: { label: "Entretiens Clients", icon: Users },
              competitiveAnalysis: { label: "Analyse Concurrentielle", icon: Eye },
              trendAnalysis: { label: "Analyse Tendances", icon: TrendingUp },
              financialBenchmarks: { label: "Benchmarks Financiers", icon: DollarSign },
            };
            const meta = labels[field]!;
            return (
              <div key={field} className="rounded-lg border border-sky-800/40 bg-zinc-900/80 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <meta.icon className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-xs font-bold text-sky-400 uppercase">{meta.label}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{safeStr(triangulation[field], "Non disponible")}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* TAM/SAM/SOM */}
      {Boolean(tamSamSom.tam || tamSamSom.sam || tamSamSom.som) && (
        <div>
          <h4 className="text-sm font-semibold text-sky-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" /> TAM / SAM / SOM
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {(["tam", "sam", "som"] as const).map((tier) => {
              const v = (tamSamSom[tier] ?? {}) as Record<string, unknown>;
              const labels = { tam: "Total Addressable Market", sam: "Serviceable Available", som: "Serviceable Obtainable" };
              return (
                <div key={tier} className="rounded-lg border border-sky-800/40 bg-zinc-900/80 p-3 text-center">
                  <span className="text-[10px] font-bold text-sky-400 uppercase">{tier.toUpperCase()}</span>
                  <p className="text-lg font-bold text-white mt-1">{fmtCurrency(v.value)}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{labels[tier]}</p>
                  {safeStr(v.description) && <p className="text-[10px] text-zinc-400 mt-1">{safeStr(v.description)}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hypothesis Validation */}
      {hypotheses.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-sky-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Validation Hypotheses
          </h4>
          <div className="space-y-2">
            {hypotheses.map((h, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <HypothesisBadge status={safeStr(h.status, "HYPOTHESIS")} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-zinc-200">{safeStr(h.hypothesis)}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Methode: {safeStr(h.validationMethod, "-")}</p>
                  {safeStr(h.evidence) && <p className="text-[10px] text-zinc-400 mt-0.5">Evidence: {safeStr(h.evidence)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── I — Implementation ─────────────────────────────────────────────────────

function ImplementationContent({ content }: { content: Record<string, unknown> }) {
  const sprint = safeArr(content.sprint90Days);
  const calendar = safeArr(content.annualCalendar);
  const budget = safeNum(content.globalBudget);
  const team = safeArr(content.teamStructure);
  const platform = (content.brandPlatform ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-5">
      {/* Budget */}
      <div className="flex items-center gap-4">
        <DollarSign className="h-5 w-5 text-orange-400" />
        <span className="text-sm text-zinc-400">Budget global:</span>
        <span className="text-2xl font-bold text-white">{fmtCurrency(budget)} FCFA</span>
      </div>

      {/* Sprint 90 Days */}
      {sprint.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4" /> Sprint 90 Jours ({sprint.length} actions)
          </h4>
          <div className="space-y-2">
            {sprint.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.isRiskMitigation ? "bg-red-500/15 text-red-400" : "bg-orange-500/15 text-orange-400"}`}>
                  {safeNum(s.priority, i + 1)}
                </span>
                <div className="flex-1">
                  <p className="text-xs text-zinc-300">{safeStr(s.action)}</p>
                  <div className="flex gap-4 mt-1 text-[10px] text-zinc-500">
                    {safeStr(s.owner) && <span>Owner: {safeStr(s.owner)}</span>}
                    {safeStr(s.kpi) && <span>KPI: {safeStr(s.kpi)}</span>}
                    {Boolean(s.isRiskMitigation) && <span className="text-red-400">Mitigation risque</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual Calendar */}
      {calendar.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Calendrier Annuel
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((q) => {
              const items = calendar.filter((c) => safeNum(c.quarter) === q);
              return (
                <div key={q} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <span className="text-xs font-bold text-orange-400">Q{q}</span>
                  {items.length === 0 && <p className="text-[10px] text-zinc-600 mt-1">-</p>}
                  {items.map((c, i) => (
                    <div key={i} className="mt-2">
                      <p className="text-xs font-medium text-zinc-300">{safeStr(c.name)}</p>
                      <p className="text-[10px] text-zinc-500">{safeStr(c.objective)}</p>
                      {safeNum(c.budget) > 0 && <p className="text-[10px] text-zinc-500">{fmtCurrency(c.budget)} FCFA</p>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team */}
      {team.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Structure Equipe
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {team.map((t, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <p className="text-xs font-medium text-zinc-200">{safeStr(t.name)}</p>
                <p className="text-[10px] text-orange-400">{safeStr(t.title)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{safeStr(t.responsibility)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brand Platform */}
      {safeStr(platform.name) && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Plateforme de Marque
          </h4>
          <div className="rounded-lg border border-orange-800/40 bg-zinc-900/80 p-4 space-y-2">
            {(["name", "benefit", "target", "competitiveAdvantage", "emotionalBenefit", "functionalBenefit", "supportedBy"] as const).map((field) => {
              const labels: Record<string, string> = {
                name: "Nom", benefit: "Benefice", target: "Cible",
                competitiveAdvantage: "Avantage Concurrentiel",
                emotionalBenefit: "Benefice Emotionnel",
                functionalBenefit: "Benefice Fonctionnel",
                supportedBy: "Supporte par",
              };
              return (
                <div key={field} className="flex gap-2">
                  <span className="text-[10px] font-bold text-orange-400 uppercase w-36 shrink-0">{labels[field]}</span>
                  <span className="text-xs text-zinc-300">{safeStr(platform[field])}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── S — Synthese ───────────────────────────────────────────────────────────

function SyntheseContent({ content }: { content: Record<string, unknown> }) {
  const coherence = safeArr(content.coherencePiliers);
  const fcs = safeArr(content.facteursClesSucces);
  const recos = safeArr(content.recommandationsPrioritaires);
  const axes = safeArr(content.axesStrategiques);
  const kpis = safeArr(content.kpiDashboard);
  const coherenceScore = safeNum(content.coherenceScore);

  return (
    <div className="space-y-5">
      {/* Coherence Score */}
      <div className="flex items-center gap-4">
        <Gauge className="h-5 w-5 text-pink-400" />
        <span className="text-sm text-zinc-400">Coherence inter-piliers:</span>
        <span className={`text-2xl font-bold ${coherenceScore > 70 ? "text-emerald-400" : coherenceScore > 40 ? "text-amber-400" : "text-red-400"}`}>
          {coherenceScore}/100
        </span>
      </div>

      {/* Executive Summary */}
      {safeStr(content.syntheseExecutive) && (
        <div className="rounded-lg border border-pink-800/40 bg-zinc-900/80 p-4">
          <h4 className="text-xs font-bold text-pink-400 uppercase mb-2">Synthese Executive</h4>
          <p className="text-xs text-zinc-300 leading-relaxed">{safeStr(content.syntheseExecutive)}</p>
        </div>
      )}

      {/* Strategic Vision */}
      {safeStr(content.visionStrategique) && (
        <div className="rounded-lg border border-pink-800/40 bg-zinc-900/80 p-4">
          <h4 className="text-xs font-bold text-pink-400 uppercase mb-2">Vision Strategique</h4>
          <p className="text-xs text-zinc-300 leading-relaxed">{safeStr(content.visionStrategique)}</p>
        </div>
      )}

      {/* Coherence Map */}
      {coherence.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" /> Coherence Inter-Piliers
          </h4>
          <div className="space-y-2">
            {coherence.map((c, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <span className="text-xs font-bold text-pink-400 shrink-0 w-16">{safeStr(c.pilier)}</span>
                <div className="flex-1">
                  <p className="text-xs text-zinc-300">{safeStr(c.contribution)}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{safeStr(c.articulation)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Success Factors */}
      {fcs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3">Facteurs Cles de Succes</h4>
          <ul className="space-y-1">
            {fcs.map((f, i) => (
              <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                {typeof f === "string" ? f : safeStr((f as Record<string, unknown>).text)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Priority Recommendations */}
      {recos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3">Recommandations Prioritaires</h4>
          <div className="space-y-2">
            {recos.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-[10px] font-bold text-pink-400">
                  {safeNum(r.priority, i + 1)}
                </span>
                <div className="flex-1">
                  <p className="text-xs text-zinc-300">{safeStr(r.recommendation)}</p>
                  {safeStr(r.source) && <span className="text-[10px] text-zinc-500">Source: {safeStr(r.source)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategic Axes */}
      {axes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3">Axes Strategiques</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {axes.map((a, i) => (
              <div key={i} className="rounded-lg border border-pink-800/40 bg-zinc-900/80 p-3">
                <p className="text-xs font-medium text-zinc-200">{safeStr(a.axe)}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {safeArr(a.pillarsLinked as unknown).map((p, j) => (
                    <span key={j} className="rounded bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-bold text-pink-300">
                      {typeof p === "string" ? p : "?"}
                    </span>
                  ))}
                </div>
                {Array.isArray(a.kpis) && (
                  <div className="mt-1.5">
                    {safeArr(a.kpis as unknown).map((kpi, j) => (
                      <span key={j} className="text-[10px] text-zinc-500 block">• {typeof kpi === "string" ? kpi : "?"}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Dashboard */}
      {kpis.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> KPI Dashboard
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 uppercase">
                  <th className="text-left p-2">KPI</th>
                  <th className="text-center p-2">Pilier</th>
                  <th className="text-left p-2">Cible</th>
                  <th className="text-center p-2">Frequence</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi, i) => (
                  <tr key={i} className="border-t border-zinc-800/50">
                    <td className="p-2 text-zinc-300">{safeStr(kpi.name)}</td>
                    <td className="p-2 text-center">
                      <span className="rounded bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-bold text-pink-300">{safeStr(kpi.pillar)}</span>
                    </td>
                    <td className="p-2 text-zinc-400">{safeStr(kpi.target)}</td>
                    <td className="p-2 text-center text-zinc-500">{safeStr(kpi.frequency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function ProbBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: "bg-emerald-500/15 text-emerald-300",
    MEDIUM: "bg-amber-500/15 text-amber-300",
    HIGH: "bg-red-500/15 text-red-300",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${colors[level] ?? "bg-zinc-700 text-zinc-400"}`}>
      {level}
    </span>
  );
}

function HypothesisBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    HYPOTHESIS: "bg-zinc-500/15 text-zinc-300",
    TESTING: "bg-amber-500/15 text-amber-300",
    VALIDATED: "bg-emerald-500/15 text-emerald-300",
    INVALIDATED: "bg-red-500/15 text-red-300",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${colors[status] ?? "bg-zinc-700 text-zinc-400"}`}>
      {status}
    </span>
  );
}

function fmtCurrency(val: unknown): string {
  const n = safeNum(val);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Mds`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} K`;
  return n.toLocaleString("fr-FR");
}

