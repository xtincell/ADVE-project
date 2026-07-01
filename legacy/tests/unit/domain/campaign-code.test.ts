/**
 * Anti-drift CI test — Phase 18-A1-α (audit MATANGA V4) — auto-générateur Campaign.code.
 *
 * Vérifie que le helper produit les codes alignés sur la nomenclature opératrice
 * formelle Matanga V4 (sheet NOMENCLATURE) :
 *   FrieslandCampina : `FC-[PAYS]-[MARQUE]-NNN`
 *   Cadyst Group    : `PZ-NNN`
 *   Cadyst Farming  : `CF-NNN`
 *
 * NEFER §3 interdit absolu n°3 — drift narratif silencieux.
 */

import { describe, it, expect } from "vitest";
import {
  generateCampaignCode,
  generateTaskCode,
  generateChangeRequestCode,
  parseCampaignCode,
  extractCodePrefix,
  shortenBrandForCode,
  CODE_PREFIX_ROLE_TAG,
} from "@/domain/campaign-code";

describe("campaign-code — extractCodePrefix", () => {
  it("extrait depuis nodeRole CODE_PREFIX explicite", () => {
    expect(
      extractCodePrefix({
        name: "FrieslandCampina",
        slug: "frieslandcampina",
        nodeRole: [`${CODE_PREFIX_ROLE_TAG}:FC`],
      }),
    ).toBe("FC");
    expect(
      extractCodePrefix({
        name: "Panzani / Cadyst Group",
        slug: "panzani-cadyst",
        nodeRole: [`${CODE_PREFIX_ROLE_TAG}:PZ`],
      }),
    ).toBe("PZ");
  });

  it("dérive du nom si nodeRole absent — mots multi → initiales (max 3)", () => {
    expect(extractCodePrefix({ name: "Cadyst Farming", slug: "cadyst-farming", nodeRole: [] })).toBe("CF");
    expect(extractCodePrefix({ name: "Cadyst Grain", slug: "cadyst-grain", nodeRole: [] })).toBe("CG");
  });

  it("dérive du nom si single word — 2 premières lettres", () => {
    expect(extractCodePrefix({ name: "Fokou", slug: "fokou", nodeRole: [] })).toBe("FO");
    expect(extractCodePrefix({ name: "Panzani", slug: "panzani", nodeRole: [] })).toBe("PA");
  });

  it("filtre les mots de liaison pour les initiales", () => {
    expect(
      extractCodePrefix({
        name: "Banque de la Nation",
        slug: "bdn",
        nodeRole: [],
      }),
    ).toBe("BN");
  });
});

describe("campaign-code — shortenBrandForCode", () => {
  it("garde le mot complet si <= 6 chars", () => {
    expect(shortenBrandForCode({ name: "Peak", slug: "peak" })).toBe("PEAK");
    expect(shortenBrandForCode({ name: "Coast", slug: "coast" })).toBe("COAST");
  });

  it("multi-mots → initiales", () => {
    expect(shortenBrandForCode({ name: "Bonnet Rouge", slug: "bonnet-rouge" })).toBe("BR");
    expect(shortenBrandForCode({ name: "Belle Hollandaise", slug: "belle-hollandaise" })).toBe("BH");
    expect(shortenBrandForCode({ name: "La Pasta Gold", slug: "la-pasta-gold" })).toBe("PG");
  });

  it("nom long single-word → tronqué à 6", () => {
    expect(shortenBrandForCode({ name: "ROBUSTE", slug: "robuste" })).toBe("ROBUST");
  });
});

