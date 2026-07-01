/**
 * src/server/governance/cost-gate.ts — Pillar 6 (Thot active gate).
 *
 * Layer 2. Evaluates a Cost gate for an Intent before execution. Symmetric
 * to `pillar-readiness.assertReadyFor` (Pillar 4) — but defends the
 * propellant axis instead of the pillar-state axis.
 *
 * Wire-up:
 *   governedProcedure → assertReadyFor (P4 preconditions)
 *                    → evaluateCostGate (P6 cost gate)  ← THIS MODULE
 *                    → handler
 *                    → assertPostConditions (P6.2 after-burn)
 *
 * The decision is persisted in `CostDecision` (Prisma) so Thot's audit
 * trail is queryable independently of IntentEmission.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — without budget gating,
 * UPgraders flame out before any brand reaches ICONE.
 */

import type { Brain, Capability, NeteruManifest } from "./manifest";

export type CostDecisionKind = "ALLOW" | "DOWNGRADE" | "VETO";

export interface CostGateInput {
  readonly intentId: string;
  readonly intentKind: string;
  readonly strategyId?: string;
  readonly operatorId: string;
  readonly capability: Capability;
  readonly manifest: NeteruManifest;
}

export interface CostDecisionResult {
  readonly decision: CostDecisionKind;
  readonly estimatedUsd: number;
  readonly remainingBudgetUsd: number;
  readonly downgradeTo?: { qualityTier: "S" | "A" | "B" | "C"; expectedDeltaUsd: number };
  readonly reason: string;
  readonly governor: Brain;
}

/**
 * Capacity reader interface — lets cost-gate consume Thot without an
 * import cycle. Implemented by financial-brain in services/.
 */
export interface CapacityReader {
  remainingBudgetUsd(operatorId: string): Promise<number>;
  rollingSpendUsd(operatorId: string, days: number): Promise<number>;
}

const SAFETY_MARGIN = 1.2; // 20% headroom — refuse if estimated > remaining/SAFETY

/**
 * Pure decision function. Given the manifest's cost estimate + the
 * remaining propellant, returns ALLOW / DOWNGRADE / VETO.
 *
 * - ALLOW   : remaining >= estimated × SAFETY_MARGIN
 * - DOWNGRADE: SAFETY_MARGIN-borderline AND a lower qualityTier exists
 * - VETO    : remaining < estimated, no downgrade option
 */
export async function evaluateCostGate(
  input: CostGateInput,
  reader: CapacityReader,
): Promise<CostDecisionResult> {
  const estimatedUsd = input.capability.costEstimateUsd ?? 0;
  const remainingBudgetUsd = await reader.remainingBudgetUsd(input.operatorId);

  if (estimatedUsd === 0) {
    // Free capability (no LLM call) — passes by default.
    return {
      decision: "ALLOW",
      estimatedUsd: 0,
      remainingBudgetUsd,
      reason: "no cost estimate — assumed free",
      governor: "THOT",
    };
  }

  const required = estimatedUsd * SAFETY_MARGIN;

  if (remainingBudgetUsd >= required) {
    return {
      decision: "ALLOW",
      estimatedUsd,
      remainingBudgetUsd,
      reason: `propellant sufficient (need ${required.toFixed(2)} USD with ${(SAFETY_MARGIN - 1) * 100}% margin)`,
      governor: "THOT",
    };
  }

  // Try downgrade: if capability declares qualityTier S/A, propose B/C.
  const currentTier = input.capability.qualityTier;
  if (currentTier && (currentTier === "S" || currentTier === "A")) {
    const downgradeTier = currentTier === "S" ? "A" : "B";
    const downgradeEstimate = estimatedUsd * (currentTier === "S" ? 0.4 : 0.5);
    if (remainingBudgetUsd >= downgradeEstimate * SAFETY_MARGIN) {
      return {
        decision: "DOWNGRADE",
        estimatedUsd,
        remainingBudgetUsd,
        downgradeTo: { qualityTier: downgradeTier, expectedDeltaUsd: estimatedUsd - downgradeEstimate },
        reason: `insufficient propellant for tier ${currentTier} — downgrading to ${downgradeTier}`,
        governor: "THOT",
      };
    }
  }

  return {
    decision: "VETO",
    estimatedUsd,
    remainingBudgetUsd,
    reason: `propellant exhausted (need ${required.toFixed(2)} USD, have ${remainingBudgetUsd.toFixed(2)} USD)`,
    governor: "THOT",
  };
}

/**
 * Throw-style helper for governedProcedure. Throws CostVetoError on VETO.
 * Returns the decision (ALLOW or DOWNGRADE) so the caller can adjust.
 */
export class CostVetoError extends Error {
  constructor(
    public readonly result: CostDecisionResult,
    public readonly intentId: string,
  ) {
    super(`Intent ${intentId} vetoed by Thot: ${result.reason}`);
    this.name = "CostVetoError";
  }
}

export async function assertCostGate(
  input: CostGateInput,
  reader: CapacityReader,
): Promise<CostDecisionResult> {
  const result = await evaluateCostGate(input, reader);
  if (result.decision === "VETO") {
    throw new CostVetoError(result, input.intentId);
  }
  return result;
}
