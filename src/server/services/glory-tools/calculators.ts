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
};
