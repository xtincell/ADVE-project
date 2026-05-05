"use client";

/**
 * /cockpit/insights/apogee-maintenance — visibilité Loi 4 pour brands ICONE.
 * Phase 16-bis (ADR-0051 — anciennement ADR-0038) — auto-correction du drift APOGEE §13 :
 *   « UI — `<ApogeeMaintenanceDashboard>` (à venir P5+) ». Plus à venir.
 *
 * APOGEE compliance :
 *   - Sous-système : Telemetry (Mission #3) — observation des sentinels
 *   - Loi 4 (Maintien masse en orbite) — convertit l'exécution mécanique
 *     du cron `/api/cron/sentinels` en confiance pilote founder.
 */

import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { ApogeeMaintenanceDashboard } from "@/components/neteru";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

const SENTINEL_KINDS = ["MAINTAIN_APOGEE", "DEFEND_OVERTON", "EXPAND_TO_ADJACENT_SECTOR"] as const;

type SentinelKind = (typeof SENTINEL_KINDS)[number];

interface SentinelRow {
  id: string;
  intentKind: string;
  status: string;
  emittedAt: Date | string;
  completedAt: Date | string | null;
  result: unknown;
}

function pickSummary(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as { summary?: unknown };
  return typeof r.summary === "string" ? r.summary : null;
}

function pickDriftDetected(result: unknown): boolean | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as { summary?: unknown };
  if (typeof r.summary !== "string") return undefined;
  // MAINTAIN_APOGEE handler embeds "drift=<n>" in its summary string.
  const m = r.summary.match(/drift=(-?\d+(?:\.\d+)?)/);
  if (!m || !m[1]) return undefined;
  const drift = Number(m[1]);
  return Number.isFinite(drift) && drift < -5;
}

export default function ApogeeMaintenancePage() {
  const strategyId = useCurrentStrategyId();

  const { data, isLoading } = trpc.governance.listRecentSentinels.useQuery(
    { strategyId: strategyId ?? "", sinceDays: 60, limit: 30 },
    { enabled: Boolean(strategyId) },
  );

  if (!strategyId || isLoading) return <SkeletonPage />;

  const rows = (data?.emissions ?? []) as SentinelRow[];
  const composite =
    typeof data?.compositeScore === "number" ? data.compositeScore : 0;

  const runs = rows
    .filter((r) => SENTINEL_KINDS.includes(r.intentKind as SentinelKind))
    .map((r) => ({
      intentId: r.id,
      kind: r.intentKind as SentinelKind,
      status: (r.status as "PENDING" | "OK" | "FAILED") ?? "PENDING",
      emittedAt:
        r.emittedAt instanceof Date ? r.emittedAt.toISOString() : String(r.emittedAt),
      completedAt: r.completedAt
        ? r.completedAt instanceof Date
          ? r.completedAt.toISOString()
          : String(r.completedAt)
        : null,
      summary: pickSummary(r.result),
      driftDetected: pickDriftDetected(r.result),
    }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        title="Maintien d'apogée"
        description="Loi 4 APOGEE — trois sentinels défendent la masse en orbite. Cette page rend leurs runs visibles."
      />
      <ApogeeMaintenanceDashboard
        strategyId={strategyId}
        composite={composite}
        runs={runs}
      />
    </div>
  );
}
