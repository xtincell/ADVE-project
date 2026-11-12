/**
 * src/server/governance/hash-chain.ts — IntentEmission tamper-evidence.
 *
 * Layer 2. Pure helpers; the actual chain rows are written from the canonical
 * emission spine (`governance/emission-spine.ts` — `openEmission`), consumed by
 * BOTH entry paths: `governed-procedure.ts` (tRPC) and `mestor.emitIntent`
 * (bus). Each new IntentEmission row receives `selfHash`, computed from the
 * row body + the previous HASHED row's `selfHash` (scoped to the same
 * `strategyId` to keep the chain partitioned and indexable).
 *
 * # Périmètre scellé — émission, pas complétion
 *
 * `selfHash` est calculé À L'ÉMISSION avec `result: null` : il scelle l'ordre,
 * le kind, le payload et le caller. Le `result` est écrit PLUS TARD par
 * `closeEmission` — il est mutable par design et HORS du périmètre scellé.
 * `verifyChain` recompute donc toujours avec `result: null` ; recomputer avec
 * le result post-complétion flaggerait chaque intent complété comme altéré
 * (bug historique du vérificateur, corrigé avec l'unification du spine).
 *
 * Verification (run weekly via governance-drift cron):
 *   SELECT id, strategyId, prevHash, selfHash FROM "IntentEmission"
 *   ORDER BY emittedAt;
 * walk per-strategy, recompute, compare. v2 mismatch ⇒ critical alert; legacy non-recomputable ⇒ unverifiable history.
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
  /** v1 preserves legacy byte order; v2 seals recursive canonical JSON. */
  version?: number;
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
  const version = row.version ?? 1;
  if (version !== 1 && version !== 2) throw new Error(`Unsupported emission seal version: ${version}`);
  const body = version === 1 ? JSON.stringify(canonical) : canonicalJson({ ...canonical, version });
  return createHash("sha256").update(body).digest("hex");
}

/** Normalize the persisted JSON representation, then order object keys recursively. */
function canonicalJson(value: unknown): string {
  const json: unknown = JSON.parse(JSON.stringify(value));
  const order = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(order);
    if (input && typeof input === "object") {
      return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, child]) => [key, order(child)]));
    }
    return input;
  };
  return JSON.stringify(order(json));
}

export type SealCheck =
  | { ok: true; state: "VERIFIED" }
  | { ok: false; state: "UNSEALED" | "UNVERIFIABLE_LEGACY" | "UNSUPPORTED_VERSION" | "INVALID"; expected?: string };

/** Individual emission body only. Does not certify its ancestry or mutable completion. */
export function verifyEmissionSeal(row: ChainableRow & { selfHash: string | null }): SealCheck {
  if (!row.selfHash) return { ok: false, state: "UNSEALED" };
  if ((row.version ?? 1) !== 1 && row.version !== 2) return { ok: false, state: "UNSUPPORTED_VERSION" };
  const expected = computeSelfHash({ ...row, result: null });
  if (expected === row.selfHash) return { ok: true, state: "VERIFIED" };
  return { ok: false, state: (row.version ?? 1) === 1 ? "UNVERIFIABLE_LEGACY" : "INVALID", expected };
}

export interface ChainCheckResult {
  ok: boolean;
  brokenAt?: { id: string; expected: string; actual: string };
  unverifiableAt?: { id: string; state: "UNVERIFIABLE_LEGACY" | "UNSUPPORTED_VERSION" | "UNSEALED" };
  count: number;
}

export function verifyChain(
  rows: readonly (ChainableRow & { selfHash: string })[],
  /** A bounded window may anchor on its predecessor without verifying that predecessor. */
  anchorHash: string | null = null,
): ChainCheckResult {
  let prev = anchorHash;
  let unverifiableAt: ChainCheckResult["unverifiableAt"];
  for (const row of rows) {
    if ((row.prevHash ?? null) !== prev) {
      return { ok: false, brokenAt: { id: row.id, expected: prev ?? "(null)", actual: row.prevHash ?? "(null)" }, count: rows.length };
    }
    const seal = verifyEmissionSeal(row);
    if (!seal.ok) {
      if (seal.state === "INVALID") {
        return { ok: false, brokenAt: { id: row.id, expected: seal.expected!, actual: row.selfHash }, count: rows.length };
      }
      unverifiableAt ??= { id: row.id, state: seal.state };
    }
    prev = row.selfHash;
  }
  return { ok: !unverifiableAt, ...(unverifiableAt ? { unverifiableAt } : {}), count: rows.length };
}
