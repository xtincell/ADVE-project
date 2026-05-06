/**
 * Anti-drift CI test — Phase 18 (ADR-0061) `BRAND_NATURE_ARCHETYPES` cohérence.
 *
 * Vérifie l'intégrité interne de la const TS source de vérité des 9 archétypes :
 * - Tous les `cascade[*]` apparaissent comme clé dans `validTransitions`
 * - `identityRootKind` est dans `cascade`
 * - `defaultManipulationMix` non-vide
 * - Toutes les BrandNature de l'enum Prisma sont couvertes
 * - Pas de cycle dans `validTransitions` (un kind ne peut pas être ancêtre de lui-même)
 * - Helper `validateNodeTransition()` produit les bons résultats sur cas canoniques + cas refusés
 *
 * NEFER §3 interdit absolu n°3 — drift narratif silencieux.
 *
 * Cf. [docs/governance/adr/0061-brand-nature-archetypes-template.md](../../../docs/governance/adr/0061-brand-nature-archetypes-template.md).
 */

import { describe, it, expect } from "vitest";
import {
  BRAND_NATURE_ARCHETYPES,
  ALL_BRAND_NATURES,
  NATURE_TRANSITIONS_VALID,
  validateNodeTransition,
  getCascadeForNature,
  getValidChildKinds,
} from "@/domain/brand-nature-archetypes";
import type { BrandNature } from "@prisma/client";

describe("brand-nature-archetypes — cohérence interne const", () => {
  it("toutes les 9 BrandNature de l'enum Prisma sont couvertes", () => {
    const expected: BrandNature[] = [
      "PRODUCT",
      "SERVICE",
      "CHARACTER_IP",
      "FESTIVAL_IP",
      "MEDIA_IP",
      "RETAIL_SPACE",
      "PLATFORM",
      "INSTITUTION",
      "PERSONAL",
    ];
    for (const nature of expected) {
      expect(BRAND_NATURE_ARCHETYPES[nature]).toBeDefined();
    }
    expect(Object.keys(BRAND_NATURE_ARCHETYPES).sort()).toEqual([...expected].sort());
    expect(ALL_BRAND_NATURES.length).toBe(9);
  });

  it("pour chaque nature : tous les `cascade[*]` apparaissent comme clé dans `validTransitions`", () => {
    for (const nature of ALL_BRAND_NATURES) {
      const arch = BRAND_NATURE_ARCHETYPES[nature];
      for (const kind of arch.cascade) {
        expect(arch.validTransitions[kind]).toBeDefined();
      }
    }
  });

  it("pour chaque nature : `identityRootKind` est présent dans `cascade`", () => {
    for (const nature of ALL_BRAND_NATURES) {
      const arch = BRAND_NATURE_ARCHETYPES[nature];
      expect(arch.cascade).toContain(arch.identityRootKind);
    }
  });

  it("pour chaque nature : `defaultManipulationMix` non-vide et valeurs valides", () => {
    const validModes = new Set(["peddler", "dealer", "facilitator", "entertainer"]);
    for (const nature of ALL_BRAND_NATURES) {
      const arch = BRAND_NATURE_ARCHETYPES[nature];
      expect(arch.defaultManipulationMix.length).toBeGreaterThan(0);
      for (const mode of arch.defaultManipulationMix) {
        expect(validModes.has(mode)).toBe(true);
      }
    }
  });

  it("pour chaque nature : `applicableGloryTools` et `applicableBibleVars` non-vides", () => {
    for (const nature of ALL_BRAND_NATURES) {
      const arch = BRAND_NATURE_ARCHETYPES[nature];
      expect(arch.applicableGloryTools.length).toBeGreaterThan(0);
      expect(arch.applicableBibleVars.length).toBeGreaterThan(0);
    }
  });

  it("pas de cycle dans validTransitions (un kind ne peut pas être ancêtre de lui-même)", () => {
    for (const nature of ALL_BRAND_NATURES) {
      const arch = BRAND_NATURE_ARCHETYPES[nature];
      // BFS depuis ROOT : aucun nœud visité 2 fois sur un chemin
      function visit(kind: string, path: string[]): void {
        if (path.includes(kind)) {
          throw new Error(`Cycle détecté pour nature ${nature}: ${path.join(" → ")} → ${kind}`);
        }
        const children = arch.validTransitions[kind] ?? [];
        for (const child of children) {
          if (child === "STANDALONE_BRAND") continue; // STANDALONE_BRAND est un fallback, pas dans la cascade canonique
          visit(child, [...path, kind]);
        }
      }
      const rootChildren = arch.validTransitions["ROOT"] ?? [];
      for (const root of rootChildren) {
        if (root === "STANDALONE_BRAND") continue;
        expect(() => visit(root, [])).not.toThrow();
      }
    }
  });

  it("toute clé de NATURE_TRANSITIONS_VALID est une BrandNature valide", () => {
    const validNatures = new Set(ALL_BRAND_NATURES);
    for (const [parentNature, childNatures] of Object.entries(NATURE_TRANSITIONS_VALID)) {
      expect(validNatures.has(parentNature as BrandNature)).toBe(true);
      for (const child of childNatures ?? []) {
        expect(validNatures.has(child)).toBe(true);
      }
    }
  });
});

