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
import { deriveBrandLevelDeterministic, observedVisibility, evidenceCeiling } from "@/server/services/quick-intake/brand-level-evaluator";

const evaluatorExports = { evidenceCeiling };

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

describe("plafond de preuve — un palier se paie en preuve (cas « Naruto »)", () => {
  // Mesuré en prod : « Naruto » classé CULTE (composite 16,5) sur une
  // justification fabriquée depuis la notoriété de l'anime — communauté
  // mondiale, rituels hebdomadaires — sans un volet déclaré ni un signal
  // constaté. Le plafond rend cette classe d'inflation impossible.
  const { evidenceCeiling } = evaluatorExports;

  it("nom célèbre, substance vide, aucun scan → FRAGILE au mieux", () => {
    expect(evidenceCeiling({ declaredPhases: 1, observedSignals: 0, extractedE: {} })).toBe("FRAGILE");
    expect(evidenceCeiling({ declaredPhases: 0, observedSignals: 0, extractedE: {} })).toBe("LATENT");
  });

  it("CULTE exige déclaration substantielle ET marqueurs de culte déclarés", () => {
    // 9 volets remplis mais aucun rituel/sacrement déclaré → FORTE au mieux :
    // CULTE se définit par la communauté structurée, pas par le volume.
    expect(evidenceCeiling({ declaredPhases: 9, observedSignals: 4, extractedE: {} })).toBe("FORTE");
    expect(
      evidenceCeiling({ declaredPhases: 4, observedSignals: 0, extractedE: { rituels: [{ nom: "x" }] } }),
    ).toBe("CULTE");
    // Les marqueurs sans la déclaration ne suffisent pas non plus.
    expect(
      evidenceCeiling({ declaredPhases: 1, observedSignals: 0, extractedE: { rituels: [{ nom: "x" }] } }),
    ).toBe("FRAGILE");
  });

  it("la visibilité constatée nette ouvre ORDINAIRE, jamais plus", () => {
    // Le cas Irawo : 1 volet déclaré mais 3 signaux publics — le plafond ne
    // bride pas le plancher, et n'autorise pas FORTE sans substance déclarée.
    expect(evidenceCeiling({ declaredPhases: 1, observedSignals: 3, extractedE: {} })).toBe("ORDINAIRE");
  });

  it("le plancher ne peut jamais dépasser le plafond", () => {
    // Invariant : pour toute entrée, floor(FRAGILE sur 2 signaux) ≤ ceiling.
    for (const d of [0, 1, 2, 4]) {
      for (const s of [0, 2, 3, 4]) {
        const c = evidenceCeiling({ declaredPhases: d, observedSignals: s, extractedE: {} });
        if (s >= 2) {
          // là où le plancher s'applique, le plafond admet au moins FRAGILE
          expect(["FRAGILE", "ORDINAIRE", "FORTE", "CULTE"]).toContain(c);
        }
      }
    }
  });
});

describe("plafond, forme finale : déclaré OU PROUVÉ (V3 « le tournoi »)", () => {
  const { evidenceCeiling } = evaluatorExports;
  // Directive opérateur : « Naruto restera culte, n'est-ce pas ? le traqueur
  // doit juste le prouver. » Sans l'argument `wonItems`, le plafond
  // INTERDISAIT ce qu'il aurait dû faire mériter.

  it("les deux must-have CULTE gagnés en arène ⇒ CULTE, sans un seul volet déclaré", () => {
    expect(
      evidenceCeiling({
        declaredPhases: 0,
        observedSignals: 0,
        extractedE: {},
        wonItems: new Set(["masse-superfan", "duel-cadre-overton"]),
      }),
    ).toBe("CULTE");
  });

  it("un seul des deux ne suffit pas — le rang exige SES must-have", () => {
    expect(
      evidenceCeiling({ declaredPhases: 0, observedSignals: 0, extractedE: {}, wonItems: new Set(["masse-superfan"]) }),
    ).not.toBe("CULTE");
  });

  it("sans items gagnés, le comportement d'origine tient (aucune régression)", () => {
    expect(evidenceCeiling({ declaredPhases: 1, observedSignals: 0, extractedE: {} })).toBe("FRAGILE");
    expect(evidenceCeiling({ declaredPhases: 9, observedSignals: 4, extractedE: {} })).toBe("FORTE");
  });
});