describe("campaign-code — generateCampaignCode", () => {
  const fcCorporate = {
    id: "1",
    name: "FrieslandCampina",
    slug: "frieslandcampina",
    nodeRole: [`${CODE_PREFIX_ROLE_TAG}:FC`],
    nodeKind: "CORPORATE",
  };

  it("FC-TG-PEAK-001 — pattern FrieslandCampina canonique", () => {
    const code = generateCampaignCode({
      corporateNode: fcCorporate,
      regionalNode: { countryCode: "TG" },
      brandNode: { name: "Peak", slug: "peak" },
      sequenceNumber: 1,
    });
    expect(code).toBe("FC-TG-PEAK-001");
  });

  it("FC-CD-BR-001 — Bonnet Rouge RDC", () => {
    const code = generateCampaignCode({
      corporateNode: fcCorporate,
      regionalNode: { countryCode: "CD" },
      brandNode: { name: "Bonnet Rouge", slug: "bonnet-rouge" },
      sequenceNumber: 1,
    });
    expect(code).toBe("FC-CD-BR-001");
  });

  it("FC-XX-MULTI-001 — multi-pays multi-marques", () => {
    const code = generateCampaignCode({
      corporateNode: fcCorporate,
      regionalNode: null,
      brandNode: null,
      sequenceNumber: 1,
    });
    expect(code).toBe("FC-001"); // Pas de country ni brand → format réduit
  });

  it("FC-XX-MULTI-001 explicite — quand brandNode null mais country présent", () => {
    // Cas hybride : on a un pays mais pas de marque spécifique
    const code = generateCampaignCode({
      corporateNode: fcCorporate,
      regionalNode: { countryCode: "CM" },
      brandNode: null,
      sequenceNumber: 5,
    });
    expect(code).toBe("FC-CM-MULTI-005");
  });

  it("Padding 3 chars sur sequenceNumber", () => {
    const code1 = generateCampaignCode({
      corporateNode: fcCorporate,
      regionalNode: { countryCode: "TG" },
      brandNode: { name: "Peak", slug: "peak" },
      sequenceNumber: 42,
    });
    expect(code1).toBe("FC-TG-PEAK-042");

    const code2 = generateCampaignCode({
      corporateNode: fcCorporate,
      regionalNode: { countryCode: "TG" },
      brandNode: { name: "Peak", slug: "peak" },
      sequenceNumber: 999,
    });
    expect(code2).toBe("FC-TG-PEAK-999");
  });

  it("PZ-001 — Panzani sans cascade pays/marque (cas Cadyst Group)", () => {
    const pzCorporate = {
      id: "2",
      name: "Panzani / Cadyst Group",
      slug: "panzani-cadyst",
      nodeRole: [`${CODE_PREFIX_ROLE_TAG}:PZ`],
      nodeKind: "CORPORATE",
    };
    const code = generateCampaignCode({
      corporateNode: pzCorporate,
      regionalNode: null,
      brandNode: null,
      sequenceNumber: 7,
    });
    expect(code).toBe("PZ-007");
  });

  it("CF-001 — Cadyst Farming dérivé sans nodeRole", () => {
    const cfCorporate = {
      id: "3",
      name: "Cadyst Farming",
      slug: "cadyst-farming",
      nodeRole: [],
      nodeKind: "CORPORATE",
    };
    const code = generateCampaignCode({
      corporateNode: cfCorporate,
      regionalNode: null,
      brandNode: null,
      sequenceNumber: 1,
    });
    expect(code).toBe("CF-001");
  });
});

describe("campaign-code — generateTaskCode + generateChangeRequestCode", () => {
  it("Task code = ID_PROJET.NN format", () => {
    expect(generateTaskCode("FC-TG-PEAK-001", 3)).toBe("FC-TG-PEAK-001.03");
    expect(generateTaskCode("FC-TG-PEAK-001", 12)).toBe("FC-TG-PEAK-001.12");
    expect(generateTaskCode("PZ-006", 1)).toBe("PZ-006.01");
  });

  it("ChangeRequest code = ID_TÂCHE-RNN format", () => {
    expect(generateChangeRequestCode("FC-TG-PEAK-001.03", 1)).toBe("FC-TG-PEAK-001.03-R01");
    expect(generateChangeRequestCode("PZ-003.01", 5)).toBe("PZ-003.01-R05");
  });
});

describe("campaign-code — parseCampaignCode", () => {
  it("parse format complet PREFIX-COUNTRY-BRAND-NNN", () => {
    expect(parseCampaignCode("FC-TG-PEAK-001")).toEqual({
      prefix: "FC",
      countryCode: "TG",
      brandShort: "PEAK",
      sequence: 1,
    });
    expect(parseCampaignCode("FC-CD-BR-042")).toEqual({
      prefix: "FC",
      countryCode: "CD",
      brandShort: "BR",
      sequence: 42,
    });
  });

  it("parse XX/MULTI placeholders comme null", () => {
    expect(parseCampaignCode("FC-XX-MULTI-001")).toEqual({
      prefix: "FC",
      countryCode: null,
      brandShort: null,
      sequence: 1,
    });
  });

  it("parse format réduit PREFIX-NNN", () => {
    expect(parseCampaignCode("PZ-006")).toEqual({
      prefix: "PZ",
      countryCode: null,
      brandShort: null,
      sequence: 6,
    });
  });

  it("retourne null sur format invalide", () => {
    expect(parseCampaignCode("invalid")).toBeNull();
    expect(parseCampaignCode("FC-TG-PEAK-NOTANUMBER")).toBeNull();
    expect(parseCampaignCode("FC-TG-PEAK")).toBeNull(); // 3 parts pas supporté
  });
});
