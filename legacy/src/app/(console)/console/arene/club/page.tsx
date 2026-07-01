"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Crown, Users, Star, TrendingUp } from "lucide-react";

export default function ClubPage() {
  const { data: members, isLoading } = trpc.club.list.useQuery({});

  if (isLoading) return <SkeletonPage />;

  const items = members ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Upgraded Brands Club" description="Membres du club, engagement et suivi de fidelite" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Arene" }, { label: "Club" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Membres" value={items.length} icon={Users} />
        <StatCard title="Actifs" value={items.filter((m) => (m as Record<string, unknown>).status === "ACTIVE").length} icon={Star} />
        <StatCard title="Score moyen" value="—" icon={TrendingUp} />
        <StatCard title="Renouvellements" value="—" icon={Crown} />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Crown} title="Aucun membre" description="Les membres du Upgraded Brands Club apparaitront ici une fois inscrits." />
      ) : (
        <div className="space-y-2">
          {items.map((member) => {
            const m = member as Record<string, unknown>;
            return (
              <div key={m.id as string} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card-hover">
                <div>
                  <p className="text-sm font-medium text-foreground">{(m.name as string) ?? (m.strategyId as string) ?? "Membre"}</p>
                  <p className="text-xs text-foreground-muted">{m.createdAt ? new Date(m.createdAt as string).toLocaleDateString("fr-FR") : ""}</p>
                </div>
                <StatusBadge status={(m.status as string) ?? "active"} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
