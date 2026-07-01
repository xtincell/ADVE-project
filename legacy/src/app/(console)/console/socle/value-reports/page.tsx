"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { FileBarChart, CheckCircle, Clock, TrendingUp } from "lucide-react";

export default function ValueReportsPage() {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const { data: reports, isLoading } = trpc.valueReport.list.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );

  const periods = reports ?? [];
  const withData = periods.filter((r) => r.hasData);

  return (
    <div className="space-y-6">
      <PageHeader title="Value Reports" description="Rapports de valeur — preuve du ROI pour chaque client" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Socle" }, { label: "Value Reports" }]} />

      <div className="rounded-xl border border-border bg-card p-4">
        <label className="mb-2 block text-sm font-medium text-foreground-secondary">Client</label>
        <select value={selectedStrategyId ?? ""} onChange={(e) => setSelectedStrategyId(e.target.value || null)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          <option value="">Selectionnez un client</option>
          {(strategies ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {selectedStrategyId && isLoading && <SkeletonPage />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Periodes" value={periods.length} icon={FileBarChart} />
        <StatCard title="Avec donnees" value={withData.length} icon={CheckCircle} />
        <StatCard title="Sans donnees" value={periods.length - withData.length} icon={Clock} />
        <StatCard title="Tendance" value="—" icon={TrendingUp} />
      </div>

      {!selectedStrategyId ? (
        <EmptyState icon={FileBarChart} title="Selectionnez un client" description="Choisissez un client ci-dessus pour voir les periodes de Value Reports disponibles." />
      ) : periods.length === 0 ? (
        <EmptyState icon={FileBarChart} title="Aucun Value Report" description="Les rapports de valeur seront generes selon le First Value Protocol (J+0 a J+30)." />
      ) : (
        <div className="space-y-2">
          {periods.map((period) => (
            <div key={period.period} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card-hover">
              <div>
                <p className="text-sm font-medium text-foreground">Periode {period.period}</p>
                <p className="text-xs text-foreground-muted">
                  {period.hasData ? "Donnees disponibles" : "Aucune donnee pour cette periode"}
                </p>
              </div>
              <StatusBadge status={period.hasData ? "ACTIVE" : "PENDING"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
