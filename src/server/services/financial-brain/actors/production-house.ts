/**
 * Production House Engine — Project estimation and margin analysis
 */

import type { Deliverable, ProjectEstimate, QualityTier } from "../types";
import { getBatchCost, getCountryAdjustedCost } from "../benchmarks/production-costs";
import { lookupCountry } from "@/server/services/country-registry";

// VAT rates remain hardcoded — these are tax-policy constants, not market
// data. They belong with the tax module long-term but the OS does not yet
// have one (tracked under the future tax-engine service).
const TVA_RATES: Record<string, number> = {
  Cameroun: 0.1925, France: 0.20, "Cote d'Ivoire": 0.18, Senegal: 0.18,
  Nigeria: 0.075, Ghana: 0.125, RDC: 0.16, Gabon: 0.18, Congo: 0.185,
  USA: 0.0, Maroc: 0.20, Tunisie: 0.19,
  Wakanda: 0.10, // simulation
};

const COMPLEXITY_MULT: Record<string, number> = { SIMPLE: 0.75, STANDARD: 1.0, COMPLEX: 1.5 };

export async function estimateProduction(
  deliverables: Deliverable[],
  qualityTier: QualityTier = "STANDARD",
  country: string = "Cameroun",
  markupPct: number = 0.25,
): Promise<ProjectEstimate> {
  const c = await lookupCountry(country);
  if (!c) {
    throw new Error(
      `production-house: unknown country '${country}'. Add it to prisma/seed-countries.ts.`,
    );
  }
  const ppp = c.purchasingPowerIndex / 100;
  const tvaRate = TVA_RATES[country] ?? 0.1925;

  let totalProduction = 0;
  const lineItems: Array<{ label: string; amount: number; category: string }> = [];

  for (const d of deliverables) {
    const batch = getBatchCost(d.type, d.quantity, qualityTier, d.complexity);
    const adjustedCost = Math.round(batch.totalCost * ppp);
    totalProduction += adjustedCost;
    lineItems.push({
      label: `${d.quantity}x ${d.type} (${qualityTier}/${d.complexity})`,
      amount: adjustedCost,
      category: "PRODUCTION",
    });
  }

  // Standard split: 20% pre-prod, 50% production, 30% post-prod
  const preProduction = Math.round(totalProduction * 0.20);
  const production = Math.round(totalProduction * 0.50);
  const postProduction = Math.round(totalProduction * 0.30);

  // Talent + logistics (estimated at 15% of production cost)
  const talent = Math.round(totalProduction * 0.10);
  const logistics = Math.round(totalProduction * 0.05);

  // Markup
  const subtotal = totalProduction + talent + logistics;
  const markup = Math.round(subtotal * markupPct);
  const totalHT = subtotal + markup;
  const tva = Math.round(totalHT * tvaRate);
  const totalTTC = totalHT + tva;

  return {
    preProduction,
    production,
    postProduction,
    talent,
    logistics,
    markup,
    totalHT,
    tva,
    totalTTC,
    lineItems,
  };
}
