/**
 * src/server/services/auto-promotion/metrics.ts — DB metric aggregations.
 *
 * Read-only. Used by eligibility checkers.
 *
 * Sources :
 *  - SequenceExecution table : status, qualityScore, sequenceKey, createdAt
 *  - ALL_SEQUENCES static (artemis/tools/sequences.ts) : lifecycle field DRAFT/STABLE
 *  - IntentEmission table : audit trail for promotions
 */

import { db } from "@/lib/db";
import { ALL_SEQUENCES } from "@/server/services/artemis/tools/sequences";

/** Quality threshold per ADR-0041 — qualityScore >= 0.7 = pass. */
const QUALITY_PASS_THRESHOLD = 0.7;

export interface SequenceMetrics {
  sequenceKey: string;
  /** Total executions ever recorded */
  totalExecutions: number;
  /** Executions in the last N days */
  recentExecutions: number;
  /** Quality pass rate over the last N days (0-1). Null if no executions. */
  recentQualityPassRate: number | null;
  /** Number of executions with status FAILED or qualityScore < threshold */
  recentQualityFailures: number;
  /** Static lifecycle from sequences.ts */
  staticLifecycle: "DRAFT" | "STABLE" | "DEPRECATED" | "UNKNOWN";
}

/**
 * Static lookup of sequence lifecycle from sequences.ts. Returns "UNKNOWN" if
 * the sequence is not declared (e.g., wrappers WRAP-FW-* generated dynamically
 * may not be in ALL_SEQUENCES depending on framework-wrappers.ts).
 */
function getStaticLifecycle(
  sequenceKey: string,
): "DRAFT" | "STABLE" | "DEPRECATED" | "UNKNOWN" {
  const seq = ALL_SEQUENCES.find((s) => s.key === sequenceKey);
  if (!seq) return "UNKNOWN";
  const lifecycle = (seq as { lifecycle?: unknown }).lifecycle;
  if (lifecycle === "DRAFT" || lifecycle === "STABLE" || lifecycle === "DEPRECATED") {
    return lifecycle;
  }
  return "UNKNOWN";
}

/**
 * Aggregate execution + quality metrics per sequence over a window.
 *
 * Pass = status === "COMPLETED" AND qualityScore is null OR >= 0.7.
 * Fail = status FAILED/PARTIAL OR qualityScore < 0.7.
 */
export async function getSequenceMetrics(
  sequenceKey: string,
  windowDays: number,
): Promise<SequenceMetrics> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [total, recent] = await Promise.all([
    db.sequenceExecution.count({ where: { sequenceKey } }),
    db.sequenceExecution.findMany({
      where: { sequenceKey, createdAt: { gte: windowStart } },
      select: { status: true, qualityScore: true },
    }),
  ]);

  const recentCount = recent.length;
  const recentFailures = recent.filter((e) => {
    if (e.status !== "COMPLETED") return true;
    if (e.qualityScore !== null && e.qualityScore !== undefined && e.qualityScore < QUALITY_PASS_THRESHOLD) {
      return true;
    }
    return false;
  }).length;
  const passRate = recentCount === 0 ? null : (recentCount - recentFailures) / recentCount;

  return {
    sequenceKey,
    totalExecutions: total,
    recentExecutions: recentCount,
    recentQualityPassRate: passRate,
    recentQualityFailures: recentFailures,
    staticLifecycle: getStaticLifecycle(sequenceKey),
  };
}

/**
 * Aggregate quality-gate soft-mode metrics over a window.
 * Used to evaluate the soft→hard switch eligibility (ADR-0041 §4).
 *
 * False-positive rate = warnings on STABLE sequences / total warnings.
 * STABLE sequences should NEVER trigger quality gate failure if the gate
 * is correctly calibrated.
 */
export interface QualityGateSoftMetrics {
  windowDays: number;
  totalRuns: number;
  qualityFailures: number;
  qualityFailuresOnStableSequences: number;
  /** False-positive rate = failures on STABLE sequences / total failures. Null if no failures. */
  falsePositiveRate: number | null;
}

export async function getQualityGateSoftMetrics(
  windowDays: number,
): Promise<QualityGateSoftMetrics> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [totalRuns, failed] = await Promise.all([
    db.sequenceExecution.count({ where: { createdAt: { gte: windowStart } } }),
    db.sequenceExecution.findMany({
      where: {
        createdAt: { gte: windowStart },
        OR: [
          { status: { not: "COMPLETED" } },
          { qualityScore: { lt: QUALITY_PASS_THRESHOLD } },
        ],
      },
      select: { sequenceKey: true },
    }),
  ]);

  const onStable = failed.filter((e) => getStaticLifecycle(e.sequenceKey) === "STABLE").length;
  const falsePositiveRate =
    failed.length === 0 ? null : onStable / failed.length;

  return {
    windowDays,
    totalRuns,
    qualityFailures: failed.length,
    qualityFailuresOnStableSequences: onStable,
    falsePositiveRate,
  };
}

/**
 * List all sequences with `lifecycle: "DRAFT"` from the static registry.
 * These are the candidates for DRAFT→STABLE promotion.
 */
export function listDraftSequences(): string[] {
  return ALL_SEQUENCES.filter(
    (s) => (s as { lifecycle?: unknown }).lifecycle === "DRAFT",
  ).map((s) => s.key);
}

/**
 * Count IntentEmissions of a given kind in a window. Used to track
 * promotion history (e.g., already promoted sequences shouldn't be
 * re-evaluated).
 */
export async function countIntentEmissionsInWindow(
  intentKind: string,
  windowDays: number,
): Promise<number> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  return db.intentEmission.count({
    where: { intentKind, emittedAt: { gte: windowStart } },
  });
}
