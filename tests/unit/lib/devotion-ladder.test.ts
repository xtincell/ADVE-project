/**
 * Anti-drift CI — `DevotionLadderTier` parsing + canonicalisation (ADR-0047).
 *
 * Régression Makrea : `cultIndexSnapshots[0].tier === "APPRENTI"` (du
 * GuildTier creator copy-pasté) s'affichait brut en UI sous label "CULT INDEX".
 * Le helper `parseDevotionLadderTier` doit retourner `null` pour cette valeur
 * — APPRENTI n'est pas un rung Devotion Ladder.
 */

import { describe, expect, it } from "vitest";
import {
  DEVOTION_LADDER_TIERS,
  type DevotionLadderTier,
  parseDevotionLadderTier,
  devotionLadderPosition,
} from "@/domain/devotion-ladder";

describe("DevotionLadderTier — canonical 6-rung enum (ADR-0047)", () => {
  it("declares exactly 6 rungs in canonical order", () => {
    expect(DEVOTION_LADDER_TIERS).toEqual([
      "SPECTATEUR",
      "INTERESSE",
      "PARTICIPANT",
      "ENGAGE",
      "AMBASSADEUR",
      "EVANGELISTE",
    ]);
  });

  it("devotionLadderPosition is monotone (SPECTATEUR=0, EVANGELISTE=5)", () => {
    expect(devotionLadderPosition("SPECTATEUR")).toBe(0);
    expect(devotionLadderPosition("INTERESSE")).toBe(1);
    expect(devotionLadderPosition("PARTICIPANT")).toBe(2);
    expect(devotionLadderPosition("ENGAGE")).toBe(3);
    expect(devotionLadderPosition("AMBASSADEUR")).toBe(4);
    expect(devotionLadderPosition("EVANGELISTE")).toBe(5);
  });
});

describe("parseDevotionLadderTier — accepts canonical UPPERCASE", () => {
  for (const tier of DEVOTION_LADDER_TIERS) {
    it(`returns "${tier}" unchanged`, () => {
      expect(parseDevotionLadderTier(tier)).toBe(tier);
    });
  }
});

describe("parseDevotionLadderTier — accepts case + accent variants", () => {
  it("lowercase → UPPERCASE", () => {
    expect(parseDevotionLadderTier("ambassadeur")).toBe("AMBASSADEUR");
    expect(parseDevotionLadderTier("evangeliste")).toBe("EVANGELISTE");
  });

  it("accentué → UPPERCASE non-accentué", () => {
    expect(parseDevotionLadderTier("intéressé")).toBe("INTERESSE");
    expect(parseDevotionLadderTier("engagé")).toBe("ENGAGE");
    expect(parseDevotionLadderTier("évangéliste")).toBe("EVANGELISTE");
  });

  it("Capitalize → UPPERCASE", () => {
    expect(parseDevotionLadderTier("Spectateur")).toBe("SPECTATEUR");
    expect(parseDevotionLadderTier("Participant")).toBe("PARTICIPANT");
  });

  it("pluriel → singulier (alignement pillarE schemas)", () => {
    expect(parseDevotionLadderTier("spectateurs")).toBe("SPECTATEUR");
    expect(parseDevotionLadderTier("ambassadeurs")).toBe("AMBASSADEUR");
    expect(parseDevotionLadderTier("evangelistes")).toBe("EVANGELISTE");
  });
});

describe("parseDevotionLadderTier — rejects other enums (ADR-0047 separation)", () => {
  it("rejects GuildTier values (creator) — regression Makrea", () => {
    expect(parseDevotionLadderTier("APPRENTI")).toBeNull();
    expect(parseDevotionLadderTier("COMPAGNON")).toBeNull();
    expect(parseDevotionLadderTier("MAITRE")).toBeNull();
    expect(parseDevotionLadderTier("ASSOCIE")).toBeNull();
  });

  it("rejects BrandClassification values (brand)", () => {
    expect(parseDevotionLadderTier("ZOMBIE")).toBeNull();
    expect(parseDevotionLadderTier("ORDINAIRE")).toBeNull();
    expect(parseDevotionLadderTier("FORTE")).toBeNull();
    expect(parseDevotionLadderTier("CULTE")).toBeNull();
    expect(parseDevotionLadderTier("ICONE")).toBeNull();
  });
});

describe("parseDevotionLadderTier — robustness", () => {
  it("returns null for non-string input", () => {
    expect(parseDevotionLadderTier(null)).toBeNull();
    expect(parseDevotionLadderTier(undefined)).toBeNull();
    expect(parseDevotionLadderTier(42)).toBeNull();
    expect(parseDevotionLadderTier({})).toBeNull();
    expect(parseDevotionLadderTier([])).toBeNull();
  });

  it("returns null for empty / whitespace-only string", () => {
    expect(parseDevotionLadderTier("")).toBeNull();
    expect(parseDevotionLadderTier("   ")).toBeNull();
  });

  it("returns null for unknown garbage", () => {
    expect(parseDevotionLadderTier("foo")).toBeNull();
    expect(parseDevotionLadderTier("RANDOM")).toBeNull();
    expect(parseDevotionLadderTier("admin")).toBeNull();
  });

  it("trims surrounding whitespace before matching", () => {
    expect(parseDevotionLadderTier("  ambassadeur  ")).toBe("AMBASSADEUR");
  });
});

describe("Type-level invariant — DevotionLadderTier is a discriminated union", () => {
  it("compile-time : assignment from parseDevotionLadderTier narrows to enum", () => {
    const tier: DevotionLadderTier | null = parseDevotionLadderTier("ambassadeur");
    if (tier) {
      // TS narrows tier to DevotionLadderTier here — the test compiles only
      // because tier ∈ literal union.
      const switched: number = ((): number => {
        switch (tier) {
          case "SPECTATEUR": return 0;
          case "INTERESSE": return 1;
          case "PARTICIPANT": return 2;
          case "ENGAGE": return 3;
          case "AMBASSADEUR": return 4;
          case "EVANGELISTE": return 5;
        }
      })();
      expect(switched).toBe(4);
    }
  });
});
