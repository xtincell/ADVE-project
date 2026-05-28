/**
 * Phase 23 — Superfan attribution : type backbone (pattern P22-2).
 *
 * **Layer 4** — Services. Imports allowed : `zod` only (this file is type-only ;
 * the Story 4.2 runtime `runAttribution` will add Prisma / domain imports when
 * it lands in the same file).
 *
 * Pattern P22-2 (ADR-0081 §2). The type-level enforcement of the
 * no-magic-fallback invariant (ADR-0046) for the superfan-attribution mechanic :
 * "no measurement" is structurally distinct from "measured zero" — the
 * discriminated union forbids a `null` / `undefined` / silent `0` return on
 * sparse input.
 *
 * # The two states
 *
 * - `OK` — the regression (or the operator-supplied coefficients) produced a
 *   defendable measurement. `score` carries the continuous attribution metric,
 *   `lineage` carries the observed Ambassador → Evangelist transitions that
 *   justify the score, `snapshotRef` points at the `RUN_ATTRIBUTION_CALIBRATION`
 *   `IntentEmission.id` that persists the model snapshot (P22-6).
 *
 * - `INSUFFICIENT_DATA` — the input window holds fewer than
 *   `minSamplesRequired` transitions ; the model cannot produce a defendable
 *   score. The branch carries the explicit `minSamplesRequired` /
 *   `samplesAvailable` so the operator UI can render an honest "10 of 30
 *   transitions observed ; need 20 more" empty state (UX-DR10) without
 *   substituting a fabricated zero.
 *
 * **Neither `null` nor `undefined` is a permitted return.** The type-only test
 * at [tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts]
 * asserts this structurally. Story 4.8 will activate the HARD anti-drift test
 * `phase22-no-silent-zero.test.ts` for this file's scope (covering
 * `superfan-attribution.ts` + `superfan-economy.ts`).
 *
 * # Devotion ladder divergence (deliberate per ADR-0081 §2)
 *
 * The canonical 6-rung Devotion Ladder lives at [src/domain/devotion-ladder.ts]
 * and uses French uppercase identifiers :
 *
 *     SPECTATEUR < INTERESSE < PARTICIPANT < ENGAGE < AMBASSADEUR < EVANGELISTE
 *
 * The Phase 23 attribution-layer transitions deliberately use a 4-rung English
 * subset (ADR-0081 §2 spec verbatim) :
 *
 *     Curious < Convinced < Ambassador < Evangelist
 *
 * Why two alphabets : the canonical ladder is a general devotion classification
 * (used by `cultIndex`, `pillarE`, `devotion-pyramid`, etc.) ; the attribution
 * alphabet tracks **the transitions that produce measurable superfan
 * accumulation** (the regression input). Mapping between the two — when the
 * regression sources data from the canonical 6-rung — is Story 4.2 scope, not
 * Story 4.1.
 *
 * # Coexistence with legacy `SuperfanAttributionResult` (Phase 19 Cluster C)
 *
 * The Phase 19 heuristic `SuperfanAttributionResult` lives at
 * [src/server/services/campaign-tracker/types.ts:201] and is consumed by
 * `recomputeSuperfanAttribution` in `superfan-economy.ts`. The two shapes
 * intentionally coexist on `main` :
 *
 *   - `SuperfanAttributionResult` — Phase 19 LTV heuristic, French rungs,
 *     populated `byAction` breakdown, `degradationCodes` array.
 *   - `AttributionResult` (this file) — Phase 23 calibration, English rungs,
 *     discriminated `INSUFFICIENT_DATA` branch, `snapshotRef` for IntentEmission
 *     reproducibility (P22-6).
 *
 * Story 4.3 extends the Phase 19 path with `ConnectorResult<T>` consumption ;
 * Story 4.5 + Epic 6 Story 6.1 wire the Phase 23 path through `runAttribution`
 * (added in Story 4.2 — see TODO at end of file). Unification deferred
 * post-Phase 23.
 *
 * # Example consumer pattern (P22-2 canonical)
 *
 *     const result = await runAttribution({ campaignIds: ["camp-123"] });
 *     switch (result.state) {
 *       case "OK":
 *         return renderScore(result.score, result.lineage, result.snapshotRef);
 *       case "INSUFFICIENT_DATA":
 *         return renderEmptyState({
 *           cause: `${result.samplesAvailable} of ${result.minSamplesRequired} transitions observed`,
 *           unlock: "Need more devotion transitions in window",
 *         });
 *     }
 *
 * # Anti-pattern (banned by HARD test in Story 4.8)
 *
 *     const result = await runAttribution({ campaignIds: ["camp-123"] });
 *     const score = result.score ?? 0;          // ← silent zero on sparse input
 *     return renderScore(score);                 // ← fabricated downstream
 *
 * The discriminated union forbids `result.score` access without state
 * narrowing — the anti-pattern fails `tsc` (`Property 'score' does not exist on
 * type '{ state: "INSUFFICIENT_DATA"; ... }'`).
 *
 * Cf. ADR-0081 (calibration methodology), ADR-0046 (no-magic-fallback root),
 * ADR-0002 (Layer 4 boundary), Story 1.3 (`ConnectorResult<T>` precedent).
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────
// Section 1 — Devotion-ladder transition alphabet (ADR-0081 §2)
// ─────────────────────────────────────────────────────────────────────────

/**
 * The 3 rungs from which an evangelist-producing transition may start.
 * Strict subset of the attribution alphabet — `Evangelist` is the terminal
 * rung and cannot appear as `transitionFrom`.
 */
