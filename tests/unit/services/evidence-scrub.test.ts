/**
 * ADR-0163 — scrub déterministe des preuves non fondées (anti-fabrication).
 * Cas réel test qualité 2026-07-20 : l'extracteur LLM inventait des roiProofs
 * (« +300 % — PME Cameroun — attestation fictive ») qui gonflaient le score V
 * et s'affichaient au client comme « valeurs extraites ».
 */

import { describe, it, expect } from "vitest";
import { scrubUnfoundedEvidence } from "@/server/services/quick-intake/evidence-scrub";

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
