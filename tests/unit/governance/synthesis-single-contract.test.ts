/**
 * Contrat S unique (ADR-0214, amendement 6.27.564) — maturité, schéma strict,
 * composition relue, écrivain calculé et consommateurs lisent UN seul verdict.
 *
 * Défaut reproduit (recette 436) : la maturité canonique déclarait un S
 * COMPLETE/100 alors que le schéma strict refusait des chemins de structure,
 * de type ou de référence, et que l'approbation était impossible.
 *
 * Toutes les formes ci-dessous sont SYNTHÉTIQUES — aucune donnée de marque réelle.
 */
import { describe, expect, it, vi } from "vitest";
import { PillarSSchema } from "@/lib/types/pillar-schemas";
import { STRICT_CONTENT_PILLARS, strictContentIssues } from "@/lib/types/pillar-maturity-contracts";
import { assessPillar, isFieldSatisfied } from "@/server/services/pillar-maturity/assessor";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import { requirementsToFill } from "@/server/services/pillar-maturity/auto-filler";
import { evaluatePillarReadiness, consistencyCheck } from "@/server/governance/pillar-readiness";
import { inspectSynthesis } from "@/server/services/pillar-gateway/validation-status";
import { generateStrategy, computePillarS } from "@/server/services/rtis-protocols/strategy";
import { getStrategyPillarInputsFromContent } from "@/server/services/advertis-scorer/structural";
import { classifyPillarConformance } from "@/lib/types/pillar-conformance";
import { composedSynthesis, completeSynthesis } from "../../fixtures/synthesis";
import { model, projection, actions } from "../../fixtures/strategy-planning";

const sequenceDb = vi.hoisted(() => ({
  pillars: [] as Array<Record<string, unknown>>,
}));
vi.mock("@/lib/db", () => ({ db: {
  sequenceExecution: { findMany: vi.fn(async () => []) },
  pillar: { findMany: vi.fn(async () => sequenceDb.pillars) },
} }));
import { checkPrerequisites } from "@/server/services/sequence-vault";

type S = Record<string, unknown>;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Every schema key present and strict-valid: the positive control. */
const completeCurrentForm = (): S => completeSynthesis();

/** Same keys, historical (LLM-era) shapes: present, but refused by the schema. */
function historicalForm(): S {
  return {
    ...completeCurrentForm(),
    axesStrategiques: [{ axe: "Axe", pillarsLinked: ["A"], kpis: ["Indicateur"] }],
    sprint90Days: [{ action: "Action", kpi: "Critère", priority: "P1", sourceInitiativeId: "action-lisible-1" }],
    selectedFromI: [{ sourceRef: "I.catalogue.0", sourceInitiativeId: "action-lisible-1", action: "Action" }],
    globalBudget: "1 000 000 FCFA", budgetBreakdown: { media: "500k" },
    kpiDashboard: [{ name: "Ventes", pillar: "V", target: "+10 %", frequency: "mensuelle" }],
    northStarKPI: { name: "Indicateur nord", target: "10k", frequency: "mensuel" },
    computed: { roadmapRoutes: [{ key: "TARGET", label: "Cible", recommended: true, description: "Route" }] },
  };
}

/** The calculated writer (PROTOCOLE_S) composes generateStrategy + computePillarS. */
function calculatedForm(objectif?: string, kpiCount = 5): S {
  const ids = actions.map((a, i) => ({ ...a, id: uuid(i + 1), preference: "FAVORITE", ...(objectif ? { objectif } : {}) }));
  const pillars: Record<string, Record<string, unknown>> = {
    a: { secteur: "Services", publicCible: "Public synthétique",
      equipeDirigeante: [{ nom: "Profil", role: "Produit", responsabilites: "Livrer" }],
      overtonPositions: [{ id: "conv", kind: "CONVICTION", statement: "Proposition synthétique", audience: "Public synthétique",
        baseline: { zone: "RADICAL", basis: "INFERRED", reason: "Postulat", sourceRefs: ["fixture"], verification: "Avis datés" },
        targetZone: "ACCEPTABLE" }] },
    v: { strategyBudgetModel: model },
    e: { devotionProjection: projection,
      kpis: Array.from({ length: kpiCount }, (_, i) => ({ name: `Indicateur ${i + 1}`, target: `${i + 1}0 %`, frequency: "MONTHLY" })) },
    r: { probabilityImpactMatrix: [{ id: uuid(9), risk: "Risque" }], mitigationPriorities: [{ action: "m1" }, { action: "m2" }, { action: "m3" }] },
    t: { overtonPosition: { currentPerception: "Inconnue" }, perceptionGap: { targetPerception: "Référence", gapDescription: "Écart" } },
    i: { catalogueParCanal: { MIX: ids } },
  };
  const computed = computePillarS(pillars);
  return { ...generateStrategy(pillars, computed.selectedRouteKey as never), computed, coherenceScore: computed.coherenceScore };
}

