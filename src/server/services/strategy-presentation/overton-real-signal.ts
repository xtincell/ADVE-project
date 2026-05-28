/**
 * Phase 23 Epic 3 Story 3.6 — Oracle Overton-distinctive real-signal builder.
 *
 * Aggregates `culture.overtonShift` + `culture.overtonReadiness` outputs across
 * a Strategy's campaigns into a discriminated payload consumed by the Oracle
 * Overton-distinctive section writeback (and downstream UI).
 *
 * Per P22-2 the union is first-class :
 *   - `{ state: "OK", samples, meanShiftScore, ... }`         — at least one
 *     campaign returned a non-null `overtonShiftScore`.
 *   - `{ state: "INSUFFICIENT_DATA", reason, degradationCodes }` — no
 *     campaigns with an Overton hypothesis, or every measurement degraded.
 *
 * `meanShiftScore` averages over non-null shift scores only ; null branches
 * are never folded as 0 (ADR-0046 no-magic-fallback). The denominator is
 * `measurableCampaigns`, not `samples.length`.
 *
 * Manual-first parity (ADR-0060) is transparent : when an action carries
 * `overtonDeltaManual`, `measureOvertonShift` returns the operator-tagged
 * value and stamps `degradationCodes` with `MANUAL_OPERATOR_DELTA`. This
 * builder propagates the code unchanged ; the UI render is identical for
 * operator-tagged vs algorithmic.
 *
 * Cf. [ADR-0078](../../../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md).
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  evaluateOvertonReadiness,
  measureOvertonShift,
} from "@/server/services/campaign-tracker/signals-culture";
import type {
  OvertonReadinessResult,
  OvertonShiftResult,
} from "@/server/services/campaign-tracker/types";

export interface OvertonRealSignalSample {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly shift: OvertonShiftResult;
  readonly readiness: OvertonReadinessResult;
}

export type OvertonRealSignalInsufficientReason = "NO_CAMPAIGNS" | "ALL_DEGRADED";

export type OvertonRealSignal =
  | {
      readonly state: "OK";
      readonly samples: readonly OvertonRealSignalSample[];
      /** Mean of non-null shift scores (∈ [-1, 1]). Null branches are NOT folded as 0 (P22-2). */
      readonly meanShiftScore: number;
      /** Count of campaigns that returned a non-null `overtonShiftScore`. */
      readonly measurableCampaigns: number;
      readonly observedAt: string;
    }
  | {
      readonly state: "INSUFFICIENT_DATA";
      readonly reason: OvertonRealSignalInsufficientReason;
      readonly degradationCodes: readonly string[];
      readonly observedAt: string;
    };

/** Cap : the 10 most-recently-updated campaigns with an Overton hypothesis. */
const CAMPAIGN_CAP = 10;

/**
 * Build the Oracle Overton-distinctive real-signal payload for a Strategy.
 *
 * 1. Load up to `CAMPAIGN_CAP` campaigns for the strategy that have an
 *    `overtonHypothesis` (a precondition for `measureOvertonShift`).
 * 2. For each, call `measureOvertonShift` + `evaluateOvertonReadiness` in
 *    parallel.
 * 3. Aggregate :
 *    - 0 campaigns → `INSUFFICIENT_DATA / NO_CAMPAIGNS`.
 *    - All shifts null → `INSUFFICIENT_DATA / ALL_DEGRADED` with the union
 *      of upstream `degradationCodes`.
 *    - Otherwise → `OK` with `meanShiftScore` over the measurable subset.
 */
export async function buildOvertonRealSignalForOracle(
  strategyId: string,
  operatorId: string,
): Promise<OvertonRealSignal> {
  const observedAt = new Date().toISOString();

  const campaigns = await db.campaign.findMany({
    where: { strategyId, overtonHypothesis: { not: Prisma.JsonNull } },
    select: { id: true, name: true },
    orderBy: { updatedAt: "desc" },
    take: CAMPAIGN_CAP,
  });

  if (campaigns.length === 0) {
    return {
      state: "INSUFFICIENT_DATA",
      reason: "NO_CAMPAIGNS",
      degradationCodes: ["NO_CAMPAIGNS_WITH_OVERTON_HYPOTHESIS"],
      observedAt,
    };
  }

  const samples: OvertonRealSignalSample[] = [];
  const degradationCodes = new Set<string>();

  for (const c of campaigns) {
    const [shift, readiness] = await Promise.all([
      measureOvertonShift({ strategyId, operatorId, campaignId: c.id }),
      evaluateOvertonReadiness({ strategyId, operatorId, campaignId: c.id }),
    ]);
    for (const code of shift.degradationCodes) degradationCodes.add(code);
    for (const code of readiness.degradationCodes) degradationCodes.add(code);
    samples.push({ campaignId: c.id, campaignName: c.name, shift, readiness });
  }

  const measurableShifts = samples.filter((s) => s.shift.overtonShiftScore !== null);
  if (measurableShifts.length === 0) {
    return {
      state: "INSUFFICIENT_DATA",
      reason: "ALL_DEGRADED",
      degradationCodes: [...degradationCodes],
      observedAt,
    };
  }

  // P22-2 : mean over measurable only — never fold null as 0.
  // `overtonShiftScore` is asserted non-null by the filter above.
  const sum = measurableShifts.reduce(
    (acc, s) => acc + (s.shift.overtonShiftScore as number),
    0,
  );
  const meanShiftScore = sum / measurableShifts.length;

  return {
    state: "OK",
    samples,
    meanShiftScore,
    measurableCampaigns: measurableShifts.length,
    observedAt,
  };
}
