/**
 * ADR-0165 — sujets de veille dérivés de l'ADVE (cas Motion19 : la veille
 * n'interrogeait que « équipement audiovisuel » → presse générique française ;
 * l'opérateur attendait l'actu des marques distribuées + les événements de la
 * communauté cible sur son marché).
 */

import { describe, it, expect } from "vitest";
import {
  extractCatalogBrands,
  deriveWatchSubjects,
  effectiveWatchSubjects,
  countryDisplayNameFr,
} from "@/server/services/seshat/external-feeds/watch-subjects";

const CATALOGUE = [
  { name: "Canon EOS R5" }, { name: "Canon RF 24-70mm" }, { name: "Canon Speedlite" },
  { name: "Nikon Z6 II" }, { name: "Nikon NIKKOR 50mm" },
  { name: "Godox AD200" }, { name: "Godox V1" },
  { name: "Trépied vidéo fluide" }, { name: "Câble HDMI 4K" }, { name: "Kit éclairage LED" },
];

describe("extractCatalogBrands", () => {
  it("extrait les marques récurrentes du catalogue, jamais les mots génériques", () => {
    const brands = extractCatalogBrands(CATALOGUE);
    expect(brands).toContain("Canon");
    expect(brands).toContain("Nikon");
    expect(brands).toContain("Godox");
    expect(brands).not.toContain("Trépied");
    expect(brands).not.toContain("Kit");
  });
  it("un token vu une seule fois n'est pas une marque", () => {
    expect(extractCatalogBrands([{ name: "Sony A7" }, { name: "Canon R5" }, { name: "Canon R6" }])).toEqual(["Canon"]);
  });
});

describe("deriveWatchSubjects", () => {
  it("compose marques + concurrents + communauté scopée pays (cas Motion19)", () => {
    const subjects = deriveWatchSubjects({
      pillarV: { produitsCatalogue: CATALOGUE },
      pillarD: { concurrents: [{ nom: "Fotona Douala" }] },
      pillarE: { cible: "créateurs et photographes professionnels" },
      countryName: "Cameroun",
    });
    expect(subjects).toContain("Canon");
    expect(subjects).toContain("Fotona Douala Cameroun");
    expect(subjects.some((s) => s.includes("photographes") && s.includes("Cameroun"))).toBe(true);
    expect(subjects.length).toBeLessThanOrEqual(6);
  });
  it("uses the modern SPAWT audience, partner and payer declarations without fictional persona names", () => {
    const subjects = deriveWatchSubjects({
      pillarA: { publicCible: "Communication : les Suiveurs de vidéos food d’Abidjan qui enregistrent des lieux. Partenaires qui apportent ce trafic : créateurs food et Local Guides. Clients payants visés : restaurateurs qui veulent atteindre ce public qualifié." },
      pillarD: { paysageConcurrentiel: [{ name: "Google Maps" }] },
      pillarE: { superfanPortrait: { personaRef: "grace" } },
      countryName: "Côte d'Ivoire",
    });
    expect(subjects).toContain("Suiveurs videos food Abidjan Côte d'Ivoire");
    expect(subjects).toContain("createurs food Local Guides Côte d'Ivoire");
    expect(subjects).toContain("restaurateurs Côte d'Ivoire");
    expect(subjects).toContain("Google Maps Côte d'Ivoire");
    expect(subjects.join(" ")).not.toMatch(/Grâce|Ange|Koffi/);
  });
  it("resolves E's superfan to D and prioritizes the communication audience over the payer", () => {
    const subjects = deriveWatchSubjects({
      pillarD: { personas: [
        { id: "payer", name: "Koffi", actorRoles: ["PAYER"], csp: "restaurateurs", location: "Abidjan" },
        { id: "partner", name: "Ange", actorRoles: ["PARTNER"], csp: "créateurs food", location: "Abidjan" },
        { id: "traffic", name: "Grâce", actorRoles: ["COMMUNICATION_AUDIENCE", "USER"], csp: "suiveurs de vidéos food", location: "Abidjan" },
      ] },
      pillarE: { superfanPortrait: { personaRef: "traffic" } }, countryName: "Côte d'Ivoire",
    });
    expect(subjects[0]).toBe("suiveurs videos food Abidjan Côte d'Ivoire");
    expect(subjects).toHaveLength(3);
    expect(subjects.join(" ")).not.toMatch(/Grâce|Ange|Koffi/);
  });
  it("keeps the target audience when a catalogue has enough brands to fill the cap", () => {
    const subjects = deriveWatchSubjects({
      pillarV: { produitsCatalogue: [...CATALOGUE, { name: "Sony A7" }, { name: "Sony A9" }] },
      pillarD: { concurrents: ["Fotona", "PhotoPro"] },
      pillarE: { cible: "créateurs et photographes professionnels" }, countryName: "Cameroun",
    });
    expect(subjects[0]).toContain("photographes");
    expect(subjects).toHaveLength(6);
  });
  it("piliers vides → aucun sujet inventé", () => {
    expect(deriveWatchSubjects({ pillarV: {}, pillarD: {}, pillarE: {}, countryName: "Cameroun" })).toEqual([]);
  });
});

describe("effectiveWatchSubjects — manual-first (ADR-0060)", () => {
  it("l'édition manuelle PRIME sur le dérivé", () => {
    const r = effectiveWatchSubjects(["Canon Rumors", "Yaoundé PhotoFest"], ["Canon", "Nikon"]);
    expect(r.source).toBe("MANUAL");
    expect(r.subjects).toEqual(["Canon Rumors", "Yaoundé PhotoFest"]);
  });
  it("manuel vide → dérivé ; tout vide → NONE", () => {
    expect(effectiveWatchSubjects([], ["Canon"])).toEqual({ subjects: ["Canon"], source: "DERIVED" });
    expect(effectiveWatchSubjects(undefined, []).source).toBe("NONE");
  });
});

describe("countryDisplayNameFr", () => {
  it("ISO-2 → nom FR, inconnu → null", () => {
    expect(countryDisplayNameFr("CM")).toBe("Cameroun");
    expect(countryDisplayNameFr("ZZ")).toBeNull();
  });
});
