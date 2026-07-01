"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { BarChart3, TrendingUp, DollarSign, Users, Rocket, Activity } from "lucide-react";

export default function EcosystemMetricsPage() {
  const { data: strategies, isLoading: ls } = trpc.strategy.list.useQuery({});
  const { data: missions, isLoading: lm } = trpc.mission.list.useQuery({ limit: 100 });
  const { data: guildStats, isLoading: lg } = trpc.guilde.getStats.useQuery();
  const { data: commissions, isLoading: lc } = trpc.commission.list.useQuery({ limit: 100 });

  if (ls || lm || lg || lc) return <SkeletonPage />;

  const allStrategies = strategies ?? [];
  const allMissions = missions ?? [];
  const totalGuild = guildStats?.total ?? 0;
  const commissionItems = commissions?.items ?? [];
  const totalRevenue = commissionItems.reduce((s, c) => s + (c.commissionAmount ?? 0), 0);
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  const completedMissions = allMissions.filter((m) => m.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <PageHeader title="Metriques Ecosysteme" description="Volume transactionnel, croissance et indicateurs cles" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Ecosysteme", href: "/console/ecosystem" }, { label: "Metriques" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Brand Instances" value={allStrategies.length} icon={Rocket} />
        <StatCard title="Missions totales" value={allMissions.length} icon={Activity} />
        <StatCard title="Missions completees" value={completedMissions.length} icon={TrendingUp} />
        <StatCard title="Creatifs" value={totalGuild} icon={Users} />
        <StatCard title="Revenus commissions" value={`${fmt(totalRevenue)} XAF`} icon={DollarSign} />
        {/* lafusee:allow-adhoc-completion: ecosystem brand metric (UI display) */}
        <StatCard title="Taux completion" value={allMissions.length > 0 ? `${Math.round((completedMissions.length / allMissions.length) * 100)}%` : "—"} icon={BarChart3} />
      </div>

      {/* Growth indicators */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Indicateurs de croissance</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-background-overlay p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{allStrategies.filter((s) => s.status === "ACTIVE").length}</p>
            <p className="text-xs text-foreground-muted">Clients actifs</p>
          </div>
          <div className="rounded-lg bg-background-overlay p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{allMissions.filter((m) => m.status === "IN_PROGRESS").length}</p>
            <p className="text-xs text-foreground-muted">Missions en vol</p>
          </div>
          <div className="rounded-lg bg-background-overlay p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{commissionItems.filter((c) => c.status === "PENDING").length}</p>
            <p className="text-xs text-foreground-muted">Paiements en attente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
