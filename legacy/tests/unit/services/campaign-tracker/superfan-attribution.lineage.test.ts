/**
 * Phase 23 Epic 4 Story 4.4 — `extractLineage` + `scoreFromActions` lineage
 * population.
 *
 * AC coverage :
 *   - lineage populated with actual devotion transitions (campaignId +
 *     transitionFrom + transitionTo + observedAt) on OK results.
 *   - evangelist count derivable from
 *     `lineage.filter(t => t.transitionTo === "Evangelist").length`.
 *   - INSUFFICIENT_DATA → lineage is structurally absent (the discriminated
 *     union forbids it on the INSUFFICIENT_DATA arm — type-level guarantee).
 *   - count expansion : a `{ from, to, count: N }` record yields N entries.
 *   - tolerant rung mapping across the repo's multiple devotion vocabularies.
 *   - non-Ambassador/Evangelist targets dropped ; downward/lateral dropped.
 *
 * Cf. _bmad-output/implementation-artifacts/4-4-evangelist-count-and-lineage.md
 */

import { describe, expect, it } from "vitest";

import {
  type AttributionInputAction,
  extractLineage,
  isAttributionInsufficient,
  isAttributionOk,
  scoreFromActions,
} from "@/server/services/campaign-tracker/superfan-attribution";

const FALLBACK = "2026-05-28T00:00:00.000Z";

function action(
  campaignId: string,
  transitions: Array<{ from: string; to: string; count: number }>,
  observedAt?: string,
): AttributionInputAction {
  return {
    campaignActionId: `act-${Math.random().toString(36).slice(2)}`,
    campaignId,
    bigIdeaCoherenceScore: 0.6,
    budget: 100_000,
    devotionTransitionsObserved: transitions,
    observedAt,
  };
}