export const EVANGELIST_TRANSITION_FROM_RUNGS = ["Curious", "Convinced", "Ambassador"] as const;

/**
 * The 2 rungs an evangelist-producing transition may end at — `Ambassador`
 * (mid-ladder progression) or `Evangelist` (terminal apex).
 */
export const EVANGELIST_TRANSITION_TO_RUNGS = ["Ambassador", "Evangelist"] as const;

export type EvangelistTransitionFromRung = (typeof EVANGELIST_TRANSITION_FROM_RUNGS)[number];
export type EvangelistTransitionToRung = (typeof EVANGELIST_TRANSITION_TO_RUNGS)[number];

/**
 * A single observed Ambassador-or-Evangelist-producing transition attributed
 * to a `Campaign`. Populated by Story 4.4 from the observed devotion ladder
 * movements in the regression input window.
 *
 * Fields are `readonly` (consistent with the surrounding `types.ts` campaign-
 * tracker DTO convention — line 18 onward).
 */
export type EvangelistTransition = {
  readonly campaignId: string;
  readonly transitionFrom: EvangelistTransitionFromRung;
  readonly transitionTo: EvangelistTransitionToRung;
  /** ISO 8601 timestamp when the transition was observed. */
  readonly observedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Section 2 — `AttributionResult` discriminated union (pattern P22-2)
// ─────────────────────────────────────────────────────────────────────────

/**
 * ADR-0081 §2 default : `minSamplesRequired = 30` transitions. Sub-30 returns
 * `INSUFFICIENT_DATA`. Exposed as a literal `30` (via `as const`) so downstream
 * consumers see the exact value at the type level.
 *
 * Story 4.2 will consume this default in `runAttribution` ; Story 4.5 may
 * override it per operator coefficient mode.
 */
export const MIN_SAMPLES_REQUIRED_DEFAULT = 30 as const;

/**
 * The canonical attribution-measurement result. **Every** Phase 23 consumer
 * of attribution output returns this shape — `runAttribution` (Story 4.2),
 * the `RUN_ATTRIBUTION_CALIBRATION` handler (Epic 6 Story 6.1), the manual
 * coefficient mode (Story 4.5), the Console operator view (Story 4.6), and the
 * Cockpit lineage view (Story 4.7).
 *
 * By construction, the `score` / `lineage` / `snapshotRef` fields are
 * **forbidden** on the `INSUFFICIENT_DATA` arm — the type system rejects
 * accessing them without a state check.
 */
export type AttributionResult =
  | {
      readonly state: "OK";
      /** Continuous attribution metric. Interpretation per ADR-0081. */
      readonly score: number;
      /** Observed transitions that justify the score (Story 4.4 populates). */
      readonly lineage: readonly EvangelistTransition[];
      /**
       * Hash-chained reference to the `RUN_ATTRIBUTION_CALIBRATION`
       * `IntentEmission.id` that persists the model snapshot (P22-6). Epic 6
       * Story 6.1 emits ; this story declares the contract.
       */
      readonly snapshotRef: string;
    }
  | {
      readonly state: "INSUFFICIENT_DATA";
      /** Threshold the regression requires (default `MIN_SAMPLES_REQUIRED_DEFAULT = 30`). */
      readonly minSamplesRequired: number;
      /** How many transitions the input window actually carries. */
      readonly samplesAvailable: number;
    };

// ─────────────────────────────────────────────────────────────────────────
// Section 3 — Type guards (narrow the union for downstream consumers)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Type guard : `result.state === "OK"`. Narrows the union so callers can
 * access `result.score` / `result.lineage` / `result.snapshotRef` without a
 * `case`-statement.
 */
export function isAttributionOk(
  result: AttributionResult,
): result is Extract<AttributionResult, { state: "OK" }> {
  return result.state === "OK";
}

/**
 * Type guard : `result.state === "INSUFFICIENT_DATA"`. Narrows the union so
 * callers can access `result.minSamplesRequired` / `result.samplesAvailable`
 * without a `case`-statement.
 */
export function isAttributionInsufficient(
  result: AttributionResult,
): result is Extract<AttributionResult, { state: "INSUFFICIENT_DATA" }> {
  return result.state === "INSUFFICIENT_DATA";
}

// ─────────────────────────────────────────────────────────────────────────
// Section 4 — Zod schemas (boundary validation)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Runtime validator for `EvangelistTransition`. Used at tRPC procedure
 * boundaries (Story 4.6 / 4.7) and at `IntentEmission` payload validation
 * (Epic 6 Story 6.1).
 */
export const evangelistTransitionSchema = z.object({
  campaignId: z.string().min(1),
  transitionFrom: z.enum(EVANGELIST_TRANSITION_FROM_RUNGS),
  transitionTo: z.enum(EVANGELIST_TRANSITION_TO_RUNGS),
  observedAt: z.string().min(1),
});

/**
 * Runtime validator for `AttributionResult`. Mirrors the type union exactly —
 * no extra fields, no loose typing.
 *
 * Used at tRPC procedure return-shape validation (Story 4.6 / 4.7) and at
 * `IntentEmission` payload persistence (Epic 6 Story 6.1).
 */
export const attributionResultSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("OK"),
    score: z.number(),
    lineage: z.array(evangelistTransitionSchema).readonly(),
    snapshotRef: z.string().min(1),
  }),
  z.object({
    state: z.literal("INSUFFICIENT_DATA"),
    minSamplesRequired: z.number().int().nonnegative(),
    samplesAvailable: z.number().int().nonnegative(),
  }),
]);

// ─────────────────────────────────────────────────────────────────────────
// Section 5 — Runtime placeholder (Story 4.2 fills `runAttribution` here)
// ─────────────────────────────────────────────────────────────────────────

// Story 4.2 will add :
//   export async function runAttribution(input: {
//     campaignIds: string[];
//     coefficients?: Record<string, number>;
//   }): Promise<AttributionResult> { ... pure-TS logistic regression ... }
//
// Story 4.4 will populate the `lineage` field on `OK` results.
// Story 4.5 (back-end mode) + Epic 6 Story 6.1 (handler) wire the manual
// coefficient path through the same `runAttribution` entry point.
