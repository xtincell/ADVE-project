"use client";

import { useMemo } from "react";
import { DollarSign, TrendingUp, Star } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

export default function EarningsHistoryPage() {
  const commissions = trpc.commission.getByCreator.useQuery({});

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  // Group commissions by month
  const monthlyData = useMemo(() => {
    const all = commissions.data ?? [];
    const map = new Map<string, typeof all>();
    for (const c of all) {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({
        key,
        label: new Date(key + "-01").toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        }),
        total: items.reduce((s, c) => s + c.netAmount, 0),
        items,
      }));
  }, [commissions.data]);

  // Last 12 months for bar chart
  const last12 = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyData.find((m) => m.key === key);
      months.push({
        key,
        label: d.toLocaleDateString("fr-FR", { month: "short" }),
        total: existing?.total ?? 0,
      });
    }
    return months;
  }, [monthlyData]);

  if (commissions.isLoading) return <SkeletonPage />;

  const allCommissions = commissions.data ?? [];
  const totalAllTime = allCommissions.reduce((s, c) => s + c.netAmount, 0);
  const avgMonthly = monthlyData.length > 0 ? totalAllTime / monthlyData.length : 0;
  const bestMonth = monthlyData.reduce(
    (best, m) => (m.total > best.total ? m : best),
    { key: "", label: "N/A", total: 0, items: [] as typeof allCommissions },
  );

  const maxBarValue = Math.max(...last12.map((m) => m.total), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique"
        description="Timeline chronologique de vos revenus"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Gains" },
          { label: "Historique" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total all time"
          value={`${fmt(totalAllTime)} FCFA`}
          icon={DollarSign}
          trend="up"
          trendValue={`${allCommissions.length} commissions`}
        />
        <StatCard
          title="Moyenne mensuelle"
          value={`${fmt(avgMonthly)} FCFA`}
          icon={TrendingUp}
        />
        <StatCard
          title="Meilleur mois"
          value={`${fmt(bestMonth.total)} FCFA`}
          icon={Star}
          trendValue={bestMonth.label !== "N/A" ? bestMonth.label : undefined}
          trend={bestMonth.total > 0 ? "up" : undefined}
        />
      </div>

      {/* Bar chart - last 12 months */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <h3 className="mb-4 font-semibold text-white">12 derniers mois</h3>
        <div className="flex items-end gap-2" style={{ height: 160 }}>
          {last12.map((m) => {
            const pct = maxBarValue > 0 ? (m.total / maxBarValue) * 100 : 0;
            return (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-zinc-500">
                  {m.total > 0 ? fmt(m.total) : ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-purple-500 transition-all duration-500"
                  style={{ height: `${Math.max(pct, 2)}%`, minHeight: 4 }}
                />
                <span className="text-[10px] capitalize text-zinc-500">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly breakdown */}
      {monthlyData.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Aucun historique"
          description="Votre historique de revenus apparaitra ici."
        />
      ) : (
        <div className="space-y-4">
          {monthlyData.map((month) => (
            <div
              key={month.key}
              className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold capitalize text-white">{month.label}</h3>
                <span className="text-sm font-semibold text-zinc-300">
                  {fmt(month.total)} FCFA
                </span>
              </div>
              <div className="space-y-2">
                {month.items.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800/50 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge
                        status={c.status}
                        variantMap={{
                          paid: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
                          pending: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
                          cancelled: "bg-red-400/15 text-red-400 ring-red-400/30",
                        }}
                      />
                      <span className="text-sm text-zinc-400">
                        {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">{c.tierAtTime}</span>
                      <span className="font-semibold text-white">
                        {new Intl.NumberFormat("fr-FR").format(c.netAmount)} FCFA
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
