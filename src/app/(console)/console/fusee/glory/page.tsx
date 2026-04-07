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
  MESTOR: { label: "M", color: "bg-violet-500" },
  PILLAR: { label: "P", color: "bg-amber-500" },
  CALC: { label: "C", color: "bg-orange-500" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function GloryPage() {
  const [view, setView] = useState<"overview" | "tools" | "catalogue">("overview");
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

  const executeMutation = trpc.glory.executeSequence.useMutation({
    onSuccess: () => { queueQuery.refetch(); scanQuery.refetch(); historyQuery2.refetch(); },
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
        title="GLORY Tools"
        description={`${allTools.length} outils | 31 sequences | 4 familles — superviseur global`}
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "GLORY" },
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
      <div className="flex gap-2">
        <button onClick={() => { setView("overview"); setSelectedStrategyId(null); }} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${view === "overview" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
          Marques ({strategies.length})
        </button>
        <button onClick={() => setView("catalogue")} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${view === "catalogue" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
          Catalogue (31 seq.)
        </button>
        <button onClick={() => setView("tools")} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${view === "tools" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
          Outils ({allTools.length})
        </button>
      </div>

      {/* ═══ OVERVIEW: Multi-brand queue ═══ */}
      {view === "overview" && !selectedStrategyId && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
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
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-left transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-violet-400" />
                      <div>
                        <h4 className="text-sm font-semibold text-white">{s.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={s.status.toLowerCase()} />
                          <span className="text-[10px] text-zinc-500">Score: {composite}/200</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600" />
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
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux marques
          </button>

          <h3 className="text-sm font-semibold text-white">
            Queue : {strategies.find((s) => s.id === selectedStrategyId)?.name}
          </h3>

          {/* Error banner */}
          {autoError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-red-400">Erreur Auto-Complete</p>
                <p className="text-[11px] text-red-300/80 mt-0.5">{autoError}</p>
              </div>
              <button onClick={() => setAutoError(null)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
            </div>
          )}

          {queueQuery.isLoading ? (
            <p className="text-xs text-zinc-500">Chargement de la queue...</p>
          ) : queueQuery.data ? (
            <div className="space-y-4">
              {/* Status counts */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["READY", "RUNNING", "BLOCKED", "DONE"] as const).map((status) => {
                  const count = queueQuery.data!.filter((q) => q.status === status).length;
                  const colors: Record<string, string> = { READY: "text-emerald-400", RUNNING: "text-blue-400", BLOCKED: "text-red-400", DONE: "text-zinc-500" };
                  return (
                    <div key={status} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-center">
                      <p className={`text-xl font-bold ${colors[status]}`}>{count}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{status}</p>
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
                  const barColor = readiness >= 80 ? "bg-emerald-500" : readiness >= 40 ? "bg-amber-500" : "bg-red-500";

                  return (
                    <div key={item.sequenceKey} className={`rounded-xl border ${borderColor} bg-zinc-900/80 p-4`}>
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isDone && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
                            <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                            <span className="text-[10px] font-mono text-zinc-600">{item.sequenceKey}</span>
                            <span className="text-[10px] text-zinc-600">{item.family}</span>
                          </div>

                          {/* Readiness bar + percentage */}
                          {!isDone && scan && (
                            <div className="mt-2 flex items-center gap-3">
                              <div className="flex-1 max-w-48">
                                <div className="h-1.5 rounded-full bg-zinc-800">
                                  <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${readiness}%` }} />
                                </div>
                              </div>
                              <span className={`text-xs font-semibold ${readiness >= 80 ? "text-emerald-400" : readiness >= 40 ? "text-amber-400" : "text-red-400"}`}>
                                {readiness}%
                              </span>
                              <span className="text-[10px] text-zinc-600">
                                {scan.resolved}/{scan.totalBindings} bindings
                              </span>
                            </div>
                          )}

                          {/* Gaps details */}
                          {!isDone && scan && scan.gaps.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {scan.gaps.slice(0, 5).map((g, i) => (
                                <span key={i} className="inline-flex rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500" title={`${g.step}: ${g.field} ← ${g.path}`}>
                                  {g.path}
                                </span>
                              ))}
                              {scan.gaps.length > 5 && (
                                <span className="text-[9px] text-zinc-600">+{scan.gaps.length - 5} autres</span>
                              )}
                            </div>
                          )}

                          {/* Blocked reason */}
                          {isBlocked && (
                            <p className="mt-1 text-[10px] text-red-400">Bloque par: {item.blockedBy.join(", ")}</p>
                          )}

                          {/* Done: output count + date */}
                          {isDone && (
                            <p className="mt-1 text-[10px] text-zinc-500">
                              {item.outputIds.length} outputs | {item.lastExecutedAt ? new Date(item.lastExecutedAt).toLocaleDateString("fr-FR") : "-"}
                            </p>
                          )}

                          <p className="mt-1 text-[10px] text-zinc-600">{item.stepCount} steps ({item.aiSteps} AI)</p>
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
                                className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
                              >
                                Manuel
                              </a>
                            </div>
                          )}

                          {/* Lancer / Forcer — when not running and not done */}
                          {!isDone && !isBlocked && !isThisRunning && !isThisAutoCompleting && (
                            <button
                              onClick={() => executeMutation.mutate({ strategyId: selectedStrategyId!, sequenceKey: item.sequenceKey })}
                              disabled={isThisRunning}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                readiness >= 60
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                  : readiness >= 30
                                    ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                              }`}
                            >
                              {readiness >= 60 ? "Lancer" : readiness >= 30 ? "Forcer" : "Incomplet"}
                            </button>
                          )}

                          {/* DONE: Voir résultats + Relancer */}
                          {isDone && (
                            <>
                              <button
                                onClick={() => setExpandedSeq(expandedSeq === item.sequenceKey ? null : item.sequenceKey)}
                                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                              >
                                {expandedSeq === item.sequenceKey ? "Masquer" : "Voir resultats"}
                              </button>
                              <button
                                onClick={() => executeMutation.mutate({ strategyId: selectedStrategyId!, sequenceKey: item.sequenceKey })}
                                disabled={isThisRunning}
                                className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors disabled:opacity-50"
                              >
                                {isThisRunning ? "..." : "Relancer"}
                              </button>
                            </>
                          )}

                          {/* BLOCKED */}
                          {isBlocked && (
                            <span className="text-[10px] text-red-400/60">Prerequis requis</span>
                          )}
                        </div>
                      </div>

                      {/* Expanded results panel (DONE sequences) */}
                      {isDone && expandedSeq === item.sequenceKey && (
                        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                          <p className="mb-2 text-xs font-medium text-zinc-500">Outputs produits</p>
                          {item.outputIds.length === 0 ? (
                            <p className="text-[10px] text-zinc-600">Aucun output enregistre.</p>
                          ) : (
                            <div className="space-y-1">
                              {item.outputIds.slice(0, 10).map((id) => (
                                <div key={id} className="flex items-center gap-2 rounded bg-zinc-900 px-2.5 py-1.5 text-[11px]">
                                  <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                                  <span className="font-mono text-zinc-400 truncate">{id}</span>
                                </div>
                              ))}
                              {item.outputIds.length > 10 && (
                                <p className="text-[10px] text-zinc-600">+{item.outputIds.length - 10} autres outputs</p>
                              )}
                            </div>
                          )}
                          <a
                            href="/cockpit/brand/deliverables"
                            className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300"
                          >
                            Ouvrir dans Livrables →
                          </a>
                        </div>
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
              <h3 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                {FAMILY_LABELS[family]}
              </h3>
              <div className="space-y-2">
                {getStaticSequences(family).map((seq) => (
                  <div key={seq.key} className={`rounded-xl border border-zinc-800 border-l-4 ${FAMILY_COLORS[family]} bg-zinc-900/80 p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{seq.name}</h4>
                          <span className="text-[10px] font-mono text-zinc-500">{seq.key}</span>
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
                        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{seq.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          {seq.steps.map((step: { type: string; name: string }, i: number) => {
                            const typeInfo = STEP_TYPE_ICONS[step.type] ?? { label: "?", color: "bg-zinc-600" };
                            return (
                              <div key={i} className="flex items-center gap-1">
                                {i > 0 && <span className="text-zinc-600 text-[10px]">&rarr;</span>}
                                <div className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white ${typeInfo.color}`} title={`${step.type}: ${step.name}`}>
                                  {typeInfo.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500">{seq.steps.length} steps</span>
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
                    className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{tool.name}</h4>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${LAYER_BADGE[tool.layer] ?? ""}`}>{tool.layer}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${execInfo.color}`}>{execInfo.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{tool.description}</p>
                        {tool.pillarKeys.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tool.pillarKeys.map((pk) => (
                              <span key={pk} className="inline-flex rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{pk.toUpperCase()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">#{tool.order}</span>
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
          <p className="text-sm text-zinc-500">Chargement...</p>
        ) : selectedToolQuery.data ? (() => {
          const t = selectedToolQuery.data;
          const execInfo = EXEC_BADGE[t.executionType] ?? EXEC_BADGE.COMPOSE;
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${LAYER_BADGE[t.layer] ?? ""}`}>{t.layer}</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${execInfo.color}`}>{execInfo.label}</span>
                <span className="text-xs text-zinc-500">#{t.order} — {t.slug}</span>
              </div>
              <p className="text-sm text-zinc-400">{t.description}</p>
              {t.inputFields?.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Champs d&apos;entree</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.inputFields.map((f: string) => (
                      <span key={f} className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-400">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {t.pillarBindings && Object.keys(t.pillarBindings).length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Irrigation ADVE-RTIS</p>
                  <div className="space-y-1">
                    {Object.entries(t.pillarBindings as Record<string, string>).map(([field, path]) => (
                      <div key={field} className="flex items-center gap-2 text-[11px]">
                        <span className="font-medium text-blue-400">{field}</span>
                        <span className="text-zinc-600">&larr;</span>
                        <span className="font-mono text-amber-400">{path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <p className="mb-1 text-xs font-medium text-zinc-500">Format de sortie</p>
                <p className="text-sm font-mono text-white">{t.outputFormat}</p>
              </div>
              {t.dependencies?.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Dependances</p>
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
