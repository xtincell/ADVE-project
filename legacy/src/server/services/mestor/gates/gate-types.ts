/**
 * mestor/gates/gate-types.ts — shared gate type vocabulary.
 *
 * Leaf module extracted from `index.ts` to break the import cycle
 * `index ⇄ brief-vs-adve-coherence` (madge --circular). Canonical gates
 * import their `GateContext` / `GateResult` / `MestorGateHandler` types from
 * here (a dependency-free leaf) instead of from the aggregating `index.ts`
 * (which imports the gate handlers back). `index.ts` re-exports these for
 * backward compatibility.
 */

import type { PrismaClient } from "@prisma/client";

/**
 * Canonical gate verdict (Story 1.8). The legacy `OK / DOWNGRADED / VETOED`
 * alphabet (used by `narrative-coherence.ts` + `manipulation-coherence.ts`)
 * is grandfathered — it is NOT remapped onto this union.
 */
export type GateResult =
  | { readonly verdict: "PASS"; readonly reason?: string; readonly evidence?: unknown }
  | { readonly verdict: "BLOCK"; readonly reason: string; readonly evidence?: unknown }
  | { readonly verdict: "WARN"; readonly reason: string; readonly evidence?: unknown };

/**
 * Read-side context every canonical gate may consume. All fields optional
 * so a scaffold gate (Story 1.8 `BRIEF_VS_ADVE_COHERENCE`) can ignore the
 * whole object. Tests pass minimal stub contexts.
 */
export interface GateContext {
  readonly db?: PrismaClient;
  readonly operatorId?: string;
  readonly intentEmissionId?: string;
}

/** Gate handler signature. */
export type MestorGateHandler<TInput> = (
  input: TInput,
  ctx: GateContext,
) => Promise<GateResult>;
