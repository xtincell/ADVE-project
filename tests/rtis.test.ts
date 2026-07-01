import { describe, expect, it } from "vitest";
import { deriveRtisDraft } from "@/domain/rtis";
import { RTIS_PILLARS } from "@/domain/pillars";
import { makeRichAdve } from "./fixtures";

describe("deriveRtisDraft — socle vide (squelette honnête)", () => {
  const draft = deriveRtisDraft({});

  it("les 4 piliers dérivés sont produits et marqués draft", () => {
    for (const key of RTIS_PILLARS) {
      expect(draft[key]).toBeDefined();
      expect(draft[key]._draft).toBe(true);
      expect(draft[key]._method).toBe("deriveRtisDraft");
    }
  });

  it("R : gaps réels à 0, aucune force fabriquée", () => {
    const r = draft.R;
    const gaps = r.pillarGaps as Record<string, { score: number; gaps: string[] }>;
    expect(gaps.a?.score).toBe(0);
    expect(gaps.a?.gaps.length).toBeGreaterThan(0);
    const swot = r.globalSwot as { strengths: string[]; weaknesses: string[] };
    expect(swot.strengths).toEqual([]);
    expect(swot.weaknesses.length).toBeGreaterThan(0);
  });

  it("T : aucune donnée marché inventée (null partout)", () => {
    expect(draft.T.overtonPosition).toBeNull();
    expect(draft.T.tamSamSom).toBeNull();
    expect(draft.T.perceptionGap).toBeNull();
    expect(draft.T.marketReality).toBeNull();
  });

  it("I : exactement 3 actions, toutes des actions de complétion honnêtes", () => {
    const parCanal = draft.I.catalogueParCanal as Record<string, Array<{ action: string; source: string }>>;
    const actions = Object.values(parCanal).flat();
    expect(actions).toHaveLength(3);
    expect(actions.every((a) => a.source.startsWith("manque:"))).toBe(true);
    expect(draft.I.bigIdea).toBeNull();
  });

  it("S : pas de vision fabriquée, sprint dérivé des manques réels", () => {
    expect(draft.S.visionStrategique).toBeNull();
    expect(draft.S.roadmap).toBeNull();
    const sprint = draft.S.sprint90Days as Array<{ action: string }>;
    expect(sprint).toHaveLength(5);
    expect(sprint[0]!.action).toContain("Nom de la marque");
  });
});

describe("deriveRtisDraft — socle riche (dérivations citent les données réelles)", () => {
  const adve = makeRichAdve();
  const draft = deriveRtisDraft(adve);

  it("R : les décisions déclarées deviennent des forces", () => {
    const swot = draft.R.globalSwot as { strengths: string[]; weaknesses: string[] };
    expect(swot.strengths.length).toBeGreaterThan(0);
    expect(swot.strengths.some((s) => s.includes("déclaré"))).toBe(true);
    expect(swot.weaknesses).toEqual([]);
  });

  it("T : la perception cible vient du positionnement D, l'actuelle reste non mesurée", () => {
    const gap = draft.T.perceptionGap as {
      targetPerception: string;
      currentPerception: null;
    };
    expect(gap.targetPerception).toContain("positionnement");
    expect(gap.currentPerception).toBeNull();
    expect(draft.T.tamSamSom).toBeNull(); // jamais estimé à la place du marché
  });

  it("I : 3 actions dérivées qui citent leurs sources ADVE", () => {
    const parCanal = draft.I.catalogueParCanal as Record<string, Array<{ action: string; source: string }>>;
    const actions = Object.values(parCanal).flat();
    expect(actions).toHaveLength(3);
    expect(actions.some((a) => a.source === "E.touchpoints")).toBe(true);
    expect(actions.some((a) => a.source === "D.personas")).toBe(true);
    expect(actions[0]!.action).toContain("touchpoints item 1");
  });

  it("S : la vision assemble des citations réelles et reste marquée DRAFT", () => {
    const vision = draft.S.visionStrategique as string;
    expect(vision).toContain("[DRAFT");
    expect(vision).toContain("promesseFondamentale");
    const axes = draft.S.axesStrategiques as Array<{ axe: string; pillarsLinked: string[] }>;
    expect(axes.length).toBeGreaterThanOrEqual(3);
    expect(draft.S.sprint90Days).toEqual([]); // rien à combler : socle complet
    expect(draft.S.roadmap).toBeNull(); // choix d'ambition, jamais dérivé
  });
});

describe("deriveRtisDraft — règles de cohérence déterministes", () => {
  it("promesse sans preuve → risque de cohérence détecté", () => {
    const draft = deriveRtisDraft({ D: { promesseMaitre: "Le meilleur ciment du pays." } });
    const risks = draft.R.coherenceRisks as Array<{ risk: string }>;
    expect(risks.some((r) => r.risk.includes("Promesse maître sans preuve"))).toBe(true);
  });

  it("plus de 3 valeurs → dilution détectée", () => {
    const draft = deriveRtisDraft({
      A: { valeurs: [{ nom: "a" }, { nom: "b" }, { nom: "c" }, { nom: "d" }] },
    });
    const risks = draft.R.coherenceRisks as Array<{ risk: string }>;
    expect(risks.some((r) => r.risk.includes("Dilution"))).toBe(true);
  });

  it("socle cohérent → aucun risque fabriqué", () => {
    const draft = deriveRtisDraft(makeRichAdve());
    expect(draft.R.coherenceRisks).toEqual([]);
  });
});

describe("deriveRtisDraft — déterminisme", () => {
  it("même socle → même draft, toujours", () => {
    const adve = { A: { nomMarque: "SPAWT" }, D: { positionnement: "La marque des athlètes urbains." } };
    expect(deriveRtisDraft(adve)).toEqual(deriveRtisDraft(adve));
  });
});
