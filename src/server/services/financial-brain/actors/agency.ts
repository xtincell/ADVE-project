/**
 * Agency Engine — Financial analysis for agencies
 */

import type { AgencyInput, AgencyOutput } from "../types";
import { validateFinancials } from "../validate-financials";
import { calculateFee } from "../fee-structures";

const PRODUCTIVE_HOURS_PER_YEAR = 1760;

export function analyzeAgency(input: AgencyInput): AgencyOutput {
  // Cost structure
  const totalSalaries = input.avgSalary * 12 * input.headcount;
  const totalOverhead = totalSalaries * input.overheadRate;
  const totalCost = totalSalaries + totalOverhead;
  const capacityHours = Math.round(input.headcount * PRODUCTIVE_HOURS_PER_YEAR * input.targetUtilization);
  const costPerHour = capacityHours > 0 ? Math.round(totalCost / capacityHours) : 0;
  const breakeven = input.targetUtilization > 0
    ? Math.round(totalCost / input.targetUtilization)
    : totalCost;

  // Revenue by client
  let totalRevenue = 0;
  let totalAllocatedHours = 0;
  const byFeeModel: Record<string, number> = {};
  const clientProfitability: AgencyOutput["profitability"]["byClient"] = [];

  for (const client of input.clients) {
    const fee = calculateFee({
      model: client.feeModel,
      mediaBudget: client.mediaBudget,
      monthlyRetainer: client.annualFee / 12,
      durationMonths: 12,
      commissionRate: 0.10,
    });

    const revenue = client.annualFee;
    totalRevenue += revenue;
    byFeeModel[client.feeModel] = (byFeeModel[client.feeModel] ?? 0) + revenue;
    totalAllocatedHours += client.hoursAllocated;

    const clientCost = client.hoursAllocated * costPerHour;
    const margin = revenue - clientCost;
    const marginPct = revenue > 0 ? Math.round((margin / revenue) * 100) / 100 : 0;
    const verdict = marginPct > 0.30 ? "TRES RENTABLE"
      : marginPct > 0.15 ? "RENTABLE"
      : marginPct > 0 ? "MARGINAL"
      : "DEFICITAIRE";

    clientProfitability.push({
      name: client.name,
      fee: revenue,
      cost: clientCost,
      margin,
      marginPct,
      verdict,
    });
  }

  const perHead = input.headcount > 0 ? Math.round(totalRevenue / input.headcount) : 0;
  const utilizationRate = capacityHours > 0 ? Math.round((totalAllocatedHours / capacityHours) * 100) / 100 : 0;
  const grossMargin = totalRevenue - totalCost;
  const grossMarginPct = totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 100) / 100 : 0;

  // Validation
  const validation = validateFinancials({
    actorType: "AGENCY",
    country: input.country,
    utilization: utilizationRate,
    revenuePerHead: perHead,
    margeNette: grossMarginPct,
  });

  return {
    costStructure: { totalSalaries, totalOverhead, totalCost, capacityHours, costPerHour, breakeven },
    revenue: { total: totalRevenue, byFeeModel: byFeeModel as Record<any, number>, perHead },
    profitability: { grossMargin, grossMarginPct, byClient: clientProfitability },
    capacity: {
      totalHours: Math.round(input.headcount * PRODUCTIVE_HOURS_PER_YEAR),
      allocatedHours: totalAllocatedHours,
      utilizationRate,
      availableForNewBusiness: Math.max(0, capacityHours - totalAllocatedHours),
    },
    validation,
  };
}
