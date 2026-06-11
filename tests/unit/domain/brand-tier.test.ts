import { describe, it, expect } from "vitest";
import {
  BRAND_TIERS,
  classifyTier,
  tierIndex,
  compareTiers,
  nextTier,
  prevTier,
  normalizePalier,
  TIER_DEFINITIONS,
  TIER_UPPER_BOUNDS_200,
} from "@/domain";

describe("brand-tier — canonical 6-tier ladder", () => {
  it("has exactly 6 ordered tiers, ground → apex", () => {
    expect([...BRAND_TIERS]).toEqual(["LATENT", "FRAGILE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"]);
    expect(BRAND_TIERS).not.toContain("ZOMBIE");
  });

  it("classifyTier hits every band boundary on /200", () => {
    expect(classifyTier(0)).toBe("LATENT");
    expect(classifyTier(40)).toBe("LATENT");
    expect(classifyTier(41)).toBe("FRAGILE");
    expect(classifyTier(80)).toBe("FRAGILE");
    expect(classifyTier(81)).toBe("ORDINAIRE");
    expect(classifyTier(120)).toBe("ORDINAIRE");
    expect(classifyTier(121)).toBe("FORTE");
    expect(classifyTier(160)).toBe("FORTE");
    expect(classifyTier(161)).toBe("CULTE");
    expect(classifyTier(180)).toBe("CULTE");
    expect(classifyTier(181)).toBe("ICONE");
    expect(classifyTier(200)).toBe("ICONE");
  });

  it("classifyTier is monotone over the whole range", () => {
    let last = -1;
    for (let c = 0; c <= 200; c += 1) {
      const idx = tierIndex(classifyTier(c));
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });

  it("normalizes scaled inputs via maxScore", () => {
    expect(classifyTier(20, 100)).toBe("LATENT"); // 20/100 → 40/200
    expect(classifyTier(35, 100)).toBe("FRAGILE"); // 35/100 → 70/200
    expect(classifyTier(95, 100)).toBe("ICONE"); // 95/100 → 190/200
  });

  it("normalizePalier maps the deprecated ZOMBIE → LATENT (any case)", () => {
    expect(normalizePalier("ZOMBIE")).toBe("LATENT");
    expect(normalizePalier("zombie")).toBe("LATENT");
    expect(normalizePalier(" Zombie ")).toBe("LATENT");
    expect(normalizePalier("FRAGILE")).toBe("FRAGILE");
    expect(normalizePalier("nonsense")).toBeNull();
    expect(normalizePalier(null)).toBeNull();
    expect(normalizePalier(42)).toBeNull();
  });

  it("ladder navigation helpers are consistent", () => {
    expect(nextTier("LATENT")).toBe("FRAGILE");
    expect(nextTier("ICONE")).toBeNull();
    expect(prevTier("FRAGILE")).toBe("LATENT");
    expect(prevTier("LATENT")).toBeNull();
    expect(compareTiers("LATENT", "ICONE")).toBeLessThan(0);
    expect(compareTiers("CULTE", "CULTE")).toBe(0);
  });

  it("every tier has a definition with a colour token", () => {
    for (const t of BRAND_TIERS) {
      expect(TIER_DEFINITIONS[t].label).toBeTruthy();
      expect(TIER_DEFINITIONS[t].colorVar).toMatch(/^var\(--color-class-/);
    }
  });

  it("bands widen toward the apex", () => {
    expect(TIER_UPPER_BOUNDS_200.LATENT).toBe(40);
    expect(TIER_UPPER_BOUNDS_200.CULTE).toBe(180);
  });
});
