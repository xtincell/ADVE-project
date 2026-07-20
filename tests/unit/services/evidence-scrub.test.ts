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
