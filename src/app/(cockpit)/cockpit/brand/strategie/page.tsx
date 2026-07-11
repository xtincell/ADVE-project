/**
 * /cockpit/brand/strategie — hub « Stratégie » (lot 10, audit UX 2026-07-11 §B).
 *
 * Regroupe les 4 piliers dérivés (R·T·I·S) derrière un seul item de nav —
 * du diagnostic au plan. Les URLs piliers ne bougent pas ; l'alias legacy
 * `/cockpit/brand/strategy` (308) pointe désormais ici.
 *
 * Statuts = `notoria.getDashboard.byPillar` + `getPillarChipStatus` (source
 * unique de vérité, Phase 21 F-A.5 — interdiction de recalculer un statut).
 */

"use client";

import Link from "next/link";
import { ChevronRight, Shield, TrendingUp, Rocket, Route, Compass } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PILLAR_METADATA } from "@/domain";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getPillarChipStatus,
  type PillarReadinessProjection,
} from "@/components/cockpit/notoria/lib/pillar-chip-status";

const STRATEGIE_PILLARS: ReadonlyArray<{ key: "R" | "T" | "I" | "S"; href: string; icon: LucideIcon }> = [
  { key: "R", href: "/cockpit/brand/diagnostic", icon: Shield },
  { key: "T", href: "/cockpit/brand/market", icon: TrendingUp },
  { key: "I", href: "/cockpit/brand/potential", icon: Rocket },
  { key: "S", href: "/cockpit/brand/roadmap", icon: Route },
];

export default function StrategieHubPage() {
  const strategyId = useCurrentStrategyId();
  const dashboardQuery = trpc.notoria.getDashboard.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );
  const byPillar = (dashboardQuery.data?.byPillar ?? {}) as Record<string, PillarReadinessProjection>;

  if (!strategyId) {
    return (
      <EmptyState
        icon={Compass}
        title="Aucune marque sélectionnée"
        description="Choisissez une marque dans le sélecteur en haut de la barre latérale pour consulter sa stratégie."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stratégie"
        description="Votre diagnostic, la réalité de votre marché, vos pistes d'innovation et votre plan — dérivés de votre fondation et tenus à jour par votre équipe."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {STRATEGIE_PILLARS.map(({ key, href, icon: Icon }) => {
          const meta = PILLAR_METADATA[key];
          const projection = byPillar[key];
          const chip = projection ? getPillarChipStatus(projection) : null;
          return (
            <Link
              key={key}
              href={href}
              className="group flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-background-raised p-5 transition-colors hover:border-accent/40"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background-overlay">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <span className="truncate">{meta.displayName}</span>
                    <span className="rounded-md bg-background-overlay px-1.5 py-0.5 text-2xs font-medium text-foreground-muted">{key}</span>
                  </p>
                  <p className="truncate text-sm text-foreground-secondary">{meta.role}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {dashboardQuery.isLoading ? (
                  <span className="h-5 w-16 animate-pulse rounded-full bg-background-overlay" />
                ) : chip ? (
                  <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${chip.className}`}>{chip.label}</span>
                ) : null}
                <ChevronRight className="h-4 w-4 text-foreground-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-foreground-muted">
        Cette stratégie se nourrit de votre veille (<Link href="/cockpit/brand/jehuty" className="text-accent hover:underline">La Gazette</Link>)
        et des <Link href="/cockpit/brand/notoria" className="text-accent hover:underline">Recommandations</Link> validées avec votre équipe.
      </p>
    </div>
  );
}
