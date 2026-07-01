import { describe, expect, it } from "vitest";
import { getFieldDef } from "@/domain/pillar-fields";
import {
  composeOracle,
  getOracleSection,
  ORACLE_SECTIONS,
  renderValue,
  type OracleDocument,
} from "@/domain/oracle";
import { makeRichBrand } from "./fixtures";

function section(doc: OracleDocument, id: string) {
  const s = doc.sections.find((x) => x.id === id);
  expect(s, `section ${id} absente du document`).toBeDefined();
  return s!;
}

describe("registre ORACLE_SECTIONS (12 CORE)", () => {
  it("exactement 12 sections CORE, ids uniques, numéros séquentiels", () => {
    expect(ORACLE_SECTIONS).toHaveLength(12);
    expect(new Set(ORACLE_SECTIONS.map((s) => s.id)).size).toBe(12);
    expect(ORACLE_SECTIONS.every((s) => s.tier === "CORE")).toBe(true);
    expect(ORACLE_SECTIONS.map((s) => s.number)).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("intégrité des sources : chaque référence pointe un champ existant de la bible", () => {
    for (const def of ORACLE_SECTIONS) {
      for (const src of def.sources) {
        expect(
          getFieldDef(src.pillar, src.field),
          `${def.id} référence ${src.pillar}.${src.field} qui n'existe pas`,
        ).toBeDefined();
      }
    }
  });

  it("toute section (hors executive-summary) déclare au moins un champ requis", () => {
    for (const def of ORACLE_SECTIONS) {
      if (def.id === "executive-summary") continue;
      expect(
        def.sources.some((s) => s.required),
        `${def.id} n'a aucun champ requis`,
      ).toBe(true);
    }
  });

  it("getOracleSection retrouve par id", () => {
    expect(getOracleSection("plateforme-strategique")?.number).toBe("03");
    expect(getOracleSection("inconnu")).toBeUndefined();
  });
});

describe("composeOracle — piliers vides (honnêteté)", () => {
  const doc = composeOracle({ name: "Marque Test" }, {});

  it("executive-summary compose quand même : le scoring EST la donnée", () => {
    const s = section(doc, "executive-summary");
    expect(s.status).toBe("ok");
    expect(s.markdown).toContain("Marque Test");
    expect(s.markdown).toContain("0/200");
    expect(s.markdown).toContain("Latent");
  });

  it("toutes les autres sections sont marquées insuffisantes avec consigne", () => {
    for (const s of doc.sections) {
      if (s.id === "executive-summary") continue;
      expect(s.status, `section ${s.id}`).toBe("insuffisant");
      expect(s.markdown).toContain("Données insuffisantes");
      expect(s.markdown).toContain("compléter le pilier");
      expect(s.sources).toEqual([]);
      expect(s.missing.length).toBeGreaterThan(0);
    }
  });

  it("la consigne nomme le bon pilier en français", () => {
    expect(section(doc, "plateforme-strategique").markdown).toContain("Authenticité");
    expect(section(doc, "plateforme-strategique").markdown).toContain("Distinction");
    expect(section(doc, "realite-marche").markdown).toContain("Tracking");
  });

  it("score du document : 0/200 LATENT", () => {
    expect(doc.score.total).toBe(0);
    expect(doc.score.level).toBe("LATENT");
    expect(doc.score.max).toBe(200);
  });
});

describe("composeOracle — données réelles citées, jamais inventées", () => {
  const positionnement = "Le ciment premium qui protège là où les low-cost trahissent.";
  const pillars = {
    A: {
      archetype: "PROTECTEUR",
      valeurs: [{ nom: "SECURITE", justification: "La sécurité n'est pas négociable." }],
    },
    D: {
      positionnement,
      promesseMaitre: "Un ciment dont vous n'aurez jamais à douter.",
    },
  };
  const doc = composeOracle({ name: "CIMENCAM", sector: "Matériaux" }, pillars);

  it("plateforme-strategique compose et cite les valeurs réelles verbatim", () => {
    const s = section(doc, "plateforme-strategique");
    expect(s.status).toBe("ok");
    expect(s.markdown).toContain("PROTECTEUR");
    expect(s.markdown).toContain(positionnement);
    expect(s.sources).toContain("A.archetype");
    expect(s.sources).toContain("D.positionnement");
  });

  it("les champs optionnels absents sont déclarés, pas comblés", () => {
    const s = section(doc, "plateforme-strategique");
    expect(s.missing).toContain("A.noyauIdentitaire");
    expect(s.missing).toContain("D.tonDeVoix");
    expect(s.markdown).toContain("Données manquantes");
  });

  it("champ requis manquant → insuffisant, MAIS les données partielles restent visibles", () => {
    const partialDoc = composeOracle(
      { name: "X" },
      { V: { produitsCatalogue: [{ nom: "Sac ciment 50kg" }] } },
    );
    const s = section(partialDoc, "proposition-valeur");
    expect(s.status).toBe("insuffisant");
    expect(s.markdown).toContain("Proposition de valeur"); // le manque est nommé
    expect(s.markdown).toContain("Données déjà disponibles");
    expect(s.markdown).toContain("Sac ciment 50kg"); // la donnée réelle est citée
  });
});

describe("composeOracle — marque complète", () => {
  it("les 12 sections composent, score 200 ICONE", () => {
    const doc = composeOracle({ name: "Full" }, makeRichBrand());
    expect(doc.sections.every((s) => s.status === "ok")).toBe(true);
    expect(doc.score.total).toBe(200);
    expect(doc.score.level).toBe("ICONE");
  });
});

describe("composeOracle — déterminisme", () => {
  it("même entrée → même document (deep equal)", () => {
    const pillars = { A: { nomMarque: "SPAWT", secteur: "Sport" } };
    const a = composeOracle({ name: "SPAWT" }, pillars);
    const b = composeOracle({ name: "SPAWT" }, pillars);
    expect(a).toEqual(b);
  });
});

describe("renderValue — rendu sans invention", () => {
  it("string/number/boolean", () => {
    expect(renderValue("  texte  ")).toBe("texte");
    expect(renderValue(42)).toBe("42");
    expect(renderValue(true)).toBe("oui");
    expect(renderValue("")).toBeNull();
    expect(renderValue(null)).toBeNull();
  });

  it("liste : libellés réels + compteur du reste", () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ nom: `item ${i + 1}` }));
    const out = renderValue(items);
    expect(out).toContain("item 1");
    expect(out).toContain("(+2)");
  });

  it("objet : paires clé/valeur réelles, métadonnées _ ignorées", () => {
    const out = renderValue({ _draft: true, slogan: "Go", tagline: "Vite" });
    expect(out).toContain("slogan : Go");
    expect(out).not.toContain("_draft");
  });
});
