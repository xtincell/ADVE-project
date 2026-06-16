/**
 * Anti-drift — base de scoring ADVE déterministe FIGÉE (ADR-0102).
 *
 * L'opérateur a signalé la base /25 par pilier (`scoreStructural × poids biz`)
 * comme « non figée ». Ce test la fige en invariant CI :
 *
 *   1. Poids structurels canoniques (Annexe G) = {atoms:15, collections:7,
 *      crossRefs:3}, somme = PILLAR_MAX_SCORE = 25, composite = 200.
 *   2. Le plafond composite (200) est aligné sur l'échelle brand-tier /200.
 *   3. Déterminisme strict (variance = 0) — même entrée → même sortie.
 *   4. Plafonnement à 25 par pilier.
 *   5. Poids business-context déterministes + clampés [0.5, 2.5].
 *   6. **LOI 9 — aucun LLM dans le chemin de scoring** : ni `scoring.ts`, ni
 *      `advertis-scorer/structural.ts`, ni `advertis-scorer/index.ts` ne doit
 *      appeler une primitive LLM ou un « quality modulator ». C'est la garantie
 *      « non-dépendance au LLM » du scoring, désormais runtime-vérifiée.
 *
 * Mode HARD — toute dérive bloque le merge. Modifier la base = changer la
 * doctrine (ADR-0102) ET ce test, consciemment.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  STRUCTURAL_WEIGHTS,
  PILLAR_MAX_SCORE,
  COMPOSITE_MAX_SCORE,
  scorePillarStructural,
  computeComposite,
} from "@/lib/utils/scoring";
import { TIER_UPPER_BOUNDS_200 } from "@/domain/brand-tier";
import {
  getPillarWeightsForContext,
  type BusinessContext,
} from "@/lib/types/business-context";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

describe("ADR-0102 — scoring base canon (poids figés)", () => {
  it("structural weights are the canonical Annexe G triple {15, 7, 3}", () => {
    expect(STRUCTURAL_WEIGHTS.atoms).toBe(15);
    expect(STRUCTURAL_WEIGHTS.collections).toBe(7);
    expect(STRUCTURAL_WEIGHTS.crossRefs).toBe(3);
  });

  it("weights sum to PILLAR_MAX_SCORE = 25", () => {
    const sum =
      STRUCTURAL_WEIGHTS.atoms + STRUCTURAL_WEIGHTS.collections + STRUCTURAL_WEIGHTS.crossRefs;
    expect(sum).toBe(25);
    expect(PILLAR_MAX_SCORE).toBe(25);
  });

  it("composite ceiling = 8 × 25 = 200, aligned with the brand-tier /200 scale", () => {
    expect(COMPOSITE_MAX_SCORE).toBe(200);
    // ICONE is the open apex above CULTE's upper bound; the whole ladder lives
    // on /200, so the composite ceiling must match.
    expect(TIER_UPPER_BOUNDS_200.CULTE).toBeLessThan(COMPOSITE_MAX_SCORE);
  });
});

describe("ADR-0102 — scoring is deterministic (LOI 9, variance = 0)", () => {
  it("identical input → identical output across 200 calls", () => {
    const input = {
      atomesValides: 6,
      atomesRequis: 12,
      collectionsCompletes: 1,
      collectionsTotales: 3,
      crossRefsValides: 1,
      crossRefsRequises: 2,
    };
    const results = Array.from({ length: 200 }, () => scorePillarStructural(input));
    expect(new Set(results).size).toBe(1);
  });

  it("full completeness → exactly PILLAR_MAX_SCORE", () => {
    expect(
      scorePillarStructural({
        atomesValides: 12,
        atomesRequis: 12,
        collectionsCompletes: 3,
        collectionsTotales: 3,
        crossRefsValides: 2,
        crossRefsRequises: 2,
      }),
    ).toBe(PILLAR_MAX_SCORE);
  });

  it("over-completeness is clamped at PILLAR_MAX_SCORE", () => {
    expect(
      scorePillarStructural({
        atomesValides: 99,
        atomesRequis: 12,
        collectionsCompletes: 99,
        collectionsTotales: 3,
        crossRefsValides: 99,
        crossRefsRequises: 2,
      }),
    ).toBe(PILLAR_MAX_SCORE);
  });

  it("composite is the deterministic sum of 8 pillars, ≤ COMPOSITE_MAX_SCORE", () => {
    const composite = computeComposite({ a: 25, d: 25, v: 25, e: 25, r: 25, t: 25, i: 25, s: 25 });
    expect(composite).toBe(COMPOSITE_MAX_SCORE);
  });
});

describe("ADR-0102 — business-context weights are deterministic + clamped", () => {
  const ctx: BusinessContext = {
    businessModel: "PLATEFORME",
    economicModels: ["COMMISSION"],
    positioningArchetype: "LUXE",
    salesChannel: "DIRECT",
    positionalGoodFlag: true,
    premiumScope: "FULL",
    brandNature: "FESTIVAL_IP",
  };

  it("same context → same weights (variance = 0)", () => {
    const a = getPillarWeightsForContext(ctx);
    const b = getPillarWeightsForContext(ctx);
    expect(a).toEqual(b);
  });

  it("every weight is clamped to the canonical [0.5, 2.5] band", () => {
    const w = getPillarWeightsForContext(ctx);
    for (const v of Object.values(w)) {
      expect(v).toBeGreaterThanOrEqual(0.5);
      expect(v).toBeLessThanOrEqual(2.5);
    }
  });
});

describe("ADR-0102 / LOI 9 — no LLM in the scoring path", () => {
  // The deterministic guarantee is meaningless if the scoring path can reach an
  // LLM. Scan the source (comments stripped) for any LLM primitive or the
  // removed quality modulator.
  const SCORING_PATH = [
    "lib/utils/scoring.ts",
    "server/services/advertis-scorer/structural.ts",
    "server/services/advertis-scorer/index.ts",
  ];

  const FORBIDDEN = [
    "callLLM(",
    "callLLMAndParse(",
    "executeStructuredLLMCall",
    "executeFramework(",
    "executeTool(",
    "executeSequence(",
    "llm-gateway",
    "applyQualityModulator",
    "qualityModulator",
  ];

  it.each(SCORING_PATH)("%s contains no LLM/quality-modulator primitive", (rel) => {
    const raw = readFileSync(join(SRC, rel), "utf-8");
    const codeOnly = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    for (const token of FORBIDDEN) {
      expect(codeOnly, `Primitive interdite « ${token} » dans ${rel} (LOI 9)`).not.toContain(token);
    }
  });

  it("applyQualityModulator no longer exists in the scoring module (ADR-0102 removal)", async () => {
    const mod = (await import("@/lib/utils/scoring")) as Record<string, unknown>;
    expect(mod.applyQualityModulator).toBeUndefined();
  });
});
