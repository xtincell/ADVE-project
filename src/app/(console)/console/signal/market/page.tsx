"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs } from "@/components/shared/tabs";
import { SearchFilter } from "@/components/shared/search-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import {
  Globe,
  BarChart3,
  Layers,
  Calendar,
  TrendingUp,
  Building2,
  FileText,
  Plus,
} from "lucide-react";

interface MarketEntry {
  id: string;
  entryType: string;
  sector: string | null;
  market: string | null;
  data: unknown;
  sourceHash: string | null;
  createdAt: Date | string;
}

export default function MarketContextPage() {
  const [activeTab, setActiveTab] = useState("benchmarks");
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<MarketEntry | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Fetch market studies (returns KnowledgeEntry with entryType SECTOR_BENCHMARK)
  const { data: studies, isLoading: loadingStudies } = trpc.marketStudy.list.useQuery({});

  // Fetch sector benchmarks from knowledge graph
  const { data: benchmarkStats, isLoading: loadingBenchmarks } = trpc.knowledgeGraph.getBenchmarks.useQuery({});

  // Fetch framework rankings for competitor view
  const { data: rankings } = trpc.knowledgeGraph.getFrameworkRanking.useQuery({});

  // Fetch strategies for create modal
  const { data: strategies } = trpc.strategy.list.useQuery({});

  // Create mutation
  const createMutation = trpc.marketStudy.create.useMutation();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ strategyId: "", title: "", sector: "", market: "", findings: "" });

  const isLoading = loadingStudies || loadingBenchmarks;

  const studyItems: MarketEntry[] = (studies ?? []) as MarketEntry[];

  // Stats
  const totalStudies = studyItems.length;
  const avgScore = benchmarkStats?.avgComposite ?? 0;
  const sectorsSet = new Set(studyItems.map((s) => s.sector).filter(Boolean));
  const latestDate = studyItems.length > 0
    ? new Date(studyItems[0]!.createdAt).toLocaleDateString("fr-FR")
    : "N/A";

  // Filtered items per search
  const filtered = useMemo(() => {
    return studyItems.filter((entry) => {
      const data = entry.data as Record<string, unknown> | null;
      const title = (data?.studyTitle as string) ?? "";
      return !search || title.toLowerCase().includes(search.toLowerCase())
        || (entry.sector ?? "").toLowerCase().includes(search.toLowerCase())
        || (entry.market ?? "").toLowerCase().includes(search.toLowerCase());
    });
  }, [studyItems, search]);

  const getEntryTitle = (entry: MarketEntry): string => {
    const data = entry.data as Record<string, unknown> | null;
    return (data?.studyTitle as string) ?? "Etude sans titre";
  };

  const handleCreate = () => {
    if (!form.title || !form.strategyId) return;
    createMutation.mutate(
      {
        strategyId: form.strategyId,
        title: form.title,
        sector: form.sector || undefined,
        market: form.market || undefined,
        findings: { summary: form.findings },
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setForm({ strategyId: "", title: "", sector: "", market: "", findings: "" });
          utils.marketStudy.list.invalidate();
        },
      },
    );
  };

  const tabs = [
    { key: "benchmarks", label: "Benchmarks", count: filtered.length },
    { key: "studies", label: "Etudes", count: totalStudies },
    { key: "competitors", label: "Concurrents", count: (rankings ?? []).length },
  ];

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contexte Marche"
        description="Intelligence de marche et benchmarks sectoriels - Systeme Tarsis"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Signal" },
          { label: "Marche" },
        ]}
      >
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Nouvelle etude
        </button>
      </PageHeader>

      {/* StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Etudes de marche"
          value={totalStudies}
          icon={FileText}
          trend={totalStudies > 0 ? "up" : "flat"}
          trendValue={`${totalStudies} realisees`}
        />
        <StatCard
          title="Score marche moy."
          value={avgScore > 0 ? avgScore.toFixed(0) : "0"}
          icon={BarChart3}
          trend={avgScore > 100 ? "up" : avgScore > 0 ? "flat" : "flat"}
          trendValue="/200"
        />
        <StatCard
          title="Secteurs couverts"
          value={sectorsSet.size}
          icon={Layers}
          trendValue={`${sectorsSet.size} secteur(s)`}
        />
        <StatCard
          title="Derniere etude"
          value={latestDate}
          icon={Calendar}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Benchmarks tab */}
      {activeTab === "benchmarks" && (
        <>
          <SearchFilter
            placeholder="Rechercher par titre, secteur ou marche..."
            value={search}
            onChange={setSearch}
          />

          {filtered.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="Aucun benchmark"
              description="Les benchmarks sectoriels apparaitront ici apres la creation d'etudes de marche."
              action={{ label: "Nouvelle etude", onClick: () => setShowCreate(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((entry) => {
                const data = entry.data as Record<string, unknown> | null;
                const findings = data?.findings as Record<string, unknown> | null;
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="rounded-lg bg-blue-400/10 p-2">
                        <BarChart3 className="h-4 w-4 text-blue-400" />
                      </div>
                      {entry.sector && (
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                          {entry.sector}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white truncate">{getEntryTitle(entry)}</p>
                    {entry.market && (
                      <p className="text-xs text-zinc-500 mt-1">Marche: {entry.market}</p>
                    )}
                    {!!findings?.summary && (
                      <p className="text-xs text-zinc-500 mt-1 truncate">{String(findings.summary)}</p>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-2">
                      {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Studies tab */}
      {activeTab === "studies" && (
        <>
          {studyItems.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune etude"
              description="Creez une etude de marche pour alimenter les benchmarks."
              action={{ label: "Nouvelle etude", onClick: () => setShowCreate(true) }}
            />
          ) : (
            <div className="space-y-2">
              {studyItems.map((entry) => {
                const data = entry.data as Record<string, unknown> | null;
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="cursor-pointer flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <FileText className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{getEntryTitle(entry)}</p>
                        <div className="mt-1 flex items-center gap-3">
                          {entry.sector && <span className="text-xs text-zinc-500">{entry.sector}</span>}
                          {entry.market && <span className="text-xs text-zinc-500">{entry.market}</span>}
                          <span className="text-xs text-zinc-600">
                            {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="rounded-md bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400">
                        {(data?.strategyId as string)?.slice(0, 8) ?? "system"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Competitors tab */}
      {activeTab === "competitors" && (
        <>
          {(rankings ?? []).length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Aucun concurrent"
              description="Les classements concurrentiels apparaitront ici une fois les strategies actives indexees."
            />
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
              <h3 className="mb-4 font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Classement des marques
              </h3>
              <div className="space-y-2">
                {(rankings ?? []).slice(0, 15).map((r, i) => (
                  <div
                    key={r.strategyId}
                    className="flex items-center justify-between rounded-lg border border-zinc-800/50 p-3 transition-colors hover:bg-zinc-800/30"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          i < 3
                            ? "bg-amber-400/20 text-amber-400"
                            : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-white">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 rounded-full bg-zinc-800">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, (r.composite / 200) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-white w-14 text-right">
                        {r.composite.toFixed(0)}/200
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
            <div className="flex items-center gap-3">
              {selectedEntry.sector && (
                <span className="rounded-md bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400">
                  {selectedEntry.sector}
                </span>
              )}
              {selectedEntry.market && (
                <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-400">
                  {selectedEntry.market}
                </span>
              )}
              <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                {selectedEntry.entryType.replace(/_/g, " ")}
              </span>
            </div>

            <div className="rounded-lg bg-zinc-800/50 p-4">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Donnees de l&apos;etude</h4>
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

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle etude de marche" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Client</label>
            <select
              value={form.strategyId}
              onChange={(e) => setForm((p) => ({ ...p, strategyId: e.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
            >
              <option value="">Selectionnez un client</option>
              {(strategies ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Titre</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
              placeholder="Titre de l'etude"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Secteur</label>
              <input
                value={form.sector}
                onChange={(e) => setForm((p) => ({ ...p, sector: e.target.value }))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                placeholder="ex: Telecom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Marche</label>
              <input
                value={form.market}
                onChange={(e) => setForm((p) => ({ ...p, market: e.target.value }))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                placeholder="ex: Cameroun"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Conclusions</label>
            <textarea
              value={form.findings}
              onChange={(e) => setForm((p) => ({ ...p, findings: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
              placeholder="Principales conclusions..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.title || !form.strategyId || createMutation.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creation..." : "Creer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
