import { describe, expect, it } from "vitest";
import { PILLAR_FIELDS } from "@/domain/pillar-fields";
import {
  classifyLevel,
  COMPOSITE_MAX_SCORE,
  isEnriched,
  isFilled,
  LEVEL_UPPER_BOUNDS_200,
  listCount,
  nextLevel,
  PILLAR_MAX_SCORE,
  scoreBrand,
  scorePillarContent,
  scorePillarStructural,
  STRUCTURAL_WEIGHTS,
} from "@/domain/scoring";
import { makeRichBrand, makeRichPillar } from "./fixtures";

describe("constantes canon (ADR-0102 legacy — doctrine figée)", () => {
  it("poids structurels = {atoms:15, collections:7, crossRefs:3}", () => {
    expect(STRUCTURAL_WEIGHTS).toEqual({ atoms: 15, collections: 7, crossRefs: 3 });
  });

  it("plafond pilier = 25, composite = 200", () => {
    expect(PILLAR_MAX_SCORE).toBe(25);
    expect(COMPOSITE_MAX_SCORE).toBe(200);
  });

  it("bornes de palier /200 : 40/80/120/160/180", () => {
    expect(LEVEL_UPPER_BOUNDS_200).toEqual({
      LATENT: 40,
      FRAGILE: 80,
      ORDINAIRE: 120,
      FORTE: 160,
      CULTE: 180,
    });
  });
});

describe("scorePillarStructural (formule canon /25)", () => {
  it("tout à zéro → 0", () => {
    expect(
      scorePillarStructural({
        atomsValid: 0,
        atomsRequired: 9,
        collectionsComplete: 0,
        collectionsTotal: 1,
        crossRefsValid: 0,
        crossRefsRequired: 9,
      }),
    ).toBe(0);
  });

  it("tout satisfait → plafonné à 25", () => {
    expect(
      scorePillarStructural({
        atomsValid: 9,
        atomsRequired: 9,
        collectionsComplete: 1,
        collectionsTotal: 1,
        crossRefsValid: 9,
        crossRefsRequired: 9,
      }),
    ).toBe(25);
  });

  it("dénominateur nul → l'axe rapporte 0 (comportement legacy)", () => {
    expect(
      scorePillarStructural({
        atomsValid: 5,
        atomsRequired: 5,
        collectionsComplete: 0,
        collectionsTotal: 0,
        crossRefsValid: 0,
        crossRefsRequired: 0,
      }),
    ).toBe(15);
  });
});

describe("sondes de contenu", () => {
  it("isFilled : rejette vide/null/blancs, accepte données réelles", () => {
    expect(isFilled(undefined)).toBe(false);
    expect(isFilled(null)).toBe(false);
    expect(isFilled("")).toBe(false);
    expect(isFilled("   ")).toBe(false);
    expect(isFilled([])).toBe(false);
    expect(isFilled({})).toBe(false);
    expect(isFilled([null, ""])).toBe(false);
    expect(isFilled("HEROS")).toBe(true);
    expect(isFilled(0)).toBe(true);
    expect(isFilled(false)).toBe(true);
    expect(isFilled([{ nom: "x" }])).toBe(true);
    expect(isFilled({ slogan: "x" })).toBe(true);
  });

  it("listCount : tableaux ET objets (SWOT = 4 quadrants)", () => {
    expect(listCount([1, 2, 3])).toBe(3);
    expect(listCount([1, null, ""])).toBe(1);
    expect(listCount({ strengths: ["a"], weaknesses: ["b"], opportunities: [], threats: [] })).toBe(2);
    expect(listCount("texte")).toBe(0);
  });

  it("isEnriched : texte court non enrichi, texte long enrichi", () => {
    const field = { id: "x", label: "X", description: "", needsHuman: false, type: "texte" as const };
    expect(isEnriched(field, "court")).toBe(false);
    expect(isEnriched(field, "x".repeat(130))).toBe(true);
  });
});