describe("Phase 23 Story 4.4 — extractLineage tolerant mapping", () => {
  it("maps French canonical AMBASSADEUR→EVANGELISTE to the English alphabet", () => {
    const lineage = extractLineage(
      [action("c1", [{ from: "AMBASSADEUR", to: "EVANGELISTE", count: 1 }], FALLBACK)],
      FALLBACK,
    );
    expect(lineage).toEqual([
      {
        campaignId: "c1",
        transitionFrom: "Ambassador",
        transitionTo: "Evangelist",
        observedAt: FALLBACK,
      },
    ]);
  });

  it("maps ENGAGE→AMBASSADEUR to Convinced→Ambassador", () => {
    const lineage = extractLineage(
      [action("c1", [{ from: "ENGAGE", to: "AMBASSADEUR", count: 1 }])],
      FALLBACK,
    );
    expect(lineage[0]).toMatchObject({ transitionFrom: "Convinced", transitionTo: "Ambassador" });
  });

  it("expands by count : a count:3 record yields 3 lineage entries (AC #2 derivability)", () => {
    const lineage = extractLineage(
      [action("c1", [{ from: "AMBASSADEUR", to: "EVANGELISTE", count: 3 }])],
      FALLBACK,
    );
    expect(lineage).toHaveLength(3);
    expect(lineage.filter((t) => t.transitionTo === "Evangelist")).toHaveLength(3);
  });

  it("drops transitions that do NOT end at Ambassador/Evangelist (INITIE→FIDELE)", () => {
    const lineage = extractLineage(
      [action("c1", [{ from: "INITIE", to: "FIDELE", count: 5 }])],
      FALLBACK,
    );
    expect(lineage).toEqual([]);
  });

  it("drops downward / lateral transitions (EVANGELISTE→AMBASSADEUR is malformed telemetry)", () => {
    const lineage = extractLineage(
      [action("c1", [{ from: "EVANGELISTE", to: "AMBASSADEUR", count: 2 }])],
      FALLBACK,
    );
    // EVANGELISTE is terminal — `normalizeFromRung` returns null → dropped.
    expect(lineage).toEqual([]);
  });

  it("drops Ambassador→Ambassador (non-monotonic, equal rung)", () => {
    const lineage = extractLineage(
      [action("c1", [{ from: "AMBASSADEUR", to: "AMBASSADEUR", count: 2 }])],
      FALLBACK,
    );
    expect(lineage).toEqual([]);
  });

  it("drops zero / negative / non-integer counts", () => {
    const lineage = extractLineage(
      [
        action("c1", [
          { from: "AMBASSADEUR", to: "EVANGELISTE", count: 0 },
          { from: "AMBASSADEUR", to: "EVANGELISTE", count: -3 },
        ]),
      ],
      FALLBACK,
    );
    expect(lineage).toEqual([]);
  });

  it("stamps observedAt from the action when present, else the fallback", () => {
    const lineage = extractLineage(
      [
        action("c1", [{ from: "AMBASSADEUR", to: "EVANGELISTE", count: 1 }], "2026-01-01T00:00:00.000Z"),
        action("c2", [{ from: "ENGAGE", to: "AMBASSADEUR", count: 1 }]), // no observedAt
      ],
      FALLBACK,
    );
    expect(lineage[0]!.observedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(lineage[1]!.observedAt).toBe(FALLBACK);
  });

  it("ignores malformed records (non-array, non-object, missing fields)", () => {
    const malformed: AttributionInputAction = {
      campaignActionId: "x",
      campaignId: "c1",
      bigIdeaCoherenceScore: null,
      budget: null,
      devotionTransitionsObserved: "not-an-array",
      observedAt: FALLBACK,
    };
    expect(extractLineage([malformed], FALLBACK)).toEqual([]);
  });

  it("evangelist count is derivable per AC #2 across a mixed window", () => {
    const lineage = extractLineage(
      [
        action("c1", [
          { from: "AMBASSADEUR", to: "EVANGELISTE", count: 4 }, // 4 evangelists
          { from: "ENGAGE", to: "AMBASSADEUR", count: 7 }, // 7 ambassadors (not evangelists)
          { from: "INITIE", to: "FIDELE", count: 99 }, // dropped
        ]),
      ],
      FALLBACK,
    );
    const evangelistCount = lineage.filter((t) => t.transitionTo === "Evangelist").length;
    const ambassadorCount = lineage.filter((t) => t.transitionTo === "Ambassador").length;
    expect(evangelistCount).toBe(4);
    expect(ambassadorCount).toBe(7);
    expect(lineage).toHaveLength(11);
  });
});

describe("Phase 23 Story 4.4 — scoreFromActions lineage on OK arm", () => {
  function denseWindow(): AttributionInputAction[] {
    // 40 actions carry a coherence score (samples ≥ 30 → OK).
    // Every 4th action records an evangelist-producing transition.
    return Array.from({ length: 40 }, (_, i) =>
      action(
        "campaign-x",
        i % 4 === 0 ? [{ from: "AMBASSADEUR", to: "EVANGELISTE", count: 1 }] : [],
        `2026-05-${String((i % 27) + 1).padStart(2, "0")}T00:00:00.000Z`,
      ),
    );
  }

  it("OK arm carries the populated lineage (campaignId + rungs + observedAt)", () => {
    const { result } = scoreFromActions(denseWindow(), { snapshotRef: "snap-4.4" });
    expect(isAttributionOk(result)).toBe(true);
    if (isAttributionOk(result)) {
      // 10 of 40 actions (i % 4 === 0) recorded one EVANGELISTE transition each.
      expect(result.lineage).toHaveLength(10);
      const evangelistCount = result.lineage.filter((t) => t.transitionTo === "Evangelist").length;
      expect(evangelistCount).toBe(10);
      for (const t of result.lineage) {
        expect(t.campaignId).toBe("campaign-x");
        expect(t.transitionFrom).toBe("Ambassador");
        expect(t.transitionTo).toBe("Evangelist");
        expect(typeof t.observedAt).toBe("string");
        expect(t.observedAt.length).toBeGreaterThan(0);
      }
    }
  });

  it("INSUFFICIENT_DATA arm has NO lineage field (type-level guarantee, AC #3)", () => {
    // Sparse : only 5 actions carry signal → below the 30 threshold.
    const sparse = Array.from({ length: 5 }, (_, i) =>
      action("c1", [{ from: "AMBASSADEUR", to: "EVANGELISTE", count: 1 }], FALLBACK + i),
    );
    const { result } = scoreFromActions(sparse, { snapshotRef: "snap-sparse" });
    expect(isAttributionInsufficient(result)).toBe(true);
    // The discriminated union forbids `lineage` on the INSUFFICIENT_DATA arm —
    // `"lineage" in result` must be false (not undefined-by-accident).
    expect("lineage" in result).toBe(false);
  });

  it("observedAtFallback from opts is used when actions omit observedAt", () => {
    const noTimestamps = Array.from({ length: 35 }, () =>
      action("c1", [{ from: "AMBASSADEUR", to: "EVANGELISTE", count: 1 }]),
    );
    const { result } = scoreFromActions(noTimestamps, {
      snapshotRef: "snap-fb",
      observedAtFallback: "2099-12-31T00:00:00.000Z",
    });
    expect(isAttributionOk(result)).toBe(true);
    if (isAttributionOk(result)) {
      expect(result.lineage.every((t) => t.observedAt === "2099-12-31T00:00:00.000Z")).toBe(true);
    }
  });
});
