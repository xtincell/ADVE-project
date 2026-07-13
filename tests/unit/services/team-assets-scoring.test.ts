import { describe, it, expect } from "vitest";
import { scorePillarSemantic } from "@/server/services/advertis-scorer/semantic";

/**
 * Increment 2b part 3 — les actifs de l'équipe dirigeante (diplômes,
 * compétences, faits marquants) doivent compter dans le score du pilier A,
 * pas seulement le nombre de membres / leur titre. Additif et borné : une
 * marque sans équipe garde 0 (aucune régression silencieuse — Loi 1).
 */
function equipe(content: unknown) {
  return scorePillarSemantic("A", content).breakdown.find((b) => b.component === "Équipe");
}

const withAssets = {
  nom: "X",
  role: "CEO",
  credentials: ["PRINCE2 Practitioner"],
  competencesCles: ["Vision produit"],
  experiencePasse: ["Jumia — operations"],
};
const titleOnly = { nom: "Y", role: "CTO" };

describe("scoreA — crédit des actifs d'équipe", () => {
  it("crédite présence + profondeur d'actifs (plein à 3 pour 3 membres tous dotés)", () => {
    const c = equipe({ equipeDirigeante: [withAssets, withAssets, withAssets] });
    expect(c?.maxScore).toBe(3);
    expect(c?.score).toBe(3); // présence 1,5 (3 membres) + profondeur 1,5 (tous avec actifs)
  });

  it("une équipe titres-only obtient MOINS qu'une équipe dotée d'actifs", () => {
    const dotee = equipe({ equipeDirigeante: [withAssets, withAssets, withAssets] })!.score;
    const nue = equipe({ equipeDirigeante: [titleOnly, titleOnly, titleOnly] })!.score;
    expect(dotee).toBeGreaterThan(nue); // les actifs comptent, pas seulement le titre
    expect(nue).toBe(1.5); // présence seule (3 membres), profondeur 0
  });

  it("aucune équipe → composant à 0 (pas de régression, Loi 1)", () => {
    expect(equipe({})?.score).toBe(0);
    expect(equipe({ equipeDirigeante: [] })?.score).toBe(0);
  });

  it("reste borné à maxScore 3 même avec beaucoup de membres dotés", () => {
    const many = Array.from({ length: 10 }, () => withAssets);
    const c = equipe({ equipeDirigeante: many });
    expect(c?.score).toBeLessThanOrEqual(3);
  });
});
