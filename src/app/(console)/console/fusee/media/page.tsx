"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Tabs } from "@/components/shared/tabs";
import {
  Monitor,
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingUp,
  BarChart3,
} from "lucide-react";

export default function MediaBuyingPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  const { data: strategies } = trpc.strategy.list.useQuery({});
  const { data: summary, isLoading: loadingSummary } = trpc.mediaBuying.getSummary.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );

  const allStrategies = strategies ?? [];
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  const tabs = [
    { key: "overview", label: "Vue d'ensemble", count: 0 },
    { key: "campaigns", label: "Campagnes media", count: 0 },
    { key: "placements", label: "Placements", count: 0 },
    { key: "budgets", label: "Budgets", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Buying"
        description="Performance des achats media, placements et optimisation budgetaire"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "Media" },
        ]}
      />

      {/* Strategy selector */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Client</label>
        <select
          value={selectedStrategyId ?? ""}
          onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Selectionnez un client pour voir les performances media</option>
          {allStrategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStrategyId && loadingSummary && <SkeletonPage />}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Budget depense"
          value={`${fmt(summary?.totalSpend ?? 0)} XAF`}
          icon={DollarSign}
        />
        <StatCard
          title="Impressions"
          value={fmt(summary?.totalImpressions ?? 0)}
          icon={Eye}
        />
        <StatCard
          title="Clics"
          value={fmt(summary?.totalClicks ?? 0)}
          icon={MousePointerClick}
        />
        <StatCard
          title="CTR moyen"
          value={`${(summary?.avgCTR ?? 0).toFixed(2)}%`}
          icon={TrendingUp}
          trend={(summary?.avgCTR ?? 0) > 2 ? "up" : (summary?.avgCTR ?? 0) > 0 ? "flat" : undefined}
          trendValue={(summary?.avgCTR ?? 0) > 2 ? "Bon" : (summary?.avgCTR ?? 0) > 0 ? "Moyen" : "Aucune donnee"}
        />
      </div>

      {/* Performance summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            CPM moyen
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {summary?.avgCPM ? `${fmt(summary.avgCPM)} XAF` : "- XAF"}
          </p>
          <p className="text-xs text-zinc-500">cout pour 1000 impressions</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            CPC moyen
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {summary?.avgCPC ? `${fmt(summary.avgCPC)} XAF` : "- XAF"}
          </p>
          <p className="text-xs text-zinc-500">cout par clic</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Conversions
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {fmt(summary?.totalConversions ?? 0)}
          </p>
          <p className="text-xs text-zinc-500">conversions trackees</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Empty state */}
      <EmptyState
        icon={Monitor}
        title="Aucune campagne media"
        description={selectedStrategyId
          ? "Aucune donnee media trouvee pour ce client. Utilisez l'API syncPerformance pour ingerer des donnees."
          : "Selectionnez un client ci-dessus pour voir les performances media."}
      />
    </div>
  );
}
