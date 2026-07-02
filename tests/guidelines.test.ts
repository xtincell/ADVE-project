import { describe, expect, it } from "vitest";
import {
  composeGuidelines,
  fieldLines,
  readColorValue,
  readHex,
  readLinkValue,
  readTypoValue,
  type GuidelinesInput,
} from "@/domain/guidelines";

/**
 * WP-019 — charte de marque : composer 100 % DÉTERMINISTE (domain/guidelines).
 * Contrats : chaque section cite sa source réelle OU déclare son manque ;
 * rien n'est inventé (entrée vide = 0 item, 3 manques) ; même entrée ⇒ même
 * document ; les usages ne sortent que des rôles/usages déclarés.
 */

const FULL_INPUT: GuidelinesInput = {
  brandName: "Nofia",
  pillarE: {
    content: {
      promesseExperience: "Chaque interaction laisse le client plus confiant.",
      rituels: ["Le café du samedi", "Le récap mensuel", "La journée portes ouvertes"],
      touchpoints: "", // rempli côté clé mais VIDE — ne doit produire aucun item
    },
    certainty: { promesseExperience: "DECLARED", rituels: "INFERRED" },
  },
  assets: [
    { kind: "COULEUR", name: "Corail", value: { hex: "#E56458", role: "Primaire — CTA" } },
    { kind: "COULEUR", name: "Or", value: { hex: "#FACC15" } }, // sans rôle → pas d'usage
    { kind: "TYPO", name: "Clash Display", value: { usage: "Titres", url: "https://f.sh/clash" } },
    { kind: "TYPO", name: "Satoshi", value: {} }, // sans usage
    { kind: "LOGO", name: "Logo principal", value: { url: "https://x.test/logo.svg", note: "Fond sombre uniquement" } },
    { kind: "DOCUMENT", name: "Charte PDF v1", value: { note: "Référence historique" } },
    { kind: "IMAGE", name: "Héro 2026", value: { url: "https://x.test/hero.jpg" } },
  ],
};

describe("composeGuidelines — entrée vide (rien n'est inventé)", () => {
  const doc = composeGuidelines({ brandName: "Vide", pillarE: null, assets: [] });

  it("3 sections déclarées manquantes, avec le manque expliqué et zéro source", () => {
    for (const section of [doc.verbal.section, doc.visual.section, doc.usages.section]) {
      expect(section.status).toBe("manquant");
      expect(section.source).toBeNull();
      expect(section.gap).toBeTruthy();
    }
    expect(doc.completeness).toEqual({ ok: 0, total: 3 });
  });

  it("aucun item fantôme", () => {
    expect(doc.verbal.items).toEqual([]);
    expect(doc.visual.colors).toEqual([]);
    expect(doc.visual.logos).toEqual([]);
    expect(doc.visual.typos).toEqual([]);
    expect(doc.usages.rules).toEqual([]);
  });

  it("pilier E présent mais vide = même verdict que null", () => {
    const emptyE = composeGuidelines({
      brandName: "Vide",
      pillarE: { content: {}, certainty: {} },
      assets: [],
    });
    expect(emptyE.verbal.section.status).toBe("manquant");
    expect(emptyE.verbal.items).toEqual([]);
  });
});

