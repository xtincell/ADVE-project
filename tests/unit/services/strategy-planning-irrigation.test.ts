import { describe, expect, it } from "vitest";
import { StrategyBudgetModelSchema, STRATEGY_COST_CATEGORIES } from "@/domain/financial-document";
import { DevotionProjectionSchema, projectDevotionFunnel } from "@/domain/devotion-ladder";
import { aggregateInitiativeSet, projectStrategyBudget } from "@/lib/strategy/roadmap-routes";
import { generateStrategy, computePillarS } from "@/server/services/rtis-protocols/strategy";
import { mapBudget } from "@/server/services/strategy-presentation/section-mappers";
import { deriveSchemaRequirements } from "@/lib/types/pillar-maturity-contracts";
import { PillarSSchema } from "@/lib/types/pillar-schemas";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import { composedSynthesis } from "../../fixtures/synthesis";
import { assessPillar, isFieldSatisfied } from "@/server/services/pillar-maturity/assessor";

import { model, projection, actions, amount } from "../../fixtures/strategy-planning";

describe("ADVE planning premises irrigate the retained strategy", () => {
  it("keeps a small retained plan enriched without padding actions, while rejecting empty or malformed plans", () => {
    const base = composedSynthesis();
    const short = { ...base,
      axesStrategiques: base.axesStrategiques.slice(0, 1),
      sprint90Days: base.sprint90Days.slice(0, 1),
      roadmap: base.roadmap.slice(0, 1),
      selectedFromI: base.selectedFromI.slice(0, 1),
      fenetreOverton: { strategieDeplacement: base.fenetreOverton.strategieDeplacement.slice(0, 1) },
    };
    const contract = getContract("s")!;
    expect(contract.stages.ENRICHED.every(r => isFieldSatisfied(short, r))).toBe(true);
    expect(assessPillar("s", short, contract).currentStage).not.toBe("INTAKE");
    expect(PillarSSchema.safeParse(short).success).toBe(true);
    for (const path of ["sprint90Days", "axesStrategiques", "roadmap", "selectedFromI"] as const) {
      const empty = { ...short, [path]: [] };
      expect(isFieldSatisfied(empty, contract.stages.ENRICHED.find(r => r.path === path)!)).toBe(false);
    }
    expect(PillarSSchema.safeParse({ ...short, sprint90Days: [{ action: "Action sans critère" }] }).success).toBe(false);
  });
  it("consolidates mixed periods on an explicit horizon without collapsing bounds to an unexplained point", () => {
    expect(aggregateInitiativeSet(actions, []).totalBudget).toBeUndefined();
    const aggregate = aggregateInitiativeSet(actions, [], model);
    expect(aggregate.totalBudget).toBe(350); // explicitly qualified upper-bound envelope
    expect(aggregate.budgetSummary.plan).toMatchObject({ min: 250, max: 350, currency: "XOF", horizonMonths: 12, qualification: "PROPOSED" });
    expect(aggregate.budgetSummary.plan?.lines.map(l => l.occurrences)).toEqual([1, 3]);
    for (const side of ["min", "max"] as const)
      expect(Object.values(aggregate.budgetSummary.plan!.byCategory).reduce((s, r) => s + r[side], 0)).toBe(aggregate.budgetSummary.plan![side]);
  });
  it("uses a one-shot occurrence and only an explicit ADVE fallback for an unspecified cost period", () => {
    expect(projectStrategyBudget([{ ...actions[1], cadence: "ONE_SHOT" }], model)?.lines[0]?.occurrences).toBe(1);
    const unknown = [{ ...actions[1], budgetPeriod: "UNSPECIFIED" }];
    expect(projectStrategyBudget(unknown, model)).toBeUndefined();
    const withPeriod = { ...model, profiles: model.profiles.map(p => ({ ...p, fallbackPeriod: "MONTHLY" })) };
    expect(projectStrategyBudget(unknown, withPeriod)?.lines[0]).toMatchObject({ period: "MONTHLY", occurrences: 3 });
  });
  it("does not annualize or assign categories without valid ADVE premises", () => {
    expect(projectStrategyBudget(actions, undefined)).toBeUndefined();
    const invalid = structuredClone(model); invalid.profiles[0]!.categoryShares.media = 0.4;
    expect(StrategyBudgetModelSchema.safeParse(invalid).success).toBe(false);
    expect(projectStrategyBudget(actions, invalid)).toBeUndefined();
    expect(projectStrategyBudget([{ ...actions[1], cadence: undefined }], model)).toBeUndefined();
  });
  it("uses documented zero, and a qualified model range only for missing or qualitative costs", () => {
    const plan = projectStrategyBudget([{ ...actions[1], budget: 0 }, { ...actions[0], budgetRange: undefined, budget: 500000, budgetBasis: "QUALITATIVE_ESTIMATE" }], model)!;
    expect(plan.lines[0]).toMatchObject({ min: 0, max: 0 });
    expect(plan.lines[1]).toMatchObject({ min: 40, max: 80 });
  });
  it("preserves cent totals and monotone category ranges", () => {
    const m = structuredClone(model); m.profiles[0]!.categoryShares = { production: 0.2, media: 0.2, talent: 0.2, logistics: 0.2, technology: 0.2 };
    const p = projectStrategyBudget([{ ...actions[0], budgetRange: { min: 0.03, max: 0.04 } }], m)!;
    expect(Object.values(p.byCategory).reduce((s, r) => s + r.max, 0)).toBeCloseTo(0.04);
    for (const r of Object.values(p.byCategory)) { expect(r.min).toBeGreaterThanOrEqual(0); expect(r.max).toBeGreaterThanOrEqual(r.min); }
  });
  it("fills all four roots and the Oracle from the same retained action set, without changing sources", () => {
    const pillars = { v: { strategyBudgetModel: model }, e: { devotionProjection: projection }, i: { catalogueParCanal: { MIX: actions } } };
    const before = structuredClone(pillars), s = generateStrategy(pillars, "TARGET");
    const computed = computePillarS(pillars);
    expect(s.globalBudget).toBe(350);
    expect(Object.keys(s.budgetBreakdown as object)).toEqual([...STRATEGY_COST_CATEGORIES]);
    expect(s.budgetByDevotion).toEqual({ acquisition: 200, conversion: 0, retention: 150, evangelisation: 0 });
    expect(s.devotionFunnel).toEqual([expect.objectContaining({ spectateurs: 1000, interesses: 200, participants: 100, engages: 20, ambassadeurs: 2, evangelistes: 1, qualification: "PROPOSED" })]);
    const oracle = mapBudget({ pillars: [{ key: "s", content: { ...s, computed } }], campaigns: [] });
    expect(oracle.globalBudget).toBe(s.globalBudget); expect(oracle.budgetBreakdown).toMatchObject(s.budgetBreakdown!);
    expect(oracle.budgetByDevotion).toEqual(s.budgetByDevotion); expect(oracle.devotionFunnel).toEqual(s.devotionFunnel);
    expect(oracle.strategyBudgetSummary).toEqual(computed.budgetSummary); expect(pillars).toEqual(before);
  });
  it("changes the envelope when a catalogue action is rejected, without adding its money to the remaining plan", () => {
    const s = generateStrategy({ v: { strategyBudgetModel: model }, i: { catalogueParCanal: { MIX: [actions[0], { ...actions[1], preference: "REJECTED" }] } } }, "TARGET");
    expect(s.globalBudget).toBe(200); expect((s.rejectedFromI as unknown[]).length).toBe(1);
  });
  it("refuses a missing or invalid audience premise and preserves a qualified zero goal", () => {
    expect(projectDevotionFunnel(undefined)).toEqual([]);
    expect(DevotionProjectionSchema.safeParse({ ...projection, rates: { ...projection.rates, interest: amount(2) } }).success).toBe(false);
    expect(projectDevotionFunnel({ ...projection, spectators: amount(0) })[0]).toMatchObject({ spectateurs: 0, evangelistes: 0 });
  });
  it("counts an explicitly empty rejection list while refusing an absent list or malformed rejection", () => {
    const req = deriveSchemaRequirements("s").find(r => r.path === "rejectedFromI")!;
    expect(isFieldSatisfied({ rejectedFromI: [] }, req)).toBe(true);
    expect(isFieldSatisfied({}, req)).toBe(false);
    expect(isFieldSatisfied({ rejectedFromI: [{}] }, req)).toBe(false);
  });
});
