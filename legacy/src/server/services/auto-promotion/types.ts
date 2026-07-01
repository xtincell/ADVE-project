/**
 * src/server/services/auto-promotion/types.ts — public types.
 *
 * Layer 3 (server/services).
 */

export type LockedItemKind =
  | "SEQUENCE_DRAFT_TO_STABLE"
  | "WRAPPER_DRAFT_TO_STABLE"
  | "QUALITY_GATE_SOFT_TO_HARD";

export type QualityGateMode = "SOFT" | "HARD";

export interface EligibilityResult {
  itemKind: LockedItemKind;
  /** Identifier (sequenceKey for sequences/wrappers, "global" for quality-gate) */
  itemId: string;
  eligible: boolean;
  reasons: string[];
  /** Numeric metrics evaluated (for audit) */
  metrics: Record<string, number | string | boolean>;
  /** Anchor date used for time-based conditions */
  anchorDate?: string;
  /** Earliest possible date (per ADR) for this item to be eligible */
  earliestEligibleAt?: string;
}

export interface PromotionDecision {
  evaluation: EligibilityResult;
  action: "PROMOTE" | "SKIP" | "WAIT";
  reason: string;
  /** Intent emitted (if action === "PROMOTE") */
  emittedIntentId?: string;
}

export interface AutoPromotionRunResult {
  startedAt: string;
  completedAt: string;
  totalEvaluated: number;
  totalPromoted: number;
  totalSkipped: number;
  totalWaiting: number;
  decisions: PromotionDecision[];
  /** Set to true if dry-run (no Intents actually emitted) */
  dryRun: boolean;
}

/**
 * Anchor dates per ADR — used to compute D+N eligibility.
 *
 * SOURCES :
 *  - Mégasprint Phase 17a (ADR-0040 + ADR-0041 + ADR-0042) : 2026-05-04
 *  - Quality gate soft mode wiring : depends on actual wiring date
 *    (read from IntentEmission of TOGGLE_QUALITY_GATE_MODE first emission,
 *    OR from env QUALITY_GATE_SOFT_WIRED_AT, OR fallback to 2026-05-06).
 */
export const ANCHOR_DATES = {
  PHASE_17A_MEGASPRINT_MERGE: "2026-05-04T00:00:00Z",
} as const;

export const ELIGIBILITY_WINDOWS = {
  SEQUENCE_DRAFT_TO_STABLE_DAYS: 30,
  WRAPPER_DRAFT_TO_STABLE_DAYS: 30,
  QUALITY_GATE_SOFT_TO_HARD_DAYS: 7,
} as const;

export const CYCLE_THRESHOLDS = {
  /** Min number of real executions per sequence before STABLE eligible (ADR-0040 §Conséquences) */
  SEQUENCE_MIN_EXECUTIONS: 50,
  /** Min quality-gate pass rate (0-1) on the last 7 days for sequences (ADR-0041 §4) */
  SEQUENCE_MIN_QUALITY_PASS_RATE: 1.0,
  /** Window over which to evaluate quality pass rate */
  SEQUENCE_QUALITY_WINDOW_DAYS: 7,
  /** Max acceptable false-positive rate for quality-gate hard switch (ADR-0041 §4) */
  QUALITY_GATE_MAX_FALSE_POSITIVE_RATE: 0.01,
} as const;
