import { describe, it, expect } from "vitest";
import {
  getTransitiveDependencies,
  PILLAR_DEPENDENCIES,
  COMPOSITE_COLLECTIONS,
} from "@/server/services/staleness-propagator";

describe("Staleness Propagator", () => {
  describe("PILLAR_DEPENDENCIES", () => {
    it("contient les 8 piliers", () => {
      const keys = Object.keys(PILLAR_DEPENDENCIES);
      expect(keys).toHaveLength(8);
      expect(keys.sort()).toEqual(["A", "D", "E", "I", "R", "S", "T", "V"]);
    });

    it("S n'a aucune dependance (sommet de la chaine)", () => {
      expect(PILLAR_DEPENDENCIES.S).toEqual([]);
    });

    it("A impacte D, E, S", () => {
      expect(PILLAR_DEPENDENCIES.A).toEqual(["D", "E", "S"]);
    });

    it("D impacte V, E, S", () => {
      expect(PILLAR_DEPENDENCIES.D).toEqual(["V", "E", "S"]);
    });

    it("V impacte T, I, S", () => {
      expect(PILLAR_DEPENDENCIES.V).toEqual(["T", "I", "S"]);
    });

    it("I impacte uniquement S", () => {
      expect(PILLAR_DEPENDENCIES.I).toEqual(["S"]);
    });
  });

  describe("COMPOSITE_COLLECTIONS", () => {
    it("contient les 8 piliers", () => {
      const keys = Object.keys(COMPOSITE_COLLECTIONS);
      expect(keys).toHaveLength(8);
      expect(keys.sort()).toEqual(["A", "D", "E", "I", "R", "S", "T", "V"]);
    });

    it("chaque pilier a un tableau de collections", () => {
      for (const [key, collections] of Object.entries(COMPOSITE_COLLECTIONS)) {
        expect(Array.isArray(collections), `${key} devrait etre un tableau`).toBe(true);
        expect(collections.length, `${key} devrait avoir au moins une collection`).toBeGreaterThan(0);
      }
    });

    it("A contient values, hero_journey, personas, community_hierarchy", () => {
      expect(COMPOSITE_COLLECTIONS.A).toEqual([
        "values",
        "hero_journey",
        "personas",
        "community_hierarchy",
      ]);
    });

    it("S contient strategic_axes et executive_summary", () => {
      expect(COMPOSITE_COLLECTIONS.S).toEqual(["strategic_axes", "executive_summary"]);
    });
  });

  describe("getTransitiveDependencies", () => {
    it("A cascade vers D, E, S, V, T, I (6 dependances)", () => {
      const deps = getTransitiveDependencies("A");
      expect(deps).toContain("D");
      expect(deps).toContain("E");
      expect(deps).toContain("S");
      expect(deps).toContain("V");
      expect(deps).toContain("T");
      expect(deps).toContain("I");
      expect(deps).toHaveLength(6);
    });

    it("les dependances transitives de A incluent D, E, V, T, I, S", () => {
      const deps = getTransitiveDependencies("A");
      const expected = ["D", "E", "S", "V", "T", "I"];
      for (const e of expected) {
        expect(deps).toContain(e);
      }
    });

    it("S retourne un tableau vide (aucune dependance)", () => {
      const deps = getTransitiveDependencies("S");
      expect(deps).toEqual([]);
    });

    it("I retourne uniquement S", () => {
      const deps = getTransitiveDependencies("I");
      expect(deps).toEqual(["S"]);
    });

    it("R cascade vers I et S", () => {
      const deps = getTransitiveDependencies("R");
      expect(deps).toContain("I");
      expect(deps).toContain("S");
      expect(deps).toHaveLength(2);
    });

    it("V cascade vers T, I, S", () => {
      const deps = getTransitiveDependencies("V");
      expect(deps).toContain("T");
      expect(deps).toContain("I");
      expect(deps).toContain("S");
    });

    it("une cle inconnue retourne un tableau vide", () => {
      const deps = getTransitiveDependencies("UNKNOWN");
      expect(deps).toEqual([]);
    });

    it("aucune dependance circulaire dans le graphe", () => {
      for (const key of Object.keys(PILLAR_DEPENDENCIES)) {
        const deps = getTransitiveDependencies(key);
        expect(deps).not.toContain(key);
      }
    });
  });
});
