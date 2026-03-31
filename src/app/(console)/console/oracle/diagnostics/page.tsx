"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchFilter } from "@/components/shared/search-filter";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Stethoscope, AlertTriangle, TrendingUp, Trophy } from "lucide-react";
import { classifyBrand, PILLAR_KEYS, PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

const CLASSIFICATION_MAP: Record<string, string> = {
  ZOMBIE: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
  ORDINAIRE: "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
  FORTE: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  CULTE: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  ICONE: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
};

const WEAK_PILLAR_THRESHOLD = 15;

export default function DiagnosticsPage() {
  const { data: strategies, isLoading } = trpc.strategy.list.useQuery({});
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const allStrategies = (strategies ?? []).filter((s) => s.status === "ACTIVE");

  // Derive diagnostic data from strategies
  const diagnostics = allStrategies.map((s) => {
    const v = s.advertis_vector as Record<string, number> | null;
    const composite = v
      ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0)
      : 0;
    const classification = classifyBrand(composite);

    // Find weak pillars (below threshold)
    const weakPillars: Array<{ key: PillarKey; name: string; score: number }> = [];
    if (v) {
      for (const k of PILLAR_KEYS) {
        const score = v[k] ?? 0;
        if (score < WEAK_PILLAR_THRESHOLD) {
          weakPillars.push({ key: k, name: PILLAR_NAMES[k], score });
        }
      }
    }

    // Determine drift status based on weak pillar count
    const hasDrift = weakPillars.length >= 3;

    return {
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      composite,
      classification,
      vector: v,
      weakPillars,
      hasDrift,
      updatedAt: s.updatedAt,
    };
  });

  // Stats
  const zombies = diagnostics.filter((d) => d.classification === "ZOMBIE");
  const driftAlerts = diagnostics.filter((d) => d.hasDrift);
  const avgScore = diagnostics.length > 0
    ? (diagnostics.reduce((sum, d) => sum + d.composite, 0) / diagnostics.length).toFixed(0)
    : "0";
  const topPerformer = diagnostics.length > 0
    ? diagnostics.reduce((best, d) => (d.composite > best.composite ? d : best), diagnostics[0]!)
    : null;

  // Filter
  const filtered = diagnostics.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterValues.classification && d.classification !== filterValues.classification) return false;
    if (filterValues.drift === "yes" && !d.hasDrift) return false;
    if (filterValues.drift === "no" && d.hasDrift) return false;
    return true;
  });

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnostics ADVE"
        description="Vue d'ensemble des strategies necessitant une attention - piliers faibles et derive"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Oracle" },
          { label: "Diagnostics" },
        ]}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Zombies (< 80)"
          value={zombies.length}
          icon={Stethoscope}
          trend={zombies.length > 0 ? "down" : "flat"}
          trendValue={zombies.length > 0 ? "Attention requise" : "Aucun"}
        />
        <StatCard
          title="Alertes derive"
          value={driftAlerts.length}
          icon={AlertTriangle}
          trend={driftAlerts.length > 0 ? "down" : "flat"}
          trendValue={`${driftAlerts.length} strategie${driftAlerts.length !== 1 ? "s" : ""}`}
        />
        <StatCard title="Score moyen" value={`${avgScore}/200`} icon={TrendingUp} />
        <StatCard
          title="Top performer"
          value={topPerformer ? topPerformer.composite.toFixed(0) : "-"}
          icon={Trophy}
          trendValue={topPerformer?.name ?? "-"}
        />
      </div>

      <SearchFilter
        placeholder="Rechercher une strategie..."
        value={search}
        onChange={setSearch}
        filters={[
          {
            key: "classification",
            label: "Classification",
            options: [
              { value: "ZOMBIE", label: "Zombie" },
              { value: "ORDINAIRE", label: "Ordinaire" },
              { value: "FORTE", label: "Forte" },
              { value: "CULTE", label: "Culte" },
              { value: "ICONE", label: "Icone" },
            ],
          },
          {
            key: "drift",
            label: "Derive",
            options: [
              { value: "yes", label: "Avec derive" },
              { value: "no", label: "Sans derive" },
            ],
          },
        ]}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
      />

      {/* Strategy Diagnostic Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Aucune strategie"
          description="Les diagnostics apparaitront ici une fois des strategies actives creees."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border p-6 transition-colors hover:border-zinc-700 ${
                d.hasDrift
                  ? "border-red-800/50 bg-red-950/20"
                  : d.classification === "ZOMBIE"
                    ? "border-amber-800/50 bg-amber-950/10"
                    : "border-zinc-800 bg-zinc-900/80"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{d.name}</h3>
                    {d.hasDrift && (
                      <span className="flex items-center gap-1 rounded-full bg-red-400/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-red-400/30">
                        <AlertTriangle className="h-3 w-3" />
                        DERIVE
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{d.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-white">
                      {d.composite.toFixed(0)}
                      <span className="text-sm font-normal text-zinc-500">/200</span>
                    </span>
                    <StatusBadge status={d.classification} variantMap={CLASSIFICATION_MAP} />
                  </div>
                </div>

                {/* Mini Radar */}
                {d.vector && (
                  <div className="ml-4 shrink-0">
                    <AdvertisRadar
                      scores={d.vector as Partial<Record<PillarKey, number>>}
                      size={120}
                    />
                  </div>
                )}
              </div>

              {/* Weak Pillars */}
              {d.weakPillars.length > 0 && (
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Piliers faibles (&lt; {WEAK_PILLAR_THRESHOLD}/25)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {d.weakPillars.map((wp) => (
                      <div
                        key={wp.key}
                        className="flex items-center gap-1.5 rounded-lg border border-red-800/30 bg-red-950/20 px-2.5 py-1"
                      >
                        <span className="text-xs font-bold uppercase text-red-400">
                          {wp.key}
                        </span>
                        <span className="text-xs text-zinc-400">{wp.name}</span>
                        <span className="text-xs font-bold text-red-300">
                          {wp.score.toFixed(0)}/25
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {d.weakPillars.length === 0 && (
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <p className="text-xs text-emerald-400">
                    Tous les piliers sont au-dessus du seuil de {WEAK_PILLAR_THRESHOLD}/25
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
