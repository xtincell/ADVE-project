/**
 * GLORY Calculators — Financial/Mathematical Operations (CALC type)
 *
 * Pure functions: no AI, no templates, just math.
 * Each calculator takes a context (Record<string, unknown>) and returns computed values.
 *
 * 9 calculators across 4 sequences:
 *   EVAL:           roi-calculator
 *   COST-SERVICE:   hourly-rate-calculator, codb-calculator, service-margin-analyzer
 *   COST-CAMPAIGN:  campaign-cost-estimator, budget-tracker
 *   PROFITABILITY:  project-pnl-calculator, client-profitability-analyzer, utilization-rate-tracker
 */

type Ctx = Record<string, unknown>;
type Result = Record<string, unknown>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(ctx: Ctx, key: string, fallback = 0): number {
  const v = ctx[key];
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? fallback : n; }
  return fallback;
}

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 10000) / 100;
}

function verdict(marginPct: number): string {
  if (marginPct > 30) return "TRÈS RENTABLE";
  if (marginPct > 15) return "RENTABLE";
  if (marginPct > 0) return "MARGINAL";
  return "DÉFICITAIRE";
}

// ─── Calculators ─────────────────────────────────────────────────────────────

/** EVAL: ROI créatif */
function roiCalculator(ctx: Ctx): Result {
  const budget = num(ctx, "budget_spent");
  const impressions = num(ctx, "impressions");
  const engagements = num(ctx, "engagements");
  const conversions = num(ctx, "conversions");
  const revenue = num(ctx, "revenue", 0);

  const cpe = engagements > 0 ? Math.round(budget / engagements) : 0;
  const cpc = conversions > 0 ? Math.round(budget / conversions) : 0;
  const cpm = impressions > 0 ? Math.round((budget / impressions) * 1000) : 0;
  const roas = budget > 0 ? Math.round((revenue / budget) * 100) / 100 : 0;
  const emv = engagements * 150; // Estimated media value per engagement (XAF)

  return {
    cpe, cpc, cpm, roas, emv,
    budget, impressions, engagements, conversions, revenue,
    summary: `CPE: ${cpe} XAF | CPC: ${cpc} XAF | CPM: ${cpm} XAF | ROAS: ${roas}x | EMV: ${emv} XAF`,
  };
}

/** COST-SERVICE: Taux horaire */
function hourlyRateCalculator(ctx: Ctx): Result {
  const salaryMonthly = num(ctx, "salary_gross");
  const chargesPct = num(ctx, "employer_charges_pct", 40);
  const overheadPct = num(ctx, "overhead_pct", 30);
  const productiveHours = num(ctx, "productive_hours_year", 1600);
  const marginPct = num(ctx, "margin_pct", 25);

  const annualCost = salaryMonthly * 12 * (1 + chargesPct / 100) * (1 + overheadPct / 100);
  const costRate = productiveHours > 0 ? Math.round(annualCost / productiveHours) : 0;
  const sellRate = Math.round(costRate * (1 + marginPct / 100));

  return {
    annualCost: Math.round(annualCost),
    costRate,
    sellRate,
    productiveHours,
    marginPct,
    summary: `Coût: ${costRate} XAF/h | Vente: ${sellRate} XAF/h | Marge: ${marginPct}%`,
  };
}

/** COST-SERVICE: Cost of Doing Business */
function codbCalculator(ctx: Ctx): Result {
  const fixedMonthly = num(ctx, "fixed_costs");
  const variableMonthly = num(ctx, "variable_costs");
  const headcount = num(ctx, "headcount", 1);
  const revenueTarget = num(ctx, "revenue_target");
  const billableRatio = num(ctx, "billable_ratio", 70);

  const codbMonthly = fixedMonthly + variableMonthly;
  const codbAnnual = codbMonthly * 12;
  const costPerHead = headcount > 0 ? Math.round(codbAnnual / headcount) : 0;
  const breakeven = revenueTarget > 0 ? Math.round(codbAnnual / (revenueTarget / codbAnnual)) : 0;
  const overheadRate = billableRatio > 0 ? Math.round((100 - billableRatio) / billableRatio * 100) : 0;

  return {
    codbMonthly, codbAnnual, costPerHead, breakeven, overheadRate, headcount,
    summary: `CODB: ${codbMonthly} XAF/mois (${codbAnnual} XAF/an) | Seuil: ${breakeven} XAF | Overhead: ${overheadRate}%`,
  };
}

