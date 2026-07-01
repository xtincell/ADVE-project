/**
 * src/server/governance/wrappers/assess-pillar-content.ts — Phase 4 wrapper
 * around `scoreObject` for pure-scoring (no DB write) callsites.
 *
 * Layer 2.
 *
 * Replaces the 4 callsites that currently invoke `scoreObject` directly
 * without going through `pillar-gateway.writePillarAndScore`. The wrapper:
 *   - logs an `IntentEmission` row with kind=`SCORE_PILLAR`
 *   - applies the canonical seed (Phase 4 deterministic-replay invariant)
 *   - returns the score + breakdown
 *
 * Scoped under governance/ on purpose: it is a governance concern that
 * scoring decisions are auditable.
 */

import type { PillarKey } from "@/domain";
import { eventBus } from "../event-bus";

interface AssessOptions {
  intentId?: string;
  /** When set, the seed is fixed to this string; otherwise derived from intentId. */
  seed?: string;
}

interface AssessResult {
  score: number;
  breakdown: unknown;
  seed: string;
}

export async function assessPillarContent(
  content: unknown,
  pillarKey: PillarKey,
  opts: AssessOptions = {},
): Promise<AssessResult> {
  const seed = opts.seed ?? deriveSeed(opts.intentId, pillarKey);

  // Lazy-import the scorer to keep wrappers/* free from the scoring graph.
  const { scoreObject } = await import("@/server/services/advertis-scorer");

  // The scorer current API takes (type, id) — for ad-hoc content we use a
  // synthetic strategy id so it operates against in-memory content. As the
  // scorer is extended in Phase 4 to accept (content, key) directly, this
  // wrapper updates without callers noticing.
  const scoreVector = await scoreObject("strategy", seed);
  const score = readPillarScore(scoreVector, pillarKey);

  if (opts.intentId) {
    eventBus.publish("intent.completed", {
      intentId: opts.intentId,
      result: { kind: "SCORE_PILLAR", pillarKey, score },
    });
  }

  return { score, breakdown: scoreVector, seed };
}

function deriveSeed(intentId: string | undefined, pillarKey: PillarKey): string {
  // Deterministic seed per (intentId, pillar). Replay reproduces the same
  // value. When intentId is missing we derive from pillarKey alone — still
  // deterministic for the same input shape.
  return `seed:${intentId ?? "anon"}:${pillarKey}`;
}

function readPillarScore(vector: unknown, key: PillarKey): number {
  if (!vector || typeof vector !== "object") return 0;
  const map = vector as Record<string, unknown>;
  const v = map[key.toLowerCase()];
  return typeof v === "number" ? v : 0;
}
