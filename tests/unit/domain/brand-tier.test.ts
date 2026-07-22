import { describe, it, expect } from "vitest";
import {
  BRAND_TIERS,
  classifyTier,
  tierIndex,
  compareTiers,
  nextTier,
  prevTier,
  normalizePalier,
  effectiveTier,
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

describe("effectiveTier — palier officiel (ratchet) vs impliqué (ADR-0167)", () => {
  it("apogeeTier null => palier dérivé du composite (marques existantes)", () => {
    expect(effectiveTier({ apogeeTier: null, composite: 100 })).toBe("ORDINAIRE");
    expect(effectiveTier({ apogeeTier: undefined, composite: 30 })).toBe("LATENT");
  });

  it("apogeeTier posé => officiel prime, MÊME au-dessus du palier impliqué", () => {
    // Score implique ORDINAIRE (100) mais officiel FORTE (promotion enregistrée).
    expect(effectiveTier({ apogeeTier: "FORTE", composite: 100 })).toBe("FORTE");
  });

  it("ratchet Loi 1 : score chute sous le seuil, l'officiel ne rétrograde PAS", () => {
    // Composite tombé à 90 (implique ORDINAIRE) — l'officiel FORTE tient : pas
    // de rétrogradation silencieuse (seul un DEMOTE explicite l'abaisse).
    expect(effectiveTier({ apogeeTier: "FORTE", composite: 90 })).toBe("FORTE");
    expect(classifyTier(90)).toBe("ORDINAIRE"); // le palier IMPLIQUÉ diverge — surfacé côté UI
  });

  it("alias legacy ZOMBIE normalisé vers LATENT", () => {
    expect(effectiveTier({ apogeeTier: "ZOMBIE", composite: 170 })).toBe("LATENT");
  });

  it("apogeeTier invalide => ignoré, fallback dérivé (jamais un throw)", () => {
    expect(effectiveTier({ apogeeTier: "BOGUS", composite: 150 })).toBe("FORTE");
  });

  it("composite null/undefined => 0 => LATENT (défensif)", () => {
    expect(effectiveTier({ apogeeTier: null, composite: null })).toBe("LATENT");
    expect(effectiveTier({ apogeeTier: null, composite: undefined })).toBe("LATENT");
  });
});
