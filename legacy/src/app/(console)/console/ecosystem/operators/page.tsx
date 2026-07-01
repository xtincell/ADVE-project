"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Building2, Users, Crown, Shield } from "lucide-react";

export default function OperatorsPage() {
  const { data: operators, isLoading } = trpc.operator.list.useQuery();

  if (isLoading) return <SkeletonPage />;

  const items = operators ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Operateurs licencies" description="Gestion des operateurs du reseau LaFusee (V1: UPgraders uniquement)" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Ecosysteme", href: "/console/ecosystem" }, { label: "Operateurs" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Operateurs" value={items.length} icon={Building2} />
        <StatCard title="Actifs" value={items.length} icon={Shield} />
        <StatCard title="Marques gerees" value="—" icon={Users} />
        <StatCard title="Tier max" value="—" icon={Crown} />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Building2} title="Aucun operateur" description="Les operateurs licencies du reseau apparaitront ici." />
      ) : (
        <div className="space-y-2">
          {items.map((op) => (
            <div key={op.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{op.name}</p>
                <p className="text-xs text-foreground-muted">Max marques: {op.maxBrands ?? "—"} · Commission: {((op.commissionRate ?? 0) * 100).toFixed(0)}%</p>
              </div>
              <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-xs text-primary">Actif</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
