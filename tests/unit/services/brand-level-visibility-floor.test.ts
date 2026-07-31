/**
 * Plancher de VISIBILITÉ — le déclaratif et le constaté jouent de pair.
 *
 * ── Le défaut (2026-07-31) ──
 *
 * Mandat opérateur : « je veux que le déclaratif ET la constatation jouent de
 * pair pour afficher le vrai niveau — une marque qui n'est pas latente ne peut
 * pas être dans le même lot que le reste ».
 *
 * L'échelle définit LATENT comme « **Invisible**. Fondations absentes. » Or le
 * placement se prend sur le pilier ADVE le plus FAIBLE : mesuré en production,
 * un `d` vide classait « invisible » une marque dotée d'un site joignable, de
 * quatre réseaux et de trois retombées presse. Le classement contredisait sa
 * propre définition.
 *
 * Sur les six échelons, LATENT est le SEUL qui parle de visibilité — les cinq
 * autres parlent de substance stratégique.
 *
 * ── Ce qui est verrouillé ──
 *
 * Le plancher relève de LATENT, et de RIEN au-dessus : l'empreinte prouve
 * qu'une marque existe publiquement, elle ne prouve rien sur sa substance.
 * Prétendre l'inverse gonflerait le palier sur du vide.
 */

import { describe, it, expect } from "vitest";
import { deriveBrandLevelDeterministic, observedVisibility } from "@/server/services/quick-intake/brand-level-evaluator";

/** Empreinte réelle d'Irawo, telle que mesurée en production. */
const EMPREINTE_REELLE = {
  webPresence: {
    site: { url: "https://irawotalents.com", reachable: true },
    socials: [{ platform: "INSTAGRAM" }, { platform: "FACEBOOK" }, { platform: "LINKEDIN" }, { platform: "TWITTER" }],
    press: [{ title: "a" }, { title: "b" }, { title: "c" }],
  },
};

/** Un seul volet du questionnaire renseigné — le cas Irawo. */
const derive = (e: Record<string, unknown>) =>
  deriveBrandLevelDeterministic({
    companyName: "Irawo",
    sector: null,
    country: null,
    responses: { biz: { x: "y" } },
    extractedValues: { a: {}, d: {}, v: {}, e },
    completionByPillar: { a: 0.05, d: 0, v: 0.75, e: 0.12 },
  });

describe("observedVisibility — ce que le public constate", () => {
  it("distingue « pas de scan » d'une empreinte vide", () => {
    // `null` = rien n'a été regardé. Un objet à 0 signal = regardé, rien trouvé.
    expect(observedVisibility({})).toBeNull();
    expect(observedVisibility(undefined)).toBeNull();
    expect(observedVisibility({ webPresence: {} })).toMatchObject({ signals: 0 });
  });

  it("compte les signaux indépendants, pas les items", () => {
    const v = observedVisibility(EMPREINTE_REELLE)!;
    expect(v).toMatchObject({ site: true, socials: 4, press: 3, signals: 3 });
  });
});

describe("plancher de visibilité", () => {
  it("une marque CONSTATÉE n'est jamais classée « invisible »", () => {
    const r = derive(EMPREINTE_REELLE);
    expect(r.level).toBe("FRAGILE");
    expect(r.basis.visibilityFloorApplied).toEqual({ from: "LATENT", to: "FRAGILE" });
  });

  it("le plancher relève de LATENT, et de rien au-dessus", () => {
    // L'empreinte atteste une existence publique — pas une stratégie. Monter
    // plus haut demanderait de juger une substance que l'empreinte ne porte pas.
    const r = derive(EMPREINTE_REELLE);
    expect(r.level).toBe("FRAGILE");
  });

  it("sans scan, aucun plancher — l'absence de mesure ne fabrique rien", () => {
    const r = derive({});
    expect(r.level).toBe("LATENT");
    expect(r.basis.observed).toBeNull();
    expect(r.basis.visibilityFloorApplied).toBeNull();
  });

  it("un seul signal ne suffit pas — un site seul peut être une coquille vide", () => {
    const r = derive({ webPresence: { site: { reachable: true }, socials: [], press: [] } });
    expect(r.basis.observed).toMatchObject({ signals: 1 });
    expect(r.level).toBe("LATENT");
    expect(r.basis.visibilityFloorApplied).toBeNull();
  });

  it("un site injoignable ne compte pas comme présence", () => {
    const r = derive({ webPresence: { site: { reachable: false }, socials: [{ platform: "X" }], press: [] } });
    expect(r.basis.observed).toMatchObject({ site: false, signals: 0 });
    expect(r.level).toBe("LATENT");
  });
});

describe("le texte énonce les DEUX axes", () => {
  it("dit d'abord ce que le public voit, puis ce qui manque", () => {
    const r = derive(EMPREINTE_REELLE);
    expect(r.justification).toContain("Ce que le public voit");
    expect(r.justification).toContain("4 réseaux");
    expect(r.justification).toContain("3 retombées presse");
    // Le relèvement est DIT, jamais silencieux.
    expect(r.justification).toContain("n'est donc pas une marque invisible");
    // Et ce qui manque reste nommé : la substance, pas la présence.
    expect(r.justification).toContain("SUBSTANCE");
    expect(r.justification).toContain("1 des 9 volets");
  });

  it("sans empreinte, le texte ne prétend voir personne", () => {
    const r = derive({});
    expect(r.justification).not.toContain("Ce que le public voit");
    expect(r.justification).toContain("provisoire");
  });
});
