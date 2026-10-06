import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { competitorScope } from "@/server/services/seshat/creative-intelligence/competition";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import { manifest } from "@/server/services/creative-intelligence/manifest";

describe("creative evidence guardrails (HARD)", () => {
  it("scopes competing studies by country, sector and originating brand", () => {
    expect(competitorScope("brand-a", "food", "CI")).toEqual({ sector: "food", countryCode: "CI", OR: [
      { visibility: "PUBLIC", strategyId: null, studyId: null, source: { not: null } },
      { visibility: "BRAND", strategyId: "brand-a" }, { visibility: "BRAND", strategyId: null, study: { strategyId: "brand-a" } },
    ] });
    expect(competitorScope(undefined, "food", "CI").OR).toHaveLength(1);
    const track = readFileSync("src/server/services/rtis-protocols/track.ts", "utf8");
    expect(track).toContain("loadScopedCompetitors(strategyId)");
    expect(track).not.toContain("db.competitorSnapshot.findMany");
  });
  it("keeps shared knowledge readers away from recipes and private provenance", () => {
    const source = readFileSync("src/server/services/seshat/references.ts", "utf8");
    expect(source).toContain("originStrategyId: null");
    expect(source).toContain('equals: "creative-recipe-v1"');
  });
  it("registers every mutation, zero-cost and under the existing observation governor", () => {
    for (const kind of manifest.acceptsIntents ?? []) {
      expect(INTENT_KINDS.find(k => k.kind === kind)).toMatchObject({ governor: "SESHAT", handler: "creative-intelligence" });
      expect(INTENT_SLOS.find(k => k.kind === kind)?.costP95Usd).toBe(0);
    }
    const registry = readFileSync("src/server/governance/__generated__/manifest-imports.ts", "utf8");
    expect(registry).toContain("creative-intelligence/manifest");
  });
  it("never maps ad impressions to video views", () => {
    const source = readFileSync("src/server/services/seshat/creative-intelligence/index.ts", "utf8");
    expect(source).not.toMatch(/views\s*=.*post_impressions/);
    expect(source).toContain('paidStatus: "UNKNOWN"');
  });
});
