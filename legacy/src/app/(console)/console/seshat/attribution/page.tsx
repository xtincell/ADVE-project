"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { GitBranch, BarChart3, Target, TrendingUp } from "lucide-react";

export default function AttributionPage() {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const { data: signals, isLoading } = trpc.signal.list.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );

  const allSignals = signals ?? [];
  const attributionSignals = allSignals.filter((s) => s.type === "ATTRIBUTION" || s.type === "CONVERSION");

  return (
    <div className="space-y-6">
      <PageHeader title="Attribution & Cohortes" description="Suivi de l'attribution cross-canal et analyse de cohortes" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Signal" }, { label: "Attribution" }]} />

      <div className="rounded-xl border border-border bg-card p-4">
        <label className="mb-2 block text-sm font-medium text-foreground-secondary">Client</label>
        <select value={selectedStrategyId ?? ""} onChange={(e) => setSelectedStrategyId(e.target.value || null)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="">Selectionnez un client</option>
          {(strategies ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {selectedStrategyId && isLoading && <SkeletonPage />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Signaux attribution" value={attributionSignals.length} icon={GitBranch} />
        <StatCard title="Canaux trackes" value={new Set(attributionSignals.map((s) => (s.data as Record<string, unknown>)?.channel)).size} icon={BarChart3} />
        <StatCard title="Conversions" value={allSignals.filter((s) => s.type === "CONVERSION").length} icon={Target} />
        <StatCard title="Tendance" value="—" icon={TrendingUp} />
      </div>

      {attributionSignals.length === 0 ? (
        <EmptyState icon={GitBranch} title="Aucune donnee d'attribution" description={selectedStrategyId ? "Aucun signal d'attribution trouve. Les conversions cross-canal apparaitront ici." : "Selectionnez un client ci-dessus."} />
      ) : (
        <div className="space-y-2">
          {attributionSignals.map((signal) => {
            const d = signal.data as Record<string, unknown> | null;
            return (
              <div key={signal.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{(d?.channel as string) ?? signal.type}</p>
                  <span className="text-xs text-foreground-muted">{new Date(signal.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                {d?.value != null && <p className="mt-1 text-xs text-foreground-muted">Valeur: {String(d.value)}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
