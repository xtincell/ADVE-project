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
import { getFieldLabel } from "@/components/cockpit/field-renderers";
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
  JSON: { label: "JSON", color: "bg-warning/15 text-warning ring-warning", icon: FileJson },
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
        <a href="/cockpit/brand/guidelines" className="flex items-center gap-3 rounded-xl border border-border bg-background/80 p-4 hover:border-border transition-colors">
          <BookOpen className="h-5 w-5 text-warning" />
          <div>
            <p className="text-sm font-medium text-white">Brand Guidelines</p>
            <p className="text-[10px] text-foreground-muted">Issu de la sequence BRANDBOOK-D</p>
          </div>
        </a>
        <a href="/cockpit/brand/assets" className="flex items-center gap-3 rounded-xl border border-border bg-background/80 p-4 hover:border-border transition-colors">
          <Image className="h-5 w-5 text-blue-400" />
          <div>
            <p className="text-sm font-medium text-white">Assets Visuels</p>
            <p className="text-[10px] text-foreground-muted">KV, logos, chromatic, typo</p>
          </div>
        </a>
        <a href="/cockpit/brand/identity" className="flex items-center gap-3 rounded-xl border border-border bg-background/80 p-4 hover:border-border transition-colors">
          <Palette className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-medium text-white">Identite</p>
            <p className="text-[10px] text-foreground-muted">Pilier A — manifeste, archetype, voix</p>
          </div>
        </a>
      </div>

      {/* Complete deliverables — ready to export */}
      {complete.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-success uppercase tracking-wider">
            Prets a exporter
          </h3>
          <div className="space-y-2">
            {complete.map((d) => {
              const fmt = (FORMAT_BADGE[d.format] ?? FORMAT_BADGE["JSON"])!;
              const FmtIcon = fmt.icon;
              return (
                <div key={d.sequenceKey} className="flex items-center justify-between rounded-xl border border-success/20 bg-background/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <FmtIcon className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{d.name}</h4>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${fmt.color}`}>
                          {fmt.label}
                        </span>
                        <CheckCircle className="h-3.5 w-3.5 text-success" />
                      </div>
                      <p className="text-[10px] text-foreground-muted">{d.sequenceKey} — {d.completeness}% complet</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/cockpit/brand/deliverables/${d.sequenceKey}`}
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Consulter
                    </a>
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
          <h3 className="mb-3 text-sm font-semibold text-warning uppercase tracking-wider">
            En cours de completion
          </h3>
          <div className="space-y-2">
            {partial.map((d) => {
              const fmt = (FORMAT_BADGE[d.format] ?? FORMAT_BADGE["JSON"])!;
              return (
                <div key={d.sequenceKey} className="rounded-xl border border-border bg-background/80 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{d.name}</h4>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${fmt.color}`}>
                          {fmt.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-foreground-muted">{d.sequenceKey}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <div className="h-1.5 rounded-full bg-background">
                          <div
                            className="h-1.5 rounded-full bg-warning transition-all"
                            style={{ width: `${d.completeness}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-foreground-muted text-right">{d.completeness}%</p>
                      </div>
                      <a
                        href={`/cockpit/brand/deliverables/${d.sequenceKey}`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-secondary hover:text-white hover:border-border-strong"
                      >
                        Details
                      </a>
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
          <p className="text-sm text-foreground-muted">Chargement du manifeste...</p>
        ) : manifestQuery.data ? (() => {
          const m = manifestQuery.data;
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${FORMAT_BADGE[m.format]?.color ?? ""}`}>
                  {m.format}
                </span>
                {m.isComplete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                    <CheckCircle className="h-3 w-3" /> Complet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
                    <AlertTriangle className="h-3 w-3" /> {m.meta.completedSteps}/{m.meta.totalSteps} sections
                  </span>
                )}
              </div>

              <p className="text-xs text-foreground-muted">
                {m.meta.strategyName} — genere le {new Date(m.meta.generatedAt).toLocaleDateString("fr-FR")}
              </p>

              {/* Sections — clickable to expand content */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground-muted">Sections du livrable ({m.sections.length}) — cliquez pour lire</p>
                {m.sections.map((s, i) => {
                  const isExpanded = expandedSection === i;
                  // Find matching output from the sequence outputs query
                  const matchingOutput = seqOutputsQuery.data?.outputs?.find(
                    (o: any) => o.toolSlug === s.sourceToolSlug || o.toolName === s.title
                  ) ?? (s.content && Object.keys(s.content).length > 0 ? { output: s.content, toolSlug: s.sourceToolSlug } : null);

                  return (
                    <div key={i} className="rounded-lg border border-border overflow-hidden">
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : i)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                          isExpanded ? "bg-accent/20 border-b border-accent/30" : "bg-background/60 hover:bg-background/60"
                        }`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-raised text-[9px] font-bold text-white shrink-0">
                          {i + 1}
                        </span>
                        <span className={`text-sm flex-1 ${isExpanded ? "text-accent font-semibold" : "text-white"}`}>{s.title}</span>
                        <span className="text-[10px] text-foreground-muted">{s.sourceType}</span>
                        <span className="text-foreground-muted">{isExpanded ? "▴" : "▾"}</span>
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-background/50 max-h-96 overflow-y-auto">
                          {matchingOutput?.output ? (
                            <div className="space-y-3">
                              {Object.entries(matchingOutput.output as Record<string, unknown>)
                                .filter(([k]) => !k.startsWith("_"))
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <p className="text-[10px] font-bold text-foreground-muted uppercase mb-1">{key.replace(/_/g, " ")}</p>
                                    {typeof value === "string" ? (
                                      <p className="text-[12px] text-foreground-secondary whitespace-pre-wrap leading-relaxed">{value}</p>
                                    ) : Array.isArray(value) ? (
                                      <div className="space-y-1">
                                        {(value as unknown[]).slice(0, 20).map((item, j) => (
                                          <div key={j} className="rounded bg-background/50 px-2.5 py-1.5 text-[11px] text-foreground-secondary">
                                            {typeof item === "string" ? item : typeof item === "object" && item ? (
                                              <div className="space-y-0.5">
                                                {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                                                  <div key={k}><span className="text-foreground-muted">{getFieldLabel(k)}:</span> {String(v)}</div>
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
                                            <span className="text-foreground-muted">{getFieldLabel(k)}:</span> {typeof v === "string" ? v : typeof v === "number" ? v.toLocaleString() : typeof v === "boolean" ? (v ? "Oui" : "Non") : Array.isArray(v) ? `${v.length} elements` : typeof v === "object" && v !== null ? Object.values(v as Record<string, unknown>).filter(x => typeof x === "string").slice(0, 2).join(", ") || "(structure)" : String(v)}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-foreground-secondary">{String(value)}</p>
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
                                className="mt-2 rounded border border-border px-2.5 py-1 text-[10px] text-foreground-secondary hover:text-white hover:border-border-strong transition-colors"
                              >
                                ↓ Telecharger JSON
                              </button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-foreground-muted italic">Contenu non disponible — l{"'"}outil n{"'"}a pas encore ete execute ou l{"'"}output n{"'"}a pas ete enregistre.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Download full deliverable */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => exportMutation.mutate({ strategyId: strategyId!, sequenceKey: selectedKey! })}
                  disabled={exportMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-xs font-semibold text-white hover:bg-success disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportMutation.isPending ? "Export en cours..." : "Telecharger le livrable complet"}
                </button>
              </div>

              {/* Missing outputs */}
              {m.missingOutputs.length > 0 && (
                <div className="rounded-lg border border-error/20 bg-error/5 p-3">
                  <p className="text-xs font-medium text-error mb-1">Outputs manquants</p>
                  <div className="flex flex-wrap gap-1">
                    {m.missingOutputs.map((slug) => (
                      <span key={slug} className="inline-flex rounded-full bg-error/10 px-2 py-0.5 text-[10px] text-error">
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
