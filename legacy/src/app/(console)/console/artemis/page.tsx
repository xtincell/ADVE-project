"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Target, Network, Lock, Trophy, Megaphone, Crosshair } from "lucide-react";
import Link from "next/link";

export default function ArtemisDashboardPage() {
  const sections = [
    { href: "/console/artemis/skill-tree", label: "Skill Tree", desc: "40 sequences, 6 tiers, combos et prerequis", icon: Network },
    { href: "/console/artemis/vault", label: "Vault", desc: "Review, accepte ou rejette les outputs de sequences", icon: Lock },
    { href: "/console/artemis/tools", label: "Outils GLORY", desc: "46 outils creatifs organises par layer", icon: Trophy },
    { href: "/console/artemis/missions", label: "Missions", desc: "Missions de production en cours", icon: Crosshair },
    { href: "/console/artemis/campaigns", label: "Campagnes", desc: "Campagnes actives et planifiees", icon: Megaphone },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Artemis"
        description="Neter du Protocole — Skill Tree, Vault, outils GLORY, missions, campagnes"
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Artemis" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Sequences" value={40} icon={Network} />
        <StatCard title="Outils GLORY" value={46} icon={Trophy} />
        <StatCard title="Tiers" value={6} icon={Target} />
        <StatCard title="En attente" value="—" icon={Lock} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl border border-border bg-card p-6 transition-all hover:bg-card-hover">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{ backgroundColor: "var(--color-division-artemis-subtle)" }}>
                <s.icon className="h-5 w-5" style={{ color: "var(--color-division-artemis)" }} />
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
