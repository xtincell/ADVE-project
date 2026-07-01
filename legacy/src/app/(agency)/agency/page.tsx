"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Building, Building2, Target, TrendingUp } from "lucide-react";
import { PILLAR_KEYS } from "@/lib/types/advertis-vector";

export default function AgencyDashboardPage() {
  const { data: clients, isLoading } = trpc.brandClient.list.useQuery({});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Agence"
          breadcrumbs={[{ label: "Agence", href: "/agency" }]}
        />
        <SkeletonPage />
      </div>
    );
  }

  const allClients = clients?.items ?? [];
  const totalBrands = allClients.reduce((sum, c) => sum + (c._count?.strategies ?? 0), 0);

  // Compute average ADVE across all brands
  let totalScore = 0;
  let brandCount = 0;
  for (const client of allClients) {
    for (const s of client.strategies) {
      const v = s.advertis_vector as Record<string, number> | null;
      if (v) {
        totalScore += PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0);
        brandCount++;
      }
    }
  }
  const avgScore = brandCount > 0 ? (totalScore / brandCount).toFixed(0) : "0";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Agence"
        description={`${allClients.length} clients dans votre portefeuille`}
        breadcrumbs={[{ label: "Agence", href: "/agency" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clients" value={allClients.length} icon={Building} />
        <StatCard title="Marques" value={totalBrands} icon={Building2} />
        <StatCard title="Score ADVE moyen" value={`${avgScore}/200`} icon={TrendingUp} />
        <StatCard
          title="Actives"
          value={allClients.filter((c) => c.strategies.some((s) => s.status === "ACTIVE")).length}
          icon={Target}
        />
      </div>

      {/* Recent brands across all clients */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Marques recentes</h2>
        <div className="space-y-3">
          {allClients
            .flatMap((c) => c.strategies.map((s) => ({ ...s, clientName: c.name })))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 8)
            .map((brand) => {
              const v = brand.advertis_vector as Record<string, number> | null;
              const composite = v ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
              return (
                <div key={brand.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{brand.name}</p>
                    <p className="text-xs text-zinc-500">{brand.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{composite.toFixed(0)}/200</p>
                    <p className="text-xs text-zinc-500">{brand.status}</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
