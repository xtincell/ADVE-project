/**
 * JEHUTY_FEED_REFRESH — cœur pur de l'orchestrateur de Gazette.
 *
 * Prouve, sans DB ni réseau, les deux algorithmes déterministes qui alimentent
 * les rubriques « Signaux marché » (deltas d'audience réels) et « Signaux
 * faibles » (thèmes émergents dérivés de la veille captée). Doctrine zéro
 * fabrication : un seul point de mesure => pas de variation ; pas de thème
 * récurrent => null (jamais un chiffre / un thème inventé).
 */
import { describe, it, expect } from "vitest";
import { computeFollowerDeltas, detectEmergingTerm } from "@/server/services/jehuty/refresh";

describe("computeFollowerDeltas — variation d'audience réelle", () => {
  it("un seul relevé par plateforme => aucune variation, allSinglePoint", () => {
    const { deltas, allSinglePoint } = computeFollowerDeltas([
      { platform: "FACEBOOK", followerCount: 4252 },
      { platform: "INSTAGRAM", followerCount: 1753 },
    ]);
    expect(deltas).toEqual([]);
    expect(allSinglePoint).toBe(true);
  });

  it("deux relevés (triés desc) => delta = dernier - précédent", () => {
    const { deltas, allSinglePoint } = computeFollowerDeltas([
      { platform: "FACEBOOK", followerCount: 4315 }, // dernier
      { platform: "FACEBOOK", followerCount: 4252 }, // précédent
    ]);
    expect(allSinglePoint).toBe(false);
    expect(deltas).toEqual([{ platform: "FACEBOOK", from: 4252, to: 4315, delta: 63 }]);
  });

  it("delta nul => écarté (audience stable, pas de dépêche)", () => {
    const { deltas } = computeFollowerDeltas([
      { platform: "TIKTOK", followerCount: 1308 },
      { platform: "TIKTOK", followerCount: 1308 },
    ]);
    expect(deltas).toEqual([]);
  });

  it("multi-plateforme : agrège les variations non nulles", () => {
    const { deltas } = computeFollowerDeltas([
      { platform: "FACEBOOK", followerCount: 4315 },
      { platform: "FACEBOOK", followerCount: 4252 },
      { platform: "INSTAGRAM", followerCount: 1794 },
      { platform: "INSTAGRAM", followerCount: 1753 },
    ]);
    expect(deltas).toHaveLength(2);
    expect(deltas.reduce((s, d) => s + d.delta, 0)).toBe(63 + 41);
  });
});

describe("detectEmergingTerm — thème émergent de la veille réelle", () => {
  const exclude = new Set(["motion19", "culture"]);

  it("terme présent dans ≥ 3 titres distincts => détecté", () => {
    const term = detectEmergingTerm(
      [
        "Le marché de l'animation explose au Cameroun",
        "Animation : une nouvelle vague de studios",
        "L'animation africaine séduit les diffuseurs",
        "Un festival dédié au sport",
      ],
      exclude,
    );
    expect(term).toEqual({ term: "animation", n: 3 });
  });

  it("aucun terme récurrent (≥3) => null (jamais inventé)", () => {
    const term = detectEmergingTerm(
      ["Sujet unique un", "Autre sujet deux", "Encore un troisième"],
      exclude,
    );
    expect(term).toBeNull();
  });

  it("exclut la marque et le secteur (comptage circulaire) + stopwords + nombres", () => {
    const term = detectEmergingTerm(
      [
        "Motion19 lance la culture 2026",
        "Motion19 et la culture du studio",
        "Motion19 culture 2026 encore",
      ],
      exclude,
    );
    // « motion19 » et « culture » exclus, « 2026 » = nombre, stopwords écartés
    // => aucun terme significatif récurrent.
    expect(term).toBeNull();
  });

  it("occurrences multiples dans UN titre ne comptent qu'une fois", () => {
    const term = detectEmergingTerm(
      ["studio studio studio", "un studio ici", "encore studio"],
      exclude,
    );
    expect(term).toEqual({ term: "studio", n: 3 });
  });
});
