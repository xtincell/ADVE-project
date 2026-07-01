/**
 * src/server/governance/hash-chain.ts — IntentEmission tamper-evidence.
 *
 * Layer 2. Pure helpers; the actual chain rows are written from
 * `mestor.emitIntent`. Each new IntentEmission row receives `selfHash`,
 * computed from the row body + the previous row's `selfHash` (scoped to the
 * same `strategyId` to keep the chain partitioned and indexable).
 *
 * Verification (run weekly via governance-drift cron):
 *   SELECT id, strategyId, prevHash, selfHash FROM "IntentEmission"
 *   ORDER BY emittedAt;
 * walk per-strategy, recompute, compare. Mismatch ⇒ critical alert.
 */

import { createHash } from "node:crypto";

export interface ChainableRow {
  id: string;
  intentKind: string;
  strategyId: string;
  payload: unknown;
  result: unknown;
  caller: string;
  emittedAt: Date | string;
  prevHash?: string | null;
}

export function computeSelfHash(row: ChainableRow): string {
  const canonical = {
    id: row.id,
    intentKind: row.intentKind,
    strategyId: row.strategyId,
    payload: row.payload,
    result: row.result ?? null,
    caller: row.caller,
    emittedAt:
      row.emittedAt instanceof Date
        ? row.emittedAt.toISOString()
        : row.emittedAt,
    prevHash: row.prevHash ?? null,
  };
  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

export interface ChainCheckResult {
  ok: boolean;
  brokenAt?: { id: string; expected: string; actual: string };
  count: number;
}

export function verifyChain(
  rows: readonly (ChainableRow & { selfHash: string })[],
): ChainCheckResult {
  let prev: string | null = null;
  for (const row of rows) {
    if ((row.prevHash ?? null) !== prev) {
      return {
        ok: false,
        brokenAt: { id: row.id, expected: prev ?? "(null)", actual: row.prevHash ?? "(null)" },
        count: rows.length,
      };
    }
    const recomputed = computeSelfHash({ ...row, prevHash: prev });
    if (recomputed !== row.selfHash) {
      return {
        ok: false,
        brokenAt: { id: row.id, expected: recomputed, actual: row.selfHash },
        count: rows.length,
      };
    }
    prev = row.selfHash;
  }
  return { ok: true, count: rows.length };
}
