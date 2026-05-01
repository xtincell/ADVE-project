"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Users, UsersRound, GraduationCap, BookOpen } from "lucide-react";
import Link from "next/link";

export default function ImhotepDashboardPage() {
  const sections = [
    { href: "/console/crew/matching", label: "Matching Creator", desc: "Top-N candidats pondérés devotion-potential pour une mission", icon: Users },
    { href: "/console/crew/team-builder", label: "Team Builder", desc: "Composer une équipe multi-bucket × manipulation modes", icon: UsersRound },
    { href: "/console/crew/training", label: "Training Recos", desc: "Suggestions Académie selon les gaps des reviews", icon: GraduationCap },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Imhotep — Crew Programs"
        description="6ème Neter (ADR-0010) — Master of Crew. Matching basé sur devotion-potential, composition, tier, QC, training."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Crew" }]}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl border border-border bg-card p-6 transition-all hover:bg-card-hover">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-amber-500/10">
                <s.icon className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
                <p className="text-xs text-foreground-muted">{s.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 mt-0.5 text-foreground-muted" />
          <div className="text-sm text-foreground-muted">
            <p className="text-foreground font-medium">Téléologie ADR-0010 §3</p>
            <p className="mt-1">Matching prioritise devotion-footprint sectoriel + manipulation strengths, pas CV brut. Sans cet ancrage, Imhotep matcherait sur des compétences — pas sur la capacité à recruter des superfans.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