/** COST-SERVICE: Marge par service */
function serviceMarginAnalyzer(ctx: Ctx): Result {
  const hourlyCost = num(ctx, "hourly_cost");
  const hoursRaw = ctx.hours_per_service;
  const pricesRaw = ctx.price_per_service;
  const servicesRaw = ctx.services;

  // Handle arrays or single values
  const hours = Array.isArray(hoursRaw) ? hoursRaw.map(Number) : [num(ctx, "hours_per_service")];
  const prices = Array.isArray(pricesRaw) ? pricesRaw.map(Number) : [num(ctx, "price_per_service")];
  const names = Array.isArray(servicesRaw) ? servicesRaw.map((s: unknown) => typeof s === "object" && s !== null ? (s as Record<string, unknown>).nom ?? String(s) : String(s)) : ["Service"];

  const analysis = (names as string[]).map((name: string, i: number) => {
    const h = hours[i] ?? hours[0] ?? 0;
    const p = prices[i] ?? prices[0] ?? 0;
    const cost = h * hourlyCost;
    const margin = p - cost;
    const marginPctVal = pct(margin, p);
    return { name, hours: h, price: p, cost, margin, marginPct: marginPctVal, verdict: verdict(marginPctVal) };
  });

  return { analysis, hourlyCost, totalServices: analysis.length };
}

/** COST-CAMPAIGN: Estimation coût campagne */
function campaignCostEstimator(ctx: Ctx): Result {
  const mediaBudget = num(ctx, "media_budget");
  const creationHours = num(ctx, "creation_hours", 80);
  const hourlyRate = num(ctx, "hourly_rate", 25000);
  const productionCost = num(ctx, "production_cost", 0);
  const postProdCost = num(ctx, "post_production_cost", 0);

  const creationCost = creationHours * hourlyRate;
  const projectMgmt = Math.round((creationCost + productionCost + postProdCost) * 0.15);
  const agencyMargin = Math.round((creationCost + productionCost + postProdCost + projectMgmt) * 0.20);
  const totalHT = creationCost + productionCost + postProdCost + mediaBudget + projectMgmt + agencyMargin;
  const tva = Math.round(totalHT * 0.1925); // 19.25% TVA Cameroun
  const totalTTC = totalHT + tva;

  return {
    breakdown: { creation: creationCost, production: productionCost, postProduction: postProdCost, media: mediaBudget, projectManagement: projectMgmt, agencyMargin },
    totalHT, tva, totalTTC,
    summary: `Création: ${creationCost} | Prod: ${productionCost} | Média: ${mediaBudget} | PM: ${projectMgmt} | Marge: ${agencyMargin} | Total TTC: ${totalTTC} XAF`,
  };
}

/** COST-CAMPAIGN: Suivi budgétaire */
function budgetTracker(ctx: Ctx): Result {
  const estimated = num(ctx, "estimated_budget");
  const spent = num(ctx, "spent_to_date");
  const committed = num(ctx, "committed");
  const invoiced = num(ctx, "invoiced");

  const engagedTotal = spent + committed;
  const remaining = estimated - engagedTotal;
  const consumedPct = pct(spent, estimated);
  const engagedPct = pct(engagedTotal, estimated);
  const remainingPct = pct(remaining, estimated);
  const alert = remaining < estimated * 0.10 ? "CRITIQUE" : remaining < estimated * 0.25 ? "ATTENTION" : "OK";
  const toInvoice = spent - invoiced;

  return {
    estimated, spent, committed, invoiced,
    engagedTotal, remaining, toInvoice,
    consumedPct, engagedPct, remainingPct,
    alert,
    summary: `Consommé: ${consumedPct}% | Engagé: ${engagedPct}% | Reste: ${remaining} XAF (${alert})`,
  };
}

