import { describe, it, expect } from "vitest";
import {
  getTransitiveDependencies,
  PILLAR_DEPENDENCIES,
  COMPOSITE_COLLECTIONS,
} from "@/server/services/staleness-propagator";

/**
 * Le modèle canonique (NEFER §0.3 + ADR-0023) — ADVE socle fondateur
 * indépendant, ADVE → RTIS, RTIS interne linéaire — est verrouillé ici.
 *
 * Drift à éviter : la version legacy traitait A → D → V → E comme cascade
 * linéaire et faisait apparaître E "MAJ RECOMMANDÉE" dès qu'A bougeait.
 * Ces tests garantissent que toute régression vers une cascade intra-ADVE
 * casse la CI.
 */
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

    it("A pilier ADVE indépendant : ne flippe que R, T, I, S", () => {
      expect(PILLAR_DEPENDENCIES.A).toEqual(["R", "T", "I", "S"]);
    });

    it("D pilier ADVE indépendant : ne flippe que R, T, I, S", () => {
      expect(PILLAR_DEPENDENCIES.D).toEqual(["R", "T", "I", "S"]);
    });

    it("V pilier ADVE indépendant : ne flippe que R, T, I, S", () => {
      expect(PILLAR_DEPENDENCIES.V).toEqual(["R", "T", "I", "S"]);
    });

    it("E pilier ADVE indépendant : ne flippe que R, T, I, S", () => {
      expect(PILLAR_DEPENDENCIES.E).toEqual(["R", "T", "I", "S"]);
    });

    it("R cascade interne RTIS : T, I, S", () => {
      expect(PILLAR_DEPENDENCIES.R).toEqual(["T", "I", "S"]);
    });

    it("T cascade interne RTIS : I, S", () => {
      expect(PILLAR_DEPENDENCIES.T).toEqual(["I", "S"]);
    });

    it("I impacte uniquement S", () => {
      expect(PILLAR_DEPENDENCIES.I).toEqual(["S"]);
    });

    it("aucun pilier ADVE ne marque un autre ADVE stale (anti-drift)", () => {
      const adveSet = new Set(["A", "D", "V", "E"]);
      for (const adve of adveSet) {
        const deps = PILLAR_DEPENDENCIES[adve] ?? [];
        for (const dep of deps) {
          expect(adveSet.has(dep), `${adve} ne doit pas marquer ${dep} (autre ADVE) stale`).toBe(false);
        }
      }
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
    it("A cascade vers R, T, I, S (4 dependances RTIS uniquement)", () => {
      const deps = getTransitiveDependencies("A");
      expect(deps.sort()).toEqual(["I", "R", "S", "T"]);
    });

    it("D cascade vers R, T, I, S (4 dependances RTIS uniquement)", () => {
      const deps = getTransitiveDependencies("D");
      expect(deps.sort()).toEqual(["I", "R", "S", "T"]);
    });

    it("V cascade vers R, T, I, S (4 dependances RTIS uniquement)", () => {
      const deps = getTransitiveDependencies("V");
      expect(deps.sort()).toEqual(["I", "R", "S", "T"]);
    });

    it("E cascade vers R, T, I, S (4 dependances RTIS uniquement)", () => {
      const deps = getTransitiveDependencies("E");
      expect(deps.sort()).toEqual(["I", "R", "S", "T"]);
    });

    it("S retourne un tableau vide (aucune dependance)", () => {
      const deps = getTransitiveDependencies("S");
      expect(deps).toEqual([]);
    });

    it("I retourne uniquement S", () => {
      const deps = getTransitiveDependencies("I");
      expect(deps).toEqual(["S"]);
    });

    it("R cascade vers T, I, S (3 dependances RTIS interne)", () => {
      const deps = getTransitiveDependencies("R");
      expect(deps.sort()).toEqual(["I", "S", "T"]);
    });

    it("T cascade vers I, S", () => {
      const deps = getTransitiveDependencies("T");
      expect(deps.sort()).toEqual(["I", "S"]);
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

    it("aucun pilier ADVE n'apparait dans la cascade transitive d'un autre ADVE", () => {
      const adveKeys = ["A", "D", "V", "E"];
      for (const a of adveKeys) {
        const deps = getTransitiveDependencies(a);
        for (const other of adveKeys) {
          if (other === a) continue;
          expect(deps, `cascade(${a}) ne doit pas inclure ${other}`).not.toContain(other);
        }
      }
    });
  });
});
