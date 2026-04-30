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
    label: "R", full: "Risk", icon: Shield, accent: "text-error", border: "border-red-800/40", bg: "bg-error/10",
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
  DRAFT: { label: "Brouillon", color: "bg-zinc-500/15 text-foreground-secondary border-border-strong/30" },
  AI_PROPOSED: { label: "IA Propose", color: "bg-amber-500/15 text-amber-300 border-amber-600/30" },
  VALIDATED: { label: "Valide", color: "bg-emerald-500/15 text-emerald-300 border-emerald-600/30" },
  LOCKED: { label: "Verrouille", color: "bg-accent/15 text-accent border-accent/30" },
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
  A: { label: "A", full: "Authenticite", accent: "text-accent", border: "border-accent/40", bg: "bg-accent/10" },
  D: { label: "D", full: "Distinction", accent: "text-blue-400", border: "border-blue-800/40", bg: "bg-blue-500/10" },
  V: { label: "V", full: "Valeur", accent: "text-emerald-400", border: "border-emerald-800/40", bg: "bg-emerald-500/10" },
  E: { label: "E", full: "Engagement", accent: "text-amber-400", border: "border-amber-800/40", bg: "bg-amber-500/10" },
};

const IMPACT_COLORS: Record<string, string> = {
  HIGH: "bg-error/15 text-error border-red-600/30",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-600/30",
  LOW: "bg-zinc-500/15 text-foreground-secondary border-border-strong/30",
};

const SOURCE_COLORS: Record<string, string> = {
  R: "bg-error/10 text-error",
  T: "bg-sky-500/10 text-sky-400",
  "R+T": "bg-purple-500/10 text-purple-400",
};

type RecoOperation = "SET" | "ADD" | "MODIFY" | "REMOVE" | "EXTEND";

interface RecoItem {
  field: string;
  operation?: RecoOperation;
  currentSummary: string;
  proposedValue: unknown;
  targetIndex?: number;
  targetMatch?: unknown;
  justification: string;
  source: string;
  impact: string;
  accepted?: boolean;
  id?: string;
}

const OP_BADGE: Record<RecoOperation, { label: string; color: string; icon: string }> = {
  SET: { label: "Remplacer", color: "bg-error/15 text-error border-red-600/30", icon: "~" },
  ADD: { label: "Ajouter", color: "bg-emerald-500/15 text-emerald-300 border-emerald-600/30", icon: "+" },
  MODIFY: { label: "Modifier", color: "bg-amber-500/15 text-amber-300 border-amber-600/30", icon: "~" },
  REMOVE: { label: "Supprimer", color: "bg-error/15 text-error border-red-600/30 line-through", icon: "-" },
  EXTEND: { label: "Etendre", color: "bg-sky-500/15 text-sky-300 border-sky-600/30", icon: "+" },
};