/** PROFITABILITY: P&L projet */
function projectPnlCalculator(ctx: Ctx): Result {
  const revenue = num(ctx, "project_revenue");
  const directCosts = num(ctx, "direct_costs");
  const hours = num(ctx, "hours_spent");
  const hourlyC = num(ctx, "hourly_cost");
  const overheadPct = num(ctx, "overhead_allocation_pct", 25);

  const rhCost = hours * hourlyC;
  const indirectCosts = Math.round(rhCost * overheadPct / 100);
  const totalCost = directCosts + rhCost + indirectCosts;
  const grossMargin = revenue - totalCost;
  const marginPctVal = pct(grossMargin, revenue);

  return {
    revenue, directCosts, rhCost, indirectCosts, totalCost,
    grossMargin, marginPct: marginPctVal,
    verdict: verdict(marginPctVal),
    summary: `Revenus: ${revenue} | Coûts: ${totalCost} | Marge: ${grossMargin} XAF (${marginPctVal}%) — ${verdict(marginPctVal)}`,
  };
}

/** PROFITABILITY: Rentabilité client */
function clientProfitabilityAnalyzer(ctx: Ctx): Result {
  const totalRevenue = num(ctx, "total_revenue");
  const totalHours = num(ctx, "total_hours");
  const totalCosts = num(ctx, "total_costs");
  const durationMonths = num(ctx, "contract_duration_months", 1);

  const cumulativeMargin = totalRevenue - totalCosts;
  const marginPctVal = pct(cumulativeMargin, totalRevenue);
  const monthlyRevenue = Math.round(totalRevenue / durationMonths);
  const effectiveHourlyRate = totalHours > 0 ? Math.round(totalRevenue / totalHours) : 0;
  const costPerHour = totalHours > 0 ? Math.round(totalCosts / totalHours) : 0;

  return {
    totalRevenue, totalCosts, totalHours, durationMonths,
    cumulativeMargin, marginPct: marginPctVal,
    monthlyRevenue, effectiveHourlyRate, costPerHour,
    verdict: verdict(marginPctVal),
    summary: `Marge: ${cumulativeMargin} XAF (${marginPctVal}%) | Rev/mois: ${monthlyRevenue} XAF | Taux effectif: ${effectiveHourlyRate} XAF/h — ${verdict(marginPctVal)}`,
  };
}

/** PROFITABILITY: Taux d'utilisation */
function utilizationRateTracker(ctx: Ctx): Result {
  const available = num(ctx, "available_hours");
  const billable = num(ctx, "billable_hours");
  const nonBillable = num(ctx, "non_billable_hours");

  const utilization = pct(billable, available);
  const occupation = pct(billable + nonBillable, available);
  const lostHours = Math.max(0, available - billable - nonBillable);
  const lostPct = pct(lostHours, available);
  const alert = utilization < 50 ? "CRITIQUE" : utilization < 70 ? "SOUS-UTILISÉ" : utilization > 90 ? "SURCHARGE" : "OPTIMAL";

  return {
    available, billable, nonBillable, lostHours,
    utilization, occupation, lostPct,
    alert,
    targets: { utilization: "70-85%", occupation: ">85%" },
    summary: `Utilisation: ${utilization}% | Occupation: ${occupation}% | Perdu: ${lostHours}h (${lostPct}%) — ${alert}`,
  };
}

// ─── Export map (slug → function) ────────────────────────────────────────────

// ─── Financial Brain Wrappers (CALC) ────────────────────────────────────────

function budgetRecommenderCalc(ctx: Ctx): Result {
  const fb = require("@/server/services/financial-brain") as typeof import("@/server/services/financial-brain");
  const reco = fb.recommendBudget({
    sector: String(ctx.sector ?? "SERVICES"),
    country: String(ctx.country ?? "Cameroun"),
    positioning: String(ctx.positioning ?? "MAINSTREAM"),
    businessModel: String(ctx.business_model ?? "B2C"),
    estimatedRevenue: num(ctx, "revenue", 0) || undefined,
    revenueTarget: num(ctx, "revenue_target", 0) || undefined,
    targetCustomers: num(ctx, "target_customers", 0) || undefined,
    targetCac: num(ctx, "target_cac", 0) || undefined,
    somTarget: num(ctx, "som_target", 0) || undefined,
    growthAmbition: num(ctx, "growth_ambition", 0.5),
  });
  return {
    recommended: reco.recommended,
    range_min: reco.range.min,
    range_max: reco.range.max,
    confidence: reco.confidence,
    currency: reco.currency,
    always_on_pct: reco.campaignMix.alwaysOnPct,
    punctual_pct: reco.campaignMix.punctualPct,
    contingency_pct: reco.campaignMix.contingencyPct,
    summary: `Budget recommande: ${reco.recommended.toLocaleString()} ${reco.currency} (${(reco.confidence * 100).toFixed(0)}% confiance) — Range: ${reco.range.min.toLocaleString()} - ${reco.range.max.toLocaleString()}`,
  };
}

