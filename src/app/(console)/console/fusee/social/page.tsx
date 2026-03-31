"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Tabs } from "@/components/shared/tabs";
import {
  Share2,
  Users,
  Heart,
  TrendingUp,
  Plus,
  Link2,
  Eye,
} from "lucide-react";

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState("connections");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  const { data: strategies } = trpc.strategy.list.useQuery({});
  const { data: performance, isLoading: loadingPerf } = trpc.social.getPerformance.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );

  const allStrategies = strategies ?? [];
  const summary = performance?.summary;
  const signals = performance?.signals ?? [];

  const tabs = [
    { key: "connections", label: "Connexions", count: 0 },
    { key: "posts", label: "Publications", count: signals.length },
    { key: "metrics", label: "Metriques", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Connections"
        description="Gestion des connexions sociales, publications et metriques d'engagement"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "Social" },
        ]}
      >
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
          <Plus className="h-4 w-4" /> Connecter un compte
        </button>
      </PageHeader>

      {/* Strategy selector */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Client</label>
        <select
          value={selectedStrategyId ?? ""}
          onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Selectionnez un client pour voir les metriques sociales</option>
          {allStrategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStrategyId && loadingPerf && <SkeletonPage />}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Publications trackees"
          value={summary?.postCount ?? 0}
          icon={Link2}
        />
        <StatCard
          title="Impressions totales"
          value={new Intl.NumberFormat("fr-FR").format(summary?.totalImpressions ?? 0)}
          icon={Eye}
        />
        <StatCard
          title="Engagement total"
          value={new Intl.NumberFormat("fr-FR").format(summary?.totalEngagement ?? 0)}
          icon={Heart}
        />
        <StatCard
          title="Taux d'engagement moy."
          value={`${(summary?.avgEngagementRate ?? 0).toFixed(2)}%`}
          icon={TrendingUp}
          trend={
            (summary?.avgEngagementRate ?? 0) > 3
              ? "up"
              : (summary?.avgEngagementRate ?? 0) > 0
                ? "flat"
                : undefined
          }
          trendValue={
            (summary?.avgEngagementRate ?? 0) > 3
              ? "Bon"
              : (summary?.avgEngagementRate ?? 0) > 0
                ? "Moyen"
                : "Aucune donnee"
          }
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "connections" && (
        <EmptyState
          icon={Share2}
          title="Aucune connexion sociale"
          description="Connectez vos comptes de reseaux sociaux pour commencer le suivi."
        />
      )}
      {activeTab === "posts" && (
        <>
          {signals.length === 0 ? (
            <EmptyState
              icon={Share2}
              title="Aucune publication"
              description={selectedStrategyId
                ? "Aucun signal social trouve pour ce client. Utilisez l'API pour ingerer des metriques."
                : "Selectionnez un client pour voir les publications trackees."}
            />
          ) : (
            <div className="space-y-2">
              {signals.map((signal) => {
                const data = signal.data as Record<string, unknown> | null;
                return (
                  <div
                    key={signal.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {(data?.platform as string) ?? "Social"} — Post {(data?.postId as string) ?? ""}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(signal.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <span>{new Intl.NumberFormat("fr-FR").format((data?.impressions as number) ?? 0)} impr.</span>
                      <span>{new Intl.NumberFormat("fr-FR").format((data?.engagement as number) ?? 0)} eng.</span>
                      <span className="font-medium text-white">
                        {((data?.engagementRate as number) ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {activeTab === "metrics" && (
        <EmptyState
          icon={TrendingUp}
          title="Aucune metrique"
          description="Les metriques d'engagement social seront affichees une fois les comptes connectes."
        />
      )}
    </div>
  );
}
