"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Radar, Eye, Shield, TrendingDown } from "lucide-react";

export default function TarsisPage() {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const { data: signals, isLoading } = trpc.signal.list.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );

  const allSignals = signals ?? [];
  const competitorSignals = allSignals.filter((s) => s.type === "COMPETITOR" || s.type === "MARKET_TREND" || s.type === "THREAT");

  return (
    <div className="space-y-6">
      <PageHeader title="TARSIS — Veille Concurrentielle" description="Intelligence concurrentielle multi-marques et signaux de menace" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Signal" }, { label: "Tarsis" }]} />

      <div className="rounded-xl border border-border bg-card p-4">
        <label className="mb-2 block text-sm font-medium text-foreground-secondary">Client</label>
        <select value={selectedStrategyId ?? ""} onChange={(e) => setSelectedStrategyId(e.target.value || null)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="">Selectionnez un client</option>
          {(strategies ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {selectedStrategyId && isLoading && <SkeletonPage />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Signaux concurrentiels" value={competitorSignals.length} icon={Radar} />
        <StatCard title="Menaces detectees" value={competitorSignals.filter((s) => s.type === "THREAT").length} icon={Shield} />
        <StatCard title="Tendances marche" value={competitorSignals.filter((s) => s.type === "MARKET_TREND").length} icon={TrendingDown} />
        <StatCard title="Sources surveillees" value="—" icon={Eye} />
      </div>

      {competitorSignals.length === 0 ? (
        <EmptyState icon={Radar} title="Aucune donnee TARSIS" description={selectedStrategyId ? "Aucun signal concurrentiel. La veille sera alimentee par les connecteurs RADAR." : "Selectionnez un client ci-dessus."} />
      ) : (
        <div className="space-y-2">
          {competitorSignals.map((signal) => {
            const d = signal.data as Record<string, unknown> | null;
            return (
              <div key={signal.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{(d?.competitor as string) ?? signal.type}</p>
                    <p className="text-xs text-foreground-muted">{(d?.description as string) ?? "Signal concurrentiel"}</p>
                  </div>
                  <span className="text-xs text-foreground-muted">{new Date(signal.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