const FORMS: Array<[string, S]> = [
  ["composée minimale courante", composedSynthesis()],
  ["complète courante", completeCurrentForm()],
  ["historique, toutes clés présentes", historicalForm()],
  ["courante, quatre indicateurs pour cinq exigés", { ...completeCurrentForm(), kpiDashboard: completeSynthesis().kpiDashboard.slice(0, 1) }],
  ["fenêtre sans stratégie de déplacement", { ...composedSynthesis(), fenetreOverton: { perceptionActuelle: "Départ" } }],
  ["vide", {}],
  ["calculée, sources complètes", calculatedForm()],
  ["calculée, trois objectifs", calculatedForm(undefined, 3)],
  ["calculée, objectif trop long pour un critère court", calculatedForm("Documenter le premier usage utile et ses conditions. ".repeat(6))],
];

const pillarRow = (content: S) => ({ key: "s", content, validationStatus: "AI_PROPOSED", currentVersion: 3, staleAt: null }) as never;
const enrichedSatisfied = (content: S) =>
  getContract("s").stages.ENRICHED.every((r) => isFieldSatisfied(content, r));

describe("contrat S unique — maturité ⇔ schéma strict", () => {
  it("S est le seul pilier dont la maturité est bornée par son schéma strict", () => {
    expect([...STRICT_CONTENT_PILLARS]).toEqual(["s"]);
    expect(strictContentIssues("a", { archetype: 42 })).toEqual([]);
  });

  it.each(FORMS)("%s : un stade composé ou complet implique le schéma strict accepté", (_name, content) => {
    const strict = PillarSSchema.safeParse(content);
    const assessment = assessPillar("s", content);
    const readiness = evaluatePillarReadiness(pillarRow(content), "S");
    if (assessment.currentStage === "ENRICHED" || assessment.currentStage === "COMPLETE") expect(strict.success).toBe(true);
    if (assessment.completionPct === 100) expect(strict.success).toBe(true);
    expect(readiness.stage).toBe(assessment.currentStage);
    expect(readiness.completionPct).toBe(assessment.completionPct);
    // The reviewed composition and the maturity are the same verdict.
    expect(inspectSynthesis(pillarRow(content)).composed).toBe(strict.success && enrichedSatisfied(content));
    expect(consistencyCheck(pillarRow(content), "S").divergences.filter(d => d.includes("zod-strict refuses"))).toEqual([]);
    // Refused paths are those the approval lists, never a second reading.
    const refused = strict.success ? [] : strict.error.issues.map(i => i.path.join("."));
    expect(assessment.invalid).toEqual([...new Set(refused)]);
    for (const path of refused) expect(inspectSynthesis(pillarRow(content)).missing).toContain(path);
  });

  it("la forme historique n'est plus COMPLETE/100 : elle reste un brouillon qui nomme ses chemins refusés", () => {
    const content = historicalForm();
    const assessment = assessPillar("s", content);
    const readiness = evaluatePillarReadiness(pillarRow(content), "S");
    expect(assessment.currentStage).toBe("INTAKE");
    expect(assessment.completionPct).toBeLessThan(100);
    expect(assessment.invalid).toEqual(expect.arrayContaining([
      "axesStrategiques.0.pillarsLinked", "sprint90Days.0.priority", "sprint90Days.0.sourceInitiativeId",
      "globalBudget", "budgetBreakdown.media", "kpiDashboard.0.frequency", "kpiDashboard",
      "selectedFromI.0.sourceInitiativeId", "northStarKPI.frequency", "computed.roadmapRoutes",
    ]));
    expect(assessment.needsHuman).toEqual(expect.arrayContaining(assessment.invalid));
    expect(readiness.displayLabel).toBe("Brouillon");
    expect(readiness.invalid).toEqual(assessment.invalid);
    for (const gate of ["DISPLAY_AS_COMPLETE", "GLORY_SEQUENCE", "RTIS_CASCADE", "ORACLE_ENRICH"] as const) {
      expect(readiness.gates[gate].ok).toBe(false);
      expect(readiness.gates[gate].reasons).toContain("ZOD_STRICT_FAILED");
    }
    expect(inspectSynthesis(pillarRow(content))).toMatchObject({ composed: false, canValidate: false });
  });

  it("aucune normalisation implicite : le contenu stocké est lu tel quel, sans être modifié", () => {
    const content = historicalForm();
    const before = structuredClone(content);
    assessPillar("s", content);
    evaluatePillarReadiness(pillarRow(content), "S");
    inspectSynthesis(pillarRow(content));
    expect(content).toEqual(before);
  });

  it("contrôle positif : un S courant complet et valide reste COMPLETE/100, composé", () => {
    const content = completeCurrentForm();
    expect(PillarSSchema.safeParse(content).success).toBe(true);
    const assessment = assessPillar("s", content);
    expect(assessment).toMatchObject({ currentStage: "COMPLETE", completionPct: 100, invalid: [] });
    expect(inspectSynthesis(pillarRow(content)).composed).toBe(true);
    expect(evaluatePillarReadiness(pillarRow(content), "S").gates.DISPLAY_AS_COMPLETE.reasons).not.toContain("ZOD_STRICT_FAILED");
  });

  it("le score structurel reste gelé (ADR-0102) : la présence comptée est inchangée", () => {
    const historical = historicalForm();
    const current = completeCurrentForm();
    expect(assessPillar("s", historical).satisfied).toEqual(assessPillar("s", current).satisfied);
    expect(getStrategyPillarInputsFromContent("s", historical)).toEqual(getStrategyPillarInputsFromContent("s", current));
  });
});

