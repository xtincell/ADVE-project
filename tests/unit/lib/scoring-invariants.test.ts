/**
 * Anti-drift CI — invariants APOGEE de scoring.
 *
 * Audit ADR-0045 sur Makrea (mai 2026) a observé :
 * - Pillar scores affichés > 25/25 (Distinction 27.33, Strategy 25.93)
 * - Composite affiché 186.67/200 cohérent avec /200 mais aucun cap enforce
 * - Classification ICONE avec 0 superfans (incohérence avec définition canonique)
 *
 * Ces tests verrouillent les invariants côté schema + helpers, pour que toute
 * régression future soit attrapée en CI plutôt qu'en surface chez le founder.
 *
 * Source-of-truth fixes :
 * - Pillar / composite cap : `AdvertisVectorSchema` (Zod) + clamp défensif
 *   côté composant + helper `classifyBrand` lit `composite ≤ 200`.
 * - Classification ↔ superfans : `src/domain/classification-coherence.ts`
 *   helper utilisé en pre-flight gate + UI.
 */

import { describe, expect, it } from "vitest";
import {
  AdvertisVectorSchema,
  classifyBrand,
  type BrandClassification,
} from "@/lib/types/advertis-vector";
import {
  checkClassificationCoherence,
  assertClassificationCoherence,
  ClassificationCoherenceError,
  MIN_SUPERFANS_BY_CLASSIFICATION,
} from "@/domain/classification-coherence";

describe("Scoring invariants — pillar cap [0, 25] (ADR-0045)", () => {
  it("AdvertisVectorSchema rejects pillar score > 25", () => {
    const dirty = {
      a: 24, d: 27.33, v: 24, e: 22, r: 22.5, t: 18.58, i: 22, s: 25.93,
      composite: 186.67, confidence: 0.9,
    };
    expect(AdvertisVectorSchema.safeParse(dirty).success).toBe(false);
  });

  it("AdvertisVectorSchema rejects pillar score < 0", () => {
    const dirty = { a: -1, d: 22, v: 22, e: 22, r: 22, t: 22, i: 22, s: 22, composite: 153, confidence: 0.9 };
    expect(AdvertisVectorSchema.safeParse(dirty).success).toBe(false);
  });

  it("AdvertisVectorSchema accepts pillar score exactly at [0, 25] bounds", () => {
    const valid = { a: 0, d: 25, v: 12.5, e: 22, r: 18, t: 14, i: 21, s: 13, composite: 125.5, confidence: 0.9 };
    expect(AdvertisVectorSchema.safeParse(valid).success).toBe(true);
  });

  it("AdvertisVectorSchema rejects composite > 200", () => {
    const dirty = { a: 25, d: 25, v: 25, e: 25, r: 25, t: 25, i: 25, s: 25, composite: 201, confidence: 0.9 };
    expect(AdvertisVectorSchema.safeParse(dirty).success).toBe(false);
  });
});

describe("Scoring invariants — classifyBrand monotone (ADR-0045)", () => {
  it("classifies thresholds correctly on /200 scale", () => {
    expect(classifyBrand(0)).toBe("ZOMBIE");
    expect(classifyBrand(80)).toBe("ZOMBIE");
    expect(classifyBrand(81)).toBe("ORDINAIRE");
    expect(classifyBrand(120)).toBe("ORDINAIRE");
    expect(classifyBrand(121)).toBe("FORTE");
    expect(classifyBrand(160)).toBe("FORTE");
    expect(classifyBrand(161)).toBe("CULTE");
    expect(classifyBrand(180)).toBe("CULTE");
    expect(classifyBrand(181)).toBe("ICONE");
    expect(classifyBrand(200)).toBe("ICONE");
  });

  it("classifyBrand is monotone — composite increase never decreases tier", () => {
    const tiers: BrandClassification[] = ["ZOMBIE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"];
    let lastTierIndex = -1;
    for (let composite = 0; composite <= 200; composite += 5) {
      const tier = classifyBrand(composite);
      const idx = tiers.indexOf(tier);
      expect(idx).toBeGreaterThanOrEqual(lastTierIndex);
      lastTierIndex = idx;
    }
  });
});

