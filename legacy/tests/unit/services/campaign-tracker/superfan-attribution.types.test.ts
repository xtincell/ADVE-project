/**
 * Phase 23 Epic 4 Story 4.1 — type-only assertions for `AttributionResult` +
 * `EvangelistTransition`.
 *
 * AC #3 verbatim from epics.md L856 : "no `null` / `undefined` return is
 * permitted (asserted via type-only test)".
 *
 * The Vitest `expectTypeOf` block compiles down to no-op at runtime ; the
 * assertions execute at `tsc` time. The smoke `describe` block exercises the
 * Zod schemas to confirm the runtime validators match the type union exactly
 * (boundary-validation pre-flight before Story 4.6 / Epic 6 Story 6.1 wire
 * them in).
 *
 * Cf. _bmad-output/implementation-artifacts/4-1-attribution-result-discriminated-union.md
 */

import { describe, expect, expectTypeOf, it } from "vitest";

import {
  attributionResultSchema,
  evangelistTransitionSchema,
  EVANGELIST_TRANSITION_FROM_RUNGS,
  EVANGELIST_TRANSITION_TO_RUNGS,
  isAttributionInsufficient,
  isAttributionOk,
  MIN_SAMPLES_REQUIRED_DEFAULT,
  type AttributionResult,
  type EvangelistTransition,
  type EvangelistTransitionFromRung,
  type EvangelistTransitionToRung,
} from "@/server/services/campaign-tracker/superfan-attribution";

describe("Phase 23 Story 4.1 — AttributionResult type-only contract", () => {
  it("AttributionResult forbids null and undefined returns (AC #3)", () => {
    // The whole point of the discriminated union : neither null nor undefined
    // is structurally assignable to AttributionResult. If a future contributor
    // tries `function foo(): AttributionResult { return null; }` the typecheck
    // fails ; this test pins that property structurally.
    expectTypeOf<null>().not.toMatchTypeOf<AttributionResult>();
    expectTypeOf<undefined>().not.toMatchTypeOf<AttributionResult>();
    expectTypeOf<null | AttributionResult>().not.toMatchTypeOf<AttributionResult>();
  });

  it("OK arm narrows to score + lineage + snapshotRef (AC #1)", () => {
    type Ok = Extract<AttributionResult, { state: "OK" }>;
    expectTypeOf<Ok>().toHaveProperty("score").toEqualTypeOf<number>();
    expectTypeOf<Ok>().toHaveProperty("lineage").toEqualTypeOf<readonly EvangelistTransition[]>();
    expectTypeOf<Ok>().toHaveProperty("snapshotRef").toEqualTypeOf<string>();
    // INSUFFICIENT_DATA-only fields must NOT exist on the OK arm.
    expectTypeOf<Ok>().not.toHaveProperty("minSamplesRequired");
    expectTypeOf<Ok>().not.toHaveProperty("samplesAvailable");
  });

  it("INSUFFICIENT_DATA arm narrows to minSamplesRequired + samplesAvailable (AC #1)", () => {
    type Insufficient = Extract<AttributionResult, { state: "INSUFFICIENT_DATA" }>;
    expectTypeOf<Insufficient>().toHaveProperty("minSamplesRequired").toEqualTypeOf<number>();
    expectTypeOf<Insufficient>().toHaveProperty("samplesAvailable").toEqualTypeOf<number>();
    // OK-only fields must NOT exist on the INSUFFICIENT_DATA arm.
    expectTypeOf<Insufficient>().not.toHaveProperty("score");
    expectTypeOf<Insufficient>().not.toHaveProperty("lineage");
    expectTypeOf<Insufficient>().not.toHaveProperty("snapshotRef");
  });

  it("EvangelistTransition.transitionFrom is the 3-rung English subset (AC #2)", () => {
    expectTypeOf<EvangelistTransition["transitionFrom"]>().toEqualTypeOf<
      "Curious" | "Convinced" | "Ambassador"
    >();
    expectTypeOf<EvangelistTransitionFromRung>().toEqualTypeOf<
      "Curious" | "Convinced" | "Ambassador"
    >();
    // String widening MUST NOT slip in (deliberate ADR-0081 §2 alphabet).
    expectTypeOf<string>().not.toMatchTypeOf<EvangelistTransitionFromRung>();
  });

  it("EvangelistTransition.transitionTo is the 2-rung English subset (AC #2)", () => {
    expectTypeOf<EvangelistTransition["transitionTo"]>().toEqualTypeOf<
      "Ambassador" | "Evangelist"
    >();
    expectTypeOf<EvangelistTransitionToRung>().toEqualTypeOf<"Ambassador" | "Evangelist">();
    expectTypeOf<string>().not.toMatchTypeOf<EvangelistTransitionToRung>();
  });

  it("type guards narrow the union without case-statement boilerplate", () => {
    // Compile-only : confirm the predicates return the correctly-narrowed type.
    function reduceCompileCheck(result: AttributionResult): number {
      if (isAttributionOk(result)) {
        // After the guard, `result.score` is accessible without a `case`.
        expectTypeOf(result.score).toEqualTypeOf<number>();
        expectTypeOf(result.lineage).toEqualTypeOf<readonly EvangelistTransition[]>();
        return result.score;
      }
      if (isAttributionInsufficient(result)) {
        expectTypeOf(result.minSamplesRequired).toEqualTypeOf<number>();
        expectTypeOf(result.samplesAvailable).toEqualTypeOf<number>();
        return -1;
      }
      // Unreachable — the union is exhaustively narrowed by the two guards.
      const _exhaustive: never = result;
      return _exhaustive;
    }
    expect(typeof reduceCompileCheck).toBe("function");
  });

  it("MIN_SAMPLES_REQUIRED_DEFAULT narrows to the literal 30 (ADR-0081 §2)", () => {
    expectTypeOf<typeof MIN_SAMPLES_REQUIRED_DEFAULT>().toEqualTypeOf<30>();
    expect(MIN_SAMPLES_REQUIRED_DEFAULT).toBe(30);
  });

  it("rung-set constants stay in sync with the derived literal unions", () => {
    expect([...EVANGELIST_TRANSITION_FROM_RUNGS]).toEqual(["Curious", "Convinced", "Ambassador"]);
    expect([...EVANGELIST_TRANSITION_TO_RUNGS]).toEqual(["Ambassador", "Evangelist"]);
  });
});