describe("contrat S unique — écrivain calculé", () => {
  it("sources complètes : l'écrivain produit un S que le contrat accepte comme composé", () => {
    const content = calculatedForm();
    expect(PillarSSchema.safeParse(content).success).toBe(true);
    expect(assessPillar("s", content).currentStage).toBe("ENRICHED");
    expect(inspectSynthesis(pillarRow(content)).composed).toBe(true);
  });

  it("sources lacunaires : brouillon classé, sans remplissage ni troncature, aucune corruption de forme", () => {
    const fewGoals = calculatedForm(undefined, 3);
    expect(fewGoals.kpiDashboard).toHaveLength(3); // never padded to five
    expect(assessPillar("s", fewGoals)).toMatchObject({ currentStage: "INTAKE", invalid: ["kpiDashboard"] });
    const objectif = "Objectif documenté. ".repeat(20);
    const longGoal = calculatedForm(objectif);
    expect((longGoal.sprint90Days as Array<{ kpi: string }>)[0]!.kpi).toBe(objectif); // never truncated
    expect(assessPillar("s", longGoal)).toMatchObject({ currentStage: "INTAKE" });
    expect(assessPillar("s", longGoal).invalid).toContain("sprint90Days.0.kpi");
    // Admissible drafts: the gateway shape gate (corruption that breaks rendering) passes.
    for (const content of [fewGoals, longGoal]) expect(classifyPillarConformance("S", content).shape).toEqual([]);
  });
});

describe("contrat S unique — l'auto-filler ne réécrit pas une valeur présente refusée", () => {
  it("garde les champs absents ou insuffisants, écarte les valeurs présentes refusées", () => {
    const content = historicalForm();
    delete content.visionStrategique;
    const assessment = assessPillar("s", content);
    const paths = requirementsToFill(getContract("s").stages.COMPLETE, assessment).map(r => r.path);
    expect(paths).toContain("visionStrategique");
    for (const present of ["kpiDashboard", "globalBudget"]) {
      expect(assessment.missing).toContain(present);
      expect(paths).not.toContain(present);
    }
  });
});

describe("contrat S unique — consommateur sequence-vault", () => {
  const requires = [{ type: "PILLAR" as const, key: "s", maturity: "ENRICHED" as const }];
  it("un S historique à forte confiance n'est pas enrichi pour les séquences", async () => {
    sequenceDb.pillars = [{ key: "s", confidence: 0.912, validationStatus: "AI_PROPOSED", content: historicalForm() }];
    expect((await checkPrerequisites("synthetic", requires)).blocked).toBe(true);
  });
  it("un S calculé composé, confiance 0 par construction, est enrichi", async () => {
    sequenceDb.pillars = [{ key: "s", confidence: 0, validationStatus: "AI_PROPOSED", content: calculatedForm() }];
    expect((await checkPrerequisites("synthetic", requires)).blocked).toBe(false);
  });
  it("les autres piliers gardent leur règle existante", async () => {
    sequenceDb.pillars = [{ key: "a", confidence: 0.4, validationStatus: "AI_PROPOSED", content: {} }];
    expect((await checkPrerequisites("synthetic", [{ type: "PILLAR", key: "a", maturity: "ENRICHED" }])).blocked).toBe(false);
  });
});
