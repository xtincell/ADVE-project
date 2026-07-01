"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { ShoppingBag, DollarSign, Package, TrendingUp } from "lucide-react";

export default function BoutiquePage() {
  const { data: items, isLoading } = trpc.boutique.listItems.useQuery({});

  if (isLoading) return <SkeletonPage />;

  const allItems = items ?? [];
  const active = allItems.filter((i) => (i as Record<string, unknown>).isActive !== false);
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  return (
    <div className="space-y-6">
      <PageHeader title="Boutique" description="Playbooks, templates et ventes — canal de distribution ADVE" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Academie", href: "/console/academie" }, { label: "Boutique" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Articles" value={allItems.length} icon={Package} />
        <StatCard title="Actifs" value={active.length} icon={ShoppingBag} />
        <StatCard title="Revenus" value="—" icon={DollarSign} />
        <StatCard title="Tendance" value="—" icon={TrendingUp} />
      </div>

      {allItems.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Aucun article" description="Ajoutez des playbooks, templates ou formations a la boutique." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allItems.map((item) => {
            const i = item as Record<string, unknown>;
            return (
              <div key={i.id as string} className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-card-hover">
                <p className="text-sm font-semibold text-foreground">{i.name as string}</p>
                <p className="mt-1 text-xs text-foreground-muted">{(i.description as string) ?? (i.category as string) ?? ""}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{fmt((i.price as number) ?? 0)} {(i.currency as string) ?? "XAF"}</span>
                  <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-xs text-primary">{(i.category as string) ?? "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
