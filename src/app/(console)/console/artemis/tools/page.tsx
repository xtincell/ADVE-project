"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Wrench,
  Layers,
  Play,
  Clock,
  CheckCircle,
  Zap,
  Link2,
  Cpu,
  FileText,
  Calculator,
  Building2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type GloryTool = {
  slug: string;
  name: string;
  layer: string;
  order: number;
  executionType: string;
  pillarKeys: string[];
  requiredDrivers: string[];
  description: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const LAYER_BADGE: Record<string, string> = {
  CR: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  DC: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  HYBRID: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  BRAND: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
};

const EXEC_BADGE: Record<string, { label: string; color: string; icon: typeof Cpu }> = {
  LLM: { label: "LLM", color: "bg-rose-400/15 text-rose-400 ring-rose-400/30", icon: Cpu },
  COMPOSE: { label: "COMPOSE", color: "bg-sky-400/15 text-sky-400 ring-sky-400/30", icon: FileText },
  CALC: { label: "CALC", color: "bg-orange-400/15 text-orange-400 ring-orange-400/30", icon: Calculator },
};

const FAMILY_COLORS: Record<string, string> = {
  PILLAR: "border-l-amber-500",
  PRODUCTION: "border-l-blue-500",
  STRATEGIC: "border-l-emerald-500",
  OPERATIONAL: "border-l-purple-500",
};

const FAMILY_LABELS: Record<string, string> = {
  PILLAR: "Pilier ADVE-RTIS",
  PRODUCTION: "Production Creative",
  STRATEGIC: "Strategique",
  OPERATIONAL: "Operationnel",
};

const STEP_TYPE_ICONS: Record<string, { label: string; color: string }> = {
  GLORY: { label: "G", color: "bg-blue-500" },
  ARTEMIS: { label: "A", color: "bg-rose-500" },
  SESHAT: { label: "S", color: "bg-teal-500" },
  MESTOR: { label: "M", color: "bg-accent" },
  PILLAR: { label: "P", color: "bg-amber-500" },
  CALC: { label: "C", color: "bg-orange-500" },
};

// ─── Sequence Results Panel ──────────────────────────────────────────────────

function SequenceResultsPanel({ strategyId, sequenceKey, outputIds }: { strategyId: string; sequenceKey: string; outputIds: string[] }) {
  const [viewingOutputId, setViewingOutputId] = useState<string | null>(null);

  const seqOutputs = trpc.glory.getSequenceOutputs.useQuery(
    { strategyId, sequenceKey },
    { enabled: !!strategyId && !!sequenceKey },
  );

  const singleOutput = trpc.glory.getOutput.useQuery(
    { outputId: viewingOutputId ?? "" },
    { enabled: !!viewingOutputId },
  );

  const outputs = seqOutputs.data?.outputs ?? [];

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-foreground-muted">
          {seqOutputs.data?.sequenceName ?? "Resultats"} — {outputs.length} output{outputs.length > 1 ? "s" : ""}
        </p>
      </div>

      {seqOutputs.isLoading ? (
        <p className="text-[10px] text-foreground-muted animate-pulse">Chargement des resultats...</p>
      ) : outputs.length === 0 ? (
        <p className="text-[10px] text-foreground-muted">Aucun output enregistre.</p>
      ) : (
        <div className="space-y-1">
          {outputs.map((o, i) => (
            <button
              key={o.id}
              onClick={() => setViewingOutputId(viewingOutputId === o.id ? null : o.id)}
              className={`w-full text-left flex items-center gap-2 rounded px-2.5 py-2 text-[11px] transition-colors ${
                viewingOutputId === o.id
                  ? "bg-accent/30 border border-accent/40"
                  : "bg-background hover:bg-background border border-transparent"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${
                o.layer === "CR" ? "bg-blue-500/20 text-blue-400" :
                o.layer === "BRAND" ? "bg-amber-500/20 text-amber-400" :
                "bg-purple-500/20 text-purple-400"
              }`}>{i + 1}</span>
              <span className="flex-1 text-foreground-secondary truncate">{o.toolName}</span>
              <span className="text-[9px] text-foreground-muted uppercase">{o.layer}</span>
            </button>
          ))}
        </div>
      )}

      {/* Detail viewer — shows full output content */}
      {viewingOutputId && singleOutput.data && (
        <div className="mt-3 rounded-lg border border-accent/30 bg-background p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-accent">{singleOutput.data.toolName}</h4>
              <p className="text-[10px] text-foreground-muted">{singleOutput.data.toolSlug} — {singleOutput.data.layer} — {new Date(singleOutput.data.createdAt).toLocaleDateString("fr")}</p>
            </div>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(singleOutput.data!.output, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${singleOutput.data!.toolSlug}-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded border border-border px-2 py-1 text-[10px] text-foreground-secondary hover:text-white hover:border-border-strong transition-colors"
            >
              Telecharger JSON
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto rounded bg-background/80 p-3">
            {renderOutputContent(singleOutput.data.output)}
          </div>
        </div>
      )}
    </div>
  );
}

/** Render Glory output content as readable cards instead of raw JSON */
function renderOutputContent(output: Record<string, unknown>) {
  const entries = Object.entries(output).filter(([k]) => !k.startsWith("_"));

  if (entries.length === 0) {
    return <p className="text-[11px] text-foreground-muted">Output vide</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <p className="text-[10px] font-bold text-foreground-muted uppercase mb-1">{key.replace(/_/g, " ")}</p>
          {typeof value === "string" ? (
            <p className="text-[11px] text-foreground-secondary whitespace-pre-wrap leading-relaxed">{value}</p>
          ) : Array.isArray(value) ? (
            <div className="space-y-1">
              {(value as unknown[]).map((item, i) => (
                <div key={i} className="rounded bg-background/50 px-2.5 py-1.5 text-[11px] text-foreground-secondary">
                  {typeof item === "string" ? item : typeof item === "object" && item ? (
                    <div className="space-y-0.5">
                      {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                        <div key={k}><span className="text-foreground-muted">{k}:</span> <span>{String(v)}</span></div>
                      ))}
                    </div>
                  ) : String(item)}
                </div>
              ))}
            </div>
          ) : typeof value === "object" && value !== null ? (
            <div className="rounded bg-background/50 p-2.5 text-[11px] space-y-0.5">
              {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <div key={k} className="text-foreground-secondary">
                  <span className="text-foreground-muted">{k}:</span>{" "}
                  <span>{typeof v === "string" ? v : JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-foreground-secondary">{String(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GloryPage() {
  const [view, setView] = useState<"overview" | "tools" | "catalogue">("catalogue");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);

  const toolsQuery = trpc.glory.listAll.useQuery();
  const strategiesQuery = trpc.strategy.list.useQuery({});

  // Queue + scan for selected strategy (drill-down)
  const queueQuery = trpc.glory.queue.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );
  const scanQuery = trpc.glory.scanAll.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );
  const historyQuery2 = trpc.glory.history.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );

  // ── Execution result tracker ──────────────────────────────────────────────
  const [execResult, setExecResult] = useState<{
    sequenceKey: string;
    status: string;
    steps: Array<{ ref: string; type: string; status: string; durationMs: number; error?: string }>;
    totalDurationMs: number;
    timestamp: string;
  } | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const executeMutation = trpc.glory.executeSequence.useMutation({
    onMutate: () => { setExecError(null); setExecResult(null); },
    onSuccess: (data: any) => {
      queueQuery.refetch(); scanQuery.refetch(); historyQuery2.refetch();
      // Capture full result for debug tracker
      setExecResult({
        sequenceKey: data.sequenceKey ?? "?",
        status: data.status ?? "UNKNOWN",
        steps: (data.steps ?? []).map((s: any) => ({
          ref: s.ref, type: s.type, status: s.status,
          durationMs: s.durationMs ?? 0, error: s.error,
        })),
        totalDurationMs: data.totalDurationMs ?? 0,
        timestamp: new Date().toISOString(),
      });
    },
    onError: (err) => {
      setExecError(err.message);
      queueQuery.refetch(); scanQuery.refetch();
    },
  });
  const [autoError, setAutoError] = useState<string | null>(null);
  const autoCompleteMutation = trpc.glory.autoComplete.useMutation({
    onMutate: () => { setAutoError(null); },
    onSuccess: (data) => {
      if (data.status === "ERROR") setAutoError(`${data.pillarProcessed}: ${data.error}`);
      queueQuery.refetch(); scanQuery.refetch();
    },
    onError: (err) => { setAutoError(err.message); },
  });

  // Index scan results by sequenceKey for fast lookup
  const scanMap = new Map((scanQuery.data ?? []).map((s) => [s.sequenceKey, s]));

  const selectedToolQuery = trpc.glory.getBySlug.useQuery(
    { slug: selectedSlug ?? "" },
    { enabled: !!selectedSlug },
  );

  const allTools = (toolsQuery.data ?? []) as GloryTool[];
  const strategies = (strategiesQuery.data ?? []) as Array<{
    id: string; name: string; status: string; advertis_vector: Record<string, number> | null;
  }>;

  const llmCount = allTools.filter((t) => t.executionType === "LLM").length;
  const composeCount = allTools.filter((t) => t.executionType === "COMPOSE").length;
  const calcCount = allTools.filter((t) => t.executionType === "CALC").length;

  const toolTabs = [
    { key: "all", label: "Tous", count: allTools.length },
    { key: "cr", label: "CR", count: allTools.filter((t) => t.layer === "CR").length },
    { key: "dc", label: "DC", count: allTools.filter((t) => t.layer === "DC").length },
    { key: "hybrid", label: "HYBRID", count: allTools.filter((t) => t.layer === "HYBRID").length },
    { key: "brand", label: "BRAND", count: allTools.filter((t) => t.layer === "BRAND").length },
  ];

  const tabFiltered = activeTab === "all" ? allTools : allTools.filter((t) => t.layer === activeTab.toUpperCase());

  if (toolsQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Artemis — Outils GLORY"
        description={`${allTools.length} outils | 40 sequences | 4 familles — arsenal du Neter du Protocole`}
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Artemis", href: "/console/artemis" },
          { label: "Outils GLORY" },
        ]}
      />

      {/* Global Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total outils" value={allTools.length} icon={Wrench} />
        <StatCard title="Sequences" value={31} icon={Link2} />
        <StatCard title="Marques actives" value={strategies.filter((s) => s.status === "ACTIVE").length} icon={Building2} />
        <StatCard title="Execution Types" value={`${llmCount} LLM / ${composeCount} COMP / ${calcCount} CALC`} icon={Layers} />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setView("catalogue")} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${view === "catalogue" ? "bg-white text-black" : "bg-background text-foreground-secondary hover:text-white"}`}>
          Sequences (40)
        </button>
        <button onClick={() => setView("tools")} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${view === "tools" ? "bg-white text-black" : "bg-background text-foreground-secondary hover:text-white"}`}>
          Outils ({allTools.length})
        </button>
        <button onClick={() => { setView("overview"); setSelectedStrategyId(null); }} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${view === "overview" ? "bg-white text-black" : "bg-background text-foreground-secondary hover:text-white"}`}>
          Par marque
        </button>
        <a href="/console/artemis/skill-tree" className="ml-auto rounded-lg bg-emerald-500/20 px-3 py-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors">
          Lancer une sequence →
        </a>
      </div>

      {/* ═══ OVERVIEW: Multi-brand queue ═══ */}
      {view === "overview" && !selectedStrategyId && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
            Toutes les marques
          </h3>
          {strategies.length === 0 ? (
            <EmptyState icon={Building2} title="Aucune marque" description="Aucune strategie trouvee." />
          ) : (
            <div className="space-y-2">
              {strategies.map((s) => {
                const vec = s.advertis_vector;
                const composite = vec?.composite ?? 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStrategyId(s.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-background/80 p-4 text-left transition-colors hover:border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-accent" />
                      <div>
                        <h4 className="text-sm font-semibold text-white">{s.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={s.status.toLowerCase()} />
                          <span className="text-[10px] text-foreground-muted">Score: {composite}/200</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-foreground-muted" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ DRILL-DOWN: Queue for selected strategy ═══ */}
      {view === "overview" && selectedStrategyId && (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedStrategyId(null)}
            className="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux marques
          </button>

          <h3 className="text-sm font-semibold text-white">
            Queue : {strategies.find((s) => s.id === selectedStrategyId)?.name}
          </h3>

          {/* Error banners */}
          {autoError && (
            <div className="rounded-lg border border-red-500/30 bg-error/10 px-4 py-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-error">Erreur Auto-Complete</p>
                <p className="text-[11px] text-error/80 mt-0.5">{autoError}</p>
              </div>
              <button onClick={() => setAutoError(null)} className="text-error hover:text-error text-sm">✕</button>
            </div>
          )}
          {execError && (
            <div className="rounded-lg border border-red-500/30 bg-error/10 px-4 py-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-error">Erreur Execution</p>
                <p className="text-[11px] text-error/80 mt-0.5">{execError}</p>
              </div>
              <button onClick={() => setExecError(null)} className="text-error hover:text-error text-sm">✕</button>
            </div>
          )}

          {/* ── Debug Tracker: dernier resultat d'execution ─────────────── */}
          {execResult && (
            <div className={`rounded-lg border px-4 py-3 font-mono text-[11px] ${
              execResult.status === "COMPLETED" ? "border-emerald-500/30 bg-emerald-500/5" :
              execResult.status === "PARTIAL" ? "border-amber-500/30 bg-amber-500/5" :
              "border-red-500/30 bg-error/5"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    execResult.status === "COMPLETED" ? "text-emerald-400" :
                    execResult.status === "PARTIAL" ? "text-amber-400" : "text-error"
                  }`}>
                    {execResult.status}
                  </span>
                  <span className="text-foreground-muted">{execResult.sequenceKey}</span>
                  <span className="text-foreground-muted">{(execResult.totalDurationMs / 1000).toFixed(1)}s</span>
                  <span className="text-foreground-muted">{execResult.timestamp.slice(11, 19)}</span>
                </div>
                <button onClick={() => setExecResult(null)} className="text-foreground-muted hover:text-foreground-secondary">✕</button>
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {execResult.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm text-[8px] font-bold flex items-center justify-center ${
                      step.status === "SUCCESS" ? "bg-emerald-600 text-white" :
                      step.status === "SKIPPED" ? "bg-surface-raised text-foreground-secondary" :
                      "bg-error text-white"
                    }`}>
                      {step.status === "SUCCESS" ? "✓" : step.status === "SKIPPED" ? "–" : "✕"}
                    </span>
                    <span className={`w-8 ${STEP_TYPE_ICONS[step.type]?.color ?? "bg-surface-elevated"} rounded px-1 text-[9px] text-white text-center`}>
                      {step.type}
                    </span>
                    <span className={`flex-1 truncate ${step.status === "FAILED" ? "text-error" : step.status === "SKIPPED" ? "text-foreground-muted" : "text-foreground-secondary"}`}>
                      {step.ref}
                    </span>
                    <span className="text-foreground-muted w-12 text-right">
                      {step.durationMs > 0 ? `${(step.durationMs / 1000).toFixed(1)}s` : ""}
                    </span>
                    {step.error && (
                      <span className="text-error truncate max-w-[200px]" title={step.error}>
                        {step.error.slice(0, 60)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {execResult.steps.some(s => s.status === "FAILED") && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-error text-[10px]">
                    {execResult.steps.filter(s => s.status === "FAILED").length} step(s) failed —{" "}
                    {execResult.steps.filter(s => s.status === "SUCCESS").length}/{execResult.steps.length} succeeded
                  </p>
                </div>
              )}
            </div>
          )}

          {queueQuery.isLoading ? (
            <p className="text-xs text-foreground-muted">Chargement de la queue...</p>
          ) : queueQuery.data ? (
            <div className="space-y-4">
              {/* Status counts */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["READY", "RUNNING", "BLOCKED", "DONE"] as const).map((status) => {
                  const count = queueQuery.data!.filter((q) => q.status === status).length;
                  const colors: Record<string, string> = { READY: "text-emerald-400", RUNNING: "text-blue-400", BLOCKED: "text-error", DONE: "text-foreground-muted" };
                  return (
                    <div key={status} className="rounded-lg border border-border bg-background/80 p-3 text-center">
                      <p className={`text-xl font-bold ${colors[status]}`}>{count}</p>
                      <p className="text-[10px] text-foreground-muted uppercase">{status}</p>
                    </div>
                  );
                })}
              </div>

              {/* ALL sequences — each with individual readiness + actions */}
              <div className="space-y-2">
                {queueQuery.data.map((item) => {
                  const scan = scanMap.get(item.sequenceKey);
                  const readiness = scan?.readiness ?? 0;
                  const isDone = item.status === "DONE";
                  const isBlocked = item.status === "BLOCKED";
                  const isRunning = item.status === "RUNNING";
                  // Client-side per-sequence state detection
                  const isThisRunning = executeMutation.isPending && executeMutation.variables?.sequenceKey === item.sequenceKey;
                  const isThisAutoCompleting = autoCompleteMutation.isPending && autoCompleteMutation.variables?.sequenceKey === item.sequenceKey;

                  // Border color based on state
                  const borderColor = isThisRunning
                    ? "border-blue-500/50 animate-pulse"
                    : isDone
                      ? "border-emerald-500/30"
                      : isBlocked
                        ? "border-red-500/20"
                        : readiness >= 80
                          ? "border-emerald-500/20"
                          : readiness >= 40
                            ? "border-amber-500/20"
                            : "border-red-500/10";

                  // Readiness bar color
                  const barColor = readiness >= 80 ? "bg-emerald-500" : readiness >= 40 ? "bg-amber-500" : "bg-error";

                  return (
                    <div key={item.sequenceKey} className={`rounded-xl border ${borderColor} bg-background/80 p-4`}>
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isDone && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
                            <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                            <span className="text-[10px] font-mono text-foreground-muted">{item.sequenceKey}</span>
                            <span className="text-[10px] text-foreground-muted">{item.family}</span>
                          </div>

                          {/* Readiness bar + percentage */}
                          {!isDone && scan && (
                            <div className="mt-2 flex items-center gap-3">
                              <div className="flex-1 max-w-48">
                                <div className="h-1.5 rounded-full bg-background">
                                  <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${readiness}%` }} />
                                </div>
                              </div>
                              <span className={`text-xs font-semibold ${readiness >= 80 ? "text-emerald-400" : readiness >= 40 ? "text-amber-400" : "text-error"}`}>
                                {readiness}%
                              </span>
                              <span className="text-[10px] text-foreground-muted">
                                {scan.resolved}/{scan.totalBindings} bindings
                              </span>
                            </div>
                          )}

                          {/* Gaps details */}
                          {!isDone && scan && scan.gaps.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {scan.gaps.slice(0, 5).map((g, i) => (
                                <span key={i} className="inline-flex rounded bg-background px-1.5 py-0.5 text-[9px] text-foreground-muted" title={`${g.step}: ${g.field} ← ${g.path}`}>
                                  {g.path}
                                </span>
                              ))}
                              {scan.gaps.length > 5 && (
                                <span className="text-[9px] text-foreground-muted">+{scan.gaps.length - 5} autres</span>
                              )}
                            </div>
                          )}

                          {/* Blocked reason */}
                          {isBlocked && (
                            <p className="mt-1 text-[10px] text-error">Bloque par: {item.blockedBy.join(", ")}</p>
                          )}

                          {/* Done: output count + date */}
                          {isDone && (
                            <p className="mt-1 text-[10px] text-foreground-muted">
                              {item.outputIds.length} outputs | {item.lastExecutedAt ? new Date(item.lastExecutedAt).toLocaleDateString("fr-FR") : "-"}
                            </p>
                          )}

                          <p className="mt-1 text-[10px] text-foreground-muted">{item.stepCount} steps ({item.aiSteps} AI)</p>
                        </div>

                        {/* Right: actions */}
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          {/* RUNNING state — this sequence is currently executing */}
                          {isThisRunning && (
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                              <span className="text-xs text-blue-400">Lancement...</span>
                            </div>
                          )}

                          {/* Gap actions — when gaps exist and not running */}
                          {!isDone && !isThisRunning && scan && scan.gaps.length > 0 && (
                            <div className="flex gap-1.5">
                              {/* Auto-complete via Mestor — fills ALL gap types */}
                              <button
                                onClick={() => {
                                  console.log("[glory] Auto-complete clicked:", item.sequenceKey, selectedStrategyId);
                                  if (!selectedStrategyId) { setAutoError("Aucune strategie selectionnee"); return; }
                                  autoCompleteMutation.mutate(
                                    { strategyId: selectedStrategyId, sequenceKey: item.sequenceKey },
                                    { onError: (err) => { console.error("[glory] Auto-complete error:", err); setAutoError(err.message); } }
                                  );
                                }}
                                disabled={isThisAutoCompleting}
                                className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
                              >
                                {isThisAutoCompleting ? "Mestor..." : `Auto (${scan.gaps.length})`}
                              </button>
                              {/* Manuel — edit page with focus mode */}
                              <a
                                href={`/cockpit/brand/edit?focus=${encodeURIComponent(scan.gaps.map((g) => g.path).join(","))}&from=glory&seq=${item.sequenceKey}`}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground-secondary hover:border-border-strong transition-colors"
                              >
                                Manuel
                              </a>
                            </div>
                          )}

                          {/* Lancer → redirect to Skill Tree (single launcher) */}
                          {!isDone && !isBlocked && (
                            <a
                              href="/console/artemis/skill-tree"
                              className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                            >
                              Lancer via Skill Tree →
                            </a>
                          )}

                          {/* DONE: Voir résultats + Vault link */}
                          {isDone && (
                            <>
                              <button
                                onClick={() => setExpandedSeq(expandedSeq === item.sequenceKey ? null : item.sequenceKey)}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-secondary hover:text-white hover:border-border-strong transition-colors"
                              >
                                {expandedSeq === item.sequenceKey ? "Masquer" : "Voir resultats"}
                              </button>
                              <a
                                href="/console/artemis/vault"
                                className="rounded-lg border border-border px-3 py-1.5 text-[10px] text-foreground-muted hover:text-foreground-secondary hover:border-border transition-colors"
                              >
                                Voir dans Vault →
                              </a>
                            </>
                          )}

                          {/* BLOCKED */}
                          {isBlocked && (
                            <span className="text-[10px] text-error/60">Prerequis requis</span>
                          )}
                        </div>
                      </div>

                      {/* Expanded results panel (DONE sequences) */}
                      {isDone && expandedSeq === item.sequenceKey && (
                        <SequenceResultsPanel
                          strategyId={selectedStrategyId!}
                          sequenceKey={item.sequenceKey}
                          outputIds={item.outputIds}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ═══ CATALOGUE: Static 31 sequences ═══ */}
      {view === "catalogue" && (
        <div className="space-y-6">
          {(["PILLAR", "PRODUCTION", "STRATEGIC", "OPERATIONAL"] as const).map((family) => (
            <div key={family}>
              <h3 className="mb-3 text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
                {FAMILY_LABELS[family]}
              </h3>
              <div className="space-y-2">
                {getStaticSequences(family).map((seq) => (
                  <div key={seq.key} className={`rounded-xl border border-border border-l-4 ${FAMILY_COLORS[family]} bg-background/80 p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{seq.name}</h4>
                          <span className="text-[10px] font-mono text-foreground-muted">{seq.key}</span>
                          {seq.pillar && (
                            <span className="inline-flex rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-inset ring-amber-400/30">
                              {seq.pillar.toUpperCase()}
                            </span>
                          )}
                          {!seq.aiPowered && (
                            <span className="inline-flex rounded-full bg-orange-400/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400 ring-1 ring-inset ring-orange-400/30">
                              CALC
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-foreground-secondary line-clamp-2">{seq.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          {seq.steps.map((step: { type: string; name: string }, i: number) => {
                            const typeInfo = STEP_TYPE_ICONS[step.type] ?? { label: "?", color: "bg-surface-elevated" };
                            return (
                              <div key={i} className="flex items-center gap-1">
                                {i > 0 && <span className="text-foreground-muted text-[10px]">&rarr;</span>}
                                <div className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white ${typeInfo.color}`} title={`${step.type}: ${step.name}`}>
                                  {typeInfo.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <span className="text-xs text-foreground-muted">{seq.steps.length} steps</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TOOLS VIEW ═══ */}
      {view === "tools" && (
        <>
          <Tabs tabs={toolTabs} activeTab={activeTab} onChange={setActiveTab} />
          {tabFiltered.length === 0 ? (
            <EmptyState icon={Wrench} title="Aucun outil" description="Aucun outil GLORY trouve dans cette couche." />
          ) : (
            <div className="space-y-2">
              {tabFiltered.map((tool) => {
                const execInfo = EXEC_BADGE[tool.executionType] ?? EXEC_BADGE.COMPOSE;
                return (
                  <div
                    key={tool.slug}
                    onClick={() => setSelectedSlug(tool.slug)}
                    className="cursor-pointer rounded-xl border border-border bg-background/80 p-4 transition-colors hover:border-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{tool.name}</h4>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${LAYER_BADGE[tool.layer] ?? ""}`}>{tool.layer}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${execInfo?.color ?? ""}`}>{execInfo?.label ?? ""}</span>
                        </div>
                        <p className="mt-1 text-xs text-foreground-secondary line-clamp-2">{tool.description}</p>
                        {tool.pillarKeys.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tool.pillarKeys.map((pk) => (
                              <span key={pk} className="inline-flex rounded-full bg-background px-2 py-0.5 text-[10px] text-foreground-secondary">{pk.toUpperCase()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-foreground-muted">#{tool.order}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tool Detail Modal */}
      <Modal open={!!selectedSlug} onClose={() => setSelectedSlug(null)} title={selectedToolQuery.data?.name ?? selectedSlug ?? "Details"} size="lg">
        {selectedToolQuery.isLoading ? (
          <p className="text-sm text-foreground-muted">Chargement...</p>
        ) : selectedToolQuery.data ? (() => {
          const t = selectedToolQuery.data;
          const execInfo = EXEC_BADGE[t.executionType] ?? EXEC_BADGE.COMPOSE;
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${LAYER_BADGE[t.layer] ?? ""}`}>{t.layer}</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${execInfo?.color ?? ""}`}>{execInfo?.label ?? ""}</span>
                <span className="text-xs text-foreground-muted">#{t.order} — {t.slug}</span>
              </div>
              <p className="text-sm text-foreground-secondary">{t.description}</p>
              {t.inputFields?.length > 0 && (
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">Champs d&apos;entree</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.inputFields.map((f: string) => (
                      <span key={f} className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-400">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {t.pillarBindings && Object.keys(t.pillarBindings).length > 0 && (
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">Irrigation ADVE-RTIS</p>
                  <div className="space-y-1">
                    {Object.entries(t.pillarBindings as Record<string, string>).map(([field, path]) => (
                      <div key={field} className="flex items-center gap-2 text-[11px]">
                        <span className="font-medium text-blue-400">{field}</span>
                        <span className="text-foreground-muted">&larr;</span>
                        <span className="font-mono text-amber-400">{path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-border bg-background/80 p-3">
                <p className="mb-1 text-xs font-medium text-foreground-muted">Format de sortie</p>
                <p className="text-sm font-mono text-white">{t.outputFormat}</p>
              </div>
              {t.dependencies?.length > 0 && (
                <div className="rounded-lg border border-border bg-background/80 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">Dependances</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.dependencies.map((d: string) => (
                      <span key={d} className="inline-flex rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-400">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })() : null}
      </Modal>
    </div>
  );
}

// ─── Static sequence catalogue ───────────────────────────────────────────────

type StaticSeq = { key: string; name: string; description: string; pillar?: string; aiPowered: boolean; steps: Array<{ type: string; name: string }> };

function getStaticSequences(family: string): StaticSeq[] {
  const all: StaticSeq[] = [
    // PILLAR
    { key: "MANIFESTE-A", name: "Le Manifeste", pillar: "a", description: "ADN, archeytpe, prophetie, voix, manifeste.", steps: [{ type: "PILLAR", name: "A" }, { type: "ARTEMIS", name: "Archeo" }, { type: "SESHAT", name: "Refs" }, { type: "GLORY", name: "Mots" }, { type: "GLORY", name: "Concepts" }, { type: "GLORY", name: "Ton" }, { type: "GLORY", name: "Claims" }, { type: "GLORY", name: "Manifeste" }], aiPowered: true },
    { key: "BRANDBOOK-D", name: "Le Brandbook", pillar: "d", description: "Systeme visuel complet.", steps: [{ type: "PILLAR", name: "D" }, { type: "GLORY", name: "Semio" }, { type: "GLORY", name: "Paysage" }, { type: "GLORY", name: "Mood" }, { type: "GLORY", name: "Photo" }, { type: "GLORY", name: "Chroma" }, { type: "GLORY", name: "Typo" }, { type: "GLORY", name: "Logo" }, { type: "GLORY", name: "Tokens" }, { type: "GLORY", name: "Icons" }, { type: "GLORY", name: "Motion" }, { type: "GLORY", name: "Guide" }], aiPowered: true },
    { key: "OFFRE-V", name: "L'Offre Commerciale", pillar: "v", description: "Proposition de valeur, pricing, deck.", steps: [{ type: "PILLAR", name: "V" }, { type: "SESHAT", name: "Bench" }, { type: "GLORY", name: "ValProp" }, { type: "GLORY", name: "Claims" }, { type: "CALC", name: "Pricing" }, { type: "GLORY", name: "Deck" }], aiPowered: true },
    { key: "PLAYBOOK-E", name: "Le Playbook Engagement", pillar: "e", description: "Communaute, rituels, superfan.", steps: [{ type: "PILLAR", name: "E" }, { type: "ARTEMIS", name: "Touch" }, { type: "ARTEMIS", name: "Rituels" }, { type: "GLORY", name: "Playbook" }, { type: "GLORY", name: "Superfan" }, { type: "GLORY", name: "Rituels" }], aiPowered: true },
    { key: "AUDIT-R", name: "L'Audit Interne", pillar: "r", description: "Risques, conformite, mitigation.", steps: [{ type: "PILLAR", name: "R" }, { type: "MESTOR", name: "RTIS R" }, { type: "ARTEMIS", name: "Risk" }, { type: "GLORY", name: "Matrice" }, { type: "GLORY", name: "Crise" }, { type: "GLORY", name: "Conformite" }], aiPowered: true },
    { key: "ETUDE-T", name: "L'Etude de Marche", pillar: "t", description: "Intelligence marche, tendances.", steps: [{ type: "PILLAR", name: "T" }, { type: "SESHAT", name: "Intel" }, { type: "ARTEMIS", name: "Fit" }, { type: "GLORY", name: "Concur" }, { type: "CALC", name: "TAM" }, { type: "GLORY", name: "Trends" }, { type: "GLORY", name: "Insights" }], aiPowered: true },
    { key: "BRAINSTORM-I", name: "Le Brainstorm 360", pillar: "i", description: "Ideation, architecture, ressources.", steps: [{ type: "PILLAR", name: "I" }, { type: "MESTOR", name: "RTIS I" }, { type: "GLORY", name: "Ideation" }, { type: "GLORY", name: "Concepts" }, { type: "GLORY", name: "Archi" }, { type: "CALC", name: "Ressources" }], aiPowered: true },
    { key: "ROADMAP-S", name: "La Roadmap Strategique", pillar: "s", description: "Vision, KPIs, jalons.", steps: [{ type: "PILLAR", name: "S" }, { type: "MESTOR", name: "RTIS S" }, { type: "GLORY", name: "Diagnostic" }, { type: "GLORY", name: "KPIs" }, { type: "GLORY", name: "Roadmap" }], aiPowered: true },
    // PRODUCTION
    { key: "KV", name: "Key Visual", description: "Concept → prompt AI image.", steps: [{ type: "PILLAR", name: "A+D" }, { type: "GLORY", name: "Concept" }, { type: "GLORY", name: "Claim" }, { type: "GLORY", name: "Eval" }, { type: "GLORY", name: "Brief DA" }, { type: "GLORY", name: "Prompt" }, { type: "GLORY", name: "Valid" }], aiPowered: true },
    { key: "SPOT-VIDEO", name: "Spot Video", description: "Script, storyboard, casting, son.", steps: [{ type: "GLORY", name: "Concept" }, { type: "GLORY", name: "Script" }, { type: "GLORY", name: "Dialogue" }, { type: "GLORY", name: "Storyboard" }, { type: "GLORY", name: "Casting" }, { type: "GLORY", name: "Son" }], aiPowered: true },
    { key: "PRINT-AD", name: "Annonce Presse", description: "Claim, layout, body copy.", steps: [{ type: "GLORY", name: "Concept" }, { type: "GLORY", name: "Claim" }, { type: "GLORY", name: "Layout" }, { type: "GLORY", name: "Copy" }, { type: "GLORY", name: "Check" }], aiPowered: true },
    { key: "SOCIAL-POST", name: "Post Social", description: "Copy + brand check.", steps: [{ type: "GLORY", name: "Concept" }, { type: "GLORY", name: "Copy" }, { type: "GLORY", name: "Check" }], aiPowered: true },
    { key: "NAMING", name: "Naming", description: "Exploration → legal check.", steps: [{ type: "GLORY", name: "Semio" }, { type: "GLORY", name: "Mots" }, { type: "GLORY", name: "Noms" }, { type: "GLORY", name: "Eval" }, { type: "GLORY", name: "Legal" }], aiPowered: true },
    // STRATEGIC
    { key: "CAMPAIGN-360", name: "Campagne 360", description: "Brief → simulation.", steps: [{ type: "GLORY", name: "Brief" }, { type: "GLORY", name: "Concept" }, { type: "GLORY", name: "Archi" }, { type: "CALC", name: "Media" }, { type: "GLORY", name: "Digital" }, { type: "CALC", name: "Simul" }], aiPowered: true },
    { key: "LAUNCH", name: "Lancement", description: "Benchmark → timeline.", steps: [{ type: "SESHAT", name: "Intel" }, { type: "GLORY", name: "Concur" }, { type: "GLORY", name: "Concept" }, { type: "GLORY", name: "Timeline" }], aiPowered: true },
    { key: "PITCH", name: "Pitch", description: "Benchmark → credentials.", steps: [{ type: "GLORY", name: "Refs" }, { type: "GLORY", name: "Concept" }, { type: "GLORY", name: "Pitch" }, { type: "GLORY", name: "Credentials" }], aiPowered: true },
    // OPERATIONAL
    { key: "OPS", name: "Operations", description: "Budget, devis, vendor, approval.", steps: [{ type: "GLORY", name: "Budget" }, { type: "GLORY", name: "Devis" }, { type: "GLORY", name: "Vendor" }, { type: "GLORY", name: "Approval" }], aiPowered: false },
    { key: "EVAL", name: "Post-Campagne", description: "Resultats, ROI, case.", steps: [{ type: "GLORY", name: "Resultats" }, { type: "CALC", name: "ROI" }, { type: "GLORY", name: "Eval" }, { type: "GLORY", name: "Case" }], aiPowered: true },
    { key: "COST-SERVICE", name: "Cout du Service", description: "Taux horaire, CODB, marges.", steps: [{ type: "CALC", name: "Taux" }, { type: "CALC", name: "CODB" }, { type: "CALC", name: "Marges" }], aiPowered: false },
    { key: "PROFITABILITY", name: "Rentabilite", description: "P&L, client, utilisation.", steps: [{ type: "CALC", name: "P&L" }, { type: "CALC", name: "Client" }, { type: "CALC", name: "Utilisation" }], aiPowered: false },
  ];
  const familyMap: Record<string, string[]> = {
    PILLAR: ["MANIFESTE-A", "BRANDBOOK-D", "OFFRE-V", "PLAYBOOK-E", "AUDIT-R", "ETUDE-T", "BRAINSTORM-I", "ROADMAP-S"],
    PRODUCTION: ["KV", "SPOT-VIDEO", "PRINT-AD", "SOCIAL-POST", "NAMING"],
    STRATEGIC: ["CAMPAIGN-360", "LAUNCH", "PITCH"],
    OPERATIONAL: ["OPS", "EVAL", "COST-SERVICE", "PROFITABILITY"],
  };
  const keys = familyMap[family] ?? [];
  return all.filter((s) => keys.includes(s.key));
}
