"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchFilter } from "@/components/shared/search-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import {
  Database,
  BarChart3,
  FileText,
  GitBranch,
  Brain,
  Trophy,
  Search,
  BookOpen,
} from "lucide-react";

const ENTRY_TYPES = [
  "SECTOR_BENCHMARK",
  "MISSION_OUTCOME",
  "BRIEF_PATTERN",
  "CREATOR_PROFILE",
  "CAMPAIGN_TEMPLATE",
] as const;

const TYPE_BADGE_MAP: Record<string, string> = {
  SECTOR_BENCHMARK: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  MISSION_OUTCOME: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  BRIEF_PATTERN: "bg-violet-400/15 text-violet-400 ring-violet-400/30",
  CREATOR_PROFILE: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  CAMPAIGN_TEMPLATE: "bg-cyan-400/15 text-cyan-400 ring-cyan-400/30",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  SECTOR_BENCHMARK: BarChart3,
  MISSION_OUTCOME: Trophy,
  BRIEF_PATTERN: GitBranch,
  CREATOR_PROFILE: Brain,
  CAMPAIGN_TEMPLATE: FileText,
};

interface KnowledgeEntry {
  id: string;
  entryType: string;
  sector: string | null;
  market: string | null;
  data: unknown;
  sourceHash: string | null;
  confidence?: number | null;
  createdAt: Date | string;
}

