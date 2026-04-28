import { describe, it, expect } from "vitest";
import { INTENT_KINDS, INTENT_KIND_BY_NAME, intentKindExists } from "@/server/governance/intent-kinds";
import { INTENT_SLOS, SLO_BY_KIND } from "@/server/governance/slos";

describe("intent kinds catalog", () => {
  it("every kind name is unique", () => {
    const names = INTENT_KINDS.map((k) => k.kind);
    expect(new Set(names).size).toBe(names.length);
  });

  it("the V5.4 ranker / Jehuty / hyperviseur kinds are registered", () => {
    for (const k of [
      "RANK_PEERS",
      "SEARCH_BRAND_CONTEXT",
      "JEHUTY_FEED_REFRESH",
      "JEHUTY_CURATE",
      "HYPERVISEUR_PEER_INSIGHTS",
      "LIFT_INTAKE_TO_STRATEGY",
      "EXPORT_ORACLE",
    ]) {
      expect(intentKindExists(k)).toBe(true);
    }
  });

  it("INTENT_KIND_BY_NAME indexes the catalog correctly", () => {
    expect(INTENT_KIND_BY_NAME.size).toBe(INTENT_KINDS.length);
    for (const k of INTENT_KINDS) {
      expect(INTENT_KIND_BY_NAME.get(k.kind)).toBe(k);
    }
  });

  it("every intent kind has a paired SLO", () => {
    const sloNames = new Set(INTENT_SLOS.map((s) => s.kind));
    const skip = new Set(["LEGACY_MUTATION", "CORRECT_INTENT", "APPLY_RECOMMENDATIONS", "BUILD_PLAN"]);
    for (const k of INTENT_KINDS) {
      if (skip.has(k.kind)) continue;
      expect(sloNames.has(k.kind), `missing SLO for ${k.kind}`).toBe(true);
    }
  });

  it("SLO_BY_KIND is consistent", () => {
    for (const slo of INTENT_SLOS) {
      expect(SLO_BY_KIND.get(slo.kind)).toBe(slo);
    }
  });
});
