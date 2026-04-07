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

  const deliverablesQuery = trpc.glory.compilableDeliverables.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  const manifestQuery = trpc.glory.compileDeliverable.useQuery(
    { strategyId: strategyId ?? "", sequenceKey: selectedKey ?? "" },
    { enabled: !!strategyId && !!selectedKey },
  );

  const exportMutation = trpc.glory.exportDeliverable.useMutation();

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
              const fmt = FORMAT_BADGE[d.format] ?? FORMAT_BADGE.JSON;
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
              const fmt = FORMAT_BADGE[d.format] ?? FORMAT_BADGE.JSON;
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

              {/* Sections */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-500">Sections du livrable ({m.sections.length})</p>
                {m.sections.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-700 text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm text-white">{s.title}</span>
                    <span className="text-[10px] text-zinc-600 ml-auto">{s.sourceType}</span>
                  </div>
                ))}
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
