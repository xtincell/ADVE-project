"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Megaphone, Radio, Target, CalendarClock, BookOpen } from "lucide-react";
import Link from "next/link";

export default function AnubisDashboardPage() {
  const sections = [
    { href: "/console/comms/broadcast", label: "Broadcast", desc: "Fan-out cohorte (ALL_USERS_OPERATOR ou segment) sur un canal", icon: Megaphone },
    { href: "/console/comms/ad-launcher", label: "Ad Launcher", desc: "Campagnes paid Meta/Google/TikTok/X — gate cost_per_superfan", icon: Target },
    { href: "/console/comms/drop-scheduler", label: "Drop Scheduler", desc: "Drop coordonné multi-canaux pour une campagne", icon: CalendarClock },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Anubis — Comms"
        description="7ème Neter (ADR-0011) — Master of Comms. Dispatch, broadcast, paid media, social, drops."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Comms" }]}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl border border-border bg-card p-6 transition-all hover:bg-card-hover">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-purple-500/10">
                <s.icon className="h-5 w-5 text-purple-500" />
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
            <p className="text-foreground font-medium">Téléologie ADR-0011 §3</p>
            <p className="mt-1">KPI primaire = <code>cost_per_superfan_recruited</code>, pas reach/CTR/CPM/CPC. Thot vetoe une campagne si projected cost &gt; 2× benchmark sectoriel. Sans cet ancrage, Anubis optimiserait pour la diffusion brute — pas pour l'accumulation de superfans.</p>
            <p className="mt-1"><Radio className="inline h-3 w-3 mr-1" />Pre-flight gates : OAuth scope active · audience targeting valid · manipulation coherence · cost_per_superfan ≤ 2× benchmark.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