function financialValidatorCalc(ctx: Ctx): Result {
  const fb = require("@/server/services/financial-brain") as typeof import("@/server/services/financial-brain");
  const report = fb.validateFinancials({
    actorType: "ADVERTISER",
    sector: String(ctx.sector ?? ""),
    country: String(ctx.country ?? ""),
    cac: num(ctx, "cac", 0) || undefined,
    ltv: num(ctx, "ltv", 0) || undefined,
    ltvCacRatio: num(ctx, "ltv_cac_ratio", 0) || undefined,
    budgetCom: num(ctx, "budget_com", 0) || undefined,
    caVise: num(ctx, "ca_vise", 0) || undefined,
    margeNette: num(ctx, "marge_nette", 0) || undefined,
    productPrice: num(ctx, "product_price", 0) || undefined,
  });
  return {
    overall: report.overall,
    score: report.score,
    blockers_count: report.blockers.length,
    warnings_count: report.warnings.length,
    advisories_count: report.advisories.length,
    blockers: report.blockers.map(b => `${b.ruleId}: ${b.message}`).join("; "),
    warnings: report.warnings.map(w => `${w.ruleId}: ${w.message}`).join("; "),
    summary: `${report.overall} (score ${report.score}/100) — ${report.blockers.length} blockers, ${report.warnings.length} warnings`,
  };
}

function multiYearProjectorCalc(ctx: Ctx): Result {
  const fb = require("@/server/services/financial-brain") as typeof import("@/server/services/financial-brain");
  const proj = fb.projectMultiYear({
    year1Budget: num(ctx, "year1_budget", 5_000_000),
    year1Revenue: num(ctx, "year1_revenue", 50_000_000),
    sector: String(ctx.sector ?? "SERVICES"),
    country: String(ctx.country ?? "Cameroun"),
    positioning: String(ctx.positioning ?? "MAINSTREAM"),
    companyStage: (String(ctx.company_stage ?? "GROWTH")) as "STARTUP" | "GROWTH" | "MATURITY" | "DECLINE",
    growthAmbition: num(ctx, "growth_ambition", 0.5),
    cac: num(ctx, "cac", 0) || undefined,
    ltv: num(ctx, "ltv", 0) || undefined,
  });
  const y1 = proj.years[0]!, y2 = proj.years[1]!, y3 = proj.years[2]!;
  return {
    y1_revenue: y1.revenue, y1_budget: y1.budget, y1_roas: y1.roas,
    y2_revenue: y2.revenue, y2_budget: y2.budget, y2_roas: y2.roas,
    y3_revenue: y3.revenue, y3_budget: y3.budget, y3_roas: y3.roas,
    cumulative_roi: proj.cumulativeRoi,
    break_even_year: proj.breakEvenYear,
    summary: `3-year: Revenue ${y1.revenue.toLocaleString()} → ${y3.revenue.toLocaleString()} | ROI cumule: ${(proj.cumulativeRoi * 100).toFixed(0)}%`,
  };
}

