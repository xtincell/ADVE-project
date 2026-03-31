import { describe, it, expect } from "vitest";
import {
  classifyBrand,
  createEmptyVector,
  sumPillars,
  validateVector,
  AdvertisVectorSchema,
  PILLAR_KEYS,
  PILLAR_NAMES,
  type AdvertisVector,
  type BrandClassification,
  type PillarKey,
} from "@/lib/types/advertis-vector";

describe("AdvertisVector", () => {
  it("should create an empty vector with all zeros", () => {
    const vec = createEmptyVector();
    expect(vec.composite).toBe(0);
    expect(vec.confidence).toBe(0);
    expect(sumPillars(vec)).toBe(0);
  });

  it("should validate a correct vector", () => {
    const vec = { a: 20, d: 18, v: 15, e: 12, r: 10, t: 8, i: 5, s: 3, composite: 91, confidence: 0.85 };
    expect(validateVector(vec)).toBe(true);
  });

  it("should reject a vector with mismatched composite", () => {
    const vec = { a: 20, d: 18, v: 15, e: 12, r: 10, t: 8, i: 5, s: 3, composite: 100, confidence: 0.85 };
    expect(validateVector(vec)).toBe(false);
  });

  it("should reject out-of-range values", () => {
    const result = AdvertisVectorSchema.safeParse({
      a: 30, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0, composite: 30, confidence: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("classifyBrand", () => {
  it("should classify brands correctly", () => {
    expect(classifyBrand(50)).toBe("ZOMBIE");
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
});

describe("classifyBrand - each tier boundary", () => {
  it("ZOMBIE: 0 to 80", () => {
    expect(classifyBrand(0)).toBe("ZOMBIE");
    expect(classifyBrand(40)).toBe("ZOMBIE");
    expect(classifyBrand(80)).toBe("ZOMBIE");
  });

  it("ORDINAIRE: 81 to 120", () => {
    expect(classifyBrand(81)).toBe("ORDINAIRE");
    expect(classifyBrand(100)).toBe("ORDINAIRE");
    expect(classifyBrand(120)).toBe("ORDINAIRE");
  });

  it("FORTE: 121 to 160", () => {
    expect(classifyBrand(121)).toBe("FORTE");
    expect(classifyBrand(140)).toBe("FORTE");
    expect(classifyBrand(160)).toBe("FORTE");
  });

  it("CULTE: 161 to 180", () => {
    expect(classifyBrand(161)).toBe("CULTE");
    expect(classifyBrand(170)).toBe("CULTE");
    expect(classifyBrand(180)).toBe("CULTE");
  });

  it("ICONE: above 180", () => {
    expect(classifyBrand(181)).toBe("ICONE");
    expect(classifyBrand(190)).toBe("ICONE");
    expect(classifyBrand(200)).toBe("ICONE");
  });
});

describe("validateVector - comprehensive", () => {
  it("validates a perfect score vector", () => {
    const vec: AdvertisVector = {
      a: 25, d: 25, v: 25, e: 25, r: 25, t: 25, i: 25, s: 25,
      composite: 200, confidence: 1,
    };
    expect(validateVector(vec)).toBe(true);
  });

  it("validates an empty vector", () => {
    const vec = createEmptyVector();
    expect(validateVector(vec)).toBe(true);
  });

  it("rejects negative pillar values", () => {
    const result = AdvertisVectorSchema.safeParse({
      a: -1, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0,
      composite: -1, confidence: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects pillar values above 25", () => {
    const result = AdvertisVectorSchema.safeParse({
      a: 26, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0,
      composite: 26, confidence: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects composite above 200", () => {
    const result = AdvertisVectorSchema.safeParse({
      a: 25, d: 25, v: 25, e: 25, r: 25, t: 25, i: 25, s: 25,
      composite: 201, confidence: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence above 1", () => {
    const result = AdvertisVectorSchema.safeParse({
      a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0,
      composite: 0, confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence below 0", () => {
    const result = AdvertisVectorSchema.safeParse({
      a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0,
      composite: 0, confidence: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it("validates that composite must match sum of pillars", () => {
    // Composite is 90 but pillars sum to 91
    const vec: AdvertisVector = {
      a: 20, d: 18, v: 15, e: 12, r: 10, t: 8, i: 5, s: 3,
      composite: 90, confidence: 0.8,
    };
    expect(validateVector(vec)).toBe(false);
  });

  it("allows small floating point differences in composite", () => {
    const vec: AdvertisVector = {
      a: 10.1, d: 10.2, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0,
      composite: 20.3, confidence: 0.5,
    };
    expect(validateVector(vec)).toBe(true);
  });
});

describe("sumPillars", () => {
  it("sums all 8 pillar values", () => {
    const vec: AdvertisVector = {
      a: 1, d: 2, v: 3, e: 4, r: 5, t: 6, i: 7, s: 8,
      composite: 36, confidence: 0.5,
    };
    expect(sumPillars(vec)).toBe(36);
  });

  it("returns 0 for empty vector", () => {
    const vec = createEmptyVector();
    expect(sumPillars(vec)).toBe(0);
  });

  it("returns 200 for max vector", () => {
    const vec: AdvertisVector = {
      a: 25, d: 25, v: 25, e: 25, r: 25, t: 25, i: 25, s: 25,
      composite: 200, confidence: 1,
    };
    expect(sumPillars(vec)).toBe(200);
  });
});

describe("PILLAR_KEYS and PILLAR_NAMES", () => {
  it("has exactly 8 pillar keys", () => {
    expect(PILLAR_KEYS).toHaveLength(8);
  });

  it("pillar keys are a, d, v, e, r, t, i, s", () => {
    expect(PILLAR_KEYS).toEqual(["a", "d", "v", "e", "r", "t", "i", "s"]);
  });

  it("every pillar key has a corresponding name", () => {
    for (const key of PILLAR_KEYS) {
      expect(PILLAR_NAMES[key]).toBeDefined();
      expect(typeof PILLAR_NAMES[key]).toBe("string");
      expect(PILLAR_NAMES[key].length).toBeGreaterThan(0);
    }
  });

  it("pillar names are unique", () => {
    const names = Object.values(PILLAR_NAMES);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

describe("AdvertisVectorSchema - missing fields", () => {
  it("rejects vector missing a pillar", () => {
    const result = AdvertisVectorSchema.safeParse({
      a: 10, d: 10, v: 10, e: 10, r: 10, t: 10, i: 10,
      // missing 's'
      composite: 70, confidence: 0.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects vector missing composite", () => {
    const result = AdvertisVectorSchema.safeParse({
      a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0,
      confidence: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects vector missing confidence", () => {
    const result = AdvertisVectorSchema.safeParse({
      a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0,
      composite: 0,
    });
    expect(result.success).toBe(false);
  });
});