describe("Classification coherence — ICONE/CULTE require superfans (ADR-0045)", () => {
  it("MIN_SUPERFANS thresholds : ZOMBIE/ORDINAIRE/FORTE = 0, CULTE/ICONE = 1", () => {
    expect(MIN_SUPERFANS_BY_CLASSIFICATION.ZOMBIE).toBe(0);
    expect(MIN_SUPERFANS_BY_CLASSIFICATION.ORDINAIRE).toBe(0);
    expect(MIN_SUPERFANS_BY_CLASSIFICATION.FORTE).toBe(0);
    expect(MIN_SUPERFANS_BY_CLASSIFICATION.CULTE).toBeGreaterThan(0);
    expect(MIN_SUPERFANS_BY_CLASSIFICATION.ICONE).toBeGreaterThan(0);
  });

  it("ICONE with 0 superfans → violation (regression test Makrea)", () => {
    const result = checkClassificationCoherence({ classification: "ICONE", superfanCount: 0 });
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toContain("ICONE");
  });

  it("CULTE with 0 superfans → violation", () => {
    const result = checkClassificationCoherence({ classification: "CULTE", superfanCount: 0 });
    expect(result.ok).toBe(false);
  });

  it("ZOMBIE/ORDINAIRE/FORTE with 0 superfans → ok (legitimate state)", () => {
    for (const c of ["ZOMBIE", "ORDINAIRE", "FORTE"] as const) {
      expect(checkClassificationCoherence({ classification: c, superfanCount: 0 }).ok).toBe(true);
    }
  });

  it("ICONE/CULTE with ≥ MIN_SUPERFANS → ok", () => {
    for (const c of ["CULTE", "ICONE"] as const) {
      expect(
        checkClassificationCoherence({
          classification: c,
          superfanCount: MIN_SUPERFANS_BY_CLASSIFICATION[c],
        }).ok,
      ).toBe(true);
    }
  });

  it("assertClassificationCoherence throws ClassificationCoherenceError on violation", () => {
    expect(() =>
      assertClassificationCoherence({ classification: "ICONE", superfanCount: 0 }),
    ).toThrow(ClassificationCoherenceError);
  });

  it("assertClassificationCoherence is silent on coherent state", () => {
    expect(() =>
      assertClassificationCoherence({ classification: "ZOMBIE", superfanCount: 0 }),
    ).not.toThrow();
    expect(() =>
      assertClassificationCoherence({ classification: "ICONE", superfanCount: 5 }),
    ).not.toThrow();
  });
});

describe("Regression — Makrea audit observed state (ADR-0045)", () => {
  it("the exact dirty vector observed cannot pass schema validation", () => {
    // Snapshot des valeurs exactes du screenshot d'audit (mai 2026).
    const observed = {
      a: 24.36, d: 27.33, v: 24, e: 21.85, r: 22.5, t: 18.58, i: 22, s: 25.93,
      composite: 186.67, confidence: 0.9,
    };
    const result = AdvertisVectorSchema.safeParse(observed);
    expect(result.success).toBe(false);
    if (!result.success) {
      const failedFields = result.error.issues.map((i) => i.path.join("."));
      expect(failedFields).toContain("d"); // Distinction 27.33 > 25
      expect(failedFields).toContain("s"); // Strategy 25.93 > 25
    }
  });

  it("classifyBrand(186.67) === ICONE — incoherent if superfanCount = 0", () => {
    expect(classifyBrand(186.67)).toBe("ICONE");
    expect(checkClassificationCoherence({ classification: "ICONE", superfanCount: 0 }).ok).toBe(false);
  });
});
