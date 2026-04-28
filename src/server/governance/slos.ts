/**
 * src/server/governance/slos.ts — SLO catalog (Phase 6).
 *
 * Layer 2.
 *
 * One entry per Intent kind. Used by `slo-check` (CI weekly + dashboard).
 * Numbers are starting targets — tightened as performance work lands.
 */

export interface IntentSlo {
  readonly kind: string;
  /** 95th percentile latency target in milliseconds. */
  readonly p95LatencyMs: number;
  /** Acceptable error rate (0..1). */
  readonly errorRatePct: number;
  /** 95th percentile cost in USD. */
  readonly costP95Usd: number;
}

export const INTENT_SLOS: readonly IntentSlo[] = [
  { kind: "FILL_ADVE", p95LatencyMs: 25_000, errorRatePct: 0.03, costP95Usd: 0.25 },
  { kind: "RUN_RTIS_CASCADE", p95LatencyMs: 45_000, errorRatePct: 0.05, costP95Usd: 0.6 },
  { kind: "GENERATE_RECOMMENDATIONS", p95LatencyMs: 20_000, errorRatePct: 0.02, costP95Usd: 0.2 },
  { kind: "RANK_PEERS", p95LatencyMs: 1_500, errorRatePct: 0.01, costP95Usd: 0.005 },
  { kind: "SEARCH_BRAND_CONTEXT", p95LatencyMs: 1_200, errorRatePct: 0.01, costP95Usd: 0.005 },
  { kind: "JEHUTY_FEED_REFRESH", p95LatencyMs: 2_500, errorRatePct: 0.02, costP95Usd: 0.01 },
  { kind: "JEHUTY_CURATE", p95LatencyMs: 800, errorRatePct: 0.01, costP95Usd: 0 },
  { kind: "HYPERVISEUR_PEER_INSIGHTS", p95LatencyMs: 2_500, errorRatePct: 0.02, costP95Usd: 0.02 },
  { kind: "LIFT_INTAKE_TO_STRATEGY", p95LatencyMs: 60_000, errorRatePct: 0.05, costP95Usd: 0.5 },
  { kind: "ENRICH_ORACLE", p95LatencyMs: 60_000, errorRatePct: 0.05, costP95Usd: 0.8 },
  { kind: "EXPORT_ORACLE", p95LatencyMs: 45_000, errorRatePct: 0.02, costP95Usd: 0.4 },
  { kind: "INVOKE_GLORY_TOOL", p95LatencyMs: 15_000, errorRatePct: 0.04, costP95Usd: 0.1 },
  { kind: "EXECUTE_GLORY_SEQUENCE", p95LatencyMs: 90_000, errorRatePct: 0.05, costP95Usd: 1.5 },
  { kind: "SCORE_PILLAR", p95LatencyMs: 1_500, errorRatePct: 0.01, costP95Usd: 0.01 },
  { kind: "WRITE_PILLAR", p95LatencyMs: 1_200, errorRatePct: 0.01, costP95Usd: 0.005 },
  { kind: "CHECK_CAPACITY", p95LatencyMs: 100, errorRatePct: 0.001, costP95Usd: 0 },
  { kind: "RECORD_COST", p95LatencyMs: 100, errorRatePct: 0.001, costP95Usd: 0 },
  { kind: "VETO_INTENT", p95LatencyMs: 100, errorRatePct: 0.001, costP95Usd: 0 },
  { kind: "RUN_QUICK_INTAKE", p95LatencyMs: 30_000, errorRatePct: 0.04, costP95Usd: 0.15 },
  { kind: "RUN_BOOT_SEQUENCE", p95LatencyMs: 90_000, errorRatePct: 0.05, costP95Usd: 1.0 },
];

export const SLO_BY_KIND = new Map(INTENT_SLOS.map((s) => [s.kind, s]));
