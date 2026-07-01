import { describe, it, expect } from "vitest";
import {
  CULT_INDEX_TIERS,
  getCultIndexTier,
  parseCultIndexTier,
  resolveCultIndexTier,
  cultIndexTierPosition,
} from "@/domain/cult-index-tier";

describe("cult-index-tier — canonical 5-tier maturity scale (audit galileo 2026-06-13)", () => {
  it("has exactly 5 ordered tiers, ghost → cult", () => {
    expect([...CULT_INDEX_TIERS]).toEqual(["GHOST", "FUNCTIONAL", "LOVED", "EMERGING", "CULT"]);
  });

  it("getCultIndexTier hits every band boundary on /100", () => {
    expect(getCultIndexTier(0)).toBe("GHOST");
    expect(getCultIndexTier(20)).toBe("GHOST");
    expect(getCultIndexTier(20.1)).toBe("FUNCTIONAL");
    expect(getCultIndexTier(40)).toBe("FUNCTIONAL");
    expect(getCultIndexTier(41)).toBe("LOVED");
    expect(getCultIndexTier(60)).toBe("LOVED");
    expect(getCultIndexTier(61)).toBe("EMERGING");
    expect(getCultIndexTier(80)).toBe("EMERGING");
    expect(getCultIndexTier(81)).toBe("CULT");
    expect(getCultIndexTier(100)).toBe("CULT");
  });

  it("parseCultIndexTier accepts canonical + case/accent variants", () => {
    expect(parseCultIndexTier("FUNCTIONAL")).toBe("FUNCTIONAL");
    expect(parseCultIndexTier("functional")).toBe("FUNCTIONAL");
    expect(parseCultIndexTier("Emergent")).toBe("EMERGING");
    expect(parseCultIndexTier("culte")).toBe("CULT");
  });

  it("parseCultIndexTier rejects foreign scales (no silent conflation)", () => {
    // The original galileo bug: a CultIndexSnapshot.tier read through the
    // DevotionLadder parser. Guard both directions.
    expect(parseCultIndexTier("AMBASSADEUR")).toBeNull(); // DevotionLadderTier
    expect(parseCultIndexTier("EVANGELISTE")).toBeNull();
    expect(parseCultIndexTier("ICONE")).toBeNull(); // BrandClassification
    expect(parseCultIndexTier("APPRENTI")).toBeNull(); // GuildTier
    expect(parseCultIndexTier("")).toBeNull();
    expect(parseCultIndexTier(null)).toBeNull();
    expect(parseCultIndexTier(42)).toBeNull();
  });

  it("resolveCultIndexTier — score is authoritative, never contradicted by a stale tier", () => {
    // The exact CIMENCAM case: tier 'FUNCTIONAL' on score 26.35 → kept (consistent).
    expect(resolveCultIndexTier("FUNCTIONAL", 26.35)).toBe("FUNCTIONAL");
    // A stored tier that OVERSTATES the score is discarded for the score band.
    expect(resolveCultIndexTier("EMERGING", 42.5)).toBe("LOVED");
    expect(resolveCultIndexTier("CULT", 10)).toBe("GHOST");
    // A foreign/unparseable tier never nukes the index — the score still labels it.
    expect(resolveCultIndexTier("AMBASSADEUR", 72)).toBe("EMERGING");
    expect(resolveCultIndexTier(null, 55)).toBe("LOVED");
  });

  it("cultIndexTierPosition is monotone ghost(0) → cult(4)", () => {
    expect(cultIndexTierPosition("GHOST")).toBe(0);
    expect(cultIndexTierPosition("CULT")).toBe(4);
  });
});
