import { describe, expect, it } from "vitest";
import { diffRevisionFields, formatRevisionDiff } from "@/domain/revision-diff";

describe("diffRevisionFields — ce qui a changé entre deux instantanés", () => {
  it("première révision (prev null) : tout champ présent est « added »", () => {
    const diff = diffRevisionFields(null, { nomMarque: "Wafu", secteur: "FMCG" });
    expect(diff).toEqual({ added: ["nomMarque", "secteur"], changed: [], removed: [] });
  });

  it("ajout, modification et effacement détectés champ par champ", () => {
    const prev = { nomMarque: "Wafu", secteur: "FMCG", valeurs: ["qualité"] };
    const next = { nomMarque: "Wafu", secteur: "Boissons", archetype: "Créateur" };
    const diff = diffRevisionFields(prev, next);
    expect(diff.added).toEqual(["archetype"]);
    expect(diff.changed).toEqual(["secteur"]);
    expect(diff.removed).toEqual(["valeurs"]);
  });

  it("égalité indépendante de l'ordre des clés imbriquées", () => {
    const prev = { personas: [{ nom: "Awa", age: 30 }] };
    const next = { personas: [{ age: 30, nom: "Awa" }] };
    expect(diffRevisionFields(prev, next)).toEqual({ added: [], changed: [], removed: [] });
  });

  it("les métadonnées `_*` (dérivation) ne comptent jamais", () => {
    const prev = { _draft: true, _derivedFrom: ["A"], globalSwot: { strengths: [] } };
    const next = { _draft: true, _derivedFrom: ["A", "D"], globalSwot: { strengths: ["x"] } };
    const diff = diffRevisionFields(prev, next);
    expect(diff).toEqual({ added: [], changed: ["globalSwot"], removed: [] });
  });

  it("contenus non-objets tolérés (jamais de throw)", () => {
    expect(diffRevisionFields("brut", null)).toEqual({ added: [], changed: [], removed: [] });
    expect(diffRevisionFields([1, 2], { a: 1 })).toEqual({
      added: ["a"],
      changed: [],
      removed: [],
    });
  });
});

describe("formatRevisionDiff — ligne FR compacte", () => {
  it("compose les segments présents uniquement", () => {
    expect(
      formatRevisionDiff({ added: ["a", "b"], changed: ["c"], removed: [] }),
    ).toBe("+2 champs · ~1 modifié");
    expect(formatRevisionDiff({ added: [], changed: [], removed: ["x"] })).toBe("−1 effacé");
  });

  it("rien de changé → null (l'UI affiche le constat, pas une ligne vide)", () => {
    expect(formatRevisionDiff({ added: [], changed: [], removed: [] })).toBeNull();
  });
});
