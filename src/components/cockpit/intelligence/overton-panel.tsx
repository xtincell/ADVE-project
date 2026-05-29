"use client";

/**
 * <OvertonPanel /> — Cockpit-scope wrapper for `<OvertonRadar>` (Phase 23 Epic 7
 * Story 7.4, ADR-0078).
 *
 * Strict three-tier separation (architecture component boundary) :
 *   - the **route** (`/cockpit/intelligence/overton/page.tsx`) owns auth + tier guards,
 *   - **this panel** owns the data fetch + the Suspense/loading boundary + the
 *     no-strategy fallback,
 *   - the **radar** stays purely presentational (props in, pixels out) and renders
 *     its own LIVE / DEFERRED / DEGRADED states from the `ConnectorResult<T>`.
 *
 * The panel passes the resulting `ConnectorResult<OvertonRadarSignal>` straight
 * through to `<OvertonRadar instance="full" />` — it does NOT branch on connector
 * state itself (the radar owns that, Story 7.3). The boundary returns a skeleton
 * while fetching and never blocks the Cockpit shell (NFR2).
 */

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { OvertonRadar } from "@/components/neteru/overton-radar";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/primitives/skeleton";
import { Radar, Lock } from "lucide-react";

function OvertonPanelSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-5" aria-busy="true" aria-label="Chargement du radar Overton">
      <Skeleton shape="text" className="mb-4 h-5 w-40" />
      <div className="grid grid-cols-1 gap-5 @md:grid-cols-2">
        <Skeleton shape="rect" className="mx-auto h-[300px] w-[300px] max-w-full rounded-full" />
        <div className="space-y-3">
          <Skeleton shape="rect" className="h-16 w-full" />
          <Skeleton shape="rect" className="h-24 w-full" />
          <Skeleton shape="rect" className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

function OvertonPanelInner({ strategyId }: { strategyId: string }) {
  const router = useRouter();
  const { data, isLoading } = trpc.cockpitDashboard.overtonSignal.useQuery(
    { strategyId },
    { enabled: !!strategyId },
  );

  if (isLoading || !data) return <OvertonPanelSkeleton />;

  // Paid-tier gate (FR32) — server-enforced; render the upgrade CTA, not a blank.
  if (data.state === "TIER_GATE_DENIED") {
    return (
      <EmptyState
        icon={Lock}
        title="Radar Overton — réservé aux abonnements"
        description="Visualisez comment votre secteur se redéfinit autour de votre marque en activant votre abonnement."
        action={{ label: "Découvrir les formules", onClick: () => router.push(data.configureUrl) }}
      />
    );
  }

  // The radar owns every connector-state branch (Story 7.3) — pass through.
  return <OvertonRadar signal={data} instance="full" density="comfortable" />;
}

export function OvertonPanel() {
  const strategyId = useCurrentStrategyId();

  if (!strategyId) {
    return (
      <EmptyState
        icon={Radar}
        title="Aucune marque sélectionnée"
        description="Sélectionnez une marque pour visualiser son radar Overton sectoriel."
      />
    );
  }

  return (
    <Suspense fallback={<OvertonPanelSkeleton />}>
      <OvertonPanelInner strategyId={strategyId} />
    </Suspense>
  );
}

// ── Dashboard teaser (Story 7.6) ─────────────────────────────────────────────

const OVERTON_ROUTE = "/cockpit/intelligence/overton";

/**
 * Compact `<OvertonRadar instance="teaser" />` for the `/cockpit` dashboard bento.
 * Click-through to the full route ; surfaces a subtle "new activity" cue + a
 * one-line headline when the sector echoed the brand recently (Journey 3 —
 * contextual discovery). Tier-denial and degraded states render compactly with
 * the same footprint (no dashboard layout jump). Reuses the founder query.
 */
export function OvertonTeaser() {
  const strategyId = useCurrentStrategyId();
  const { data } = trpc.cockpitDashboard.overtonSignal.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  if (!strategyId || !data || data.state === "TIER_GATE_DENIED") return null;

  // "New activity" cue (MVP) — derive from the presence of dated evidence rather
  // than a per-founder last-visit tracker (deferred — see RESIDUAL-DEBT).
  const liveEvidence = data.state === "LIVE" ? data.data : null;
  const topClaim = liveEvidence?.claimImitations?.[0] ?? null;
  const hasNewActivity = !!topClaim;

  return (
    <Link
      href={OVERTON_ROUTE}
      className="group relative block rounded-xl transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Ouvrir le radar Overton sectoriel"
    >
      {hasNewActivity && (
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
          Nouveau
        </span>
      )}
      <OvertonRadar signal={data} instance="teaser" density="comfortable" />
    </Link>
  );
}
