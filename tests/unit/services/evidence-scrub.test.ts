/**
 * ADR-0163 — scrub déterministe des preuves non fondées (anti-fabrication).
 * Cas réel test qualité 2026-07-20 : l'extracteur LLM inventait des roiProofs
 * (« +300 % — PME Cameroun — attestation fictive ») qui gonflaient le score V
 * et s'affichaient au client comme « valeurs extraites ».
 */

import { describe, it, expect } from "vitest";
import { scrubUnfoundedEvidence, scrubUnsourcedStatistics } from "@/server/services/quick-intake/evidence-scrub";

const SOURCE = `{"v":{"offre":"Forfaits voix/data, fibre, Orange Money. Depuis 1948, 2 boutiques."}}`;

describe("scrubUnfoundedEvidence", () => {
  it("droppe un roiProofs dont les chiffres n'apparaissent pas dans la source (cas Orange)", () => {
    const { content, dropped } = scrubUnfoundedEvidence(
      {
        offre: "Forfaits voix/data",
        roiProofs: [
          { client: "PME Cameroun", lift: "+300%", beforeMetric: "50 appels", afterMetric: "200 appels", timeframe: "30j" },
        ],
      },
      SOURCE,
    );
    expect(content.roiProofs).toBeUndefined();
    expect(dropped).toContain("roiProofs");
    expect(content.offre).toBe("Forfaits voix/data"); // champ non-preuve intact
  });

  it("conserve une preuve dont CHAQUE nombre est fondé dans la source", () => {
    const { content, dropped } = scrubUnfoundedEvidence(
      { roiProofs: [{ lift: "2 boutiques depuis 1948", beforeMetric: "", afterMetric: "", timeframe: "" }] },
      SOURCE,
    );
    expect(Array.isArray(content.roiProofs)).toBe(true);
    expect(dropped).toHaveLength(0);
  });

  it("filtre entrée par entrée dans un tableau de preuves mixte", () => {
    const { content, dropped } = scrubUnfoundedEvidence(
      {
        roiProofs: [
          { lift: "1948" }, // fondé
          { lift: "+9999%" }, // inventé
        ],
      },
      SOURCE,
    );
    expect((content.roiProofs as unknown[]).length).toBe(1);
    expect(dropped).toContain("roiProofs[]");
  });

  it("ne touche JAMAIS les champs de jugement (archetype, personas…), même chiffrés", () => {
    const { content, dropped } = scrubUnfoundedEvidence(
      { personas: [{ name: "Aïcha", description: "35 ans, urbaine" }], archetype: "SAGE" },
      SOURCE,
    );
    expect(content.personas).toBeDefined();
    expect(content.archetype).toBe("SAGE");
    expect(dropped).toHaveLength(0);
  });

  it("un champ de preuve SANS chiffre passe (pas une preuve chiffrée)", () => {
    const { content } = scrubUnfoundedEvidence(
      { attestationClient: "Très satisfait du service" },
      SOURCE,
    );
    expect(content.attestationClient).toBe("Très satisfait du service");
  });

  it("nombres à séparateurs : « 12 500 » déclaré fonde « 12500 » extrait", () => {
    const { content } = scrubUnfoundedEvidence(
      { tractionSignals: "12500 clients" },
      `on sert 12 500 clients aujourd'hui`,
    );
    expect(content.tractionSignals).toBe("12500 clients");
  });
});

// ── Extension 2026-07-20 : récits opérationnels fabriqués (cas AARRR) ──

const PAILLOTE_SOURCE = JSON.stringify({
  biz: { model: "Petit restaurant familial de cuisine camerounaise à Douala." },
  a: { mission: "Faire goûter la vraie cuisine de chez nous dans un cadre simple." },
  d: { difference: "Recettes de famille, poisson braisé réputé dans le quartier." },
  v: { offre: "Plats du jour, poisson braisé, ndolé, jus naturels." },
  e: { canaux: "Bouche-à-oreille, WhatsApp pour les commandes." },
});

