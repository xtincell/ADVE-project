import { describe, expect, it } from "vitest";
import { generateStrategy } from "@/server/services/rtis-protocols/strategy";
import { collectNormalizedInitiatives, PillarSSchema } from "@/lib/types/pillar-schemas";
import { aggregateInitiativeSet, initiativeBudgetLabel } from "@/lib/strategy/roadmap-routes";

// Synthetic goals: production brand targets are exercised only in private receipts.
const goals = [
  ["Complétion du parcours", "≥ 55 %"], ["Activation initiale", "≥ 40 %"],
  ["Retour à sept jours", "≥ 20 %"], ["Sessions utiles / semaine (North Star)", "120 à J60"],
  ["Invitations acceptées", "≥ 0,10"], ["Clics sur la lettre", "≥ 8 % des membres"],
].map(([name, target]) => ({ name, target, frequency: "hebdomadaire" }));

describe("source irrigation into S", () => {
  it("preserves documented KPI targets, frequency, explicit North Star and team without making them observations or action assignments", () => {
    const team = [{ nom: "Responsable produit", role: "Produit", responsabilites: "Valide les builds." }];
    const source = { e: { kpis: goals }, a: { equipeDirigeante: team } };
    const before = structuredClone(source);
    const s = generateStrategy(source, "TARGET");
    expect(s.kpiDashboard).toEqual(goals.map(k => ({ ...k, frequency: "WEEKLY", pillar: "E" })));
    expect(s.northStarKPI).toEqual({ name: goals[3]!.name, target: "120 à J60", frequency: "WEEKLY" });
    expect(s.teamStructure).toEqual([{ name: "Responsable produit", title: "Produit", responsibility: "Valide les builds." }]);
    expect(s.sprint90Days).toEqual([]); expect(source).toEqual(before);
    const parsed = PillarSSchema.shape.kpiDashboard.safeParse(s.kpiDashboard);
    expect(parsed.success).toBe(true);
  });
  it("does not manufacture missing target, frequency, team responsibility or a North Star from ordering", () => {
    const s = generateStrategy({ e: { kpis: [
      { name: "Signal", target: "100", frequency: "au besoin" }, { name: "Signal 2", target: "100" },
      { name: "Signal 3", target: 0, frequency: "MONTHLY" }, { name: "Sans cible", frequency: "DAILY" },
    ] }, a: { equipeDirigeante: [{ nom: "Une personne", role: "Produit" }] } }, "TARGET");
    expect(s.kpiDashboard).toEqual([{ name: "Signal 3", target: "0", frequency: "MONTHLY", pillar: "E" }]);
    expect(s.northStarKPI).toBeUndefined(); expect(s.teamStructure).toBeUndefined();
  });
  it("keeps conflicting North Star candidates visible as goals without selecting one arbitrarily", () => {
    const s = generateStrategy({ e: { kpis: [goals[3], { ...goals[3], name: "Autre North Star" }] } }, "TARGET");
    expect(s.northStarKPI).toBeUndefined(); expect(s.kpiDashboard).toHaveLength(2);
  });
  it("can project a complete canonical A profile without asking for a second description in S", () => {
    const bio = "Expérience produit documentée, coordination des livraisons et validation des versions.";
    const s = generateStrategy({ a: { equipeDirigeante: [{ nom: "Profil source", role: "Produit", bio,
      experiencePasse: ["Expérience documentée"], competencesCles: ["Produit", "Coordination"] }] } }, "TARGET");
    expect(s.teamStructure).toEqual([{ name: "Profil source", title: "Produit", responsibility: bio }]);
    expect(s.sprint90Days).toEqual([]);
  });
  it("projects campaign family and cadence independently, leaving an unclassified action visible", () => {
    const s = generateStrategy({ i: { catalogueParCanal: { DIRECT: [
      { id: "launch", action: "Lancement", objectif: "Tester", format: "Pilote", campaignCanonType: "GTM_90", cadence: "WEEKLY", pilierImpact: "A" },
      { id: "loop", action: "Boucle", objectif: "Retenir", format: "Digest", campaignCanonType: "ALWAYS_ON", cadence: "MONTHLY", pilierImpact: "E" },
      { id: "unknown", action: "À qualifier", objectif: "Comprendre", format: "Autre", pilierImpact: "V" },
    ] } } }, "TARGET");
    expect(s.roadmap).toEqual(expect.arrayContaining([
      expect.objectContaining({ canonType: "GTM_90", cadence: "WEEKLY", actionRefs: ["launch"] }),
      expect.objectContaining({ canonType: "ALWAYS_ON", cadence: "MONTHLY", actionRefs: ["loop"] }),
      expect.objectContaining({ phase: "Campagne à qualifier", actionRefs: ["unknown"] }),
    ]));
  });
});

