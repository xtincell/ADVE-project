import { describe, expect, it } from "vitest";
import { composeRtisSynthese } from "@/domain/rtis-synthese";
import { deriveRtisDraft } from "@/domain/rtis";
import { makeRichAdve } from "./fixtures";

describe("composeRtisSynthese — piliers absents (rien n'est inventé)", () => {
  const synthese = composeRtisSynthese({});

  it("derived = false, tous les blocs vides ou null", () => {
    expect(synthese.derived).toBe(false);
    expect(synthese.vision).toBeNull();
    expect(synthese.axes).toEqual([]);
    expect(synthese.sprint).toEqual([]);
    expect(synthese.risques.forces).toEqual([]);
    expect(synthese.risques.faiblesses).toEqual([]);
    expect(synthese.risques.coherence).toEqual([]);
    expect(synthese.risques.mitigations).toEqual([]);
    expect(synthese.marche.targetPerception).toBeNull();
    expect(synthese.marche.currentPerception).toBeNull();
    expect(synthese.potentiel).toEqual([]);
  });
});

describe("composeRtisSynthese — sur la dérivation d'un socle riche", () => {
  const draft = deriveRtisDraft(makeRichAdve());
  const synthese = composeRtisSynthese(draft);

  it("derived = true, vision assemblée depuis les citations réelles", () => {
    expect(synthese.derived).toBe(true);
    expect(synthese.vision).not.toBeNull();
    expect(synthese.vision).toContain("[DRAFT à réécrire par l'opérateur]");
  });

  it("axes stratégiques présents, chacun lié à ≥ 2 piliers", () => {
    expect(synthese.axes.length).toBeGreaterThan(0);
    for (const axe of synthese.axes) {
      expect(axe.axe.length).toBeGreaterThan(0);
      expect(axe.pillarsLinked.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("socle complet → sprint vide (le sprint se dérive des manques)", () => {
    expect(synthese.sprint).toEqual([]);
  });

  it("risques : forces réelles (décisions déclarées), zéro faiblesse fabriquée", () => {
    expect(synthese.risques.forces.length).toBeGreaterThan(0);
    expect(synthese.risques.faiblesses).toEqual([]);
    expect(synthese.risques.swotNote).not.toBeNull();
  });

  it("marché : perception cible dérivée de D, perception actuelle JAMAIS inventée", () => {
    expect(synthese.marche.targetPerception).not.toBeNull();
    expect(synthese.marche.currentPerception).toBeNull();
    expect(synthese.marche.gapDescription).not.toBeNull();
  });

  it("potentiel : actions par canal, chacune citant sa source ADVE", () => {
    expect(synthese.potentiel.length).toBeGreaterThan(0);
    const actions = synthese.potentiel.flatMap((c) => c.actions);
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.source).not.toBeNull();
    }
  });

  it("déterminisme : même entrée → même synthèse", () => {
    const again = composeRtisSynthese(deriveRtisDraft(makeRichAdve()));
    expect(again).toEqual(synthese);
  });
});

describe("composeRtisSynthese — sur la dérivation d'un socle vide (squelette honnête)", () => {
  const synthese = composeRtisSynthese(deriveRtisDraft({}));

  it("vision null (aucune citation), sprint dérivé des manques réels", () => {
    expect(synthese.vision).toBeNull();
    expect(synthese.sprint.length).toBe(5);
    expect(synthese.sprint[0]!.action).toContain("Nom de la marque");
  });

  it("faiblesses réelles listées, aucune force fabriquée", () => {
    expect(synthese.risques.forces).toEqual([]);
    expect(synthese.risques.faiblesses.length).toBeGreaterThan(0);
  });

  it("potentiel : uniquement des actions de complétion honnêtes", () => {
    const actions = synthese.potentiel.flatMap((c) => c.actions);
    expect(actions.length).toBe(3);
    for (const action of actions) {
      expect(action.source).toMatch(/^manque:/);
    }
  });

  it("shapes hérités tolérés : valeurs non conformes → blocs vides, jamais de throw", () => {
    const weird = composeRtisSynthese({
      R: { globalSwot: "pas un objet", coherenceRisks: [42, null, "x"] },
      T: { perceptionGap: ["array au lieu d'objet"] },
      I: { catalogueParCanal: [1, 2, 3] },
      S: { axesStrategiques: { pas: "un tableau" }, sprint90Days: [{ action: "  " }] },
    });
    expect(weird.axes).toEqual([]);
    expect(weird.sprint).toEqual([]);
    expect(weird.risques.coherence).toEqual([]);
    expect(weird.marche.targetPerception).toBeNull();
    expect(weird.potentiel).toEqual([]);
  });
});
