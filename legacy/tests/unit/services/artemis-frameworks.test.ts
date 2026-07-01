import { describe, it, expect } from "vitest";
import {
  FRAMEWORKS,
  getFramework,
  getFrameworksByLayer,
  getFrameworksByPillar,
  type FrameworkLayer,
} from "@/server/services/artemis/frameworks";
import { topologicalSort } from "@/server/services/artemis/index";

// ============================================================
// Registre des 24 Frameworks
// ============================================================
describe("ARTEMIS — Registre des Frameworks", () => {
  it("doit contenir exactement 28 frameworks", () => {
    expect(FRAMEWORKS).toHaveLength(28);
  });

  it("doit avoir des slugs uniques", () => {
    const slugs = FRAMEWORKS.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(28);
  });

  it("doit avoir des noms non vides pour chaque framework", () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.name.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir des descriptions non vides pour chaque framework", () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.description.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir des promptTemplates non vides pour chaque framework", () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.promptTemplate.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir des inputFields non vides pour chaque framework", () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.inputFields.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir des outputFields non vides pour chaque framework", () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.outputFields.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir au moins un pillarKey par framework", () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.pillarKeys.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// 9 Couches (Layers)
// ============================================================
describe("ARTEMIS — 9 Couches Philosophiques", () => {
  const expectedLayers: FrameworkLayer[] = [
    "IDENTITY",
    "VALUE",
    "EXPERIENCE",
    "VALIDATION",
    "EXECUTION",
    "MEASUREMENT",
    "GROWTH",
    "EVOLUTION",
    "SURVIVAL",
  ];

  it("doit couvrir les 9 couches", () => {
    const layers = new Set(FRAMEWORKS.map((f) => f.layer));
    for (const layer of expectedLayers) {
      expect(layers.has(layer)).toBe(true);
    }
    expect(layers.size).toBe(9);
  });

  it("doit avoir 4 frameworks dans la couche IDENTITY", () => {
    expect(getFrameworksByLayer("IDENTITY")).toHaveLength(4);
  });

  it("doit avoir 4 frameworks dans la couche VALUE", () => {
    expect(getFrameworksByLayer("VALUE")).toHaveLength(4);
  });

  it("doit avoir 3 frameworks dans la couche EXPERIENCE", () => {
    expect(getFrameworksByLayer("EXPERIENCE")).toHaveLength(3);
  });

  it("doit avoir 4 frameworks dans la couche VALIDATION", () => {
    expect(getFrameworksByLayer("VALIDATION")).toHaveLength(4);
  });

  it("doit avoir 3 frameworks dans la couche EXECUTION", () => {
    expect(getFrameworksByLayer("EXECUTION")).toHaveLength(3);
  });

  it("doit avoir 2 frameworks dans la couche MEASUREMENT", () => {
    expect(getFrameworksByLayer("MEASUREMENT")).toHaveLength(2);
  });

  it("doit avoir 2 frameworks dans la couche GROWTH", () => {
    expect(getFrameworksByLayer("GROWTH")).toHaveLength(2);
  });

  it("doit avoir 2 frameworks dans la couche EVOLUTION", () => {
    expect(getFrameworksByLayer("EVOLUTION")).toHaveLength(2);
  });

  it("doit avoir 4 frameworks dans la couche SURVIVAL", () => {
    expect(getFrameworksByLayer("SURVIVAL")).toHaveLength(4);
  });
});

// ============================================================
// Lookup par Slug
// ============================================================
describe("ARTEMIS — Lookup par Slug", () => {
  it("doit trouver un framework par son slug", () => {
    const fw = getFramework("fw-01-brand-archeology");
    expect(fw).toBeDefined();
    expect(fw!.name).toBe("Archéologie de Marque");
    expect(fw!.layer).toBe("IDENTITY");
  });

  it("doit retourner undefined pour un slug inconnu", () => {
    const fw = getFramework("fw-99-inexistant");
    expect(fw).toBeUndefined();
  });

  it("doit trouver le framework Cult Index par slug", () => {
    const fw = getFramework("fw-22-risk-matrix");
    expect(fw).toBeDefined();
    expect(fw!.layer).toBe("SURVIVAL");
  });
});

// ============================================================
// Lookup par Pillar
// ============================================================
describe("ARTEMIS — Lookup par Pilier", () => {
  it("doit trouver des frameworks pour le pilier A (Authenticite)", () => {
    const results = getFrameworksByPillar("A");
    expect(results.length).toBeGreaterThan(0);
    for (const fw of results) {
      expect(fw.pillarKeys).toContain("A");
    }
  });

  it("doit trouver des frameworks pour le pilier V (Valeur)", () => {
    const results = getFrameworksByPillar("V");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit trouver des frameworks pour le pilier T (Transformation)", () => {
    const results = getFrameworksByPillar("T");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit trouver des frameworks pour le pilier E (Engagement)", () => {
    const results = getFrameworksByPillar("E");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit retourner un tableau vide pour un pilier inexistant", () => {
    const results = getFrameworksByPillar("Z");
    expect(results).toHaveLength(0);
  });
});

// ============================================================
// Tri Topologique et Dependances
// ============================================================
describe("ARTEMIS — Tri Topologique", () => {
  it("doit trier correctement les frameworks sans dependances", () => {
    const sorted = topologicalSort(["fw-04-value-architecture", "fw-10-attribution-model", "fw-22-risk-matrix"]);
    expect(sorted).toHaveLength(3);
    // Les trois n'ont pas de dependances entre eux, donc l'ordre n'importe pas
    expect(sorted).toContain("fw-04-value-architecture");
    expect(sorted).toContain("fw-10-attribution-model");
    expect(sorted).toContain("fw-22-risk-matrix");
  });

  it("doit respecter l'ordre des dependances", () => {
    const sorted = topologicalSort(["fw-01-brand-archeology", "fw-02-persona-constellation"]);
    expect(sorted).toHaveLength(2);
    const idx01 = sorted.indexOf("fw-01-brand-archeology");
    const idx02 = sorted.indexOf("fw-02-persona-constellation");
    expect(idx01).toBeLessThan(idx02);
  });

  it("doit respecter une chaine de dependances longue", () => {
    const slugs = [
      "fw-01-brand-archeology",
      "fw-02-persona-constellation",
      "fw-07-touchpoint-mapping",
      "fw-08-ritual-design",
      "fw-09-devotion-pathway",
    ];
    const sorted = topologicalSort(slugs);
    expect(sorted).toHaveLength(5);

    // fw-01 doit etre avant fw-02
    expect(sorted.indexOf("fw-01-brand-archeology")).toBeLessThan(sorted.indexOf("fw-02-persona-constellation"));
    // fw-02 doit etre avant fw-07
    expect(sorted.indexOf("fw-02-persona-constellation")).toBeLessThan(sorted.indexOf("fw-07-touchpoint-mapping"));
    // fw-07 doit etre avant fw-08
    expect(sorted.indexOf("fw-07-touchpoint-mapping")).toBeLessThan(sorted.indexOf("fw-08-ritual-design"));
    // fw-08 doit etre avant fw-09
    expect(sorted.indexOf("fw-08-ritual-design")).toBeLessThan(sorted.indexOf("fw-09-devotion-pathway"));
  });

  it("doit ignorer les slugs inconnus", () => {
    const sorted = topologicalSort(["fw-01-brand-archeology", "fw-99-inexistant"]);
    expect(sorted).toHaveLength(1);
    expect(sorted).toContain("fw-01-brand-archeology");
  });

  it("doit gerer un tableau vide", () => {
    const sorted = topologicalSort([]);
    expect(sorted).toHaveLength(0);
  });

  it("doit trier tous les 28 frameworks", () => {
    const allSlugs = FRAMEWORKS.map((f) => f.slug);
    const sorted = topologicalSort(allSlugs);
    expect(sorted).toHaveLength(28);
  });
});

// ============================================================
// Resolution de chaine de dependances
// ============================================================
describe("ARTEMIS — Chaine de Dependances", () => {
  it("doit verifier que les dependances referencent des slugs existants", () => {
    const allSlugs = new Set(FRAMEWORKS.map((f) => f.slug));
    for (const fw of FRAMEWORKS) {
      for (const dep of fw.dependencies) {
        expect(allSlugs.has(dep)).toBe(true);
      }
    }
  });

  it("ne doit pas avoir de dependances circulaires", () => {
    const allSlugs = FRAMEWORKS.map((f) => f.slug);
    const sorted = topologicalSort(allSlugs);
    // Si le tri topologique retourne tous les elements, il n'y a pas de cycle
    expect(sorted).toHaveLength(28);
  });

  it("doit avoir des frameworks sans dependances (racines)", () => {
    const roots = FRAMEWORKS.filter((f) => f.dependencies.length === 0);
    expect(roots.length).toBeGreaterThan(0);
  });

  it("fw-01-brand-archeology ne doit pas avoir de dependances", () => {
    const fw = getFramework("fw-01-brand-archeology");
    expect(fw!.dependencies).toHaveLength(0);
  });

  it("fw-09-devotion-pathway doit dependre de fw-08 et fw-02", () => {
    const fw = getFramework("fw-09-devotion-pathway");
    expect(fw!.dependencies).toContain("fw-08-ritual-design");
    expect(fw!.dependencies).toContain("fw-02-persona-constellation");
  });
});