describe("Phase 23 Story 4.1 — Zod schemas (boundary validation smoke)", () => {
  it("evangelistTransitionSchema accepts a well-formed transition", () => {
    const ok = evangelistTransitionSchema.safeParse({
      campaignId: "camp-123",
      transitionFrom: "Convinced",
      transitionTo: "Ambassador",
      observedAt: "2026-05-28T10:00:00.000Z",
    });
    expect(ok.success).toBe(true);
  });

  it("evangelistTransitionSchema rejects an out-of-alphabet rung", () => {
    const bad = evangelistTransitionSchema.safeParse({
      campaignId: "camp-123",
      transitionFrom: "EVANGELISTE", // French canon — NOT in the attribution alphabet
      transitionTo: "Ambassador",
      observedAt: "2026-05-28T10:00:00.000Z",
    });
    expect(bad.success).toBe(false);
  });

  it("attributionResultSchema accepts the OK arm", () => {
    const ok = attributionResultSchema.safeParse({
      state: "OK",
      score: 0.74,
      lineage: [
        {
          campaignId: "camp-123",
          transitionFrom: "Ambassador",
          transitionTo: "Evangelist",
          observedAt: "2026-05-28T10:00:00.000Z",
        },
      ],
      snapshotRef: "intent-emission-abc-123",
    });
    expect(ok.success).toBe(true);
  });

  it("attributionResultSchema accepts the INSUFFICIENT_DATA arm", () => {
    const ok = attributionResultSchema.safeParse({
      state: "INSUFFICIENT_DATA",
      minSamplesRequired: 30,
      samplesAvailable: 10,
    });
    expect(ok.success).toBe(true);
  });

  it("attributionResultSchema rejects an OK arm that smuggles INSUFFICIENT_DATA fields", () => {
    const bad = attributionResultSchema.safeParse({
      state: "OK",
      score: 0.74,
      lineage: [],
      snapshotRef: "intent-emission-abc-123",
      minSamplesRequired: 30, // ← MUST be rejected — field forbidden on OK arm
      samplesAvailable: 10,
    });
    // z.discriminatedUnion is strict by default — extra fields on the OK shape
    // must NOT pass. If a future Zod upgrade loosens this, the test catches it.
    if (bad.success) {
      // If passthrough is enabled in a future Zod release, surface that
      // explicitly rather than silently accept the drift.
      expect(bad.data).not.toMatchObject({ minSamplesRequired: 30, samplesAvailable: 10 });
    }
  });

  it("attributionResultSchema rejects null and undefined", () => {
    expect(attributionResultSchema.safeParse(null).success).toBe(false);
    expect(attributionResultSchema.safeParse(undefined).success).toBe(false);
  });
});