describe("composeGuidelines — entrée réelle complète", () => {
  const doc = composeGuidelines(FULL_INPUT);

  it("identité verbale : champs E réellement remplis, certitude conservée, source citée", () => {
    expect(doc.verbal.section.status).toBe("ok");
    expect(doc.verbal.section.source).toContain("Pilier E — Engagement");
    expect(doc.verbal.section.source).toContain("Promesse d'expérience");
    expect(doc.verbal.items).toHaveLength(2); // touchpoints vide → exclu
    expect(doc.verbal.items[0]).toMatchObject({
      fieldId: "promesseExperience",
      label: "Promesse d'expérience",
      certainty: "DECLARED",
      lines: ["Chaque interaction laisse le client plus confiant."],
    });
    expect(doc.verbal.items[1]).toMatchObject({
      fieldId: "rituels",
      certainty: "INFERRED",
    });
    expect(doc.verbal.items[1]!.lines).toHaveLength(3);
  });

  it("identité visuelle : le coffre réel, source comptée", () => {
    expect(doc.visual.section.status).toBe("ok");
    expect(doc.visual.section.source).toContain("Coffre de marque");
    expect(doc.visual.section.source).toContain("2 couleurs");
    expect(doc.visual.colors).toEqual([
      { name: "Corail", hex: "#E56458", role: "Primaire — CTA" },
      { name: "Or", hex: "#FACC15", role: null },
    ]);
    expect(doc.visual.typos).toEqual([
      { name: "Clash Display", usage: "Titres", url: "https://f.sh/clash" },
      { name: "Satoshi", usage: null, url: null },
    ]);
    expect(doc.visual.logos[0]).toMatchObject({
      name: "Logo principal",
      url: "https://x.test/logo.svg",
      note: "Fond sombre uniquement",
    });
    expect(doc.visual.documents).toHaveLength(1);
    expect(doc.visual.images).toHaveLength(1);
  });

  it("usages : UNIQUEMENT les rôles/usages/notes déclarés, chacun sourcé", () => {
    expect(doc.usages.section.status).toBe("ok");
    const bySource = Object.fromEntries(doc.usages.rules.map((r) => [r.sourceName, r]));
    expect(bySource["Corail"]).toMatchObject({
      kind: "COULEUR",
      text: "Primaire — CTA : Corail (#E56458).",
    });
    expect(bySource["Clash Display"]).toMatchObject({ kind: "TYPO", text: "Titres : Clash Display." });
    expect(bySource["Charte PDF v1"]).toMatchObject({ kind: "DOCUMENT" });
    expect(bySource["Logo principal"]).toMatchObject({ kind: "LOGO" });
    // « Or » (sans rôle), « Satoshi » (sans usage), « Héro 2026 » (sans note) : rien.
    expect(bySource["Or"]).toBeUndefined();
    expect(bySource["Satoshi"]).toBeUndefined();
    expect(bySource["Héro 2026"]).toBeUndefined();
    expect(doc.usages.rules).toHaveLength(4);
  });

  it("complétude 3/3 + déterminisme strict (même entrée ⇒ même document)", () => {
    expect(doc.completeness).toEqual({ ok: 3, total: 3 });
    expect(composeGuidelines(FULL_INPUT)).toEqual(doc);
  });
});

describe("composeGuidelines — sections partielles honnêtes", () => {
  it("du visuel sans aucun usage déclaré : visuelle ok, usages manquant", () => {
    const doc = composeGuidelines({
      brandName: "Partielle",
      pillarE: null,
      assets: [{ kind: "COULEUR", name: "Or", value: { hex: "#FACC15" } }],
    });
    expect(doc.visual.section.status).toBe("ok");
    expect(doc.usages.section.status).toBe("manquant");
    expect(doc.usages.section.gap).toContain("Aucun usage déclaré");
    expect(doc.completeness).toEqual({ ok: 1, total: 3 });
  });

  it("documents/images seuls ne composent PAS l'identité visuelle (logo/couleur/typo)", () => {
    const doc = composeGuidelines({
      brandName: "Refs",
      pillarE: null,
      assets: [{ kind: "DOCUMENT", name: "Charte PDF", value: { url: "https://x.t/c.pdf" } }],
    });
    expect(doc.visual.section.status).toBe("manquant");
    expect(doc.visual.documents).toHaveLength(1); // listés quand même — rien n'est caché
  });
});

describe("lecture tolérante des values (jamais de crash, jamais d'invention)", () => {
  it("readHex n'accepte que le canonique #RRGGBB", () => {
    expect(readHex("#E56458")).toBe("#E56458");
    expect(readHex("#e56458")).toBeNull(); // non canonique → illisible (l'écriture canonise)
    expect(readHex(42)).toBeNull();
    expect(readHex(undefined)).toBeNull();
  });

  it("values malformées → champs null, pas d'exception", () => {
    expect(readColorValue(null)).toEqual({ hex: null, role: null });
    expect(readColorValue("corail")).toEqual({ hex: null, role: null });
    expect(readColorValue({ hex: 123, role: ["x"] })).toEqual({ hex: null, role: null });
    expect(readTypoValue([])).toEqual({ usage: null, url: null });
    expect(readLinkValue({ url: "", note: "   " })).toEqual({ url: null, note: null });
  });

  it("fieldLines : texte → 1 ligne, liste → items non vides, reste → rien", () => {
    expect(fieldLines(" a ")).toEqual(["a"]);
    expect(fieldLines(["a", " ", 3, "b"])).toEqual(["a", "b"]);
    expect(fieldLines({})).toEqual([]);
    expect(fieldLines(null)).toEqual([]);
  });
});
