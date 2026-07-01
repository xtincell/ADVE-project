"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Brain, GitPullRequest, Lightbulb, Zap } from "lucide-react";
import Link from "next/link";

export default function MestorDashboardPage() {
  const { data: strategies, isLoading } = trpc.strategy.list.useQuery({});

  if (isLoading) return <SkeletonPage />;

  const active = strategies?.filter((s) => s.status === "ACTIVE") ?? [];

  const sections = [
    { href: "/console/mestor/plans", label: "Plans d'Orchestration", desc: "Build, execute et resume les plans RTIS + GLORY", icon: GitPullRequest },
    { href: "/console/mestor/recos", label: "Recommandations", desc: "Review et accepte les recommandations ADVE du Commandant", icon: Lightbulb },
    { href: "/console/mestor/insights", label: "Insights Proactifs", desc: "Alertes et opportunites detectees par le swarm", icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mestor"
        description="Neter de la Decision — swarm LLM, orchestration, recommandations, insights proactifs"
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Mestor" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Strategies actives" value={active.length} icon={Brain} />
        <StatCard title="Plans en cours" value="—" icon={GitPullRequest} />
        <StatCard title="Recos en attente" value="—" icon={Lightbulb} />
        <StatCard title="Insights" value="—" icon={Zap} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl border border-border bg-card p-6 transition-all hover:bg-card-hover">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{ backgroundColor: "var(--color-division-mestor-subtle)" }}>
                <s.icon className="h-5 w-5" style={{ color: "var(--color-division-mestor)" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
                <p className="text-xs text-foreground-muted">{s.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