describe("action cost bounds and monetary periods", () => {
  it("does not turn an inferred zero range into a free action", () => {
    const [action] = collectNormalizedInitiatives({ catalogueParCanal: { SOCIAL: [{ id: "zero", action: "À chiffrer", budgetRange: { min: 0, max: 0 } }] }, _fieldProvenance: { catalogueParCanal: "INFERRED" } });
    expect(action).toMatchObject({ budgetBasis: "UNKNOWN" }); expect(action?.budgetRange).toBeUndefined(); expect(action?.budget).toBeUndefined();
  });
  it.each(["SOURCE", "HUMAN"])("retains an explicit %s zero range", (origin) => {
    const [action] = collectNormalizedInitiatives({ catalogueParCanal: { SOCIAL: [{ id: "zero", action: "Gratuité documentée", budgetRange: { min: 0, max: 0 } }] }, _fieldProvenance: { catalogueParCanal: origin } });
    expect(action?.budgetRange).toEqual({ min: 0, max: 0 });
  });
  it("retains documented bounds through normalization and does not replace them by a qualitative midpoint", () => {
    const [action] = collectNormalizedInitiatives({ catalogueParCanal: { SOCIAL: [
      { id: "a", action: "Contenus", budgetRange: { min: 100, max: 300 }, budgetEstime: "HIGH", budgetPeriod: "MONTHLY", cadence: "MONTHLY", campaignCanonType: "ALWAYS_ON" },
    ] } });
    expect(action).toMatchObject({ budgetRange: { min: 100, max: 300 }, budgetPeriod: "MONTHLY", cadence: "MONTHLY", campaignCanonType: "ALWAYS_ON", budgetBasis: "DECLARED_RANGE" });
    expect(action?.budget).toBeUndefined();
    const agg = aggregateInitiativeSet([action!] as unknown as Array<Record<string, unknown>>, []);
    expect(agg.totalBudget).toBeUndefined();
    expect(initiativeBudgetLabel(agg.totalBudget, agg.budgetSummary)).toBe("100–300 F · par mois");
  });
  it("does not sum setup and monthly costs or annualize an unspecified number of occurrences", () => {
    const agg = aggregateInitiativeSet([
      { id: "setup", budget: 250, budgetPeriod: "ONE_OFF", timeframe: "SPRINT_90" },
      { id: "loop", budgetRange: { min: 100, max: 300 }, budgetPeriod: "MONTHLY", timeframe: "SPRINT_90" },
    ], []);
    expect(agg.totalBudget).toBeUndefined(); expect(agg.budgetSummary.knownSubtotal).toBeNull();
    expect(agg.budgetByPhase).toEqual({});
    expect(initiativeBudgetLabel(undefined, agg.budgetSummary)).toContain("100–300 F · par mois");
    expect(initiativeBudgetLabel(undefined, agg.budgetSummary)).toContain("250 F · ponctuel");
  });
  it("sums comparable bounds conservatively and keeps an unknown line explicit", () => {
    const agg = aggregateInitiativeSet([
      { id: "a", budgetRange: { min: 100, max: 300 }, budgetPeriod: "ONE_OFF" },
      { id: "b", budget: 50, budgetPeriod: "ONE_OFF" }, { id: "c", budgetPeriod: "ONE_OFF" },
    ], []);
    expect(agg.budgetSummary.amountGroups).toEqual([{ period: "ONE_OFF", min: 150, max: 350, rangeCount: 1, knownCount: 2, unknownCount: 1 }]);
    expect(agg.totalBudget).toBeUndefined(); expect(initiativeBudgetLabel(undefined, agg.budgetSummary)).toContain("1 budget(s) à préciser");
  });
});
