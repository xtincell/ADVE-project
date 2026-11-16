import { afterAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";

const knowledgeReads = vi.hoisted(() => {
  vi.stubEnv("SESHAT_API_URL", "");
  return vi.fn().mockResolvedValue([]);
});
vi.mock("@/lib/db", () => ({ db: { knowledgeEntry: { findMany: knowledgeReads } } }));
afterAll(() => vi.unstubAllEnvs());

import { competitorScope } from "@/server/services/seshat/creative-intelligence/competition";
import { enrichBrief, queryReferences } from "@/server/services/seshat/references";
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
  it("keeps every shared reader away from recipes, expired evidence and private provenance while preserving absent SQL/JSON values", async () => {
    knowledgeReads.mockClear();
    await enrichBrief({ channel: "fixture-channel", sector: "fixture-sector", market: "fixture-market" });
    await queryReferences({ topic: "fixture", sector: "fixture-sector", market: "fixture-market", pillarFocus: "a" });
    // Exercise both brief reads and all three query fallback branches, without IO.
    expect(knowledgeReads).toHaveBeenCalledTimes(5);
    for (const [query] of knowledgeReads.mock.calls) {
      expect(query.where.originStrategyId).toBeNull();
      expect(query.where.sampleSize).toEqual({ gte: 3 });
      expect(query.where.NOT).toEqual([{ data: { path: ["strategyId"], not: Prisma.DbNull } }]);
      // Exact nested predicates: an extra permissive OR arm must fail this HARD guard.
      // NOT(schema equals recipe) would exclude missing paths under PostgreSQL NULL semantics.
      expect(query.where.AND).toEqual([
        { OR: [{ sourceHash: null }, { sourceHash: { not: "aggregator-expired" } }] },
        { OR: [{ data: { path: ["schema"], equals: Prisma.DbNull } }, { data: { path: ["schema"], not: "creative-recipe-v1" } }] },
      ]);
      const types = typeof query.where.entryType === "string" ? [query.where.entryType] : query.where.entryType.in;
      expect(types.length).toBeGreaterThan(0);
      for (const type of types) expect(["SECTOR_BENCHMARK", "BRIEF_PATTERN", "CAMPAIGN_TEMPLATE"]).toContain(type);
    }
  });
  it("registers every mutation under the observation governor and budgets only assisted analysis", () => {
    for (const kind of manifest.acceptsIntents ?? []) {
      expect(INTENT_KINDS.find(k => k.kind === kind)).toMatchObject({ governor: "SESHAT", handler: "creative-intelligence" });
      const cost = INTENT_SLOS.find(k => k.kind === kind)?.costP95Usd;
      if (kind === "SESHAT_DRAFT_CREATIVE_ANALYSIS") expect(cost).toBe(0.15);
      else if (kind === "SESHAT_INDEX_CREATIVE_PATTERNS") expect(cost).toBe(0.05);
      else expect(cost).toBe(0);
    }
    const registry = readFileSync("src/server/governance/__generated__/manifest-imports.ts", "utf8");
    expect(registry).toContain("creative-intelligence/manifest");
  });
  it("never admits model drafts into the empirical recipe corpus", () => {
    const source = readFileSync("src/server/services/seshat/creative-intelligence/index.ts", "utf8");
    expect(source).toContain('analyses: { where: { taxonomyVersion: TAXONOMY_VERSION, method: "MANUAL",');
    const draft = readFileSync("src/server/services/seshat/creative-intelligence/assisted-analysis.ts", "utf8");
    expect(draft).toContain('method: "MODEL_DRAFT"');
    expect(draft).toContain("return annotateSpecimen(");
    expect(draft).not.toMatch(/creativeAnalysis\.update\(/);
  });
  it("never maps ad impressions to video views", () => {
    const source = readFileSync("src/server/services/seshat/creative-intelligence/index.ts", "utf8");
    expect(source).not.toMatch(/views\s*=.*post_impressions/);
    expect(source).toContain('paidStatus: "UNKNOWN"');
  });
});
