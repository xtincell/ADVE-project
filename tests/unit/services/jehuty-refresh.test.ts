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
import { parseRssItems } from "@/server/services/seshat/external-feeds/rss";

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

// ── Extraction d'image RSS (vignettes « Le monde dehors ») ──────────────────
describe("parseRssItems — vignette réelle du flux (fix « aucune image »)", () => {
  it("extrait media:thumbnail / media:content", () => {
    const xml = `<rss><channel><item>
      <title>Un titre</title><link>https://ex.com/a</link>
      <media:thumbnail url="https://img.ex.com/t.jpg" />
    </item></channel></rss>`;
    expect(parseRssItems(xml)[0]?.imageUrl).toBe("https://img.ex.com/t.jpg");
  });

  it("extrait enclosure image", () => {
    const xml = `<rss><channel><item>
      <title>Deux</title><link>https://ex.com/b</link>
      <enclosure url="https://img.ex.com/e.png" type="image/png" />
    </item></channel></rss>`;
    expect(parseRssItems(xml)[0]?.imageUrl).toBe("https://img.ex.com/e.png");
  });

  it("extrait le premier <img src> de la description", () => {
    const xml = `<rss><channel><item>
      <title>Trois</title><link>https://ex.com/c</link>
      <description>&lt;img src="https://img.ex.com/d.jpg"&gt; texte</description>
    </item></channel></rss>`;
    // La description est CDATA/échappée selon le flux ; ici on teste le <img> brut.
    const xml2 = `<rss><channel><item><title>Trois</title><link>https://ex.com/c</link><description><![CDATA[<img src="https://img.ex.com/d.jpg"> texte]]></description></item></channel></rss>`;
    expect(parseRssItems(xml2)[0]?.imageUrl).toBe("https://img.ex.com/d.jpg");
    void xml;
  });

  it("pas d'image => imageUrl absent (jamais une URL vide)", () => {
    const xml = `<rss><channel><item><title>Quatre</title><link>https://ex.com/d</link></item></channel></rss>`;
    expect(parseRssItems(xml)[0]?.imageUrl).toBeUndefined();
  });

  it("ignore une URL non http(s) (data:/relative)", () => {
    const xml = `<rss><channel><item><title>Cinq</title><link>https://ex.com/e</link><media:content url="data:image/gif;base64,AAAA" /></item></channel></rss>`;
    expect(parseRssItems(xml)[0]?.imageUrl).toBeUndefined();
  });
});
