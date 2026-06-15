/**
 * Phase 23 Epic 1 Story 1.8 — `BRIEF_VS_ADVE_COHERENCE` gate (scaffold).
 *
 * # Purpose (when fully enforced in Phase 24)
 *
 * Asserts that the *content* of an incoming brief is coherent with the
 * brand's ADVE noyau (Authenticité / Distinction / Valeur / Engagement)
 * before any RTIS or production action proceeds. Sits at the *content*
 * frontier — orthogonal to the two pre-existing layers:
 *
 *   - ADVE *editing* (ADR-0023 `OPERATOR_AMEND_PILLAR` + sibling
 *     `PILLAR_COHERENCE` gate) — different surface.
 *   - Brief *presence* (ADR-0049 Brief Mandatory Gate) — different layer
 *     below this one.
 *
 * Cf. STATE_FINAL_BLUEPRINT §3 (ADVE = brand noyau) and §21.2 drift
 * D-3.1 (CRITIQUE — gate absent).
 *
 * # Story 1.8 scope = SCAFFOLD ONLY
 *
 * - Exports the canonical signature
 *   `(input, ctx: GateContext) => Promise<GateResult>` so any caller
 *   wired pre-Phase-24 fails fast with `NOT_YET_IMPLEMENTED` and a
 *   pointer back to closure-target #14.
 * - Registered in the canonical `mestorGates` registry
 *   (`src/server/services/mestor/gates/index.ts`).
 * - Throws — does NOT touch the DB, does NOT call an LLM, does NOT
 *   dispatch any Intent.
 *
 * # Phase 24 enforcement contract (closure-target #14)
 *
 * When full enforcement ships, the LLM-assisted coherence check MUST be
 * paired with a manual operator override path at
 * `/console/strategy-operations/brief-ingest` (existing surface, ADR-0049
 * §2.4) per the manual-first parity invariant (ADR-0060). The Phase 24
 * dev agent does NOT need to re-discover that requirement — it is
 * encoded here.
 *
 * # References
 *
 * - ADR-0084 (Layer 5 boundary — this gate may import from `@/domain`,
 *   `@/lib`, `@/server/governance`, sibling `@/server/services`; never
 *   from `@/server/trpc`, `@/components`, `@/app`).
 * - ADR-0049 (Brief Mandatory Gate — mandatory presence layer below).
 * - ADR-0023 (OPERATOR_AMEND_PILLAR — sibling ADVE write surface).
 * - ADR-0060 (manual-first parity — applies in Phase 24, not this scaffold).
 * - STATE_FINAL_BLUEPRINT §3 + §21.2 D-3.1.
 * - closure-roadmap target #14 (Phase 24 enforcement scope).
 */

import type { PillarKey } from "@/domain/pillars";

import type { GateContext, GateResult } from "./gate-types";

/**
 * Error thrown by the Story 1.8 scaffold stub. Message contract:
 *
 *   - Always prefixed by the literal string `NOT_YET_IMPLEMENTED:`.
 *   - Body MUST contain the literal substring `closure-target #14`
 *     so the anti-drift test cannot silently lose the deferral signal
 *     across renames.
 *
 * Kept local to `gates/` — do NOT promote to `@/domain` until full
 * enforcement lands and other gates need the same scaffold convention.
 */
export class NotYetImplementedError extends Error {
  constructor(message: string) {
    super(`NOT_YET_IMPLEMENTED: ${message}`);
    this.name = "NotYetImplementedError";
  }
}

export interface BriefVsAdveCoherenceInput {
  readonly strategyId: string;
  readonly brief: {
    readonly content: string;
    readonly pillarBindings?: readonly PillarKey[];
  };
}

/**
 * Phase 23 Story 1.8 scaffold — throws `NotYetImplementedError`. Real
 * implementation lands in Phase 24 closure-target #14.
 *
 * The signature is the contract. Callers wired pre-Phase-24 will fail
 * fast at runtime with a structured error pointing to the deferral.
 *
 * Args intentionally unused at scaffold stage — they are part of the
 * contract Phase 24 must honour.
 */
export async function briefVsAdveCoherenceGate(
  _input: BriefVsAdveCoherenceInput,
  _ctx: GateContext,
): Promise<GateResult> {
  throw new NotYetImplementedError(
    "BRIEF_VS_ADVE_COHERENCE enforcement deferred to closure-target #14 Phase 24",
  );
}
