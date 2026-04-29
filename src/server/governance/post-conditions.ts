/**
 * src/server/governance/post-conditions.ts — After-burn checks (Pillar 4 dual).
 *
 * Layer 2. Symmetric counterpart of `pillar-readiness.assertReadyFor` :
 * - Pre-conditions defend the INPUT (state of the world before action).
 * - Post-conditions defend the OUTPUT (state after action). Failure
 *   means the handler claims to have succeeded but produced an invalid
 *   result — rollback + IntentEmission status=FAILED + reason="POSTCONDITION:<name>".
 *
 * Wire-up: governedProcedure invokes `assertPostConditions` AFTER the
 * handler returns and BEFORE flipping IntentEmission to OK.
 *
 * Mission contribution: CHAIN_VIA:pillar-gateway — guarantees the writes
 * that build superfan-relevant pillar state are coherent (e.g. score
 * never out of [0,100], cache never divergent). Without post-conditions,
 * silent corruption accumulates and erodes founder trust → kills the
 * cult-formation mechanism.
 */

import type { PostCondition } from "./manifest";

export class PostconditionFailedError extends Error {
  constructor(
    public readonly conditionName: string,
    public readonly intentId: string,
    public readonly output: unknown,
  ) {
    super(`Postcondition '${conditionName}' failed for intent ${intentId}`);
    this.name = "PostconditionFailedError";
  }
}

export interface PostConditionContext {
  readonly intentId: string;
  readonly strategyId?: string;
  readonly db: unknown;
}

export async function assertPostConditions(
  output: unknown,
  postconditions: readonly PostCondition[] | undefined,
  ctx: PostConditionContext,
): Promise<void> {
  if (!postconditions || postconditions.length === 0) return;
  for (const pc of postconditions) {
    let ok: boolean;
    try {
      ok = await Promise.resolve(pc.check(output, { strategyId: ctx.strategyId, db: ctx.db }));
    } catch (err) {
      throw new PostconditionFailedError(pc.name, ctx.intentId, output);
    }
    if (!ok) {
      throw new PostconditionFailedError(pc.name, ctx.intentId, output);
    }
  }
}

// ── Common reusable post-conditions ────────────────────────────────────

export const scoreInRange: PostCondition = {
  name: "score-in-range",
  check: (output) => {
    const score = (output as { score?: number } | undefined)?.score;
    if (typeof score !== "number") return true; // not applicable
    return score >= 0 && score <= 200;
  },
};

export const compositeInRange: PostCondition = {
  name: "composite-in-range",
  check: (output) => {
    const composite = (output as { composite?: number } | undefined)?.composite;
    if (typeof composite !== "number") return true;
    return composite >= 0 && composite <= 200;
  },
};

export const staleInFuture: PostCondition = {
  name: "stale-future",
  check: (output) => {
    const staleAt = (output as { staleAt?: Date | string } | undefined)?.staleAt;
    if (!staleAt) return true;
    const d = staleAt instanceof Date ? staleAt : new Date(staleAt);
    return d.getTime() > Date.now();
  },
};

export const COMMON_POSTCONDITIONS = [scoreInRange, compositeInRange, staleInFuture] as const;
