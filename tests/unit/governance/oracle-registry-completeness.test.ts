/**
 * Oracle 35-section framework completeness — anti-drift test (Phase 13, ADR-0014).
 *
 * Garantit que :
 * 1. SECTION_REGISTRY contient exactement 35 sections (21 CORE + 7 BIG4 + 5 DISTINCTIVE + 2 DORMANT)
 * 2. Chaque `brandAssetKind` déclaré est une valeur valide de l'enum BrandAssetKind
 *    (src/domain/brand-asset-kinds.ts)
 * 3. Tous les ids sont uniques et toutes les numbers strictement séquentielles 01..35
 * 4. Sections distinctives + dormantes + baseline ont les flags appropriés
 * 5. Tous les `sequenceKey` déclarés sont des strings non-vides (validation runtime
 *    par audit-oracle-registry.ts ; sera resserré avec GlorySequenceKey en B3)
 *
 * Si ce test échoue → drift framework canonical Oracle. STOP, retour Phase 2 NEFER.
 */

import { describe, expect, it } from "vitest";
import {
  SECTION_REGISTRY,
  ORACLE_SECTION_BRAND_ASSET_KINDS,
  type SectionMeta,
} from "@/server/services/strategy-presentation/types";
import {
  BRAND_ASSET_KINDS,
  isBrandAssetKind,
  PHASE_13_BRAND_ASSET_KINDS,
} from "@/domain/brand-asset-kinds";

describe("Oracle 35-section framework completeness (ADR-0014)", () => {
  it("contains exactly 35 sections", () => {
    expect(SECTION_REGISTRY).toHaveLength(35);
  });

  it("partitions into 21 CORE + 7 BIG4_BASELINE + 5 DISTINCTIVE + 2 DORMANT", () => {
    const byTier = SECTION_REGISTRY.reduce<Record<string, number>>((acc, s) => {
      const tier = s.tier ?? "CORE";
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    }, {});
    expect(byTier).toEqual({
      CORE: 21,
      BIG4_BASELINE: 7,
      DISTINCTIVE: 5,
      DORMANT: 2,
    });
  });

  it("has unique section ids", () => {
    const ids = SECTION_REGISTRY.map((s) => s.id);
    expect(new Set(ids).size).toBe(SECTION_REGISTRY.length);
  });

  it("has strictly sequential numbers 01..35", () => {
    const numbers = SECTION_REGISTRY.map((s) => s.number);
    const expected = Array.from({ length: 35 }, (_, i) => String(i + 1).padStart(2, "0"));
    expect(numbers).toEqual(expected);
  });

  it("declares brandAssetKind on every section, all valid enum values", () => {
    for (const section of SECTION_REGISTRY) {
      expect(section.brandAssetKind, `section ${section.id} missing brandAssetKind`).toBeDefined();
      expect(
        isBrandAssetKind(section.brandAssetKind),
        `section ${section.id} has invalid brandAssetKind=${section.brandAssetKind}`,
      ).toBe(true);
    }
  });

  it("ORACLE_SECTION_BRAND_ASSET_KINDS reflects unique kinds across registry", () => {
    const kinds = SECTION_REGISTRY.map((s) => s.brandAssetKind).filter(Boolean);
    expect(ORACLE_SECTION_BRAND_ASSET_KINDS.size).toBe(new Set(kinds).size);
  });

  it("all 10 Phase 13 BrandAsset.kind extensions are documented in BRAND_ASSET_KINDS", () => {
    for (const kind of PHASE_13_BRAND_ASSET_KINDS) {
      expect(BRAND_ASSET_KINDS).toContain(kind);
    }
  });

  describe("BIG4_BASELINE sections (7)", () => {
    const baselines = SECTION_REGISTRY.filter((s) => s.tier === "BIG4_BASELINE");

    it("has isBaseline=true on all 7 sections", () => {
      expect(baselines).toHaveLength(7);
      for (const s of baselines) {
        expect(s.isBaseline, `${s.id} should have isBaseline=true`).toBe(true);
        expect(s.isDistinctive, `${s.id} should NOT have isDistinctive`).not.toBe(true);
        expect(s.isDormant, `${s.id} should NOT be dormant`).not.toBe(true);
      }
    });

    it("declares sequenceKey on all 7", () => {
      for (const s of baselines) {
        expect(s.sequenceKey, `${s.id} missing sequenceKey`).toBeTruthy();
      }
    });
  });

  describe("DISTINCTIVE sections (5)", () => {
    const distinctives = SECTION_REGISTRY.filter((s) => s.tier === "DISTINCTIVE");

    it("has isDistinctive=true on all 5 sections", () => {
      expect(distinctives).toHaveLength(5);
      for (const s of distinctives) {
        expect(s.isDistinctive, `${s.id} should have isDistinctive=true`).toBe(true);
        expect(s.isBaseline, `${s.id} should NOT have isBaseline`).not.toBe(true);
        expect(s.isDormant, `${s.id} should NOT be dormant`).not.toBe(true);
      }
    });

    it("includes Cult Index, Manipulation Matrix, Devotion Ladder", () => {
      const ids = distinctives.map((s) => s.id);
      expect(ids).toContain("cult-index");
      expect(ids).toContain("manipulation-matrix");
      expect(ids).toContain("devotion-ladder");
    });
  });

  describe("DORMANT sections (Imhotep + Anubis)", () => {
    const dormants = SECTION_REGISTRY.filter((s) => s.tier === "DORMANT");

    it("has isDormant=true on both 2 sections", () => {
      expect(dormants).toHaveLength(2);
      for (const s of dormants) {
        expect(s.isDormant, `${s.id} should have isDormant=true`).toBe(true);
        expect(s.isDistinctive, `${s.id} should NOT have isDistinctive`).not.toBe(true);
        expect(s.isBaseline, `${s.id} should NOT have isBaseline`).not.toBe(true);
      }
    });

    it("includes exactly Imhotep + Anubis dormants", () => {
      const ids = dormants.map((s: SectionMeta) => s.id).sort();
      expect(ids).toEqual(["anubis-comms-dormant", "imhotep-crew-program-dormant"]);
    });

    it("uses GENERIC brandAssetKind for dormants (no premature kind)", () => {
      for (const s of dormants) {
        expect(s.brandAssetKind).toBe("GENERIC");
      }
    });
  });
});
