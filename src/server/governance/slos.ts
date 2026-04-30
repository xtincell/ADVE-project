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

  // Phase 3 — Mestor v1 missing
  { kind: "BUILD_PLAN", p95LatencyMs: 5_000, errorRatePct: 0.02, costP95Usd: 0.05 },
  { kind: "APPLY_RECOMMENDATIONS", p95LatencyMs: 5_000, errorRatePct: 0.02, costP95Usd: 0.05 },
  { kind: "CORRECT_INTENT", p95LatencyMs: 200, errorRatePct: 0.001, costP95Usd: 0 },

  // Tier transitions (palier ZOMBIE → ICONE)
  { kind: "PROMOTE_ZOMBIE_TO_FRAGILE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0.02 },
  { kind: "PROMOTE_FRAGILE_TO_ORDINAIRE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0.02 },
  { kind: "PROMOTE_ORDINAIRE_TO_FORTE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0.02 },
  { kind: "PROMOTE_FORTE_TO_CULTE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0.02 },
  { kind: "PROMOTE_CULTE_TO_ICONE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0.02 },
  // Compensating demotions
  { kind: "DEMOTE_FRAGILE_TO_ZOMBIE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0 },
  { kind: "DEMOTE_ORDINAIRE_TO_FRAGILE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0 },
  { kind: "DEMOTE_FORTE_TO_ORDINAIRE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0 },
  { kind: "DEMOTE_CULTE_TO_FORTE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0 },
  { kind: "DEMOTE_ICONE_TO_CULTE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0 },

  // Sentinel intents (Loi 4 régime apogée)
  { kind: "MAINTAIN_APOGEE", p95LatencyMs: 30_000, errorRatePct: 0.05, costP95Usd: 0.5 },
  { kind: "DEFEND_OVERTON", p95LatencyMs: 30_000, errorRatePct: 0.05, costP95Usd: 0.3 },
  { kind: "EXPAND_TO_ADJACENT_SECTOR", p95LatencyMs: 60_000, errorRatePct: 0.07, costP95Usd: 1.0 },

  // Funnel (free showcase → paywalled)
  { kind: "DEDUCE_ADVE_FROM_OFFER", p95LatencyMs: 8_000, errorRatePct: 0.04, costP95Usd: 0.05 },
  { kind: "EXPORT_RTIS_PDF", p95LatencyMs: 30_000, errorRatePct: 0.03, costP95Usd: 0.2 },
  { kind: "ACTIVATE_RETAINER", p95LatencyMs: 500, errorRatePct: 0.001, costP95Usd: 0 },

  // Compensating intents (rollbacks)
  { kind: "ROLLBACK_PILLAR", p95LatencyMs: 1_500, errorRatePct: 0.01, costP95Usd: 0 },
  { kind: "ROLLBACK_ADVE", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0 },
  { kind: "ROLLBACK_RTIS_CASCADE", p95LatencyMs: 3_000, errorRatePct: 0.02, costP95Usd: 0 },
  { kind: "DISCARD_RECOMMENDATIONS", p95LatencyMs: 500, errorRatePct: 0.01, costP95Usd: 0 },
  { kind: "REVERT_RECOMMENDATIONS", p95LatencyMs: 2_000, errorRatePct: 0.02, costP95Usd: 0 },

  // Plugin extension
  { kind: "COMPUTE_LOYALTY_SCORE", p95LatencyMs: 1_000, errorRatePct: 0.02, costP95Usd: 0 },

  // Governance
  { kind: "UPDATE_MODEL_POLICY", p95LatencyMs: 500, errorRatePct: 0.001, costP95Usd: 0 },
  { kind: "LEGACY_MUTATION", p95LatencyMs: 5_000, errorRatePct: 0.05, costP95Usd: 0 },

  // Phase 9 — Ptah Forge (ADR-0009)
  // p95 = task création synchrone (forge complète arrive plus tard via webhook).
  { kind: "PTAH_MATERIALIZE_BRIEF", p95LatencyMs: 5_000, errorRatePct: 0.05, costP95Usd: 0.5 },
  { kind: "PTAH_RECONCILE_TASK", p95LatencyMs: 30_000, errorRatePct: 0.03, costP95Usd: 0 },
  { kind: "PTAH_REGENERATE_FADING_ASSET", p95LatencyMs: 10_000, errorRatePct: 0.05, costP95Usd: 0.5 },

  // Phase 10 — Brand Vault state machine (ADR-0012)
  { kind: "SELECT_BRAND_ASSET", p95LatencyMs: 500, errorRatePct: 0.01, costP95Usd: 0 },
  { kind: "PROMOTE_BRAND_ASSET_TO_ACTIVE", p95LatencyMs: 500, errorRatePct: 0.01, costP95Usd: 0 },
  { kind: "SUPERSEDE_BRAND_ASSET", p95LatencyMs: 1_000, errorRatePct: 0.02, costP95Usd: 0 },
  { kind: "ARCHIVE_BRAND_ASSET", p95LatencyMs: 500, errorRatePct: 0.01, costP95Usd: 0 },

  // Phase 11 — Error Vault (observabilité runtime)
  { kind: "CAPTURE_ERROR_EVENT", p95LatencyMs: 200, errorRatePct: 0.001, costP95Usd: 0 },
  { kind: "RESOLVE_ERROR_EVENT", p95LatencyMs: 300, errorRatePct: 0.001, costP95Usd: 0 },
];

export const SLO_BY_KIND = new Map(INTENT_SLOS.map((s) => [s.kind, s]));
