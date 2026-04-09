"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  FileText,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileJson,
  Globe,
  BookOpen,
  Image,
  Palette,
  Shield,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const FORMAT_BADGE: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  PDF: { label: "PDF", color: "bg-rose-400/15 text-rose-400 ring-rose-400/30", icon: FileText },
  HTML: { label: "HTML", color: "bg-sky-400/15 text-sky-400 ring-sky-400/30", icon: Globe },
  JSON: { label: "JSON", color: "bg-amber-400/15 text-amber-400 ring-amber-400/30", icon: FileJson },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function BrandDeliverablesPage() {
  const strategyId = useCurrentStrategyId();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const deliverablesQuery = trpc.glory.compilableDeliverables.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  const manifestQuery = trpc.glory.compileDeliverable.useQuery(
    { strategyId: strategyId ?? "", sequenceKey: selectedKey ?? "" },
    { enabled: !!strategyId && !!selectedKey },
  );

  const seqOutputsQuery = trpc.glory.getSequenceOutputs.useQuery(
    { strategyId: strategyId ?? "", sequenceKey: selectedKey ?? "" },
    { enabled: !!strategyId && !!selectedKey },
  );

  const exportMutation = trpc.glory.exportDeliverable.useMutation({
    onSuccess: (data) => {
      // Download the compiled deliverable as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedKey ?? "deliverable"}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const deliverables = deliverablesQuery.data ?? [];
  const complete = deliverables.filter((d) => d.isComplete);
  const partial = deliverables.filter((d) => !d.isComplete);

  if (!strategyId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Livrables"
          description="Compilez et exportez les livrables de votre marque"
          breadcrumbs={[{ label: "Cockpit" }, { label: "Brand" }, { label: "Livrables" }]}
        />
        <EmptyState icon={FileText} title="Aucune strategie" description="Selectionnez une strategie pour voir les livrables." />
      </div>
    );
  }

  if (deliverablesQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Livrables"
        description={`${complete.length} prets a exporter, ${partial.length} en cours de completion`}
        breadcrumbs={[{ label: "Cockpit", href: "/cockpit" }, { label: "Brand" }, { label: "Livrables" }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Prets a exporter" value={complete.length} icon={CheckCircle} />
        <StatCard title="En cours" value={partial.length} icon={RefreshCw} />
        <StatCard title="Total" value={deliverables.length} icon={FileText} />
      </div>

      {/* Quick links to existing brand pages */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <a href="/cockpit/brand/guidelines" className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 hover:border-zinc-700 transition-colors">
          <BookOpen className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-white">Brand Guidelines</p>
            <p className="text-[10px] text-zinc-500">Issu de la sequence BRANDBOOK-D</p>
          </div>
        </a>
        <a href="/cockpit/brand/assets" className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 hover:border-zinc-700 transition-colors">
          <Image className="h-5 w-5 text-blue-400" />
          <div>
            <p className="text-sm font-medium text-white">Assets Visuels</p>
            <p className="text-[10px] text-zinc-500">KV, logos, chromatic, typo</p>
          </div>
        </a>
        <a href="/cockpit/brand/identity" className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 hover:border-zinc-700 transition-colors">
          <Palette className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-white">Identite</p>
            <p className="text-[10px] text-zinc-500">Pilier A — manifeste, archetype, voix</p>
          </div>
        </a>
      </div>

      {/* Complete deliverables — ready to export */}
      {complete.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-emerald-400 uppercase tracking-wider">
            Prets a exporter
          </h3>
          <div className="space-y-2">
            {complete.map((d) => {
              const fmt = (FORMAT_BADGE[d.format] ?? FORMAT_BADGE["JSON"])!;
              const FmtIcon = fmt.icon;
              return (
                <div key={d.sequenceKey} className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-zinc-900/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <FmtIcon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{d.name}</h4>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${fmt.color}`}>
                          {fmt.label}
                        </span>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <p className="text-[10px] text-zinc-500">{d.sequenceKey} — {d.completeness}% complet</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedKey(d.sequenceKey)}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-600"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => exportMutation.mutate({ strategyId: strategyId!, sequenceKey: d.sequenceKey })}
                      disabled={exportMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exporter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Partial deliverables — in progress */}
      {partial.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-amber-400 uppercase tracking-wider">
            En cours de completion
          </h3>
          <div className="space-y-2">
            {partial.map((d) => {
              const fmt = (FORMAT_BADGE[d.format] ?? FORMAT_BADGE["JSON"])!;
              return (
                <div key={d.sequenceKey} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{d.name}</h4>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${fmt.color}`}>
                          {fmt.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500">{d.sequenceKey}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <div className="h-1.5 rounded-full bg-zinc-800">
                          <div
                            className="h-1.5 rounded-full bg-amber-500 transition-all"
                            style={{ width: `${d.completeness}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-zinc-600 text-right">{d.completeness}%</p>
                      </div>
                      <button
                        onClick={() => setSelectedKey(d.sequenceKey)}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {deliverables.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Aucun livrable"
          description="Lancez des sequences GLORY pour generer des livrables compilables."
        />
      )}

      {/* Deliverable Detail Modal */}
      <Modal
        open={!!selectedKey}
        onClose={() => setSelectedKey(null)}
        title={manifestQuery.data?.name ?? selectedKey ?? "Livrable"}
        size="lg"
      >
        {manifestQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Chargement du manifeste...</p>
        ) : manifestQuery.data ? (() => {
          const m = manifestQuery.data;
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${FORMAT_BADGE[m.format]?.color ?? ""}`}>
                  {m.format}
                </span>
                {m.isComplete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle className="h-3 w-3" /> Complet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                    <AlertTriangle className="h-3 w-3" /> {m.meta.completedSteps}/{m.meta.totalSteps} sections
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-500">
                {m.meta.strategyName} — genere le {new Date(m.meta.generatedAt).toLocaleDateString("fr-FR")}
              </p>

              {/* Sections — clickable to expand content */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-500">Sections du livrable ({m.sections.length}) — cliquez pour lire</p>
                {m.sections.map((s, i) => {
                  const isExpanded = expandedSection === i;
                  // Find matching output from the sequence outputs query
                  const matchingOutput = seqOutputsQuery.data?.outputs?.find(
                    (o: any) => o.toolSlug === s.sourceToolSlug || o.toolName === s.title
                  ) ?? (s.content && Object.keys(s.content).length > 0 ? { output: s.content, toolSlug: s.sourceToolSlug } : null);

                  return (
                    <div key={i} className="rounded-lg border border-zinc-800 overflow-hidden">
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : i)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                          isExpanded ? "bg-violet-900/20 border-b border-violet-800/30" : "bg-zinc-900/60 hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-700 text-[9px] font-bold text-white shrink-0">
                          {i + 1}
                        </span>
                        <span className={`text-sm flex-1 ${isExpanded ? "text-violet-300 font-semibold" : "text-white"}`}>{s.title}</span>
                        <span className="text-[10px] text-zinc-600">{s.sourceType}</span>
                        <span className="text-zinc-600">{isExpanded ? "▴" : "▾"}</span>
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-zinc-950/50 max-h-96 overflow-y-auto">
                          {matchingOutput?.output ? (
                            <div className="space-y-3">
                              {Object.entries(matchingOutput.output as Record<string, unknown>)
                                .filter(([k]) => !k.startsWith("_"))
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{key.replace(/_/g, " ")}</p>
                                    {typeof value === "string" ? (
                                      <p className="text-[12px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{value}</p>
                                    ) : Array.isArray(value) ? (
                                      <div className="space-y-1">
                                        {(value as unknown[]).slice(0, 20).map((item, j) => (
                                          <div key={j} className="rounded bg-zinc-800/50 px-2.5 py-1.5 text-[11px] text-zinc-300">
                                            {typeof item === "string" ? item : typeof item === "object" && item ? (
                                              <div className="space-y-0.5">
                                                {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                                                  <div key={k}><span className="text-zinc-500">{k}:</span> {String(v)}</div>
                                                ))}
                                              </div>
                                            ) : String(item)}
                                          </div>
                                        ))}
                                      </div>
                                    ) : typeof value === "object" && value !== null ? (
                                      <div className="rounded bg-zinc-800/50 p-2.5 text-[11px] space-y-0.5">
                                        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                                          <div key={k} className="text-zinc-300">
                                            <span className="text-zinc-500">{k}:</span> {typeof v === "string" ? v : JSON.stringify(v)}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-zinc-300">{String(value)}</p>
                                    )}
                                  </div>
                                ))}
                              <button
                                onClick={() => {
                                  const blob = new Blob([JSON.stringify(matchingOutput.output, null, 2)], { type: "application/json" });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `${matchingOutput.toolSlug}-${new Date().toISOString().slice(0, 10)}.json`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="mt-2 rounded border border-zinc-700 px-2.5 py-1 text-[10px] text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                              >
                                ↓ Telecharger JSON
                              </button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-zinc-600 italic">Contenu non disponible — l{"'"}outil n{"'"}a pas encore ete execute ou l{"'"}output n{"'"}a pas ete enregistre.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Download full deliverable */}
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => exportMutation.mutate({ strategyId: strategyId!, sequenceKey: selectedKey! })}
                  disabled={exportMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportMutation.isPending ? "Export en cours..." : "Telecharger le livrable complet"}
                </button>
              </div>

              {/* Missing outputs */}
              {m.missingOutputs.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-xs font-medium text-red-400 mb-1">Outputs manquants</p>
                  <div className="flex flex-wrap gap-1">
                    {m.missingOutputs.map((slug) => (
                      <span key={slug} className="inline-flex rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">
                        {slug}
                      </span>
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
