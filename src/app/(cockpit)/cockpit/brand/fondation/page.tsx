/**
 * /cockpit/brand/fondation — hub « Fondation » (lot 10, audit UX 2026-07-11 §B).
 *
 * Regroupe les 4 piliers fondateurs (A·D·V·E) derrière un seul item de nav :
 * les URLs piliers ne bougent pas, ce hub est la porte d'entrée founder et
 * s'allume via `activePrefixes` quand on navigue dans un pilier.
 *
 * Statuts = `notoria.getDashboard.byPillar` + `getPillarChipStatus` (source
 * unique de vérité, Phase 21 F-A.5 — interdiction de recalculer un statut).
 */

"use client";

import Link from "next/link";
import { ChevronRight, Fingerprint, Target, Tags, Users, Landmark } from "lucide-react";
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
import { MarketScaleCard } from "@/components/cockpit/market-scale-card";

const FONDATION_PILLARS: ReadonlyArray<{ key: "A" | "D" | "V" | "E"; href: string; icon: LucideIcon }> = [
  { key: "A", href: "/cockpit/brand/identity", icon: Fingerprint },
  { key: "D", href: "/cockpit/brand/positioning", icon: Target },
  { key: "V", href: "/cockpit/brand/offer", icon: Tags },
  { key: "E", href: "/cockpit/brand/engagement", icon: Users },
];

export default function FondationHubPage() {
  const strategyId = useCurrentStrategyId();
  const dashboardQuery = trpc.notoria.getDashboard.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );
  const byPillar = (dashboardQuery.data?.byPillar ?? {}) as Record<string, PillarReadinessProjection>;

  if (!strategyId) {
    return (
      <EmptyState
        icon={Landmark}
        title="Aucune marque sélectionnée"
        description="Choisissez une marque dans le sélecteur en haut de la barre latérale pour consulter sa fondation."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fondation de marque"
        description="Qui vous êtes, ce qui vous distingue, ce que vous offrez et l'expérience que vous faites vivre — la fondation sur laquelle tout le reste s'appuie."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {FONDATION_PILLARS.map(({ key, href, icon: Icon }) => {
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

      {/* ADR-0126 — déclaration de l'échelle : la fondation dit AUSSI sur quel terrain la marque joue. */}
      <MarketScaleCard strategyId={strategyId} />

      <p className="text-sm text-foreground-muted">
        Ces quatre piliers sont enrichis et tenus à jour par votre équipe UPgraders à partir de vos
        sources — les recommandations en attente vous sont présentées dans{" "}
        <Link href="/cockpit/brand/notoria" className="text-accent hover:underline">Recommandations</Link>.
      </p>
    </div>
  );
}
