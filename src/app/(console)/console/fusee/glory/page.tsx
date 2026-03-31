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
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  Wrench,
  Layers,
  Play,
  Clock,
  CheckCircle,
  Zap,
} from "lucide-react";

type GloryTool = {
  slug: string;
  name: string;
  layer: string;
  order: number;
  pillarKeys: string[];
  requiredDrivers: string[];
  description: string;
};

const LAYER_COLORS: Record<string, string> = {
  CR: "bg-blue-500",
  DC: "bg-emerald-500",
  HYBRID: "bg-purple-500",
  BRAND: "bg-amber-500",
};

const LAYER_LABELS: Record<string, string> = {
  CR: "Creative",
  DC: "Digital Content",
  HYBRID: "Hybrid",
  BRAND: "Brand",
};

const LAYER_BADGE_COLORS: Record<string, string> = {
  CR: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  DC: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  HYBRID: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  BRAND: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
};

export default function GloryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const strategyId = useCurrentStrategyId();

  // Fetch all 39 tools
  const toolsQuery = trpc.glory.listAll.useQuery();

  // Fetch execution history if strategy is selected
  const historyQuery = trpc.glory.history.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  // Fetch full tool definition when selected
  const selectedToolQuery = trpc.glory.getBySlug.useQuery(
    { slug: selectedSlug ?? "" },
    { enabled: !!selectedSlug },
  );

  const allTools = (toolsQuery.data ?? []) as GloryTool[];
  const history = (historyQuery.data ?? []) as unknown as Array<{
    id: string;
    toolSlug: string;
    createdAt: string;
    status?: string;
    result?: unknown;
  }>;

  // Group by layer
  const crTools = allTools.filter((t) => t.layer === "CR");
  const dcTools = allTools.filter((t) => t.layer === "DC");
  const hybridTools = allTools.filter((t) => t.layer === "HYBRID");
  const brandTools = allTools.filter((t) => t.layer === "BRAND");

  const tabFiltered =
    activeTab === "all"
      ? allTools
      : activeTab === "cr"
        ? crTools
        : activeTab === "dc"
          ? dcTools
          : activeTab === "hybrid"
            ? hybridTools
            : brandTools;

  const tabs = [
    { key: "all", label: "Tous les outils", count: allTools.length },
    { key: "cr", label: "CR", count: crTools.length },
    { key: "dc", label: "DC", count: dcTools.length },
    { key: "hybrid", label: "HYBRID", count: hybridTools.length },
    { key: "brand", label: "BRAND", count: brandTools.length },
  ];

  const todayExecutions = history.filter((h) => {
    const d = new Date(h.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const successRate = history.length > 0
    ? Math.round((history.filter((h) => h.status === "SUCCESS" || h.result).length / history.length) * 100)
    : 0;

  if (toolsQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="GLORY Tools"
        description={`${allTools.length} outils repartis sur 4 couches - historique d'execution et performance`}
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "GLORY" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total outils" value={allTools.length} icon={Wrench} />
        <StatCard
          title="Couches actives"
          value={new Set(allTools.map((t) => t.layer)).size}
          icon={Layers}
        />
        <StatCard
          title="Executions aujourd'hui"
          value={todayExecutions.length}
          icon={Play}
        />
        <StatCard
          title="Taux de succes"
          value={history.length > 0 ? `${successRate} %` : "- %"}
          icon={CheckCircle}
        />
      </div>

      {/* Layer Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["CR", "DC", "HYBRID", "BRAND"] as const).map((layer) => {
          const count = allTools.filter((t) => t.layer === layer).length;
          return (
            <div
              key={layer}
              className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4"
            >
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${LAYER_COLORS[layer]}`} />
                <h4 className="text-sm font-medium text-white">
                  {LAYER_LABELS[layer]}
                </h4>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-zinc-500">outils disponibles</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tool list */}
      {tabFiltered.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Aucun outil"
          description="Aucun outil GLORY trouve dans cette couche."
        />
      ) : (
        <div className="space-y-2">
          {tabFiltered.map((tool) => (
            <div
              key={tool.slug}
              onClick={() => setSelectedSlug(tool.slug)}
              className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">{tool.name}</h4>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${LAYER_BADGE_COLORS[tool.layer] ?? ""}`}
                    >
                      {tool.layer}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                    {tool.description}
                  </p>
                  {tool.pillarKeys.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tool.pillarKeys.map((pk) => (
                        <span
                          key={pk}
                          className="inline-flex rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
                        >
                          {pk.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-500">#{tool.order}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tool Detail Modal */}
      <Modal
        open={!!selectedSlug}
        onClose={() => setSelectedSlug(null)}
        title={selectedToolQuery.data?.name ?? selectedSlug ?? "Details de l'outil"}
        size="lg"
      >
        {selectedToolQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Chargement...</p>
        ) : selectedToolQuery.data ? (() => {
          const t = selectedToolQuery.data;
          const layerColors = LAYER_BADGE_COLORS[t.layer] ?? "";
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${layerColors}`}>
                  {t.layer}
                </span>
                <span className="text-xs text-zinc-500">#{t.order}</span>
                <span className="text-xs text-zinc-500">{t.slug}</span>
              </div>

              <p className="text-sm text-zinc-400">{t.description}</p>

              {/* Input Fields */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <p className="mb-2 text-xs font-medium text-zinc-500">Champs d&apos;entree</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.inputFields.map((f: string) => (
                    <span key={f} className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-400">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Output Format */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <p className="mb-1 text-xs font-medium text-zinc-500">Format de sortie</p>
                <p className="text-sm font-mono text-white">{t.outputFormat}</p>
              </div>

              {/* Dependencies */}
              {t.dependencies.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Dependances</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.dependencies.map((d: string) => (
                      <span key={d} className="inline-flex rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-400">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Drivers */}
              {t.requiredDrivers.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Drivers requis</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.requiredDrivers.map((d: string) => (
                      <span key={d} className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pillar Keys */}
              {t.pillarKeys.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Piliers ADVE</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.pillarKeys.map((pk: string) => (
                      <span key={pk} className="inline-flex rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                        {pk.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt Template Preview */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <p className="mb-2 text-xs font-medium text-zinc-500">Prompt Template (apercu)</p>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-zinc-400 font-mono">
                  {t.promptTemplate}
                </pre>
              </div>
            </div>
          );
        })() : null}
      </Modal>

      {/* Historique d'execution */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Historique d&apos;execution</h3>
        </div>
        {!strategyId ? (
          <p className="text-xs text-zinc-500">Selectionnez une strategie pour voir l&apos;historique.</p>
        ) : historyQuery.isLoading ? (
          <p className="text-xs text-zinc-500">Chargement...</p>
        ) : history.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="Aucune execution"
            description="L'historique des executions GLORY apparaitra ici."
          />
        ) : (
          <div className="space-y-2">
            {history.slice(0, 20).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5"
              >
                <div>
                  <span className="text-sm text-white">{h.toolSlug}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {new Date(h.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <StatusBadge status={h.status ?? "completed"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
