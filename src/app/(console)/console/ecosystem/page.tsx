import { PILLAR_STORAGE_KEYS } from "@/domain";

"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Building2, Users, BarChart3, Globe } from "lucide-react";
import Link from "next/link";

export default function EcosystemPage() {
  const { data: strategies, isLoading: ls } = trpc.strategy.list.useQuery({});
  const { data: guildStats, isLoading: lg } = trpc.guilde.getStats.useQuery();

  if (ls || lg) return <SkeletonPage />;

  const allStrategies = strategies ?? [];
  const active = allStrategies.filter((s) => s.status === "ACTIVE");
  const totalGuild = guildStats?.total ?? 0;

  // Compute average score
  const scores = active.map((s) => {
    const v = s.advertis_vector as Record<string, number> | null;
    return v ? [...PILLAR_STORAGE_KEYS].reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
  });
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const sections = [
    { href: "/console/ecosystem/operators", label: "Operateurs", desc: "Gestion des operateurs licencies", icon: Building2 },
    { href: "/console/ecosystem/metrics", label: "Metriques", desc: "Volume transactionnel et croissance", icon: BarChart3 },
    { href: "/console/ecosystem/scoring", label: "Score /200", desc: "Le standard de mesure comme produit", icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Ecosysteme" description="Vue transversale — operateurs, metriques et scoring comme standard" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Ecosysteme" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Brand Instances" value={active.length} icon={Building2} />
        <StatCard title="Creatifs" value={totalGuild} icon={Users} />
        <StatCard title="Score moyen /200" value={`${avgScore}/200`} icon={BarChart3} />
        <StatCard title="Operateurs" value={1} icon={Globe} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl border border-border bg-card p-6 transition-all hover:bg-card-hover">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-subtle p-2"><s.icon className="h-5 w-5 text-primary" /></div>
              <div><h3 className="text-sm font-semibold text-foreground">{s.label}</h3><p className="text-xs text-foreground-muted">{s.desc}</p></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
