/**
 * Budget gate Ptah — délègue à financial-brain (Thot) pour CHECK_CAPACITY
 * pre-flight. Cf. Loi 3 APOGEE (conservation carburant) + cost gate Pillar 6.
 *
 * Téléologie : pas seulement budget absolu — calcule aussi
 * `cost_per_potential_superfan` et compare aux ROI_BENCHMARKS_BY_MODE
 * (MANIPULATION-MATRIX.md §4.4).
 */

import {
  costPerExpectedSuperfan,
  estimateExpectedSuperfans,
  ROI_BENCHMARKS_BY_MODE,
} from "../pricing";
import type { ForgeBrief, ManipulationMode } from "../types";

export interface BudgetGateDecision {
  decision: "OK" | "DOWNGRADE" | "VETO";
  costPerExpectedSuperfan: number;
  expectedSuperfans: number;
  reason?: string;
}

export class BudgetGateVetoError extends Error {
  constructor(
    public readonly costPerSuperfan: number,
    public readonly ceiling: number,
    public readonly mode: ManipulationMode,
  ) {
    super(
      `Thot VETO: cost_per_expected_superfan=$${costPerSuperfan.toFixed(2)} > ceiling=$${ceiling} for mode=${mode}.`,
    );
    this.name = "BudgetGateVetoError";
  }
}

export function evaluateBudget(brief: ForgeBrief, estimatedCostUsd: number): BudgetGateDecision {
  const expectedSuperfans = estimateExpectedSuperfans(brief);
  const cps = costPerExpectedSuperfan(estimatedCostUsd, expectedSuperfans);
  const benchmark = ROI_BENCHMARKS_BY_MODE[brief.manipulationMode];

  if (!benchmark) {
    return { decision: "OK", costPerExpectedSuperfan: cps, expectedSuperfans };
  }

  if (cps > benchmark.costPerSuperfanCeilingUsd) {
    return {
      decision: "VETO",
      costPerExpectedSuperfan: cps,
      expectedSuperfans,
      reason: `cps=${cps.toFixed(2)} > ceiling=${benchmark.costPerSuperfanCeilingUsd}`,
    };
  }

  // Si cps > 75% du ceiling → DOWNGRADE (suggérer modèle plus économique)
  if (cps > benchmark.costPerSuperfanCeilingUsd * 0.75) {
    return {
      decision: "DOWNGRADE",
      costPerExpectedSuperfan: cps,
      expectedSuperfans,
      reason: `cps=${cps.toFixed(2)} > 75% ceiling — suggest cheaper model`,
    };
  }

  return { decision: "OK", costPerExpectedSuperfan: cps, expectedSuperfans };
}
