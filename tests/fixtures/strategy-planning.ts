const source = { sourceId: "fixture-source", contentHash: "a".repeat(64) };
export const amount = (value: number) => ({ value, qualification: "ASSUMPTION", note: "Synthetic premise", sources: [] });
export const model = {
  schema: "adve-strategy-budget-v1", source, currency: "XOF", qualification: "PROPOSED", horizonMonths: 12,
  daysPerMonth: 30, envelopePolicy: "UPPER_BOUND", note: "Proposed twelve-month horizon, not cash or spending authorization.",
  phaseWindows: { SPRINT_90: { startMonth: 1, endMonth: 3 }, PHASE_1: { startMonth: 4, endMonth: 6 }, PHASE_2: { startMonth: 7, endMonth: 9 }, LONG_TERM: { startMonth: 10, endMonth: 12 } },
  profiles: [{ channel: "*", fallbackRange: { min: 40, max: 80 }, adHocOccurrences: 2, note: "Proposed responsibilities",
    categoryShares: { production: 0.3, media: 0.2, talent: 0.2, logistics: 0.2, technology: 0.1 } }],
};
export const projection = { source, qualification: "PROPOSED", cohortPersonaId: "audience", cohort: "Free audience", observationWindow: "Monthly cohort",
  spectators: amount(1000), rates: { interest: amount(0.2), participation: amount(0.5), engagement: amount(0.2), advocacy: amount(0.1), prescription: amount(0.5) },
  phases: [{ phase: "Sprint 90 jours", scale: 1, note: "Relative horizon" }], note: "Not observed people" };
export const actions = [
  { id: "setup", action: "Produce launch", objectif: "Audience test", channel: "DIGITAL", timeframe: "SPRINT_90", budgetRange: { min: 100, max: 200 }, budgetPeriod: "ONE_OFF", devotionImpact: "INTERESSE", pilierImpact: "D" },
  { id: "loop", action: "Monthly community", objectif: "Repeated usage", channel: "COMMUNITY", timeframe: "PHASE_1", budget: 50, budgetPeriod: "PER_OCCURRENCE", cadence: "MONTHLY", devotionImpact: "ENGAGE", pilierImpact: "E" },
];

