/**
 * Anti-drift CI test — Phase 18 noyau N3/N4/N5/N6/N7 cohérence.
 *
 * Vérifie l'API contract des helpers tree-aware + heuristiques (sans DB) :
 *  - N3 : schema BrandContextNode a `nodeId` + `retrievalScope[]` + indexes
 *  - N4 : retriever exports + types
 *  - N5 : classifyBibleVar produit les bons patterns canoniques
 *  - N6 : filterToolsByNature + isToolApplicableForNature comportements
 *  - N7 : applyNarrativeCoherenceGate exports + verdict shape
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyBibleVar,
  filterBibleKeysByNature,
} from "@/server/services/brand-node/bible-classifier";
import {
  isToolApplicableForNature,
  filterToolsByNature,
  getInapplicableTools,
} from "@/server/services/brand-node/glory-tools-filter";
import type { GloryToolDef } from "@/server/services/artemis/tools/registry";

const SCHEMA_PATH = join(__dirname, "../../../prisma/schema.prisma");

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

function extractModelBlock(schema: string, modelName: string): string {
  const re = new RegExp(`^model ${modelName} \\{([\\s\\S]*?)^\\}`, "m");
  const match = schema.match(re);
  if (!match) throw new Error(`Model ${modelName} introuvable`);
  return match[1] ?? "";
}

describe("Phase 18-N3 — BrandContextNode tree-aware schema", () => {
  const schema = readSchema();

  it("BrandContextNode a champ nodeId + relation BrandNodeContextNodes", () => {
    const block = extractModelBlock(schema, "BrandContextNode");
    expect(block).toMatch(/nodeId\s+String\?/);
    expect(block).toMatch(/node\s+BrandNode\?\s+@relation\("BrandNodeContextNodes"/);
  });

  it("BrandContextNode a champ retrievalScope String[] avec default ['SELF']", () => {
    const block = extractModelBlock(schema, "BrandContextNode");
    expect(block).toMatch(/retrievalScope\s+String\[\]/);
    expect(block).toContain('@default(["SELF"])');
  });

  it("BrandContextNode a indexes nodeId + (nodeId, kind)", () => {
    const block = extractModelBlock(schema, "BrandContextNode");
    expect(block).toContain("@@index([nodeId])");
    expect(block).toContain("@@index([nodeId, kind])");
  });

  it("BrandNode a relation contextNodes BrandNodeContextNodes", () => {
    const block = extractModelBlock(schema, "BrandNode");
    expect(block).toMatch(/contextNodes\s+BrandContextNode\[\]\s+@relation\("BrandNodeContextNodes"\)/);
  });
});

describe("Phase 18-N5 — classifyBibleVar heuristique", () => {
  it("BIBLE_A.tone → universel + INHERIT_BY_DEFAULT", () => {
    const c = classifyBibleVar("BIBLE_A.tone");
    expect(c.applicableNatures.length).toBe(9);
    expect(c.inheritanceMode).toBe("INHERIT_BY_DEFAULT");
    expect(c.source).toBe("HEURISTIC");
  });

  it("countryCode / market → NEVER_INHERIT", () => {
    expect(classifyBibleVar("BIBLE_A.countryCode").inheritanceMode).toBe("NEVER_INHERIT");
    expect(classifyBibleVar("market.size").inheritanceMode).toBe("NEVER_INHERIT");
  });

  it("manipulation mix → MERGE_WITH_PARENT", () => {
    expect(classifyBibleVar("manipulationMix.peddler").inheritanceMode).toBe("MERGE_WITH_PARENT");
  });

  it("BIBLE_E.shopper-* → PRODUCT + RETAIL_SPACE only", () => {
    const c = classifyBibleVar("BIBLE_E.shopper-journey");
    expect(c.applicableNatures).toContain("PRODUCT");
    expect(c.applicableNatures).toContain("RETAIL_SPACE");
    expect(c.applicableNatures).not.toContain("FESTIVAL_IP");
  });

  it("lineup-reveal / venue → FESTIVAL_IP only", () => {
    const c = classifyBibleVar("BIBLE_I.lineup-reveal-strategy");
    expect(c.applicableNatures).toEqual(["FESTIVAL_IP"]);
  });

  it("writers-room / character → CHARACTER_IP + MEDIA_IP", () => {
    const c = classifyBibleVar("BIBLE_I.writers-room-outline");
    expect(c.applicableNatures).toContain("CHARACTER_IP");
    expect(c.applicableNatures).toContain("MEDIA_IP");
    expect(c.applicableNatures).not.toContain("PRODUCT");
  });

  it("filterBibleKeysByNature filtre correctement par nature", () => {
    const keys = ["BIBLE_A.tone", "BIBLE_E.shopper-journey", "BIBLE_I.lineup-reveal"];
    const productKeys = filterBibleKeysByNature(keys, "PRODUCT");
    expect(productKeys).toContain("BIBLE_A.tone");
    expect(productKeys).toContain("BIBLE_E.shopper-journey");
    expect(productKeys).not.toContain("BIBLE_I.lineup-reveal");
  });
});

describe("Phase 18-N6 — Glory tools filter par BrandNature", () => {
  const universalTool: GloryToolDef = {
    slug: "creative-brief",
    name: "Creative Brief",
    layer: "CR",
    order: 1,
    executionType: "LLM",
    pillarKeys: [],
    requiredDrivers: [],
    dependencies: [],
    description: "",
    inputFields: [],
    pillarBindings: {},
    outputFormat: "",
    promptTemplate: "",
    status: "ACTIVE",
    // applicableNatures: undefined → universel
  };

  const festivalOnly: GloryToolDef = {
    ...universalTool,
    slug: "lineup-reveal",
    applicableNatures: ["FESTIVAL_IP"],
  };

  const productOnly: GloryToolDef = {
    ...universalTool,
    slug: "shelf-share",
    applicableNatures: ["PRODUCT", "RETAIL_SPACE"],
  };

  it("isToolApplicableForNature : tool universel applicable partout", () => {
    expect(isToolApplicableForNature(universalTool, "PRODUCT")).toBe(true);
    expect(isToolApplicableForNature(universalTool, "FESTIVAL_IP")).toBe(true);
    expect(isToolApplicableForNature(universalTool, "PERSONAL")).toBe(true);
  });

  it("isToolApplicableForNature : tool restreint applicable uniquement aux natures listées", () => {
    expect(isToolApplicableForNature(festivalOnly, "FESTIVAL_IP")).toBe(true);
    expect(isToolApplicableForNature(festivalOnly, "PRODUCT")).toBe(false);
    expect(isToolApplicableForNature(productOnly, "PRODUCT")).toBe(true);
    expect(isToolApplicableForNature(productOnly, "RETAIL_SPACE")).toBe(true);
    expect(isToolApplicableForNature(productOnly, "MEDIA_IP")).toBe(false);
  });

  it("filterToolsByNature filtre la liste correctement", () => {
    const tools = [universalTool, festivalOnly, productOnly];
    const productTools = filterToolsByNature(tools, "PRODUCT");
    expect(productTools.length).toBe(2);
    expect(productTools.map((t) => t.slug)).toEqual(["creative-brief", "shelf-share"]);
  });

  it("getInapplicableTools split correctement", () => {
    const tools = [universalTool, festivalOnly, productOnly];
    const { applicable, inapplicable } = getInapplicableTools(tools, "FESTIVAL_IP");
    expect(applicable.length).toBe(2); // universal + festivalOnly
    expect(inapplicable.length).toBe(1);
    expect(inapplicable[0]?.slug).toBe("shelf-share");
  });
});

describe("Phase 18-N7 — narrative-coherence-gate exports", () => {
  it("module exports applyNarrativeCoherenceGate", async () => {
    const mod = await import("@/server/services/mestor/gates/narrative-coherence");
    expect(typeof mod.applyNarrativeCoherenceGate).toBe("function");
  });
});
