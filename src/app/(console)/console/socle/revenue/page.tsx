"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  DollarSign,
  CreditCard,
  CalendarDays,
  Users,
} from "lucide-react";

const fmt = (amount: number) =>
  new Intl.NumberFormat("fr-FR").format(amount) + " XAF";

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const TIER_COLORS: Record<string, string> = {
  APPRENTI: "bg-zinc-500",
  COMPAGNON: "bg-blue-500",
  MAITRE: "bg-amber-500",
  ASSOCIE: "bg-emerald-500",
};

const TIER_TEXT: Record<string, string> = {
  APPRENTI: "text-zinc-400",
  COMPAGNON: "text-blue-400",
  MAITRE: "text-amber-400",
  ASSOCIE: "text-emerald-400",
};

export default function RevenuePage() {
  const { data: commissions, isLoading: loadingComm } =
    trpc.commission.list.useQuery({ limit: 100 });
  const { data: strategies, isLoading: loadingStrat } =
    trpc.strategy.list.useQuery({});

  const isLoading = loadingComm || loadingStrat;

  const allCommissions = commissions?.items ?? [];
  const paidCommissions = allCommissions.filter((c) => c.status === "PAID");
  const pendingCommissions = allCommissions.filter(
    (c) => c.status === "PENDING",
  );

  const totalPaid = paidCommissions.reduce(
    (sum, c) => sum + (c.commissionAmount ?? 0),
    0,
  );
  const totalPending = pendingCommissions.reduce(
    (sum, c) => sum + (c.commissionAmount ?? 0),
    0,
  );

  // This month revenue
  const now = new Date();
  const thisMonthRevenue = paidCommissions
    .filter((c) => {
      const d = new Date(c.paidAt ?? c.createdAt);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);

  const activeMemberships = (strategies ?? []).filter(
    (s) => s.status === "ACTIVE",
  ).length;

  // Group revenue by month (last 12 months)
  const monthlyRevenue = useMemo(() => {
    const months: { label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      });
      const month = d.getMonth();
      const year = d.getFullYear();
      const value = paidCommissions
        .filter((c) => {
          const cd = new Date(c.paidAt ?? c.createdAt);
          return cd.getMonth() === month && cd.getFullYear() === year;
        })
        .reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);
      months.push({ label, value });
    }
    return months;
  }, [paidCommissions]);

  const maxMonthly = Math.max(...monthlyRevenue.map((m) => m.value), 1);

  // Group revenue by tier
  const tierRevenue = useMemo(() => {
    const tiers: Record<string, number> = {
      APPRENTI: 0,
      COMPAGNON: 0,
      MAITRE: 0,
      ASSOCIE: 0,
    };
    for (const c of paidCommissions) {
      const tier = (c.tierAtTime ?? "APPRENTI").toUpperCase();
      if (tier in tiers) {
        tiers[tier] = (tiers[tier] ?? 0) + (c.commissionAmount ?? 0);
      }
    }
    return tiers;
  }, [paidCommissions]);

  const maxTier = Math.max(...Object.values(tierRevenue), 1);

  // Recent 10 paid commissions
  const recentPaid = paidCommissions.slice(0, 10);

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenus"
        description="Tableau de bord des revenus de l'ecosysteme"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Socle" },
          { label: "Revenus" },
        ]}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue totale"
          value={fmt(totalPaid)}
          icon={DollarSign}
          trend={totalPaid > 0 ? "up" : "flat"}
          trendValue={`${paidCommissions.length} paiements`}
        />
        <StatCard
          title="Paiements en attente"
          value={fmt(totalPending)}
          icon={CreditCard}
          trend={totalPending > 0 ? "up" : "flat"}
          trendValue={`${pendingCommissions.length} en attente`}
        />
        <StatCard
          title="Ce mois"
          value={fmt(thisMonthRevenue)}
          icon={CalendarDays}
        />
        <StatCard
          title="Abonnements actifs"
          value={activeMemberships}
          icon={Users}
        />
      </div>

      {/* Two-column grid: Monthly bar chart + Tier breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by month */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <h3 className="mb-4 font-semibold text-white">
            Revenus par mois (12 derniers)
          </h3>
          <div className="flex items-end gap-1.5" style={{ height: 180 }}>
            {monthlyRevenue.map((m, i) => {
              const pct = maxMonthly > 0 ? (m.value / maxMonthly) * 100 : 0;
              return (
                <div
                  key={i}
                  className="group flex flex-1 flex-col items-center gap-1"
                >
                  <div className="relative flex w-full flex-col items-center">
                    <span className="absolute -top-5 hidden text-[10px] text-zinc-400 group-hover:block">
                      {fmt(m.value)}
                    </span>
                    <div
                      className="w-full rounded-t bg-emerald-500/70 transition-all hover:bg-emerald-500"
                      style={{
                        height: `${Math.max(pct, 2)}%`,
                        minHeight: 4,
                        maxHeight: 160,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-500">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by tier */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <h3 className="mb-4 font-semibold text-white">
            Revenus par tier
          </h3>
          <div className="space-y-4">
            {Object.entries(tierRevenue).map(([tier, value]) => {
              const pct = maxTier > 0 ? (value / maxTier) * 100 : 0;
              return (
                <div key={tier} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${TIER_TEXT[tier] ?? "text-zinc-300"}`}
                    >
                      {tier}
                    </span>
                    <span className="text-sm text-zinc-400">{fmt(value)}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800/50">
                    <div
                      className={`h-full rounded-full transition-all ${TIER_COLORS[tier] ?? "bg-zinc-500"}`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h3 className="mb-4 font-semibold text-white">
          Transactions recentes
        </h3>
        {recentPaid.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aucune transaction recente.
          </p>
        ) : (
          <div className="space-y-2">
            {recentPaid.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800/50 p-3 transition-colors hover:bg-zinc-800/30"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-400/10 p-2">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {fmt(c.commissionAmount ?? 0)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {c.talentId
                        ? `Creatif ${c.talentId.slice(0, 8)}...`
                        : "N/A"}{" "}
                      &middot; Mission{" "}
                      {c.missionId.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.status ?? "PAID"} />
                  <span className="text-xs text-zinc-500">
                    {fmtDate(c.paidAt ?? c.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
