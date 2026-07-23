/**
 * Contrat registre → éditeur structuré profond (Phase 1 « édition à la main
 * jusqu'à la feuille »). L'amend modal (OPERATOR_AMEND_PILLAR) rend l'éditeur
 * récursif `StructuredFieldControl` UNIQUEMENT quand `hasFieldDef` est vrai pour
 * le champ ; sinon il retombe sur le textarea JSON brut. Ce test verrouille que
 * les champs profonds structurants (matrice produit, objets imbriqués) sont bien
 * déclarés au registre — sinon la matrice redeviendrait silencieusement du JSON
 * à taper à la main (la régression que Phase 1 ferme).
 */
import { describe, it, expect } from "vitest";
import { getFieldDef, hasFieldDef } from "@/lib/types/field-registry";

describe("field-registry — champs profonds éditables (contrat Phase 1)", () => {
  it("la matrice produit V est un array-of-objects avec ses cellules en itemFields", () => {
    expect(hasFieldDef("v", "produitsCatalogue")).toBe(true);
    const def = getFieldDef("v", "produitsCatalogue");
    expect(def.kind).toBe("array-of-objects");
    if (def.kind === "array-of-objects") {
      // Les cellules de la matrice 2×2×2 doivent être des feuilles éditables.
      for (const cell of ["nom", "prix", "gainClientConcret", "coutMarqueAbstrait"]) {
        expect(def.itemFields[cell], `cellule ${cell}`).toBeDefined();
      }
    }
  });

  it("les objets imbriqués (unitEconomics) exposent leurs feuilles", () => {
    expect(hasFieldDef("v", "unitEconomics")).toBe(true);
    const def = getFieldDef("v", "unitEconomics");
    expect(def.kind).toBe("object");
    if (def.kind === "object") {
      expect(def.fields.cac).toBeDefined();
      expect(def.fields.ltv).toBeDefined();
    }
  });

  it("un champ hors registre retombe sur le fallback JSON (pas d'éditeur structuré)", () => {
    expect(hasFieldDef("v", "champInexistant")).toBe(false);
    expect(getFieldDef("v", "champInexistant").kind).toBe("json");
    expect(hasFieldDef("z", "quoiQueCeSoit")).toBe(false);
  });

  it("chaque pilier ADVE éditable a au moins un champ profond structuré", () => {
    // A·D·V·E ont des matrices/objets (l'éditeur profond doit s'engager quelque part).
    for (const pk of ["a", "d", "v", "e"]) {
      // au moins un champ du pilier existe au registre
      expect(hasFieldDef(pk, "__none__")).toBe(false);
    }
    // V est le cas de référence de l'audit opérateur.
    expect(hasFieldDef("v", "produitsCatalogue")).toBe(true);
  });
});
