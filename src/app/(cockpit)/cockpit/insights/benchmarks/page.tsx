"use client";

import { trpc } from "@/lib/trpc/client";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  PILLAR_KEYS,
  PILLAR_NAMES,
  classifyBrand,
  type PillarKey,
  type BrandClassification,
} from "@/lib/types/advertis-vector";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { AlertTriangle, BarChart3, Info, Medal, Target } from "lucide-react";

const CLASSIFICATION_COLORS: Record<BrandClassification, string> = {
  ZOMBIE: "bg-red-500",
  ORDINAIRE: "bg-orange-500",
  FORTE: "bg-amber-500",
  CULTE: "bg-emerald-500",
  ICONE: "bg-violet-500",
};

const CLASSIFICATION_LABELS: Record<BrandClassification, string> = {
  ZOMBIE: "Zombie",
  ORDINAIRE: "Ordinaire",
  FORTE: "Forte",
  CULTE: "Culte",
  ICONE: "Icone",
};

export default function BenchmarksPage() {
  const strategyId = useCurrentStrategyId();

  const strategyQuery = trpc.strategy.getWithScore.useQuery(
    { id: strategyId! },
    { enabled: !!strategyId },
  );

  const benchmarkQuery = trpc.knowledgeGraph.getBenchmarks.useQuery(
    {},
    { enabled: !!strategyId },
  );

  const rankingQuery = trpc.knowledgeGraph.getFrameworkRanking.useQuery(
    {},
    { enabled: !!strategyId },
  );

  if (!strategyId || strategyQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (strategyQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Benchmarks" />
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-300">
            {strategyQuery.error.message}
          </p>
        </div>
      </div>
    );
  }

  const strategy = strategyQuery.data;
  const vector = (strategy?.advertis_vector as Record<string, number>) ?? {};
  const scores: Partial<Record<PillarKey, number>> = {};
  for (const k of PILLAR_KEYS) {
    scores[k] = vector[k] ?? 0;
  }
  const composite = strategy?.composite ?? 0;

  const benchmark = benchmarkQuery.data;
  const sectorAvg = benchmark?.avgComposite ?? 0;
  const sectorCount = benchmark?.count ?? 0;

  const ranking = rankingQuery.data ?? [];
  const myRank = ranking.findIndex((r) => r.strategyId === strategyId) + 1;
  const topPerformer = ranking.length > 0 ? ranking[0] : null;

  // Derive sector average per pillar from the sector avg composite
  const sectorPillarAvg: Partial<Record<PillarKey, number>> = {};
  const pillarAvgBase = sectorAvg / 8;
  for (const k of PILLAR_KEYS) {
    const variation = ((k.charCodeAt(0) % 7) - 3) * 0.8;
    sectorPillarAvg[k] = Math.min(25, Math.max(0, pillarAvgBase + variation));
  }

  // Top performer scores derived from ranking
  const topVector: Partial<Record<PillarKey, number>> = {};
  if (topPerformer) {
    const topAvg = topPerformer.composite / 8;
    for (const k of PILLAR_KEYS) {
      const variation = ((k.charCodeAt(0) % 5) - 2) * 0.6;
      topVector[k] = Math.min(25, Math.max(0, topAvg + variation));
    }
  }

  // Classification distribution derived from sector count
  const classifications: {
    label: string;
    cls: BrandClassification;
    count: number;
  }[] = [
    { label: "Zombie", cls: "ZOMBIE", count: Math.round(sectorCount * 0.15) },
    {
      label: "Ordinaire",
      cls: "ORDINAIRE",
      count: Math.round(sectorCount * 0.35),
    },
    { label: "Forte", cls: "FORTE", count: Math.round(sectorCount * 0.3) },
    { label: "Culte", cls: "CULTE", count: Math.round(sectorCount * 0.15) },
    { label: "Icone", cls: "ICONE", count: Math.round(sectorCount * 0.05) },
  ];
  const maxClassCount = Math.max(...classifications.map((c) => c.count), 1);
  const myClassification = classifyBrand(composite);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benchmarks"
        description="Positionnement de votre marque par rapport au secteur"
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Insights" },
          { label: "Benchmarks" },
        ]}
      />

      {/* Synthetic data notice */}
      <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
        <p className="text-xs leading-relaxed text-zinc-500">
          Donnees de benchmark simulees — les comparaisons reelles seront disponibles avec plus de marques dans le systeme.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Votre score"
          value={composite.toFixed(0)}
          trend={
            composite > sectorAvg
              ? "up"
              : composite < sectorAvg
                ? "down"
                : "flat"
          }
          trendValue={CLASSIFICATION_LABELS[myClassification]}
          icon={Target}
        />
        <StatCard
          title="Moyenne secteur"
          value={sectorAvg.toFixed(0)}
          trend="flat"
          trendValue={`${sectorCount} marque${sectorCount > 1 ? "s" : ""}`}
          icon={BarChart3}
        />
        <StatCard
          title="Votre rang"
          value={myRank > 0 ? `#${myRank}` : "N/A"}
          trend={
            myRank <= 3
              ? "up"
              : myRank <= Math.ceil(sectorCount / 2)
                ? "flat"
                : "down"
          }
          trendValue={`sur ${sectorCount}`}
          icon={Medal}
        />
      </div>

      {/* Radar comparison card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h3 className="mb-4 font-semibold text-white">
          Comparaison radar : Vous vs Secteur
        </h3>
        <div className="flex flex-col items-center">
          <div className="mb-4 flex gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-violet-500" />
              <span className="text-xs text-zinc-400">Votre marque</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-zinc-500" />
              <span className="text-xs text-zinc-400">Moyenne secteur</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="text-center">
              <p className="mb-2 text-xs font-medium text-violet-400">
                Votre marque
              </p>
              <AdvertisRadar
                scores={scores}
                size={280}
                className="flex justify-center"
              />
            </div>
            <div className="text-center">
              <p className="mb-2 text-xs font-medium text-zinc-400">
                Moyenne secteur
              </p>
              <AdvertisRadar
                scores={sectorPillarAvg}
                size={280}
                className="flex justify-center"
              />
            </div>
          </div>
          <div className="mt-4 grid w-full grid-cols-4 gap-2">
            {PILLAR_KEYS.map((k) => {
              const mine = scores[k] ?? 0;
              const avg = sectorPillarAvg[k] ?? 0;
              const diff = mine - avg;
              return (
                <div
                  key={k}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2 text-center"
                >
                  <p className="text-xs font-bold text-zinc-400">
                    {k.toUpperCase()}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {mine.toFixed(1)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    moy: {avg.toFixed(1)}
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      diff > 0
                        ? "text-emerald-400"
                        : diff < 0
                          ? "text-red-400"
                          : "text-zinc-500"
                    }`}
                  >
                    {diff >= 0 ? "+" : ""}
                    {diff.toFixed(1)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pillar comparison table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h3 className="mb-4 font-semibold text-white">
          Comparaison detaillee par pilier
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="pb-3 text-left text-xs font-medium text-zinc-400">
                  Pilier
                </th>
                <th className="pb-3 text-right text-xs font-medium text-zinc-400">
                  Votre score
                </th>
                <th className="pb-3 text-right text-xs font-medium text-zinc-400">
                  Moy. secteur
                </th>
                <th className="pb-3 text-right text-xs font-medium text-zinc-400">
                  Top performer
                </th>
                <th className="pb-3 text-right text-xs font-medium text-zinc-400">
                  Ecart
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {PILLAR_KEYS.map((k) => {
                const mine = scores[k] ?? 0;
                const avg = sectorPillarAvg[k] ?? 0;
                const top = topVector[k] ?? avg;
                const diff = mine - avg;
                return (
                  <tr key={k} className="hover:bg-zinc-800/30">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-xs font-bold text-white">
                          {k.toUpperCase()}
                        </span>
                        <span className="text-zinc-300">
                          {PILLAR_NAMES[k]}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold text-white">
                      {mine.toFixed(1)}
                    </td>
                    <td className="py-3 text-right text-zinc-400">
                      {avg.toFixed(1)}
                    </td>
                    <td className="py-3 text-right text-zinc-400">
                      {top.toFixed(1)}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          diff > 0
                            ? "bg-emerald-400/10 text-emerald-400"
                            : diff < 0
                              ? "bg-red-400/10 text-red-400"
                              : "bg-zinc-400/10 text-zinc-400"
                        }`}
                      >
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Votre positionnement unique */}
      {(() => {
        const strengths = PILLAR_KEYS.filter(
          (k) => (scores[k] ?? 0) > (sectorPillarAvg[k] ?? 0),
        );
        const weaknesses = PILLAR_KEYS.filter(
          (k) => (scores[k] ?? 0) < (sectorPillarAvg[k] ?? 0),
        );
        return (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h3 className="mb-4 font-semibold text-white">
              Votre positionnement unique
            </h3>

            {strengths.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-zinc-400">
                  Forces differenciatrices
                </p>
                <div className="flex flex-wrap gap-2">
                  {strengths.map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400"
                    >
                      {k.toUpperCase()} - {PILLAR_NAMES[k]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-zinc-400">
                  Opportunites de progression
                </p>
                <div className="flex flex-wrap gap-2">
                  {weaknesses.map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-400"
                    >
                      {k.toUpperCase()} - {PILLAR_NAMES[k]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm leading-relaxed text-zinc-300">
              {strengths.length > 0 && (
                <>
                  Vos forces en{" "}
                  {strengths.map((k) => PILLAR_NAMES[k]).join(", ")}{" "}
                  vous differencient.{" "}
                </>
              )}
              {weaknesses.length > 0 && (
                <>
                  Investissez dans{" "}
                  {weaknesses.map((k) => PILLAR_NAMES[k]).join(", ")}{" "}
                  pour combler l&apos;ecart.
                </>
              )}
            </p>
          </div>
        );
      })()}

      {/* Classification distribution */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h3 className="mb-4 font-semibold text-white">
          Distribution des classifications
        </h3>
        <p className="mb-6 text-xs text-zinc-400">
          Repartition des marques du secteur par classification ADVE-RTIS
        </p>
        <div className="space-y-3">
          {classifications.map((c) => {
            const pct =
              maxClassCount > 0 ? (c.count / maxClassCount) * 100 : 0;
            const isMyClass = c.cls === myClassification;
            return (
              <div key={c.cls} className="flex items-center gap-3">
                <span
                  className={`w-24 text-sm font-medium ${
                    isMyClass ? "text-white" : "text-zinc-400"
                  }`}
                >
                  {c.label}
                  {isMyClass && (
                    <span className="ml-1 text-xs text-violet-400">
                      (vous)
                    </span>
                  )}
                </span>
                <div className="flex-1">
                  <div className="relative h-7 overflow-hidden rounded-md bg-zinc-800">
                    <div
                      className={`h-full rounded-md transition-all duration-700 ${
                        CLASSIFICATION_COLORS[c.cls]
                      } ${isMyClass ? "opacity-100" : "opacity-60"}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                    {isMyClass && (
                      <div className="absolute inset-0 rounded-md ring-2 ring-violet-400/50" />
                    )}
                  </div>
                </div>
                <span
                  className={`w-10 text-right text-sm font-semibold ${
                    isMyClass ? "text-white" : "text-zinc-500"
                  }`}
                >
                  {c.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
