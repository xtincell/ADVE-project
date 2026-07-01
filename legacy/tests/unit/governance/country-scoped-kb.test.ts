/**
 * Anti-drift test : Country-Scoped Knowledge Base (ADR-0037 PR-F).
 *
 * Asserts:
 *   1. KnowledgeEntry Prisma model has `countryCode` field (introspection).
 *   2. New KnowledgeType enum values are present.
 *   3. Trend Tracker 49 catalog has exactly 49 entries.
 *   4. checkSectorKnowledgeByCountry function is exported from tarsis.
 *   5. SearchContext type includes countryCode + meta fields.
 *   6. No `db.knowledgeEntry.create` callsite in seshat services writes
 *      without considering countryCode (regex source-level audit).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf-8");
}

describe("Country-Scoped Knowledge Base (ADR-0037)", () => {
  it("Prisma schema has countryCode field on KnowledgeEntry", () => {
    const schema = read("prisma/schema.prisma");
    const block = schema.match(/model KnowledgeEntry \{[^}]+\}/);
    expect(block, "KnowledgeEntry model not found").toBeDefined();
    expect(block![0]).toMatch(/countryCode\s+String\?\s+@db\.VarChar\(2\)/);
    expect(block![0]).toMatch(/@@index\(\[countryCode\]\)/);
    expect(block![0]).toMatch(/@@index\(\[sector,\s*countryCode\]\)/);
  });

  it("KnowledgeType enum includes the 5 new MarketStudy + EXTERNAL_FEED_DIGEST values", () => {
    const schema = read("prisma/schema.prisma");
    const enumBlock = schema.match(/enum KnowledgeType \{[^}]+\}/);
    expect(enumBlock).toBeDefined();
    const text = enumBlock![0];
    expect(text).toMatch(/\bMARKET_STUDY_TAM\b/);
    expect(text).toMatch(/\bMARKET_STUDY_COMPETITOR\b/);
    expect(text).toMatch(/\bMARKET_STUDY_SEGMENT\b/);
    expect(text).toMatch(/\bMARKET_STUDY_RAW\b/);
    expect(text).toMatch(/\bEXTERNAL_FEED_DIGEST\b/);
  });

  it("Trend Tracker 49 catalog has exactly 49 entries", async () => {
    const { TREND_TRACKER_49 } = await import("@/server/services/seshat/knowledge/trend-tracker-49");
    expect(TREND_TRACKER_49).toHaveLength(49);
    // All codes unique
    const codes = TREND_TRACKER_49.map((v) => v.code);
    expect(new Set(codes).size).toBe(49);
    // All categories valid
    const validCats = new Set(["MACRO_ECO", "MACRO_TECH", "SOCIO_CULT", "REGUL_INST", "MICRO_SECTOR"]);
    for (const v of TREND_TRACKER_49) {
      expect(validCats.has(v.category), `Invalid category for ${v.code}: ${v.category}`).toBe(true);
      expect(v.label.length).toBeGreaterThan(3);
      expect(v.unit.length).toBeGreaterThan(0);
      expect(v.llmExtractionHints.length).toBeGreaterThan(0);
    }
  });

  it("checkSectorKnowledgeByCountry is exported from tarsis", async () => {
    const mod = await import("@/server/services/seshat/tarsis");
    expect(mod.checkSectorKnowledgeByCountry).toBeDefined();
    expect(typeof mod.checkSectorKnowledgeByCountry).toBe("function");
  });

  it("SearchContext type has new pays-aware fields (source-level check)", () => {
    const src = read("src/server/services/seshat/tarsis/weak-signal-analyzer.ts");
    expect(src).toMatch(/countryCode\?:\s*string/);
    expect(src).toMatch(/countryName\?:\s*string/);
    expect(src).toMatch(/primaryLanguage\?:\s*string/);
    expect(src).toMatch(/purchasingPowerIndex\?:\s*number/);
    expect(src).toMatch(/region\?:\s*string/);
  });

  it("buildCountryContextPrompt is exported from signal-collector", async () => {
    const mod = await import("@/server/services/seshat/tarsis/signal-collector");
    expect(mod.buildCountryContextPrompt).toBeDefined();
    const block = mod.buildCountryContextPrompt({
      countryCode: "ZA",
      countryName: "Afrique du Sud",
      primaryLanguage: "en",
      purchasingPowerIndex: 300,
      region: "AFRICA_SOUTH",
    });
    expect(block).toMatch(/CONTEXTE PAYS/);
    expect(block).toMatch(/Afrique du Sud/);
    expect(block).toMatch(/CONTRAINTE DURE/);
    expect(block).toMatch(/300/);
  });

  it("buildCountryContextPrompt returns empty string when no countryCode", async () => {
    const { buildCountryContextPrompt } = await import("@/server/services/seshat/tarsis/signal-collector");
    expect(buildCountryContextPrompt({})).toBe("");
  });

  it("Seshat services pass countryCode to db.knowledgeEntry.create", () => {
    // Source-level regex audit : every db.knowledgeEntry.create in
    // seshat/** must reference `countryCode` somewhere within ~5 lines.
    const filesToAudit = [
      "src/server/services/seshat/tarsis/index.ts",
      "src/server/services/seshat/tarsis/weak-signal-analyzer.ts",
      "src/server/services/seshat/external-feeds/index.ts",
      "src/server/services/seshat/market-study-ingestion/persister.ts",
    ];
    const violations: string[] = [];
    for (const f of filesToAudit) {
      const src = read(f);
      const re = /db\.knowledgeEntry\.create\(\{[\s\S]{0,800}?\}\)/g;
      const matches = src.match(re) ?? [];
      for (const m of matches) {
        if (!m.includes("countryCode")) {
          violations.push(`${f}: db.knowledgeEntry.create without countryCode`);
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("PRIORITY_PAIRS includes ZA in external feeds", async () => {
    const { PRIORITY_PAIRS } = await import("@/server/services/seshat/external-feeds");
    expect(PRIORITY_PAIRS.some((p) => p.countryCode === "ZA")).toBe(true);
  });

  it("FETCH_EXTERNAL_FEED + INGEST_MARKET_STUDY + RE_EXTRACT_MARKET_STUDY are in INTENT_KINDS", async () => {
    const { INTENT_KINDS } = await import("@/server/governance/intent-kinds");
    const kinds = INTENT_KINDS.map((i) => i.kind);
    expect(kinds).toContain("FETCH_EXTERNAL_FEED");
    expect(kinds).toContain("INGEST_MARKET_STUDY");
    expect(kinds).toContain("RE_EXTRACT_MARKET_STUDY");
  });

  it("All 3 new Intent kinds have SLOs", async () => {
    const { INTENT_SLOS } = await import("@/server/governance/slos");
    const sloKinds = INTENT_SLOS.map((s) => s.kind);
    expect(sloKinds).toContain("FETCH_EXTERNAL_FEED");
    expect(sloKinds).toContain("INGEST_MARKET_STUDY");
    expect(sloKinds).toContain("RE_EXTRACT_MARKET_STUDY");
  });
});