describe("brand-nature-archetypes — validateNodeTransition()", () => {
  it("PRODUCT — cas canonique FrieslandCampina valide", () => {
    // ROOT → CORPORATE
    expect(
      validateNodeTransition({
        parentNodeKind: null,
        parentNodeNature: null,
        childNodeKind: "CORPORATE",
        childNodeNature: "PRODUCT",
      }).valid,
    ).toBe(true);

    // CORPORATE → MASTER_BRAND
    expect(
      validateNodeTransition({
        parentNodeKind: "CORPORATE",
        parentNodeNature: "PRODUCT",
        childNodeKind: "MASTER_BRAND",
        childNodeNature: "PRODUCT",
      }).valid,
    ).toBe(true);

    // MASTER_BRAND → REGIONAL_CLUSTER
    expect(
      validateNodeTransition({
        parentNodeKind: "MASTER_BRAND",
        parentNodeNature: "PRODUCT",
        childNodeKind: "REGIONAL_CLUSTER",
        childNodeNature: "PRODUCT",
      }).valid,
    ).toBe(true);

    // REGIONAL_CLUSTER → REGIONAL_BRAND
    expect(
      validateNodeTransition({
        parentNodeKind: "REGIONAL_CLUSTER",
        parentNodeNature: "PRODUCT",
        childNodeKind: "REGIONAL_BRAND",
        childNodeNature: "PRODUCT",
      }).valid,
    ).toBe(true);

    // PRODUCT_LINE → PRODUCT_VARIANT
    expect(
      validateNodeTransition({
        parentNodeKind: "PRODUCT_LINE",
        parentNodeNature: "PRODUCT",
        childNodeKind: "PRODUCT_VARIANT",
        childNodeNature: "PRODUCT",
      }).valid,
    ).toBe(true);

    // PRODUCT_VARIANT → SKU
    expect(
      validateNodeTransition({
        parentNodeKind: "PRODUCT_VARIANT",
        parentNodeNature: "PRODUCT",
        childNodeKind: "SKU",
        childNodeNature: "PRODUCT",
      }).valid,
    ).toBe(true);
  });

  it("PRODUCT — transitions absurdes refusées", () => {
    // SKU → CORPORATE (feuille tente d'engendrer un root) — REFUSÉ
    const r1 = validateNodeTransition({
      parentNodeKind: "SKU",
      parentNodeNature: "PRODUCT",
      childNodeKind: "CORPORATE",
      childNodeNature: "PRODUCT",
    });
    expect(r1.valid).toBe(false);
    if (!r1.valid) expect(r1.reason).toContain("kind-level");

    // CORPORATE → SKU (saute 5 niveaux) — REFUSÉ
    const r2 = validateNodeTransition({
      parentNodeKind: "CORPORATE",
      parentNodeNature: "PRODUCT",
      childNodeKind: "SKU",
      childNodeNature: "PRODUCT",
    });
    expect(r2.valid).toBe(false);
  });

  it("Cas Disney — transitions cross-nature autorisées", () => {
    // INSTITUTION (Disney corporate) → CHARACTER_IP (Mickey)
    const r1 = validateNodeTransition({
      parentNodeKind: "INSTITUTION",
      parentNodeNature: "INSTITUTION",
      childNodeKind: "CHARACTER",
      childNodeNature: "CHARACTER_IP",
    });
    expect(r1.valid).toBe(true);

    // CHARACTER_IP (Mickey) → MEDIA_IP (Mickey Mouse Clubhouse)
    const r2 = validateNodeTransition({
      parentNodeKind: "CHARACTER",
      parentNodeNature: "CHARACTER_IP",
      childNodeKind: "TITLE",
      childNodeNature: "MEDIA_IP",
    });
    expect(r2.valid).toBe(true);
  });

  it("Cas Disney — transition cross-nature interdite refusée", () => {
    // PRODUCT (Disney Toys) → CHARACTER_IP (création d'un nouveau character depuis un produit) — REFUSÉ
    const r = validateNodeTransition({
      parentNodeKind: "SKU",
      parentNodeNature: "PRODUCT",
      childNodeKind: "CHARACTER",
      childNodeNature: "CHARACTER_IP",
    });
    expect(r.valid).toBe(false);
  });

  it("STANDALONE_BRAND fallback — ROOT vers STANDALONE_BRAND autorisé pour toutes natures", () => {
    for (const nature of ALL_BRAND_NATURES) {
      const r = validateNodeTransition({
        parentNodeKind: null,
        parentNodeNature: null,
        childNodeKind: "STANDALONE_BRAND",
        childNodeNature: nature,
      });
      expect(r.valid).toBe(true);
    }
  });
});

describe("brand-nature-archetypes — helpers", () => {
  it("getCascadeForNature(PRODUCT) retourne 7 niveaux FMCG", () => {
    const cascade = getCascadeForNature("PRODUCT");
    expect(cascade.length).toBe(7);
    expect(cascade).toEqual([
      "CORPORATE",
      "MASTER_BRAND",
      "REGIONAL_CLUSTER",
      "REGIONAL_BRAND",
      "PRODUCT_LINE",
      "PRODUCT_VARIANT",
      "SKU",
    ]);
  });

  it("getValidChildKinds — PRODUCT_LINE peut engendrer PRODUCT_VARIANT et SKU", () => {
    const children = getValidChildKinds("PRODUCT_LINE", "PRODUCT");
    expect(children).toContain("PRODUCT_VARIANT");
    expect(children).toContain("SKU");
  });

  it("getValidChildKinds — SKU est une feuille (aucun enfant)", () => {
    const children = getValidChildKinds("SKU", "PRODUCT");
    expect(children).toEqual([]);
  });

  it("getValidChildKinds — ROOT (null) peut engendrer CORPORATE pour PRODUCT", () => {
    const children = getValidChildKinds(null, "PRODUCT");
    expect(children).toContain("CORPORATE");
  });
});