function ADVERecommendationsPanel({ strategyId, onApplied }: { strategyId: string; onApplied: () => void }) {
  const [activeTab, setActiveTab] = useState<ADVEKey>("A");
  const [selected, setSelected] = useState<Set<number>>(new Set());

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

  const allRecos = (recosQuery.data ?? []) as RecoItem[];
  // Build indexed list with original indices (for selection by index)
  const pendingWithIndex = allRecos
    .map((r, i) => ({ reco: r, idx: i }))
    .filter(({ reco }) => reco.accepted !== true);
  const hasRecos = pendingWithIndex.length > 0;

  // Group pending recos by field
  const grouped = new Map<string, Array<{ reco: RecoItem; idx: number }>>();
  for (const item of pendingWithIndex) {
    const key = item.reco.field;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

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

  const toggleIndex = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(pendingWithIndex.map((r) => r.idx)));
  const selectNone = () => setSelected(new Set());

  function renderProposedPreview(reco: RecoItem, meta: typeof ADVE_META.A) {
    const op = reco.operation ?? "SET";
    if (op === "REMOVE") {
      return (
        <div className="rounded-lg bg-error/30 border border-red-800/30 p-2.5">
          <span className="text-[10px] font-bold text-error uppercase block mb-1">Supprimer</span>
          <p className="text-[11px] text-error/70 line-through line-clamp-3">
            {reco.targetMatch ? `${(reco.targetMatch as { key: string; value: string }).key}: ${(reco.targetMatch as { key: string; value: string }).value}` : reco.currentSummary || "\u2014"}
          </p>
        </div>
      );
    }
    if (op === "ADD") {
      return (
        <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/30 p-2.5">
          <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">+ Nouvel element</span>
          <p className="text-[11px] text-foreground line-clamp-3">{formatValue(reco.proposedValue)}</p>
        </div>
      );
    }
    if (op === "EXTEND") {
      return (
        <div className="rounded-lg bg-sky-950/30 border border-sky-800/30 p-2.5">
          <span className="text-[10px] font-bold text-sky-400 uppercase block mb-1">Cles ajoutees</span>
          <p className="text-[11px] text-foreground line-clamp-3">{formatValue(reco.proposedValue)}</p>
        </div>
      );
    }
    // SET or MODIFY
    return (
      <div className={`rounded-lg ${meta.bg} border ${meta.border} p-2.5`}>
        <span className={`text-[10px] font-bold ${meta.accent} uppercase block mb-1`}>
          {op === "MODIFY" ? "Modifie" : "Propose"}
        </span>
        <p className="text-[11px] text-foreground line-clamp-3">{formatValue(reco.proposedValue)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/40 bg-gradient-to-b from-violet-950/20 to-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-accent/20">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="font-semibold text-accent">Recommandations R+T pour ADVE</span>
          <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-accent">{totalPending}</span>
        </div>
      </div>

      <div className="flex border-b border-border">
        {(["A", "D", "V", "E"] as ADVEKey[]).map((k) => {
          const meta = ADVE_META[k];
          const count = counts[k];
          return (
            <button
              key={k}
              onClick={() => { setActiveTab(k); setSelected(new Set()); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === k ? `${meta.accent} border-current` : "text-foreground-muted border-transparent hover:text-foreground-secondary"}`}
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
            <button onClick={selectAll} className="text-xs text-accent hover:text-accent transition-colors">Tout selectionner</button>
            <span className="text-foreground-muted">|</span>
            <button onClick={selectNone} className="text-xs text-foreground-muted hover:text-foreground-secondary transition-colors">Deselectionner</button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => acceptMutation.mutate({ strategyId, key: activeTab, recoIndices: Array.from(selected) })}
                disabled={selected.size === 0 || acceptMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
              >
                {acceptMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                Accepter ({selected.size})
              </button>
              <button
                onClick={() => rejectMutation.mutate({ strategyId, key: activeTab })}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:text-error hover:border-red-800/40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Tout rejeter
              </button>
            </div>
          </div>

          {/* Grouped by field */}
          {Array.from(grouped.entries()).map(([fieldName, items]) => {
            const meta = ADVE_META[activeTab];
            return (
              <div key={fieldName} className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-background/80 border-b border-border">
                  <span className={`text-sm font-semibold ${meta.accent}`}>{fieldName}</span>
                  <span className="text-[10px] text-foreground-muted">({items.length} operation{items.length > 1 ? "s" : ""})</span>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {items.map(({ reco, idx }) => {
                    const isSelected = selected.has(idx);
                    const op = reco.operation ?? "SET";
                    const opInfo = OP_BADGE[op];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleIndex(idx)}
                        className={`p-4 cursor-pointer transition-all ${isSelected ? "bg-background/60 ring-1 ring-inset ring-white/5" : "bg-background/40 hover:bg-background/30"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${isSelected ? "bg-emerald-600 border-emerald-500" : "border-border-strong bg-background"}`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border ${opInfo.color}`}>
                                {opInfo.label}
                              </span>
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${IMPACT_COLORS[reco.impact] ?? IMPACT_COLORS.LOW}`}>
                                {reco.impact}
                              </span>
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${SOURCE_COLORS[reco.source] ?? SOURCE_COLORS.R}`}>
                                {reco.source}
                              </span>
                              {!!reco.targetMatch && (
                                <span className="text-[10px] text-foreground-muted">
                                  cible: {(reco.targetMatch as { value: string }).value}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-foreground-secondary leading-relaxed mb-2">{reco.justification}</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg bg-background/60 border border-border p-2.5">
                                <span className="text-[10px] font-bold text-foreground-muted uppercase block mb-1">Actuel</span>
                                <p className={`text-[11px] text-foreground-secondary line-clamp-3 ${op === "REMOVE" ? "" : ""}`}>
                                  {reco.currentSummary || "\u2014"}
                                </p>
                              </div>
                              {renderProposedPreview(reco, meta)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-foreground-muted">Aucune recommandation en attente pour {ADVE_META[activeTab].full}.</p>
        </div>
      )}
    </div>
  );
}

function formatValue(val: unknown): string {
  if (typeof val === "string") return val.length > 200 ? val.slice(0, 200) + "..." : val;
  if (val === null || val === undefined) return "\u2014";
  if (Array.isArray(val)) return `[${val.length} element${val.length > 1 ? "s" : ""}]`;
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const label = ["name", "nom", "title", "action", "risk", "phase"].find(k => typeof obj[k] === "string");
    if (label) return String(obj[label]);
    const keys = Object.keys(obj);
    return keys.length > 0 ? keys.slice(0, 3).join(", ") + (keys.length > 3 ? "..." : "") : "\u2014";
  }
  return String(val);
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
  { phase: "R", label: "1. Risk", description: "SWOT interne — forces, faiblesses, menaces, opportunites", accent: "text-error", border: "border-red-800/40", bg: "bg-error/10", icon: Shield },
  { phase: "T", label: "2. Track", description: "SWOT externe — marche, concurrence, validation terrain", accent: "text-sky-400", border: "border-sky-800/40", bg: "bg-sky-500/10", icon: Crosshair },
  { phase: "RECOS", label: "3. Recos R+T", description: "R+T recalibrent ADVE — accepter ou rejeter", accent: "text-accent", border: "border-accent/40", bg: "bg-accent/10", icon: Sparkles },
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
    <div className="rounded-xl border border-border bg-background/60 overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-accent" />
          <span className="font-semibold text-accent">Workflow Cascade RTIS</span>
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
                    : "border-border bg-background/40 opacity-50"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : isGenerating ? (
                <Loader2 className="h-5 w-5 shrink-0 text-accent animate-spin" />
              ) : isCurrent ? (
                <step.icon className={`h-5 w-5 shrink-0 ${step.accent}`} />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-foreground-muted" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-semibold ${isDone ? "text-emerald-300" : isCurrent ? step.accent : "text-foreground-muted"}`}>
                  {step.label}
                </span>
                <p className="text-xs text-foreground-muted">{step.description}</p>
              </div>
              {isDone && <span className="text-[10px] text-emerald-400 font-bold uppercase">Valide</span>}
              {isCurrent && !isGenerating && <ArrowRight className={`h-4 w-4 ${step.accent}`} />}
              {isGenerating && <span className="text-[10px] text-accent font-bold uppercase">Generation...</span>}
              {isLocked && <Lock className="h-4 w-4 text-foreground-muted" />}
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
        <p className="mt-4 text-sm text-foreground-muted">Aucune strategie selectionnee.</p>
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
              className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left transition-all hover:brightness-125 ${expandedPillar === k ? `${meta.border} ${meta.bg} ring-1 ring-white/10` : "border-border bg-background/60 hover:border-border"}`}
            >
              <meta.icon className={`h-4 w-4 ${meta.accent}`} />
              <span className={`text-sm font-medium ${expandedPillar === k ? meta.accent : "text-foreground-secondary"}`}>{meta.full}</span>
              {hasContent ? (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusBadge.color}`}>{statusBadge.label}</span>
              ) : (
                <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-foreground-muted">Vide</span>
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
            <div className={`rounded-xl border ${RTIS_META[currentPhase as RTISKey]?.border ?? "border-border"} ${RTIS_META[currentPhase as RTISKey]?.bg ?? "bg-background/60"} p-5`}>
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
                    className={`flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
                  >
                    {generatingStep === currentPhase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {generatingStep === currentPhase ? "Generation..." : `Generer ${RTIS_META[currentPhase as RTISKey]?.full ?? ""}`}
                  </button>
                  {Boolean(data[currentPhase]?.content) && (() => {
                    const isValidated = data[currentPhase]?.validationStatus === "VALIDATED" || data[currentPhase]?.validationStatus === "LOCKED";
                    return isValidated ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Valide
                        </span>
                        <button
                          onClick={() => transitionMutation.mutate({ strategyId, key: currentPhase as RTISKey, targetStatus: "DRAFT" })}
                          disabled={transitionMutation.isPending}
                          className="rounded-lg border border-border px-3 py-2 text-xs text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground-secondary"
                        >
                          Devalider
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => transitionMutation.mutate({ strategyId, key: currentPhase as RTISKey, targetStatus: "VALIDATED" })}
                        disabled={transitionMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-800/40 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        Valider {RTIS_META[currentPhase as RTISKey]?.full ?? ""}
                      </button>
                    );
                  })()}
                </div>
              </div>
              <p className="text-xs text-foreground-muted">
                {RTIS_META[currentPhase as RTISKey]?.description ?? ""}
                {" — "}Generez le contenu puis validez-le pour passer a l&apos;etape suivante.
              </p>
              {lastError && (
                <div className="mt-3 rounded-lg border border-red-800/40 bg-error/30 px-4 py-3 text-sm text-error">
                  <p className="font-medium">Erreur de generation</p>
                  <p className="mt-1 text-xs text-error">{lastError}</p>
                </div>
              )}
              {/* Preview of generated content */}
              {Boolean(data[currentPhase]?.content) && (
                <div className="mt-4 rounded-lg border border-border bg-background/50 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Contenu genere</p>
                  <div className="space-y-1.5 text-xs text-foreground-secondary">
                    {Object.entries(data[currentPhase]?.content as Record<string, unknown> ?? {}).slice(0, 6).map(([key, val]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="shrink-0 font-mono text-foreground-muted">{key}</span>
                        <span className="text-foreground-secondary line-clamp-1">
                          {typeof val === "string" ? val.substring(0, 100) : typeof val === "object" ? `{${Object.keys(val as object).length} champs}` : String(val)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(data[currentPhase]?.content as Record<string, unknown> ?? {}).length > 6 && (
                      <p className="text-foreground-muted">... et {Object.keys(data[currentPhase]?.content as Record<string, unknown> ?? {}).length - 6} champs de plus</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {adveAllPresent && currentPhase === "RECOS" && (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-accent">Etape: Recommandations R+T pour ADVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generateAllRecos}
                    disabled={!!generatingStep}
                    className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              <p className="text-xs text-foreground-muted">
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
                <p className="text-xs text-foreground-muted">Tous les piliers RTIS sont generes et valides. Consultez L'Oracle pour la proposition strategique.</p>
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
            <div key={k} className={`rounded-xl border ${meta.border} bg-background/60 overflow-hidden`}>
              {/* Header */}
              <button
                onClick={() => setExpandedPillar(isExpanded ? null : k)}
                className="w-full flex items-center justify-between p-4 hover:bg-background/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <meta.icon className={`h-5 w-5 ${meta.accent}`} />
                  <span className={`font-semibold ${meta.accent}`}>{meta.full}</span>
                  <span className="text-xs text-foreground-muted">{meta.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-foreground-muted" /> : <ChevronDown className="h-4 w-4 text-foreground-muted" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border p-5 space-y-5">
                  {/* Actions row */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setActualizingKey(k); actualizeMutation.mutate({ strategyId, key: k }); }}
                      disabled={isActualizing}
                      className={`flex items-center gap-1.5 rounded-lg border ${meta.border} px-3 py-1.5 text-xs font-medium ${meta.accent} hover:bg-background disabled:opacity-40 transition-colors`}
                    >
                      {isActualizing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      {isActualizing ? "Generation..." : `Generer ${meta.full}`}
                    </button>
                    <button
                      onClick={() => transitionMutation.mutate({ strategyId, key: k, targetStatus: "VALIDATED" })}
                      disabled={transitionMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-800/40 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-background transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Valider
                    </button>
                    {transitionMutation.error && (
                      <span className="text-xs text-error">{transitionMutation.error.message}</span>
                    )}
                  </div>

                  {/* Content rendering per pillar */}
                  {!pillarData?.content ? (
                    <p className="text-sm text-foreground-muted italic">Pilier vide — lancez la cascade ou generez individuellement.</p>
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
    case "S": return <StrategyContent content={content} />;
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
        <Gauge className="h-5 w-5 text-error" />
        <span className="text-sm text-foreground-secondary">Score de risque global:</span>
        <span className={`text-2xl font-bold ${riskScore > 70 ? "text-error" : riskScore > 40 ? "text-amber-400" : "text-emerald-400"}`}>
          {riskScore}/100
        </span>
      </div>

      {/* SWOT */}
      <div>
        <h4 className="text-sm font-semibold text-error uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" /> SWOT
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {(["strengths", "weaknesses", "opportunities", "threats"] as const).map((cat) => {
            const items = safeArr(swot[cat] as unknown);
            const labels: Record<string, { label: string; color: string }> = {
              strengths: { label: "Forces", color: "text-emerald-400 border-emerald-800/40" },
              weaknesses: { label: "Faiblesses", color: "text-error border-red-800/40" },
              opportunities: { label: "Opportunites", color: "text-sky-400 border-sky-800/40" },
              threats: { label: "Menaces", color: "text-amber-400 border-amber-800/40" },
            };
            const meta = labels[cat]!;
            return (
              <div key={cat} className={`rounded-lg border ${meta.color.split(" ")[1]} bg-background/80 p-3`}>
                <h5 className={`text-xs font-bold uppercase mb-2 ${meta.color.split(" ")[0]}`}>{meta.label}</h5>
                <ul className="space-y-1">
                  {items.length === 0 && <li className="text-xs text-foreground-muted italic">-</li>}
                  {items.map((item, i) => (
                    <li key={i} className="text-xs text-foreground-secondary">• {typeof item === "string" ? item : safeStr((item as Record<string, unknown>).text)}</li>
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
          <h4 className="text-sm font-semibold text-error uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Matrice Probabilite / Impact
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-foreground-muted uppercase">
                  <th className="text-left p-2">Risque</th>
                  <th className="text-center p-2">Probabilite</th>
                  <th className="text-center p-2">Impact</th>
                  <th className="text-left p-2">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-2 text-foreground-secondary">{safeStr(row.risk)}</td>
                    <td className="p-2 text-center">
                      <ProbBadge level={safeStr(row.probability, "MEDIUM")} />
                    </td>
                    <td className="p-2 text-center">
                      <ProbBadge level={safeStr(row.impact, "MEDIUM")} />
                    </td>
                    <td className="p-2 text-foreground-secondary">{safeStr(row.mitigation)}</td>
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
          <h4 className="text-sm font-semibold text-error uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" /> Priorites de Mitigation
          </h4>
          <div className="space-y-2">
            {mitigations.map((m, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background/80 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error/15 text-[10px] font-bold text-error">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs text-foreground-secondary">{safeStr(m.action)}</p>
                  <div className="flex gap-4 mt-1 text-[10px] text-foreground-muted">
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
        <span className="text-sm text-foreground-secondary">Brand-Market Fit Score:</span>
        <span className={`text-2xl font-bold ${bmfScore > 70 ? "text-emerald-400" : bmfScore > 40 ? "text-amber-400" : "text-error"}`}>
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
              <div key={field} className="rounded-lg border border-sky-800/40 bg-background/80 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <meta.icon className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-xs font-bold text-sky-400 uppercase">{meta.label}</span>
                </div>
                <p className="text-xs text-foreground-secondary leading-relaxed">{safeStr(triangulation[field], "Non disponible")}</p>
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
                <div key={tier} className="rounded-lg border border-sky-800/40 bg-background/80 p-3 text-center">
                  <span className="text-[10px] font-bold text-sky-400 uppercase">{tier.toUpperCase()}</span>
                  <p className="text-lg font-bold text-white mt-1">{fmtCurrency(v.value)}</p>
                  <p className="text-[10px] text-foreground-muted mt-0.5">{labels[tier]}</p>
                  {safeStr(v.description) && <p className="text-[10px] text-foreground-secondary mt-1">{safeStr(v.description)}</p>}
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
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background/80 p-3">
                <HypothesisBadge status={safeStr(h.status, "HYPOTHESIS")} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{safeStr(h.hypothesis)}</p>
                  <p className="text-[10px] text-foreground-muted mt-0.5">Methode: {safeStr(h.validationMethod, "-")}</p>
                  {safeStr(h.evidence) && <p className="text-[10px] text-foreground-secondary mt-0.5">Evidence: {safeStr(h.evidence)}</p>}
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
  // New format: catalogue exhaustif
  const catalogue = (content.catalogueParCanal ?? {}) as Record<string, unknown[]>;
  const assets = safeArr(content.assetsProduisibles);
  const activations = safeArr(content.activationsPossibles);
  const formats = safeArr(content.formatsDisponibles);
  const totalActions = safeNum(content.totalActions);
  const canaux = Object.keys(catalogue);

  // Legacy fallback: old sprint format
  const sprint = safeArr(content.sprint90Days);
  const isNewFormat = canaux.length > 0 || assets.length > 0;

  if (!isNewFormat && sprint.length > 0) {
    // Legacy: show old sprint format with warning
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-800/30 bg-amber-950/20 p-3">
          <p className="text-xs text-amber-400">Ancien format (sprint). Cliquez "Generer Implementation" pour obtenir le catalogue exhaustif.</p>
        </div>
        <div className="space-y-2">
          {sprint.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background/80 p-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-400">{i + 1}</span>
              <p className="text-xs text-foreground-secondary">{safeStr(s.action)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {totalActions > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-orange-400">{totalActions}</span>
          <span className="text-sm text-foreground-secondary">actions possibles identifiees</span>
        </div>
      )}

      {/* Catalogue par canal */}
      {canaux.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3">Catalogue par canal</h4>
          {canaux.map((canal) => {
            const actions = safeArr(catalogue[canal]);
            return (
              <div key={canal} className="mb-4">
                <p className="text-xs font-bold text-foreground-secondary mb-2">{canal.replace(/_/g, " ")}</p>
                <div className="space-y-1.5">
                  {actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background/80 p-3">
                      <div className="flex-1">
                        <p className="text-xs text-foreground-secondary">{safeStr(a.action)}</p>
                        <div className="flex gap-3 mt-1 text-[10px] text-foreground-muted">
                          {safeStr(a.format) && <span>Format: {safeStr(a.format)}</span>}
                          {safeStr(a.objectif) && <span>Objectif: {safeStr(a.objectif)}</span>}
                          {safeStr(a.pilierImpact) && <span className="text-orange-400">Pilier {safeStr(a.pilierImpact)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assets produisibles */}
      {assets.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3">Assets produisibles ({assets.length})</h4>
          <div className="flex flex-wrap gap-2">
            {assets.map((a, i) => (
              <span key={i} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground-secondary">
                {safeStr(a.asset ?? a)} {safeStr(a.type) && <span className="text-foreground-muted">({safeStr(a.type)})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Activations */}
      {activations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3">Activations possibles ({activations.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activations.map((a, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/80 p-3">
                <p className="text-xs font-medium text-foreground">{safeStr(a.activation)}</p>
                <div className="flex gap-2 mt-1 text-[10px]">
                  {safeStr(a.canal) && <span className="rounded bg-background px-1.5 py-0.5 text-foreground-muted">{safeStr(a.canal)}</span>}
                  {safeStr(a.cible) && <span className="rounded bg-background px-1.5 py-0.5 text-foreground-muted">{safeStr(a.cible)}</span>}
                  {safeStr(a.budgetEstime) && <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-orange-400">{safeStr(a.budgetEstime)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formats disponibles */}
      {formats.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3">Formats disponibles</h4>
          <div className="flex flex-wrap gap-1.5">
            {formats.map((f, i) => (
              <span key={i} className="rounded bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300">{safeStr(f)}</span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isNewFormat && sprint.length === 0 && (
        <p className="text-sm text-foreground-muted italic">Aucun contenu. Cliquez "Generer Implementation" pour creer le catalogue exhaustif.</p>
      )}
    </div>
  );
}

// ── S — Synthese ───────────────────────────────────────────────────────────

function StrategyContent({ content }: { content: Record<string, unknown> }) {
  const overton = (content.fenetreOverton ?? {}) as Record<string, unknown>;
  const roadmap = safeArr(content.roadmap);
  const sprint = safeArr(content.sprint90Days);
  const kpis = safeArr(content.kpiDashboard);
  const budget = safeNum(content.globalBudget);

  return (
    <div className="space-y-5">
      {/* Executive Summary */}
      {safeStr(content.syntheseExecutive) && (
        <div className="rounded-lg border border-pink-800/40 bg-background/80 p-4">
          <h4 className="text-xs font-bold text-pink-400 uppercase mb-2">Resume Executif</h4>
          <p className="text-xs text-foreground-secondary leading-relaxed">{safeStr(content.syntheseExecutive)}</p>
        </div>
      )}

      {/* Fenêtre d'Overton */}
      {(safeStr(overton.perceptionActuelle) || safeStr(overton.perceptionCible)) && (
        <div>
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" /> Fenetre d'Overton
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-red-800/30 bg-error/10 p-4">
              <p className="text-[10px] font-bold uppercase text-error">Perception actuelle</p>
              <p className="mt-1 text-xs text-foreground-secondary">{safeStr(overton.perceptionActuelle)}</p>
            </div>
            <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/10 p-4">
              <p className="text-[10px] font-bold uppercase text-emerald-400">Perception cible</p>
              <p className="mt-1 text-xs text-foreground-secondary">{safeStr(overton.perceptionCible)}</p>
            </div>
          </div>
          {safeStr(overton.ecart) && (
            <div className="mt-2 rounded-lg border border-amber-800/30 bg-amber-950/10 p-3">
              <p className="text-xs text-amber-300"><span className="font-bold">Ecart :</span> {safeStr(overton.ecart)}</p>
            </div>
          )}
          {safeArr(overton.strategieDeplacement as unknown).length > 0 && (
            <div className="mt-3 space-y-2">
              {safeArr(overton.strategieDeplacement as unknown).map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-[10px] font-bold text-pink-400">{i + 1}</span>
                  <div>
                    <p className="text-xs text-foreground-secondary">{safeStr(s.etape)} — {safeStr(s.action)}</p>
                    <div className="flex gap-2 mt-0.5 text-[10px]">
                      {safeStr(s.canal) && <span className="rounded bg-background px-1.5 py-0.5 text-foreground-muted">{safeStr(s.canal)}</span>}
                      {safeStr(s.horizon) && <span className="rounded bg-background px-1.5 py-0.5 text-foreground-muted">{safeStr(s.horizon)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roadmap */}
      {roadmap.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" /> Roadmap
          </h4>
          <div className="space-y-3">
            {roadmap.map((phase, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/80 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-pink-400">{safeStr(phase.phase)}</span>
                  {safeStr(phase.duree) && <span className="text-[10px] text-foreground-muted">{safeStr(phase.duree)}</span>}
                  {safeNum(phase.budget) > 0 && <span className="text-[10px] text-foreground-secondary">{fmtCurrency(phase.budget)} FCFA</span>}
                </div>
                <p className="text-xs text-foreground-secondary">{safeStr(phase.objectif)}</p>
                {safeArr(phase.actions as unknown).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {safeArr(phase.actions as unknown).map((a, j) => (
                      <span key={j} className="rounded bg-pink-500/10 px-2 py-0.5 text-[10px] text-pink-300">{typeof a === "string" ? a : "?"}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget */}
      {budget > 0 && (
        <div className="flex items-center gap-4">
          <DollarSign className="h-5 w-5 text-pink-400" />
          <span className="text-sm text-foreground-secondary">Budget global:</span>
          <span className="text-2xl font-bold text-white">{fmtCurrency(budget)} FCFA</span>
        </div>
      )}

      {/* Sprint 90 Days */}
      {sprint.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4" /> Sprint 90 Jours ({sprint.length} actions)
          </h4>
          <div className="space-y-2">
            {sprint.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background/80 p-3">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.isRiskMitigation ? "bg-error/15 text-error" : "bg-pink-500/15 text-pink-400"}`}>
                  {safeNum(s.priority, i + 1)}
                </span>
                <div className="flex-1">
                  <p className="text-xs text-foreground-secondary">{safeStr(s.action)}</p>
                  <div className="flex gap-4 mt-1 text-[10px] text-foreground-muted">
                    {safeStr(s.owner) && <span>Owner: {safeStr(s.owner)}</span>}
                    {safeStr(s.kpi) && <span>KPI: {safeStr(s.kpi)}</span>}
                    {Boolean(s.isRiskMitigation) && <span className="text-error">Mitigation risque</span>}
                  </div>
                </div>
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
              <thead><tr className="text-foreground-muted uppercase"><th className="text-left p-2">KPI</th><th className="text-center p-2">Pilier</th><th className="text-left p-2">Cible</th><th className="text-center p-2">Freq.</th></tr></thead>
              <tbody>
                {kpis.map((kpi, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-2 text-foreground-secondary">{safeStr(kpi.name)}</td>
                    <td className="p-2 text-center"><span className="rounded bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-bold text-pink-300">{safeStr(kpi.pillar)}</span></td>
                    <td className="p-2 text-foreground-secondary">{safeStr(kpi.target)}</td>
                    <td className="p-2 text-center text-foreground-muted">{safeStr(kpi.frequency)}</td>
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
    HIGH: "bg-error/15 text-error",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${colors[level] ?? "bg-surface-raised text-foreground-secondary"}`}>
      {level}
    </span>
  );
}

function HypothesisBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    HYPOTHESIS: "bg-zinc-500/15 text-foreground-secondary",
    TESTING: "bg-amber-500/15 text-amber-300",
    VALIDATED: "bg-emerald-500/15 text-emerald-300",
    INVALIDATED: "bg-error/15 text-error",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${colors[status] ?? "bg-surface-raised text-foreground-secondary"}`}>
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

