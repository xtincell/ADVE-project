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
  const me = trpc.auth.me.useQuery();
  const canReadGlobal = !me.isError && !me.isLoading && me.data?.canOperate === true
    && (me.data.role === "ADMIN" || me.data.role === "OPERATOR");
  const canReadPatterns = canReadGlobal && me.data?.role === "ADMIN";
  const { data: benchmarks, isLoading: loadingBenchmarks, error: benchmarkError } = trpc.knowledgeGraph.getBenchmarks.useQuery({}, { enabled: canReadGlobal });
  const { data: patterns, isLoading: loadingPatterns, error: patternError } = trpc.knowledgeGraph.getBriefPatterns.useQuery({}, { enabled: canReadPatterns });
  const { data: searchResults, isLoading: searching, error: searchError } = trpc.knowledgeGraph.query.useQuery(
    { queryText, limit: 20 },
    { enabled: canReadGlobal && queryText.length >= 2 },
  );

  const isLoading = me.isLoading || (canReadGlobal && loadingBenchmarks && (!canReadPatterns || loadingPatterns));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Knowledge Graph" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Knowledge Graph" }]} />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  if (!canReadGlobal) return <div className="space-y-6">
    <PageHeader title="Knowledge Graph" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Knowledge Graph" }]} />
    {me.isError ? <p role="alert" className="text-sm text-error">Impossible de vérifier vos droits. Réessayez plus tard.</p>
      : <EmptyState icon={Network} title="Accès réservé à l’équipe opératrice"
        description="Cette vue réunit des connaissances sur plusieurs marques. Votre équipe peut vous accompagner sur les repères de votre marque." />}
  </div>;

  const benchmarkData = benchmarkError ? undefined : benchmarks;
  const benchmarkRows: Array<Record<string, unknown>> = Array.isArray(benchmarkData?.benchmarks)
    ? benchmarkData.benchmarks : [];
  const patternData = canReadPatterns && !patternError ? patterns as Array<Record<string, unknown>> | undefined : undefined;
  const visibleSearchResults = searchError ? undefined : searchResults;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Graph"
        description="Connaissances disponibles parmi les marques observées"
        breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Knowledge Graph" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Marques observées" value={benchmarkData?.count ?? "—"} icon={BarChart3} />
        <StatCard title="Score composite moyen" value={benchmarkData?.avgComposite != null ? `${benchmarkData.avgComposite.toFixed(0)}/200` : "-"} icon={Network} />
        <StatCard title="Patterns brief" value={patternData?.length ?? "—"} icon={BookOpen} />
      </div>
      {benchmarkError && <p role="alert" className="text-sm text-error">Les repères des marques sont indisponibles. Réessayez plus tard.</p>}
      {!canReadPatterns && <p className="text-sm text-foreground-secondary">Les patterns de briefs sont réservés aux administrateurs.</p>}
      {canReadPatterns && patternError && <p role="alert" className="text-sm text-error">Les patterns de briefs sont indisponibles. Réessayez plus tard.</p>}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          aria-label="Rechercher dans les connaissances"
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
            Resultats {searching ? "(recherche...)" : searchError ? "indisponibles" : `(${visibleSearchResults?.length ?? "—"})`}
          </h3>
          {searchError && <p role="alert" className="text-sm text-error">La recherche est indisponible. Réessayez plus tard.</p>}
          {(visibleSearchResults as Array<Record<string, unknown>> | undefined)?.map((result) => (
            <div key={String(result.id)} className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <p className="text-sm font-medium text-white">{String(result.name ?? result.title ?? "-")}</p>
              <p className="text-xs text-zinc-500">{String(result.type ?? "-")} — {String(result.status ?? "-")}</p>
            </div>
          )) ?? null}
        </div>
      )}

      {/* Benchmarks */}
      {benchmarkRows.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400">Benchmarks sectoriels</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {benchmarkRows.slice(0, 6).map((b, i) => (
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

      {benchmarkData?.count === 0 && !benchmarkRows.length && patternData?.length === 0 && queryText.length < 2 && (
        <EmptyState icon={Network} title="Knowledge Graph vide" description="Les donnees sectorielles s'accumuleront avec l'utilisation." />
      )}
    </div>
  );
}
