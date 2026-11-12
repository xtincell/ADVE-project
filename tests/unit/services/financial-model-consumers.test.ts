import { describe, expect, it } from "vitest";
import { financialModelFixture } from "../../fixtures/financial-model";
import { PillarResolver } from "@/server/services/artemis/tools/pillar-resolver";
import { serializePillar } from "@/server/services/utils/pillar-context";
import { assessPillar, isFieldSatisfied } from "@/server/services/pillar-maturity/assessor";
import { findEmptyLeafPaths } from "@/lib/types/pillar-maturity-contracts";
import { scorePillarSemantic } from "@/server/services/advertis-scorer/semantic";
import { validateCrossReferences } from "@/server/services/cross-validator";

const content = () => ({ financialModel: financialModelFixture(), unitEconomics: { cac: null, ltv: null, ltvCacRatio: null },
  _fieldProvenance: { unitEconomics: "HUMAN", "unitEconomics.cac": "HUMAN", financialModel: "INFERRED" } });
const requirement = (path: string) => ({ path, validator: "is_number" as const, derivable: true, description: path });

describe("Propagation financière depuis V, sans réécriture du socle", () => {
  it("donne aux bindings de production les mêmes montants, tout en conservant le brut", () => {
    const raw = content(), before = structuredClone(raw);
    const resolver = PillarResolver.fromData([{ key: "v", content: raw, confidence: 0.4 }]);
    expect(resolver.resolve("v.unitEconomics.cac")).toBe(7000);
    expect(resolver.resolve("v.unitEconomics.caVise")).toBe(11700000);
    expect(raw).toEqual(before);
  });
  it("porte les calculs dans le contexte RTIS avec une autorité inférée, sans emprunter l’ancien HUMAN", () => {
    const text = serializePillar("V", content(), () => "HUMAN");
    const start = text.indexOf("⟦DONNÉE⟧ PILIER ");
    const data = JSON.parse(text.slice(text.indexOf("\n", start) + 1, text.lastIndexOf("\n")));
    expect(data.unitEconomics.statut).toBe("INFERRED");
    expect(data.unitEconomics.valeur).toMatchObject({ cac: 7000, ltv: 84000, caVise: 11700000 });
    expect(data.unitEconomics.complements).toBeUndefined();
  });
  it("ne signale plus de trou financier quand toutes les prémisses sont calculables", () => {
    const raw = content();
    expect(findEmptyLeafPaths("v", raw).filter(p => p.path.startsWith("unitEconomics."))).toEqual([]);
    expect(findEmptyLeafPaths("v", { unitEconomics: {} }).filter(p => p.path.startsWith("financialModel"))).toEqual([]);
    expect(isFieldSatisfied(raw, requirement("unitEconomics.cac"))).toBe(true);
    const rows = [requirement("unitEconomics.cac"), requirement("unitEconomics.ltv")];
    const contract = { pillarKey: "v", stages: { INTAKE: rows, ENRICHED: rows, COMPLETE: rows } };
    expect(assessPillar("v", raw, contract).missing).not.toContain("unitEconomics.cac");
  });
  it("reconnaît une non-applicabilité démontrée sans fabriquer un ratio nul", () => {
    const raw = content(); raw.financialModel.breakEven.variableCosts[1]!.value = 20000;
    expect(isFieldSatisfied(raw, requirement("unitEconomics.ltvCacRatio"))).toBe(true);
    expect(findEmptyLeafPaths("v", raw).some(p => p.path === "unitEconomics.ltvCacRatio")).toBe(false);
  });
  it("n’accorde pas de bonus de performance à un plafond CAC proposé", () => {
    const score = scorePillarSemantic("V", content());
    expect(score.breakdown.find(r => r.component === "Ajustements")?.score).toBe(0);
    expect(score.breakdown.find(r => r.component === "Unit Eco")?.score).toBe(5);
  });
  it("contrôle les résultats calculés avec leur qualification de scénario", async () => {
    const client = { pillar: { findMany: async () => [{ key: "v", content: content() }] } };
    const rows = await validateCrossReferences("fixture", client as never);
    expect(rows.find(r => r.ruleId === 19)).toMatchObject({ status: "VALID" });
    expect(rows.find(r => r.ruleId === 19)?.message).toContain("Modèle de travail");
    expect(rows.find(r => r.ruleId === 20)?.status).toBe("VALID");
  });  it("contrôle une enveloppe de communication explicitement nulle au lieu de la déclarer inconnue", async () => {
    const raw = content(); raw.financialModel.projection.marketingFixedCostIndexes = []; raw.financialModel.projection.marketingVariableCostIndexes = [];
    const client = { pillar: { findMany: async () => [{ key: "v", content: raw }, { key: "s", content: { globalBudget: 0, budgetByDevotion: {}, roadmap: [] } }] } };
    const rows = await validateCrossReferences("fixture", client as never);
    expect(rows.find(r => r.ruleId === 20)?.status).toBe("VALID");
    expect(rows.find(r => r.ruleId === 21)?.status).toBe("INVALID");
    for (const id of [24, 25, 30]) expect(rows.find(r => r.ruleId === id)?.status).toBe("VALID");
  });
  it("conserve les conclusions mathématiques connues d’un scénario sans revenu ou déficitaire", async () => {
    const raw = content(); raw.financialModel.breakEven.variableCosts[1]!.value = 20000;
    raw.financialModel.projection.monthlyVolumes.forEach(a => { a.value = 0; });
    const client = { pillar: { findMany: async () => [{ key: "v", content: raw }] } };
    const rows = await validateCrossReferences("fixture", client as never);
    for (const id of [19, 21, 22, 23, 26, 27]) {
      const row = rows.find(r => r.ruleId === id)!;
      expect(row.status).toBe("SKIPPED");
      expect(row.message).toContain("Non applicable");
      expect(row.message).not.toMatch(/non renseigne|non calcule|insuffisantes/i);
    }
  });

});
