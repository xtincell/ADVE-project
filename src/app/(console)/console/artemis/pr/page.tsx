"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Newspaper,
  Send,
  Scissors,
  FileText,
  BarChart3,
} from "lucide-react";

export default function PrPage() {
  const [activeTab, setActiveTab] = useState("releases");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  const { data: strategies } = trpc.strategy.list.useQuery({});
  const { data: prAssets, isLoading } = trpc.brandVault.list.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );

  const allStrategies = strategies ?? [];
  const assets = prAssets ?? [];
  const releases = assets.filter((a) => {
    const tags = (a.pillarTags ?? {}) as Record<string, number>;
    return "press_release" in tags || "pr" in tags;
  });
  const clippings = assets.filter((a) => {
    const tags = (a.pillarTags ?? {}) as Record<string, number>;
    return "clipping" in tags || "media_mention" in tags;
  });

  const tabs = [
    { key: "releases", label: "Communiques", count: releases.length },
    { key: "distributions", label: "Distributions", count: 0 },
    { key: "clippings", label: "Clippings", count: clippings.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relations Presse"
        description="Gestion des communiques, distributions et retombees presse"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "PR" },
        ]}
      />

      {/* Strategy selector */}
      <div className="rounded-xl border border-border bg-card p-4">
        <label className="mb-2 block text-sm font-medium text-foreground-secondary">Client</label>
        <select
          value={selectedStrategyId ?? ""}
          onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Selectionnez un client</option>
          {allStrategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStrategyId && isLoading && <SkeletonPage />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Communiques" value={releases.length} icon={FileText} />
        <StatCard title="Distributions" value={0} icon={Send} />
        <StatCard title="Clippings" value={clippings.length} icon={Scissors} />
        <StatCard title="Portee estimee" value="—" icon={BarChart3} />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "releases" && (
        releases.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Aucun communique de presse"
            description={selectedStrategyId ? "Aucun communique trouve. Utilisez le router PR pour creer un communique." : "Selectionnez un client ci-dessus."}
          />
        ) : (
          <div className="space-y-2">
            {releases.map((asset) => (
              <div key={asset.id} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card-hover">
                <p className="text-sm font-medium text-foreground">{asset.name}</p>
                <p className="text-xs text-foreground-muted">{new Date(asset.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
            ))}
          </div>
        )
      )}
      {activeTab === "distributions" && (
        <EmptyState icon={Send} title="Aucune distribution" description="Les distributions de communiques aux medias apparaitront ici." />
      )}
      {activeTab === "clippings" && (
        clippings.length === 0 ? (
          <EmptyState icon={Scissors} title="Aucun clipping" description="Les retombees presse et clippings seront collectes ici." />
        ) : (
          <div className="space-y-2">
            {clippings.map((asset) => (
              <div key={asset.id} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card-hover">
                <p className="text-sm font-medium text-foreground">{asset.name}</p>
                <p className="text-xs text-foreground-muted">{new Date(asset.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
