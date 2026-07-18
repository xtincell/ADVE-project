/**
 * Salvage déterministe des réponses brutes → champs de schéma (zéro LLM).
 *
 * Invariant : une marque au dossier RICHE ne doit JAMAIS être scorée ~0 juste
 * parce que l'extraction LLM était indisponible. Le salvage re-clé les vraies
 * réponses vers les champs de schéma que le scorer sait lire — reproduisant le
 * pipeline réel de complete() : salvage → normalize → assess → score.
 *
 * Fixture : Chococam (chocolaterie nationale camerounaise, 1967) — les mêmes
 * réponses ingérées qui affichaient A=0.6 / D=V=E=0.0 en prod.
 */

import { describe, it, expect } from "vitest";
import { salvageRawResponses } from "@/server/services/quick-intake/salvage-responses";
import { normalizePillarForIntake } from "@/server/services/pillar-normalizer";
import { getStrategyPillarInputsFromContent } from "@/server/services/advertis-scorer/structural";
import { scorePillarStructural } from "@/lib/utils/scoring";

// Réponses ingérées, keyées par id de question-bank (le format qui retombait au
// scorer sous forme brute quand le LLM d'extraction était down).
const CHOCOCAM_RAW: Record<"a" | "d" | "v" | "e", Record<string, string>> = {
  a: {
    a_noyau: "Le chocolat camerounais par excellence depuis 1967",
    a_origin:
      "Créée en 1967 au Cameroun, Chococam est la première chocolaterie-confiserie de la zone CEMAC",
    a_mission: "Rendre le plaisir chocolaté accessible à tous les foyers africains",
    a_values: "Qualité constante, fierté camerounaise, accessibilité",
    a_vision: "Devenir la référence chocolatière de l'Afrique centrale",
  },
  d: {
    d_positioning:
      "La seule chocolaterie industrielle historique fabriquée localement au Cameroun",
    d_promise: "Qualité et saveur constantes, fabriqué au Cameroun",
    d_persona_principal:
      "Mère de famille urbaine qui achète des goûters reconnus et abordables pour ses enfants",
    d_competitors: "Nestlé, marques importées européennes",
    d_voice: "Chaleureux, familial, patriotique, mettant en avant l'origine camerounaise",
  },
  v: {
    v_promise: "Un plaisir chocolaté de qualité constante à un prix accessible",
    v_products: "Pâte à tartiner, poudre de petit-déjeuner, barres chocolatées, bonbons",
    v_price_positioning: "Milieu de gamme",
  },
  e: {
    e_rituals: "Associé à Pâques (vœux et produits spéciaux)",
    e_superfan:
      "Le Camerounais de la diaspora qui ramène des produits Chococam et les offre comme un morceau du pays",
    e_loyalty: "50-70%",
  },
};

const CANON = { sector: "FMCG", country: "Cameroun" };

/** Reproduit le pipeline de complete() : (salvage|raw) → seal → normalize → score. */
function scoreThroughPipeline(
  pillar: "a" | "d" | "v" | "e",
  content: Record<string, unknown>,
): number {
  // Seal minimal des canoniques (comme sealCanonicalPillarFields pour A).
  const sealed: Record<string, unknown> = { ...content };
  if (pillar === "a") {
    sealed.nomMarque = "Chococam";
    sealed.secteur = CANON.sector;
    sealed.pays = CANON.country;
  }
  const normalized = normalizePillarForIntake(pillar, sealed);
  const input = getStrategyPillarInputsFromContent(pillar, normalized);
  return scorePillarStructural(input);
}

describe("salvageRawResponses — re-clé déterministe question-bank → schéma", () => {
  it("mappe les correspondances exactes vers les champs de schéma", () => {
    const a = salvageRawResponses("a", CHOCOCAM_RAW.a);
    expect(a.noyauIdentitaire).toBe(CHOCOCAM_RAW.a.a_noyau);
    expect(a.missionStatement).toBe(CHOCOCAM_RAW.a.a_mission);
    expect(Array.isArray(a.valeurs)).toBe(true);
    expect((a.valeurs as unknown[]).length).toBe(3); // 3 valeurs séparées par virgules

    const d = salvageRawResponses("d", CHOCOCAM_RAW.d);
    expect(d.positionnement).toBe(CHOCOCAM_RAW.d.d_positioning);
    expect(d.promesseMaitre).toBe(CHOCOCAM_RAW.d.d_promise);
    expect(Array.isArray(d.personas)).toBe(true);

    const v = salvageRawResponses("v", CHOCOCAM_RAW.v);
    expect(v.promesseDeValeur).toBe(CHOCOCAM_RAW.v.v_promise);
    expect(Array.isArray(v.produitsCatalogue)).toBe(true);
    expect((v.produitsCatalogue as unknown[]).length).toBe(4);

    const e = salvageRawResponses("e", CHOCOCAM_RAW.e);
    expect(Array.isArray(e.rituels)).toBe(true);
    expect((e.superfanPortrait as Record<string, unknown>).profile).toContain("diaspora");
  });

  it("conserve les réponses non-mappées (restitution rapport, zéro perte)", () => {
    const a = salvageRawResponses("a", CHOCOCAM_RAW.a);
    expect(a.a_origin).toBe(CHOCOCAM_RAW.a.a_origin); // pas de champ schéma direct → conservé
    expect(a.a_vision).toBe(CHOCOCAM_RAW.a.a_vision);
    // …mais la clé mappée a bien migré (plus de doublon brut).
    expect(a.a_noyau).toBeUndefined();
  });

  it("le salvage produit un score NON-NUL sur les 4 piliers (fin du « tout à zéro »)", () => {
    for (const pillar of ["a", "d", "v", "e"] as const) {
      const salvaged = salvageRawResponses(pillar, CHOCOCAM_RAW[pillar]);
      const score = scoreThroughPipeline(pillar, salvaged);
      expect(score, `pilier ${pillar} doit scorer > 0 après salvage`).toBeGreaterThan(0);
    }
  });

  it("REGRESSION : les clés brutes non-salvagées scoraient ~0 (le bug d'origine)", () => {
    // Sans salvage, D/V/E n'ont aucun champ de schéma → score nul.
    for (const pillar of ["d", "v", "e"] as const) {
      const raw = scoreThroughPipeline(pillar, { ...CHOCOCAM_RAW[pillar] });
      const salvaged = scoreThroughPipeline(pillar, salvageRawResponses(pillar, CHOCOCAM_RAW[pillar]));
      expect(salvaged).toBeGreaterThan(raw);
    }
  });

  it("est déterministe (variance = 0) et idempotent sur les clés mappées", () => {
    const a1 = salvageRawResponses("a", CHOCOCAM_RAW.a);
    const a2 = salvageRawResponses("a", CHOCOCAM_RAW.a);
    expect(a1).toEqual(a2);
  });

  it("tolère un pilier vide / sans mapping sans throw", () => {
    expect(salvageRawResponses("a", {})).toEqual({});
    expect(salvageRawResponses("a", null)).toEqual({});
    expect(salvageRawResponses("r", { r_threats: "x" })).toEqual({ r_threats: "x" });
  });
});
