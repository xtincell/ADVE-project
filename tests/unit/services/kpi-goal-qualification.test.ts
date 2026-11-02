import { describe, expect, it } from "vitest";
import { PillarESchema } from "@/lib/types/pillar-schemas";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import { isFieldSatisfied } from "@/server/services/pillar-maturity/assessor";
import { generateStrategy } from "@/server/services/rtis-protocols/strategy";
import { mapKpisMesure } from "@/server/services/strategy-presentation/section-mappers";

const definition = {
  name: "Sorties utiles — North Star", metricType: "BEHAVIORAL", target: null, frequency: null,
  qualification: "PROPOSED", definition: "Une visite vérifiée conforme à la promesse de la fiche.",
  sourceNotes: "Définition documentée ; cible et cadence non décidées.",
};
const goal = {
  name: "Premier usage utile", metricType: "BEHAVIORAL", target: 18, frequency: "WEEKLY",
  definition: "Part des intentions enregistrées suivies d’un usage utile.",
  qualification: "PROPOSED", unit: "%", observationWindow: "Sous 12 jours après enregistrement",
  targetContext: "Hypothèse à tester sur la cohorte", sourceNotes: "Fréquence de suivi proposée, pas une mesure.",
};
const strategy = (kpis: unknown[]) => ({ pillars: [
  { key: "e", content: { kpis } },
  { key: "s", content: { kpiDashboard: [{ name: "Ancienne cible", target: "777", frequency: "MONTHLY" }] } },
] });

describe("a documented KPI is distinct from its target, window and monitoring cadence", () => {
  it("accepts explicit unknowns without converting them into zero or a default cadence", () => {
    const rows = [definition, ...Array.from({ length: 5 }, (_, i) => ({ ...goal, name: `Signal ${i}` }))];
    const parsed = PillarESchema.shape.kpis.parse(rows);
    expect(parsed[0]).toEqual(definition);
    expect(parsed[1]).toMatchObject({ target: 18, frequency: "WEEKLY", observationWindow: goal.observationWindow });
    expect(PillarESchema.shape.kpis.safeParse([{ ...goal, target: " " }]).success).toBe(false);
  });
  it("keeps target and frequency mandatory for maturity, even when an incomplete draft is valid", () => {
    const requirement = getContract("e").stages.COMPLETE.find(r => r.path === "kpis")!;
    expect(requirement.requiredItemKeys).toEqual(expect.arrayContaining(["target", "frequency"]));
    expect(isFieldSatisfied({ kpis: [definition] }, requirement)).toBe(false);
    expect(isFieldSatisfied({ kpis: [{ ...goal, target: null }] }, requirement)).toBe(false);
    expect(isFieldSatisfied({ kpis: [{ ...goal, frequency: null }] }, requirement)).toBe(false);
    expect(isFieldSatisfied({ kpis: [goal] }, requirement)).toBe(true);
  });
  it("preserves the documented definition in the Oracle instead of reviving an old S target", () => {
    const result = mapKpisMesure(strategy([definition, goal]));
    expect(result.kpis).toHaveLength(2);
    expect(result.kpis[0]).toMatchObject({ name: definition.name, target: "", frequency: "", qualification: "PROPOSED", definition: definition.definition });
    expect(result.kpis[1]).toMatchObject({ target: "18", observationWindow: goal.observationWindow, targetContext: goal.targetContext });
    expect(result.kpis.some(k => k.name === "Ancienne cible")).toBe(false);
  });
  it("projects only qualified goals to S, retaining their proposition and observation window", () => {
    const result = generateStrategy({ e: { kpis: [definition, goal] } }, "TARGET");
    expect(result.kpiDashboard).toEqual([{ name: goal.name, target: "18", frequency: "WEEKLY", pillar: "E", qualification: "PROPOSED", definition: goal.definition, unit: "%", observationWindow: goal.observationWindow, targetContext: goal.targetContext, sourceNotes: goal.sourceNotes }]);
    expect(result.northStarKPI).toBeUndefined();
  });
  it("retains a genuine zero goal and does not add observations or human adoption", () => {
    const result = mapKpisMesure(strategy([{ ...goal, target: 0 }]));
    expect(result.kpis[0]).toMatchObject({ target: "0", qualification: "PROPOSED" });
    expect(result.kpis[0]).not.toHaveProperty("currentValue");
  });
  it("retains all qualified metadata for an explicitly targeted North Star", () => {
    const result = generateStrategy({ e: { kpis: [{ ...definition, target: 42, frequency: "MONTHLY", unit: "sorties", observationWindow: "Sur une cohorte de 12 jours" }] } }, "TARGET");
    expect(result.northStarKPI).toEqual({ name: definition.name, target: "42", frequency: "MONTHLY", qualification: "PROPOSED", definition: definition.definition, sourceNotes: definition.sourceNotes, unit: "sorties", observationWindow: "Sur une cohorte de 12 jours" });
  });
});
