import { describe, expect, it } from "vitest";
import {
  getThemeView,
  resolveThemeField,
  THEME_VIEW_IDS,
  THEME_VIEWS,
  themeFieldRefs,
} from "@/domain/pillar-views";
import { ADVE_PILLARS } from "@/domain/pillars";

describe("pillar-views — vues éditoriales par thème (mapping pur)", () => {
  it("chaque ref de champ résout vers un champ RÉEL de la bible", () => {
    for (const id of THEME_VIEW_IDS) {
      for (const ref of themeFieldRefs(THEME_VIEWS[id])) {
        const field = resolveThemeField(ref);
        expect(
          field,
          `${id} référence ${ref.pillar}.${ref.fieldId} qui n'existe pas dans PILLAR_FIELDS`,
        ).toBeDefined();
        expect(field!.id).toBe(ref.fieldId);
      }
    }
  });

  it("les vues ne mobilisent QUE le socle ADVE (jamais un dérivé RTIS)", () => {
    for (const id of THEME_VIEW_IDS) {
      for (const ref of themeFieldRefs(THEME_VIEWS[id])) {
        expect(
          (ADVE_PILLARS as readonly string[]).includes(ref.pillar),
          `${id} référence le pilier dérivé ${ref.pillar} — les vues éditent via le socle`,
        ).toBe(true);
      }
    }
  });

  it("aucun doublon de champ au sein d'un même thème", () => {
    for (const id of THEME_VIEW_IDS) {
      const refs = themeFieldRefs(THEME_VIEWS[id]).map((r) => `${r.pillar}.${r.fieldId}`);
      expect(new Set(refs).size, `doublon dans le thème ${id}`).toBe(refs.length);
    }
  });

  it("chaque thème a des groupes titrés et non vides", () => {
    for (const id of THEME_VIEW_IDS) {
      const view = THEME_VIEWS[id];
      expect(view.id).toBe(id);
      expect(view.titre.length).toBeGreaterThan(0);
      expect(view.question.length).toBeGreaterThan(0);
      expect(view.groups.length).toBeGreaterThan(0);
      for (const group of view.groups) {
        expect(group.titre.length).toBeGreaterThan(0);
        expect(group.fields.length).toBeGreaterThan(0);
      }
    }
  });

  it("getThemeView : ids connus résolus, inconnus → undefined", () => {
    expect(getThemeView("positionnement")?.id).toBe("positionnement");
    expect(getThemeView("proposition")?.id).toBe("proposition");
    expect(getThemeView("offre")?.id).toBe("offre");
    expect(getThemeView("inconnu")).toBeUndefined();
  });

  it("les mappings couvrent l'essentiel des thèmes legacy (positioning/offer)", () => {
    // positionnement porte le cœur de brand/positioning : D.positionnement.
    const positionnement = themeFieldRefs(THEME_VIEWS.positionnement).map(
      (r) => `${r.pillar}.${r.fieldId}`,
    );
    expect(positionnement).toContain("D.positionnement");
    expect(positionnement).toContain("D.paysageConcurrentiel");

    // offre porte le cœur de brand/offer : V.produitsCatalogue + businessModel.
    const offre = themeFieldRefs(THEME_VIEWS.offre).map((r) => `${r.pillar}.${r.fieldId}`);
    expect(offre).toContain("V.produitsCatalogue");
    expect(offre).toContain("V.businessModel");

    // proposition porte la chaîne de promesses (A → D/V/E).
    const proposition = themeFieldRefs(THEME_VIEWS.proposition).map(
      (r) => `${r.pillar}.${r.fieldId}`,
    );
    expect(proposition).toContain("A.promesseFondamentale");
    expect(proposition).toContain("V.promesseDeValeur");
    expect(proposition).toContain("E.promesseExperience");
  });
});