function breakEvenCalc(ctx: Ctx): Result {
  const fb = require("@/server/services/financial-brain") as typeof import("@/server/services/financial-brain");
  const be = fb.calculateBreakeven({
    fixedCosts: num(ctx, "fixed_costs", 0),
    variableCostPerUnit: num(ctx, "variable_cost_per_unit", 0),
    pricePerUnit: num(ctx, "price_per_unit", 0),
    monthlyVolume: num(ctx, "monthly_volume", 0) || undefined,
  });
  return {
    break_even_units: be.breakEvenUnits,
    break_even_revenue: be.breakEvenRevenue,
    break_even_months: be.breakEvenMonths,
    contribution_margin: be.contributionMargin,
    margin_of_safety: be.marginOfSafety,
    summary: `Point mort: ${be.breakEvenUnits} unites (${be.breakEvenRevenue.toLocaleString()} FCFA)${be.breakEvenMonths ? ` soit ~${be.breakEvenMonths} mois` : ""}`,
  };
}

function budgetElasticityCalc(ctx: Ctx): Result {
  const fb = require("@/server/services/financial-brain") as typeof import("@/server/services/financial-brain");
  const channels = ctx.channels ? String(ctx.channels).split(",").map(c => c.trim()) : ["INSTAGRAM", "FACEBOOK"];
  const el = fb.elasticityAnalysis({
    currentBudget: num(ctx, "current_budget", 5_000_000),
    sector: String(ctx.sector ?? "SERVICES"),
    country: String(ctx.country ?? "Cameroun"),
    channels,
    currentRoas: num(ctx, "current_roas", 0) || undefined,
  });
  return {
    optimal_budget: el.optimalBudget,
    diminishing_threshold: el.diminishingReturnsThreshold,
    current_efficiency: el.currentEfficiency,
    points_count: el.points.length,
    summary: `Budget optimal: ${el.optimalBudget.toLocaleString()} | Efficacite actuelle: ${(el.currentEfficiency * 100).toFixed(0)}%`,
  };
}

function scenarioModelerCalc(ctx: Ctx): Result {
  const fb = require("@/server/services/financial-brain") as typeof import("@/server/services/financial-brain");
  const analysis = fb.scenarioModel({
    year1Budget: num(ctx, "year1_budget", 5_000_000),
    year1Revenue: num(ctx, "year1_revenue", 50_000_000),
    sector: String(ctx.sector ?? "SERVICES"),
    country: String(ctx.country ?? "Cameroun"),
    positioning: String(ctx.positioning ?? "MAINSTREAM"),
    companyStage: (String(ctx.company_stage ?? "GROWTH")) as "STARTUP" | "GROWTH" | "MATURITY" | "DECLINE",
    growthAmbition: num(ctx, "growth_ambition", 0.5),
  });
  const opt = analysis.scenarios[0]!, real = analysis.scenarios[1]!, pess = analysis.scenarios[2]!;
  return {
    optimistic_revenue: opt.projection.cumulativeRevenue,
    realistic_revenue: real.projection.cumulativeRevenue,
    pessimistic_revenue: pess.projection.cumulativeRevenue,
    weighted_expected_value: analysis.weightedExpectedValue,
    risk_adjusted_budget: analysis.riskAdjustedBudget,
    top_sensitivity: analysis.sensitivityRanking[0]?.parameter ?? "N/A",
    summary: `Valeur esperee: ${analysis.weightedExpectedValue.toLocaleString()} | Realiste: ${real.projection.cumulativeRevenue.toLocaleString()} | Sensibilite #1: ${analysis.sensitivityRanking[0]?.parameter ?? "N/A"}`,
  };
}

// ─── Export map (slug → function) ────────────────────────────────────────────

export const calculators: Record<string, (ctx: Ctx) => Result> = {
  "roi-calculator": roiCalculator,
  "hourly-rate-calculator": hourlyRateCalculator,
  "codb-calculator": codbCalculator,
  "service-margin-analyzer": serviceMarginAnalyzer,
  "campaign-cost-estimator": campaignCostEstimator,
  "budget-tracker": budgetTracker,
  "project-pnl-calculator": projectPnlCalculator,
  "client-profitability-analyzer": clientProfitabilityAnalyzer,
  "utilization-rate-tracker": utilizationRateTracker,
  // Financial Brain calculators
  "budget-recommender": budgetRecommenderCalc,
  "financial-validator": financialValidatorCalc,
  "multi-year-projector": multiYearProjectorCalc,
  "break-even-calculator": breakEvenCalc,
  "budget-elasticity": budgetElasticityCalc,
  "scenario-modeler": scenarioModelerCalc,
};
