"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilter } from "@/components/shared/search-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Radio, AlertCircle, TrendingUp, RefreshCw } from "lucide-react";

const SIGNAL_TYPES = [
  "SOCIAL_METRICS",
  "MEDIA_PERFORMANCE",
  "PRESS_CLIPPING",
  "INTERVENTION_REQUEST",
  "COMPETITOR_MOVE",
  "MARKET_SHIFT",
];

const SEVERITY_MAP: Record<string, string> = {
  critical: "bg-red-400/15 text-red-400 ring-red-400/30",
  high: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  medium: "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
  low: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  info: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
};

export default function SignalsPage() {
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  // Get signals for selected strategy
  const { data: signals, isLoading } = trpc.signal.list.useQuery(
    { strategyId: selectedStrategyId ?? "", limit: 50 },
    { enabled: !!selectedStrategyId },
  );

  const reprocessMutation = trpc.signal.reprocess.useMutation();

  const allStrategies = strategies ?? [];
  const signalItems = signals ?? [];

  // Derive severity from signal data
  const enrichedSignals = signalItems.map((s) => {
    const data = s.data as Record<string, unknown> | null;
    const severity = (data?.severity as string) ?? "info";
    return { ...s, severity, feedbackStatus: (data?.feedbackStatus as string) ?? "pending" };
  });

  const filtered = enrichedSignals.filter((s) => {
    if (search && !s.type.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterValues.type && s.type !== filterValues.type) return false;
    if (filterValues.severity && s.severity !== filterValues.severity) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Signaux"
        description="Flux de signaux entrants alimentant le feedback loop cross-client"
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Signal" }, { label: "Signaux" }]}
      />

      {/* Strategy selector */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Client</label>
        <select
          value={selectedStrategyId ?? ""}
          onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Selectionnez un client pour voir ses signaux</option>
          {allStrategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStrategyId && (
        <>
          <SearchFilter
            placeholder="Filtrer les signaux..."
            value={search}
            onChange={setSearch}
            filters={[
              {
                key: "type",
                label: "Type",
                options: SIGNAL_TYPES.map((t) => ({ value: t, label: t })),
              },
              {
                key: "severity",
                label: "Severite",
                options: [
                  { value: "critical", label: "Critique" },
                  { value: "high", label: "Haute" },
                  { value: "medium", label: "Moyenne" },
                  { value: "low", label: "Basse" },
                  { value: "info", label: "Info" },
                ],
              },
            ]}
            filterValues={filterValues}
            onFilterChange={(key, value) => setFilterValues((p) => ({ ...p, [key]: value }))}
          />

          {/* Signal type summary */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {SIGNAL_TYPES.map((type) => {
              const count = enrichedSignals.filter((s) => s.type === type).length;
              return (
                <div
                  key={type}
                  onClick={() => setFilterValues({ type })}
                  className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-center transition-colors hover:border-zinc-600"
                >
                  <p className="text-xs text-zinc-500 truncate">{type}</p>
                  <p className="mt-1 text-lg font-bold text-white">{count}</p>
                </div>
              );
            })}
          </div>

          {isLoading ? (
            <SkeletonPage />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Radio} title="Aucun signal" description="Les signaux apparaitront ici une fois collectes." />
          ) : (
            <div className="space-y-2">
              {filtered.map((signal) => (
                <div
                  key={signal.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {signal.severity === "critical" ? (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      ) : signal.severity === "high" ? (
                        <TrendingUp className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Radio className="h-4 w-4 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{signal.type}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(signal.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={signal.severity} variantMap={SEVERITY_MAP} />
                    <StatusBadge status={signal.feedbackStatus} />
                    <button
                      onClick={() => reprocessMutation.mutate({ signalId: signal.id })}
                      disabled={reprocessMutation.isPending}
                      className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                      title="Retraiter"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedStrategyId && (
        <EmptyState icon={Radio} title="Selectionnez un client" description="Choisissez un client ci-dessus pour voir les signaux cross-piliers." />
      )}
    </div>
  );
}
