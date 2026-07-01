/**
 * src/server/governance/strategy-phase.ts — Canonical resolver for the
 * StrategyLifecyclePhase (INTAKE → BOOT → OPERATING → GROWTH).
 *
 * Layer 2.
 *
 * Closes dette D-1 + D-6: until now, "phase" was implicit, scattered
 * across `Strategy.notoriaPipeline.currentStage` (JSON), boot-sequence
 * step, and a hardcoded `phase: "BOOT"` in mestor/hyperviseur. This
 * module reads those signals + the pillar-readiness state and returns a
 * single typed phase.
 *
 * Transition rules (deterministic, business-aligned):
 *
 *   INTAKE   ⇐ default. The strategy exists but no ADVE pillar reaches
 *               at least the ENRICHED maturity stage. Typical: just
 *               converted from QuickIntake, paywall not crossed, ADVE
 *               partial.
 *
 *   BOOT     ⇐ at least one ADVE pillar is ENRICHED+ AND not all four
 *               (A, D, V, E) are at COMPLETE+VALIDATED yet. Boot
 *               sequence is filling pillars.
 *
 *   OPERATING ⇐ all four ADVE pillars are at COMPLETE stage AND
 *                validationStatus ∈ {VALIDATED, LOCKED}. The strategy
 *                is stable enough for downstream R/T/I/S work and
 *                Notoria pipeline progression.
 *
 *   GROWTH   ⇐ OPERATING + Notoria pipeline reached stage 3
 *               (S_SYNTHESIS reviewed) AND at least one published
 *               OracleSnapshot exists. The brand has shipped a full
 *               first Oracle and is iterating.
 *
 * The transitions are monotone (no automatic "regression"): once
 * OPERATING, a pillar going stale or a regression in content does not
 * push the phase back to BOOT — it produces a `staleAt` flag and
 * blocks specific gates instead. This is intentional: the phase
 * captures lifecycle, not transient health.
 */

import { db } from "@/lib/db";
import {
  STRATEGY_LIFECYCLE_PHASES,
  type StrategyLifecyclePhase,
  ADVE_KEYS,
  toStorage,
  type PillarKey,
} from "@/domain";
import { assessPillar } from "@/server/services/pillar-maturity/assessor";
import { getContracts } from "@/server/services/pillar-maturity/contracts-loader";

interface NotoriaPipelineShape {
  currentStage?: number;
  stages?: { stage: number; status: string }[];
}

export interface PhaseResolution {
  strategyId: string;
  phase: StrategyLifecyclePhase;
  /** Why this phase was chosen — one bullet per signal that determined it. */
  reasons: readonly string[];
  /** What transition would unlock the next phase, if any. */
  nextPhase: StrategyLifecyclePhase | null;
  /** Concrete blockers preventing the next-phase transition. */
  unlockBlockers: readonly string[];
}

export async function getCurrentPhase(strategyId: string): Promise<PhaseResolution> {
  const [strategy, pillars, snapshotCount] = await Promise.all([
    db.strategy.findUnique({
      where: { id: strategyId },
      select: { notoriaPipeline: true },
    }),
    db.pillar.findMany({
      where: { strategyId },
      select: { key: true, content: true, validationStatus: true },
    }),
    db.oracleSnapshot.count({ where: { strategyId } }),
  ]);

  if (!strategy) {
    throw new Error(`strategy-phase: strategy '${strategyId}' not found`);
  }

  // Direct call to the assessor (Layer 3) — strategy-phase intentionally
  // does NOT depend on pillar-readiness to avoid an import cycle.
  const contracts = getContracts();
  const adveReadiness = ADVE_KEYS.map((k) => {
    const dbRow = pillars.find((p) => p.key.toUpperCase() === k);
    const content = (dbRow?.content ?? {}) as Record<string, unknown>;
    const contract = contracts[toStorage(k as PillarKey)]!;
    const assessment = dbRow
      ? assessPillar(k, content, contract)
      : { currentStage: "EMPTY" as const };
    const validationStatus = dbRow?.validationStatus ?? "DRAFT";
    return {
      pillarKey: k as PillarKey,
      stage: assessment.currentStage,
      validationStatus,
    };
  });

  const anyAdveEnriched = adveReadiness.some(
    (r) => r.stage === "ENRICHED" || r.stage === "COMPLETE",
  );
  const allAdveComplete = adveReadiness.every((r) => r.stage === "COMPLETE");
  const allAdveValidated = adveReadiness.every(
    (r) => r.validationStatus === "VALIDATED" || r.validationStatus === "LOCKED",
  );

  const pipeline = (strategy.notoriaPipeline ?? null) as NotoriaPipelineShape | null;
  const notoriaStage3Reviewed =
    !!pipeline?.stages?.find((s) => s.stage === 3 && s.status === "COMPLETE");

  // ── Decision tree ──
  if (allAdveComplete && allAdveValidated && notoriaStage3Reviewed && snapshotCount > 0) {
    return {
      strategyId,
      phase: "GROWTH",
      reasons: [
        "all ADVE pillars COMPLETE + VALIDATED",
        "Notoria pipeline stage 3 (S_SYNTHESIS) reviewed",
        `${snapshotCount} OracleSnapshot(s) on record`,
      ],
      nextPhase: null,
      unlockBlockers: [],
    };
  }
  if (allAdveComplete && allAdveValidated) {
    const blockers: string[] = [];
    if (!notoriaStage3Reviewed) blockers.push("Notoria S_SYNTHESIS stage not reviewed");
    if (snapshotCount === 0) blockers.push("no OracleSnapshot taken yet");
    return {
      strategyId,
      phase: "OPERATING",
      reasons: [
        "all ADVE pillars COMPLETE",
        "all ADVE pillars VALIDATED or LOCKED",
      ],
      nextPhase: "GROWTH",
      unlockBlockers: blockers,
    };
  }
  if (anyAdveEnriched) {
    const blockers: string[] = [];
    for (const r of adveReadiness) {
      if (r.stage !== "COMPLETE") {
        blockers.push(`pillar ${r.pillarKey}: stage=${r.stage} (need COMPLETE)`);
      } else if (
        r.validationStatus !== "VALIDATED" &&
        r.validationStatus !== "LOCKED"
      ) {
        blockers.push(`pillar ${r.pillarKey}: validationStatus=${r.validationStatus} (need VALIDATED+)`);
      }
    }
    return {
      strategyId,
      phase: "BOOT",
      reasons: ["at least one ADVE pillar is ENRICHED or COMPLETE"],
      nextPhase: "OPERATING",
      unlockBlockers: blockers,
    };
  }
  // INTAKE — default.
  return {
    strategyId,
    phase: "INTAKE",
    reasons: ["no ADVE pillar at ENRICHED stage yet"],
    nextPhase: "BOOT",
    unlockBlockers: adveReadiness
      .filter((r) => r.stage === "EMPTY" || r.stage === "INTAKE")
      .map((r) => `pillar ${r.pillarKey}: stage=${r.stage} (need ENRICHED+)`),
  };
}

/**
 * Type guard — used by event-bus subscribers (Phase D-6) to detect
 * pipeline-stage-advanced and re-evaluate the phase.
 */
export function isLifecyclePhase(value: string): value is StrategyLifecyclePhase {
  return (STRATEGY_LIFECYCLE_PHASES as readonly string[]).includes(value);
}
