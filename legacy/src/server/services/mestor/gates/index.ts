/**
 * Phase 23 Epic 1 Story 1.8 — Canonical Mestor gate registry.
 *
 * Home for the typed primitives every Mestor pre-flight gate plugs into:
 *   - `GateResult` discriminated union (`PASS` / `BLOCK` / `WARN`)
 *   - `GateContext` injection point (db / operatorId / intentEmissionId)
 *   - `MestorGateKey` literal-union of registered gate identifiers
 *   - `MestorGateHandler<I>` async gate signature
 *   - `mestorGates` const — the registry instance keyed by `MestorGateKey`
 *
 * # Why this file did not exist before
 *
 * Pre-Story-1.8 two gates lived in this folder
 * (`narrative-coherence.ts`, `manipulation-coherence.ts`) and were dispatched
 * by direct dynamic import from `services/mestor/intents.ts` — each ship its
 * own bespoke verdict shape (`OK / DOWNGRADED / VETOED`). The canonical
 * registry was deferred until a third gate appeared. Story 1.8 ships that
 * third gate (`BRIEF_VS_ADVE_COHERENCE`) and lays the typed-contract
 * foundation that closure-target #14 Phase 24 will harvest when it migrates
 * the legacy gates and absorbs the three new ingestion gates.
 *
 * # What this file MUST NOT do in this story
 *
 * - Do NOT migrate the legacy gates onto the new `MestorGates` map. They
 *   keep their bespoke verdict shapes and their direct dynamic-import
 *   dispatch in `intents.ts`. They are re-exported below purely as a
 *   non-breaking facade so future consumers can reach every gate symbol
 *   through one entry point.
 * - Do NOT add a value cycle. The gate files import types only from this
 *   module (`GateResult`, `GateContext`) and this module imports the
 *   handler value lazily where needed.
 *
 * # References
 *
 * - ADR-0084 (8-layer OS architecture, Layer 5 = Services système)
 * - ADR-0049 (Brief Mandatory Gate — sibling presence layer)
 * - ADR-0023 (OPERATOR_AMEND_PILLAR — sibling ADVE-write layer)
 * - STATE_FINAL_BLUEPRINT §21.2 D-3.1 (gate `BRIEF_VS_ADVE_COHERENCE`
 *   marked CRITIQUE ABSENT — this story scaffolds it)
 * - _bmad-output/planning-artifacts/closure-roadmap.md target #14
 *   (Phase 24 enforcement scope)
 */

import type { Brain } from "@/server/governance/manifest";

import { briefVsAdveCoherenceGate } from "./brief-vs-adve-coherence";

// ── Canonical verdict (Phase 23 trio + future Phase 24 gates) ─────────

/**
 * Canonical Mestor gate result. Three-state alphabet aligned with the
 * Phase 24 closure-target #14 trio (`BRIEF_VS_ADVE_COHERENCE`,
 * `PRODUCTION_OUTPUT_VS_BRIEF`, `BROADCAST_VS_AUDIENCE_FIT`).
 *
 *   - `PASS`  — gate cleared, dispatch proceeds.
 *   - `BLOCK` — gate vetoed, dispatch refused. `reason` MUST be set.
 *   - `WARN`  — gate flagged a divergence but did not block. The caller
 *               (typically `emitIntent` pre-flight) surfaces the warning
 *               to the operator and proceeds.
 *
 * The legacy `OK / DOWNGRADED / VETOED` alphabet (used by
 * `narrative-coherence.ts` + `manipulation-coherence.ts`) is grandfathered
 * — it is NOT remapped onto this union in Story 1.8.
 */
// GateResult / GateContext / MestorGateHandler vivent dans ./gate-types (leaf)
// — rompt le cycle index ⇄ brief-vs-adve-coherence (madge). Réexportés ici.
import type { GateContext, GateResult, MestorGateHandler } from "./gate-types";
export type { GateContext, GateResult, MestorGateHandler } from "./gate-types";

// ── Registered gate keys (open literal union, grow per story) ─────────

/**
 * Canonical list of registered Mestor gate keys. Story 1.8 ships exactly
 * one entry — `BRIEF_VS_ADVE_COHERENCE`. Subsequent stories append keys
 * (closure-target #14 will add `PRODUCTION_OUTPUT_VS_BRIEF` +
 * `BROADCAST_VS_AUDIENCE_FIT`). Iterate via this array, not by typing
 * the union by hand.
 */
export const MESTOR_GATE_KEYS = ["BRIEF_VS_ADVE_COHERENCE"] as const;

export type MestorGateKey = (typeof MESTOR_GATE_KEYS)[number];

// ── Registry entry shape — governor field per ADR-0084 Layer 5 ────────

/**
 * Every entry in `mestorGates` declares its handler AND its governor.
 * The governor is always `"MESTOR"` at Layer 5 per ADR-0084: gates are
 * pre-flight assertions on Intents that traverse `mestor.emitIntent()`,
 * so Mestor is the sole governor of the gate registry.
 */
export interface MestorGateEntry<TInput = unknown> {
  readonly handler: MestorGateHandler<TInput>;
  readonly governor: Extract<Brain, "MESTOR">;
}

/**
 * Canonical Mestor gate map. Single source of truth for which gates exist
 * and which handler runs for each. Constructed once at module load — no
 * dynamic mutation.
 */
export type MestorGates = {
  readonly [K in MestorGateKey]: MestorGateEntry;
};

export const mestorGates: MestorGates = {
  BRIEF_VS_ADVE_COHERENCE: {
    handler: briefVsAdveCoherenceGate as MestorGateHandler<unknown>,
    governor: "MESTOR",
  },
};

// ── Non-breaking facade for the two pre-existing legacy gates ─────────

/**
 * Re-exports — DO NOT migrate these onto `MestorGates` in Story 1.8.
 * They keep their bespoke verdict shapes (`OK / DOWNGRADED / VETOED`)
 * and their direct dynamic-import dispatch from
 * `services/mestor/intents.ts`. Phase 24 closure-target #14 will absorb
 * them under the canonical `MestorGates` shape when full enforcement
 * lands and the verdict alphabets can be reconciled.
 */
export { applyNarrativeCoherenceGate } from "./narrative-coherence";
export type { NarrativeCoherenceVerdict } from "./narrative-coherence";
export { applyManipulationCoherenceGate } from "./manipulation-coherence";
export type { ManipulationCoherenceVerdict, ManipulationMode } from "./manipulation-coherence";

// ── Re-export Story 1.8 gate symbol (canonical entry point) ───────────

export { briefVsAdveCoherenceGate } from "./brief-vs-adve-coherence";