describe("scrubUnfoundedEvidence — récits opérationnels (prose fabriquée)", () => {
  it("droppe le mur AARRR inventé (cas réel La Paillote : livre d'or, ambassadeurs, parrainage jamais déclarés)", () => {
    const { content, dropped } = scrubUnfoundedEvidence(
      {
        aarrr:
          "Revenue : marge confortable grâce aux ingrédients locaux. Les ambassadeurs amènent de nouveaux clients. " +
          "Referral : réductions et invitations à des dégustations. Le livre d'or et les avis en ligne servent de preuve sociale. " +
          "Un programme de parrainage simple est en cours de déploiement. Retention : reconnaissance des habitués, soirées à thème, " +
          "nouveautés saisonnières. Le groupe WhatsApp Ambassadeurs crée un sentiment d'appartenance. " +
          "Acquisition : recommandations d'hôtels et de guides locaux, page Facebook pour publier les plats du jour.",
      },
      PAILLOTE_SOURCE,
    );
    expect(content.aarrr).toBeUndefined();
    expect(dropped).toContain("aarrr");
  });

  it("conserve un récit opérationnel ANCRÉ dans le déclaré (restructuration honnête)", () => {
    const { content, dropped } = scrubUnfoundedEvidence(
      {
        aarrr:
          "Acquisition : bouche-à-oreille dans le quartier. Activation : commandes via WhatsApp, plats du jour, poisson braisé et ndolé. " +
          "Retention : recettes de famille, cuisine camerounaise dans un cadre simple à Douala.",
      },
      PAILLOTE_SOURCE,
    );
    expect(content.aarrr).toBeDefined();
    expect(dropped).toHaveLength(0);
  });

  it("un récit court (< 8 tokens de contenu) passe — trop court pour juger", () => {
    const { content } = scrubUnfoundedEvidence({ taboos: "Aucun tabou déclaré." }, PAILLOTE_SOURCE);
    expect(content.taboos).toBeDefined();
  });

  it("les champs de jugement restent hors périmètre (personas non ancrés conservés)", () => {
    const { content } = scrubUnfoundedEvidence(
      { personas: [{ name: "Aïcha", description: "Urbaine gourmande, cherche des saveurs authentiques le week-end avec ses collègues." }] },
      PAILLOTE_SOURCE,
    );
    expect(content.personas).toBeDefined();
  });
});

/**
 * 4.11.d — le rapport généré affichait « 80 % » sur la première impression,
 * chiffre qu'aucune réponse ni mesure ne portait. Une statistique de
 * population sans appui dans le dossier est retirée phrase par phrase.
 */
describe("scrubUnsourcedStatistics", () => {
  const SOURCE = `{"e":{"e_loyalty":"30-50%","e_channels":"Visites à l'atelier et téléphone"},"v":{"offre":"Ressemelage, 12 000 FCFA"}}`;

  it("retire la phrase portant une statistique de population absente du dossier", () => {
    const { value, dropped } = scrubUnsourcedStatistics(
      { preview: "80 % des clients jugent une marque sur sa première impression. Votre vitrine est à soigner." },
      SOURCE,
    );
    expect(value.preview).toBe("Votre vitrine est à soigner.");
    expect(dropped).toEqual(["80 % des clients jugent une marque sur sa première impression."]);
  });

  it("couvre les multiplicateurs et ratios, en français et en anglais", () => {
    const { value } = scrubUnsourcedStatistics(
      [
        "Le bouche-à-oreille convertit dix fois plus que la publicité. Il reste à le mesurer chez vous.",
        "8 sur 10 acheteurs comparent avant d'acheter. Votre offre est claire.",
        "98% of brands fail on Distinction. Your promise needs proof.",
      ],
      SOURCE,
    );
    expect(value).toEqual(["Il reste à le mesurer chez vous.", "Votre offre est claire.", "Your promise needs proof."]);
  });

  it("conserve un chiffre que le dossier porte réellement", () => {
    const text = "Entre 30 et 50 % des clients reviennent, selon votre réponse.";
    const { value, dropped } = scrubUnsourcedStatistics({ full: text }, `{"e":{"e_loyalty":"30 et 50 % des clients reviennent"}}`);
    expect(value.full).toBe(text);
    expect(dropped).toHaveLength(0);
  });

  it("laisse intacts les chiffres qui ne sont pas des statistiques de population", () => {
    const text = "Complétude structurelle 4/25 sur cette fondation.\n• Couverture : 9 % du poids total des dimensions.";
    const { value, dropped } = scrubUnsourcedStatistics({ full: text, priority: "P1", score: 80 }, SOURCE);
    expect(value).toEqual({ full: text, priority: "P1", score: 80 });
    expect(dropped).toHaveLength(0);
  });

  it("préserve les sauts de ligne et retire une puce devenue vide", () => {
    const { value } = scrubUnsourcedStatistics("• 80 % des consommateurs décident en sept secondes.\n• Rassembler des témoignages datés.", SOURCE);
    expect(value).toBe("• Rassembler des témoignages datés.");
  });
});
