"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Users, Briefcase, ClipboardCheck, GraduationCap, Award } from "lucide-react";
import Link from "next/link";

export default function ImhotepDashboardPage() {
  const { data, isLoading } = trpc.imhotep.dashboard.useQuery();

  if (isLoading) return <SkeletonPage />;

  const sections = [
    {
      href: "/console/arene/matching",
      label: "Matching Talent ↔ Mission",
      desc: "Top candidates pour missions actives via Imhotep orchestrator",
      icon: Users,
    },
    {
      href: "/console/arene/orgs",
      label: "Crew Programs",
      desc: "Composition d'équipes pluri-rôles et budget gates",
      icon: Briefcase,
    },
    {
      href: "/console/arene/club",
      label: "Tier Promotion",
      desc: "Évaluations PROMOTE/HOLD/DEMOTE par creator",
      icon: Award,
    },
    {
      href: "/console/academie",
      label: "Académie Formation",
      desc: "Enrollments cours + recommandations skill-gap",
      icon: GraduationCap,
    },
    {
      href: "/console/academie/certifications",
      label: "Certifications",
      desc: "Badges + credentials délivrés par catégorie",
      icon: ClipboardCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imhotep"
        description="6ème Neter — Crew Programs (Ground Tier #6). Master of matching talent, formation Académie, qc-routing. Orchestre matching-engine, talent-engine, team-allocator, tier-evaluator, qc-router."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Imhotep" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Talents" value={data?.totalTalents ?? "—"} icon={Users} />
        <StatCard title="Missions actives" value={data?.activeMissions ?? "—"} icon={Briefcase} />
        <StatCard title="QC backlog" value={data?.pendingReviews ?? "—"} icon={ClipboardCheck} />
        <StatCard title="Enrollments" value={data?.activeEnrollments ?? "—"} icon={GraduationCap} />
        <StatCard title="Certifs (30j)" value={data?.certificationsLast30d ?? "—"} icon={Award} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:bg-card-hover"
          >
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2"
                style={{ backgroundColor: "var(--color-division-imhotep-subtle, var(--color-bg-subtle))" }}
              >
                <s.icon
                  className="h-5 w-5"
                  style={{ color: "var(--color-division-imhotep, var(--color-fg-default))" }}
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
                <p className="text-xs text-foreground-muted">{s.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground-muted">
        <p>
          <strong className="text-foreground">Phase 14 active</strong> — Imhotep est le 6ème Neter actif. Cap APOGEE 7
          atteint avec Anubis (7ème). Cf.{" "}
          <Link href="/console/governance/intents" className="underline hover:text-foreground">
            ADR-0019
          </Link>{" "}
          (supersedes ADR-0017 stub Phase 13).
        </p>
      </div>
    </div>
  );
}