export default function KnowledgeGraphPage() {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch knowledge entries via marketStudy.list (returns KnowledgeEntry items)
  const { data: knowledgeEntries, isLoading: loadingEntries } = trpc.marketStudy.list.useQuery({});

  // Fetch benchmarks for stats
  const { data: benchmarks, isLoading: loadingBenchmarks } = trpc.knowledgeGraph.getBenchmarks.useQuery({});

  // Fetch brief patterns for additional entries
  const { data: briefPatterns } = trpc.knowledgeGraph.getBriefPatterns.useQuery({});

  // Search query
  const { data: searchResults, isLoading: searching } = trpc.knowledgeGraph.query.useQuery(
    { queryText: searchQuery, limit: 20 },
    { enabled: hasSearched && searchQuery.length > 0 },
  );

  const isLoading = loadingEntries || loadingBenchmarks;

  // Combine knowledge entries into unified list
  const allEntries: KnowledgeEntry[] = useMemo(() => {
    const entries: KnowledgeEntry[] = [];

    // Entries from marketStudy.list (these are KnowledgeEntry records with entryType SECTOR_BENCHMARK)
    for (const e of knowledgeEntries ?? []) {
      entries.push(e as KnowledgeEntry);
    }

    return entries;
  }, [knowledgeEntries]);

  // Stats
  const totalEntries = allEntries.length;
  const sectorBenchmarks = allEntries.filter((e) => e.entryType === "SECTOR_BENCHMARK").length;
  const briefPatternCount = (briefPatterns ?? []).length;

  // Filter entries
  const filtered = useMemo(() => {
    return allEntries.filter((entry) => {
      const data = entry.data as Record<string, unknown> | null;
      const title = (data?.studyTitle as string) ?? (data?.title as string) ?? entry.entryType;

      if (search && !title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterValues.type && entry.entryType !== filterValues.type) return false;
      return true;
    });
  }, [allEntries, search, filterValues]);

  const handleSearch = () => {
    if (searchQuery.trim()) setHasSearched(true);
  };

  const getEntryTitle = (entry: KnowledgeEntry): string => {
    const data = entry.data as Record<string, unknown> | null;
    return (data?.studyTitle as string) ?? (data?.title as string) ?? "Entree sans titre";
  };

  const getEntrySummary = (entry: KnowledgeEntry): string => {
    const data = entry.data as Record<string, unknown> | null;
    const findings = data?.findings as Record<string, unknown> | null;
    return (findings?.summary as string) ?? (data?.summary as string) ?? "";
  };

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Graph"
        description="Exploration des connaissances agregees - benchmarks, patterns, templates"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Signal" },
          { label: "Knowledge Graph" },
        ]}
      />

      {/* StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Entrees totales"
          value={totalEntries}
          icon={Database}
          trend={totalEntries > 0 ? "up" : "flat"}
          trendValue={`${totalEntries} indexees`}
        />
        <StatCard
          title="Benchmarks sectoriels"
          value={sectorBenchmarks}
          icon={BarChart3}
          trendValue={`Score moy: ${benchmarks?.avgComposite?.toFixed(0) ?? 0}`}
        />
        <StatCard
          title="Patterns de briefs"
          value={briefPatternCount}
          icon={GitBranch}
          trendValue="missions completees"
        />
      </div>

      {/* Search Knowledge Graph */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h3 className="mb-3 font-semibold text-white flex items-center gap-2">
          <Search className="h-4 w-4" /> Recherche Knowledge Graph
        </h3>
        <div className="flex gap-3">
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setHasSearched(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Rechercher des strategies, benchmarks, patterns..."
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500"
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            Rechercher
          </button>
        </div>

        {hasSearched && (
          <div className="mt-4">
            {searching ? (
              <p className="text-sm text-zinc-400 animate-pulse">Recherche en cours...</p>
            ) : (searchResults ?? []).length === 0 ? (
              <p className="text-sm text-zinc-400">Aucun resultat pour &quot;{searchQuery}&quot;</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">{(searchResults ?? []).length} resultat(s)</p>
                {(searchResults ?? []).map((r) => {
                  const vec = r.advertis_vector as Record<string, number> | null;
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3 transition-colors hover:border-zinc-700">
                      <div>
                        <p className="text-sm font-medium text-white">{r.name}</p>
                        <p className="text-xs text-zinc-400">{r.type} - {r.status}</p>
                      </div>
                      <span className="text-sm font-bold text-white">{vec?.composite?.toFixed(0) ?? 0}/200</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter by type */}
      <SearchFilter
        placeholder="Filtrer les entrees..."
        value={search}
        onChange={setSearch}
        filters={[
          {
            key: "type",
            label: "Type",
            options: ENTRY_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") })),
          },
        ]}
        filterValues={filterValues}
        onFilterChange={(key, value) => setFilterValues((p) => ({ ...p, [key]: value }))}
      />

      {/* Entry cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aucune entree"
          description="Les entrees du Knowledge Graph apparaitront ici une fois les etudes et missions completees."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const Icon = TYPE_ICONS[entry.entryType] ?? Database;
            return (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="cursor-pointer flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Icon className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{getEntryTitle(entry)}</p>
                    {getEntrySummary(entry) && (
                      <p className="text-xs text-zinc-500 truncate max-w-md">{getEntrySummary(entry)}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      {entry.sector && (
                        <span className="text-[10px] text-zinc-500">Secteur: {entry.sector}</span>
                      )}
                      <span className="text-[10px] text-zinc-600">
                        {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge
                    status={entry.entryType}
                    variantMap={TYPE_BADGE_MAP}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title={selectedEntry ? getEntryTitle(selectedEntry) : ""}
        size="lg"
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge
                status={selectedEntry.entryType}
                variantMap={TYPE_BADGE_MAP}
              />
              {selectedEntry.sector && (
                <span className="text-xs text-zinc-400">Secteur: {selectedEntry.sector}</span>
              )}
              {selectedEntry.market && (
                <span className="text-xs text-zinc-400">Marche: {selectedEntry.market}</span>
              )}
            </div>

            <div className="rounded-lg bg-zinc-800/50 p-4">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Donnees</h4>
              <pre className="text-xs text-zinc-400 whitespace-pre-wrap overflow-auto max-h-64">
                {JSON.stringify(selectedEntry.data, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Source: {selectedEntry.sourceHash ?? "N/A"}</span>
              <span>{new Date(selectedEntry.createdAt).toLocaleString("fr-FR")}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
