"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonTable } from "@/components/shared/loading-skeleton";
import { Network, BookOpen, BarChart3, Search } from "lucide-react";

export default function AgencyKnowledgePage() {
  const [queryText, setQueryText] = useState("");
  const { data: benchmarks, isLoading: loadingBenchmarks } = trpc.knowledgeGraph.getBenchmarks.useQuery({});
  const { data: patterns, isLoading: loadingPatterns } = trpc.knowledgeGraph.getBriefPatterns.useQuery({});
  const { data: searchResults, isLoading: searching } = trpc.knowledgeGraph.query.useQuery(
    { queryText, limit: 20 },
    { enabled: queryText.length >= 2 },
  );

  const isLoading = loadingBenchmarks && loadingPatterns;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Knowledge Graph" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Knowledge Graph" }]} />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  const benchmarkData = benchmarks as { count?: number; avgComposite?: number; benchmarks?: Array<Record<string, unknown>> } | null;
  const patternData = patterns as Array<Record<string, unknown>> | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Graph"
        description="Connaissances accumulees sur vos secteurs et marches"
        breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Knowledge Graph" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Benchmarks" value={benchmarkData?.count ?? 0} icon={BarChart3} />
        <StatCard title="Score composite moyen" value={benchmarkData?.avgComposite ? `${benchmarkData.avgComposite.toFixed(0)}/200` : "-"} icon={Network} />
        <StatCard title="Patterns brief" value={patternData?.length ?? 0} icon={BookOpen} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Rechercher dans le knowledge graph..."
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Search results */}
      {queryText.length >= 2 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400">
            Resultats {searching ? "(recherche...)" : `(${(searchResults as unknown[])?.length ?? 0})`}
          </h3>
          {(searchResults as Array<Record<string, unknown>> | undefined)?.map((result) => (
            <div key={String(result.id)} className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <p className="text-sm font-medium text-white">{String(result.name ?? result.title ?? "-")}</p>
              <p className="text-xs text-zinc-500">{String(result.type ?? "-")} — {String(result.status ?? "-")}</p>
            </div>
          )) ?? null}
        </div>
      )}

      {/* Benchmarks */}
      {benchmarkData?.benchmarks && benchmarkData.benchmarks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400">Benchmarks sectoriels</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {benchmarkData.benchmarks.slice(0, 6).map((b, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                <p className="text-sm font-medium text-white">{String(b.sector ?? b.name ?? "-")}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Score: {String(b.avgComposite ?? b.score ?? "-")} | Marche: {String(b.market ?? "-")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brief patterns */}
      {patternData && patternData.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400">Patterns de briefs</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {patternData.slice(0, 6).map((p) => (
              <div key={String(p.id)} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                <p className="text-sm font-medium text-white">{String(p.title ?? "-")}</p>
                <p className="text-xs text-zinc-500">{String(p.status ?? "-")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!benchmarkData?.benchmarks?.length && !patternData?.length && queryText.length < 2 && (
        <EmptyState icon={Network} title="Knowledge Graph vide" description="Les donnees sectorielles s'accumuleront avec l'utilisation." />
      )}
    </div>
  );
}
