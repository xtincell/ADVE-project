/**
 * Sur quoi un niveau de marque repose (2026-07-31).
 *
 * Signalement opérateur, verbatim : « *je lis le résultat et je constate
 * qu'Irawo est l'agent alors que c'est une marque forte* ».
 *
 * Vérifié en base : cet intake ne portait qu'UNE phase déclarée sur neuf et
 * son pilier D était vide. La règle canon — « la fondation la plus faible tire
 * le placement » — produisait donc LATENT. **Le calcul était juste.** Ce qui
 * ne l'était pas, c'est ce que le rapport en disait : il annonçait un verdict
 * sur la marque là où il ne mesurait qu'un formulaire peu rempli.
 *
 * Un niveau ne peut plus voyager sans sa base.
 */

import { describe, it, expect } from "vitest";
import { deriveBrandLevelDeterministic } from "@/server/services/quick-intake/brand-level-evaluator";

const EMPTY_ADVE = { a: {}, d: {}, v: {}, e: {} };

/** Reproduit le cas Irawo : une phase déclarée, D vide, V et E nourris. */
function irawoLike() {
  return deriveBrandLevelDeterministic({
    companyName: "Irawo",
    sector: "développement des talents",
    country: null,
    responses: { biz: { biz_model: "plateforme" } },
    extractedValues: {
      a: { nomMarque: "Irawo", missionStatement: "Développer les talents africains" },
      d: {},
      v: { promesse: "Des équipes performantes plus vite" },
      e: { e_channels: "LinkedIn" },
    },
    completionByPillar: { a: 0.2, d: 0, v: 0.3, e: 0.2 },
  });
}

describe("le niveau dit sur quoi il repose", () => {
  it("compte les volets réellement déclarés", () => {
    const ev = irawoLike();
    expect(ev.basis.declaredPhases).toBe(1);
    expect(ev.basis.totalPhases).toBeGreaterThanOrEqual(9);
  });

  it("nomme les fondations vides — celles qui tirent le placement", () => {
    expect(irawoLike().basis.emptyPillars).toContain("d");
  });

  it("un palier bâti sur si peu est PROVISOIRE, jamais un verdict", () => {
    expect(irawoLike().basis.provisional).toBe(true);
  });

  it("et la justification le DIT au lieu de juger la marque", () => {
    const j = irawoLike().justification;
    expect(j).toContain("provisoire");
    expect(j).toContain("1 des");
    // Le point qui compte pour le fondateur qui lit son rapport :
    expect(j).toContain("pas la valeur réelle de la marque");
  });

  it("un intake VRAIMENT rempli n'est pas marqué provisoire", () => {
    const dense = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`f${i}`, `valeur ${i}`]));
    const ev = deriveBrandLevelDeterministic({
      companyName: "Chococam",
      sector: "agroalimentaire",
      country: "Cameroun",
      responses: {
        biz: { x: "1" }, a: { x: "1" }, d: { x: "1" }, v: { x: "1" },
        e: { x: "1" }, r: { x: "1" }, t: { x: "1" }, i: { x: "1" }, s: { x: "1" },
      },
      extractedValues: { a: dense(5), d: dense(5), v: dense(5), e: dense(5) },
      completionByPillar: { a: 0.9, d: 0.9, v: 0.9, e: 0.9 },
    });
    expect(ev.basis.provisional).toBe(false);
    expect(ev.basis.emptyPillars).toEqual([]);
    expect(ev.justification).not.toContain("provisoire");
  });

  it("le niveau lui-même n'est PAS altéré : seule sa restitution change", () => {
    // La règle canon reste intacte — on ne remonte pas artificiellement un
    // palier pour faire plaisir, on dit sur quoi il est calculé.
    expect(irawoLike().level).toBe("LATENT");
  });
});
