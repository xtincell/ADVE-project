/**
 * Entity Gate (ADR-0162) — gate adversarial de collecte publique.
 *
 * Cas fondateur (incident prod 2026-07-20) : la marque « Top » (soda des
 * Brasseries du Cameroun) collectait tout titre contenant le mot ordinaire
 * « top » — la garde lexicale `mentionsBrand` (frontière de mot) est
 * structurellement insuffisante pour un nom-mot-du-dictionnaire.
 */

import { describe, it, expect } from "vitest";
import {
  assessBrandNameAmbiguity,
  buildDiscriminants,
  createEntityGate,
  mentionsEntity,
  normalizeEntityText,
} from "@/server/services/seshat/entity-gate";

describe("assessBrandNameAmbiguity", () => {
  it("« Top » = mot du dictionnaire → ambigu", () => {
    const a = assessBrandNameAmbiguity("Top");
    expect(a.ambiguous).toBe(true);
    expect(a.reason).toMatch(/mots communs/);
  });

  it("« Orange » et « Total » (vraies marques à nom commun) → ambigus", () => {
    expect(assessBrandNameAmbiguity("Orange").ambiguous).toBe(true);
    expect(assessBrandNameAmbiguity("Total").ambiguous).toBe(true);
  });

  it("un seul token distinctif lève l'ambiguïté", () => {
    expect(assessBrandNameAmbiguity("Chococam").ambiguous).toBe(false);
    expect(assessBrandNameAmbiguity("Motion19").ambiguous).toBe(false);
    expect(assessBrandNameAmbiguity("Brasseries du Cameroun").ambiguous).toBe(false);
  });

  it("nom composé uniquement de mots-outils → ambigu", () => {
    expect(assessBrandNameAmbiguity("Le De La").ambiguous).toBe(true);
  });

  it("déterministe — même entrée, même sortie", () => {
    expect(assessBrandNameAmbiguity("Top")).toEqual(assessBrandNameAmbiguity("Top"));
  });
});

describe("buildDiscriminants", () => {
  it("secteur + pays + démonymes/toponymes + domaine + handles, sans le nom de marque", () => {
    const d = buildDiscriminants("Top", {
      sector: "Boissons gazeuses",
      country: "Cameroun",
      countryCode: "CM",
      websiteUrl: "https://www.topcameroun.cm",
      socialHandles: ["topcmr"],
    });
    expect(d).toContain("boissons");
    expect(d).toContain("gazeuses");
    expect(d).toContain("cameroun");
    expect(d).toContain("douala"); // toponyme du référentiel CM
    expect(d).toContain("topcameroun"); // slug du domaine déclaré
    expect(d).toContain("topcmr");
    expect(d).not.toContain("top"); // le nom ne se discrimine pas lui-même
  });

  it("aucun contexte déclaré → aucun discriminant (jamais d'invention)", () => {
    expect(buildDiscriminants("Top", {})).toEqual([]);
  });
});

describe("createEntityGate — le cas « Top » (Brasseries du Cameroun)", () => {
  const gate = createEntityGate("Top", {
    sector: "Boissons gazeuses",
    country: "Cameroun",
    countryCode: "CM",
  });

  it("rejette l'usage ordinaire du mot (« top 10 », « au top »)", () => {
    expect(gate.judge("Le top 10 des plages de Méditerranée").accepted).toBe(false);
    expect(gate.judge("Ce restaurant parisien est au top").accepted).toBe(false);
    expect(gate.judge("Top départ du festival de Cannes").accepted).toBe(false);
  });

  it("précise la raison du rejet (preuve, pas verdict muet)", () => {
    const v = gate.judge("Le top 10 des plages");
    expect(v.brandMatched).toBe(true); // la frontière de mot matche — c'est le problème
    expect(v.rejection).toBe("AMBIGUOUS_NO_DISCRIMINANT");
  });

  it("accepte quand un discriminant co-occurre (secteur ou pays)", () => {
    const v = gate.judge("Top, la boisson gazeuse préférée du Cameroun, fête ses 50 ans");
    expect(v.accepted).toBe(true);
    expect(v.matchedDiscriminants).toContain("cameroun");
    expect(gate.judge("À Douala, le soda Top lance un nouveau format").accepted).toBe(true);
  });

  it("rejette toujours l'absence pure de mention", () => {
    const v = gate.judge("Les Brasseries lancent une nouvelle boisson au Cameroun");
    expect(v.accepted).toBe(false);
    expect(v.rejection).toBe("NO_BRAND_MENTION");
  });
});

describe("createEntityGate — nom distinctif : la mention suffit", () => {
  const gate = createEntityGate("Chococam", { sector: "Chocolaterie", country: "Cameroun", countryCode: "CM" });

  it("mention seule acceptée, discriminants gardés comme preuve bonus", () => {
    expect(gate.judge("Chococam ouvre une nouvelle usine").accepted).toBe(true);
    const v = gate.judge("Chococam, fierté du Cameroun");
    expect(v.accepted).toBe(true);
    expect(v.matchedDiscriminants).toContain("cameroun");
  });

  it("pas de mention → rejet, même avec discriminants présents", () => {
    expect(gate.judge("Le chocolat camerounais s'exporte bien depuis Douala").accepted).toBe(false);
  });
});

describe("createEntityGate — nom ambigu SANS discriminant disponible (état honnête)", () => {
  it("tout est rejeté ; l'appelant le sait via discriminants.length === 0", () => {
    const gate = createEntityGate("Top", {});
    expect(gate.discriminants).toEqual([]);
    expect(gate.judge("Top annonce un nouveau produit").accepted).toBe(false);
  });
});

describe("mentionsEntity (source canonique de mentionsBrand)", () => {
  it("frontière de mot, insensible casse/diacritiques", () => {
    expect(mentionsEntity("Le SODA TOP est là", "Top")).toBe(true);
    expect(mentionsEntity("stopper le désastre", "Top")).toBe(false);
  });

  it("nom < 3 lettres purement alphabétique refusé ; avec chiffre accepté", () => {
    expect(mentionsEntity("la Gironde", "a")).toBe(false);
    expect(mentionsEntity("M6 lance une émission", "M6")).toBe(true);
  });

  it("multi-mots : séquence complète exigée", () => {
    expect(mentionsEntity("les Brasseries du Cameroun annoncent", "Brasseries du Cameroun")).toBe(true);
    expect(mentionsEntity("les brasseries artisanales du pays", "Brasseries du Cameroun")).toBe(false);
  });
});

describe("normalizeEntityText", () => {
  it("casse, diacritiques, ponctuation → tokens espacés", () => {
    expect(normalizeEntityText("Côte-d'Ivoire !")).toBe("cote d ivoire");
  });
});