describe("scorePillarContent (adaptateur v7)", () => {
  const fieldsA = PILLAR_FIELDS.A;

  it("contenu vide → score 0, tous les champs missing", () => {
    const r = scorePillarContent({}, fieldsA);
    expect(r.score).toBe(0);
    expect(r.score25).toBe(0);
    expect(r.filled).toEqual([]);
    expect(r.missing).toEqual(fieldsA.map((f) => f.id));
  });

  it("contenu null/undefined toléré → 0", () => {
    expect(scorePillarContent(null, fieldsA).score).toBe(0);
    expect(scorePillarContent(undefined, fieldsA).score).toBe(0);
  });

  it("pilier riche → 100/100 et 25/25", () => {
    const r = scorePillarContent(makeRichPillar("A"), fieldsA);
    expect(r.score).toBe(100);
    expect(r.score25).toBe(25);
    expect(r.missing).toEqual([]);
    expect(r.filled.length).toBe(fieldsA.length);
  });

  it("contenu partiel → score strictement entre 0 et 100, missing exact", () => {
    const partial = { nomMarque: "SPAWT", archetype: "HEROS" };
    const r = scorePillarContent(partial, fieldsA);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(100);
    expect(r.filled).toEqual(["nomMarque", "archetype"]);
    expect(r.missing).toContain("valeurs");
    expect(r.missing).not.toContain("nomMarque");
  });

  it("déterminisme strict : variance 0 sur 100 appels (LOI 9)", () => {
    const content = { nomMarque: "SPAWT", valeurs: [{ nom: "BIENVEILLANCE" }] };
    const scores = new Set(
      Array.from({ length: 100 }, () => scorePillarContent(content, fieldsA).score25),
    );
    expect(scores.size).toBe(1);
  });

  it("jamais au-dessus du plafond", () => {
    const over = makeRichPillar("A");
    // sur-remplissage : listes très longues
    over.valeurs = Array.from({ length: 30 }, (_, i) => ({ nom: `v${i}` }));
    const r = scorePillarContent(over, fieldsA);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score25).toBeLessThanOrEqual(25);
  });
});

describe("scoreBrand (composite /200 + palier)", () => {
  it("marque vide → 0/200, palier LATENT", () => {
    const r = scoreBrand({});
    expect(r.total).toBe(0);
    expect(r.level).toBe("LATENT");
    expect(r.byPillar.A.score).toBe(0);
    expect(r.byPillar.S.score).toBe(0);
  });

  it("marque complète → 200/200, meilleur palier (ICONE)", () => {
    const r = scoreBrand(makeRichBrand());
    expect(r.total).toBe(200);
    expect(r.level).toBe("ICONE");
  });

  it("socle ADVE seul (riche) → 100/200 = ORDINAIRE (les dérivés manquent)", () => {
    const brand = makeRichBrand();
    const r = scoreBrand({ A: brand.A, D: brand.D, V: brand.V, E: brand.E });
    expect(r.total).toBe(100);
    expect(r.level).toBe("ORDINAIRE");
  });
});

describe("classifyLevel (paliers lisibles)", () => {
  it("bornes exactes de l'échelle /200", () => {
    expect(classifyLevel(0)).toBe("LATENT");
    expect(classifyLevel(40)).toBe("LATENT");
    expect(classifyLevel(41)).toBe("FRAGILE");
    expect(classifyLevel(80)).toBe("FRAGILE");
    expect(classifyLevel(120)).toBe("ORDINAIRE");
    expect(classifyLevel(160)).toBe("FORTE");
    expect(classifyLevel(180)).toBe("CULTE");
    expect(classifyLevel(181)).toBe("ICONE");
    expect(classifyLevel(200)).toBe("ICONE");
  });

  it("normalise depuis d'autres échelles (diagnostic /100)", () => {
    expect(classifyLevel(0, 100)).toBe("LATENT");
    expect(classifyLevel(50, 100)).toBe("ORDINAIRE");
    expect(classifyLevel(100, 100)).toBe("ICONE");
  });

  it("nextLevel monte la cascade et s'arrête à l'apex", () => {
    expect(nextLevel("LATENT")).toBe("FRAGILE");
    expect(nextLevel("ICONE")).toBeNull();
  });
});
