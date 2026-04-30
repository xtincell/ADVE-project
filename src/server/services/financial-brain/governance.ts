/**
 * THOT GOVERNANCE — Registry of all services governed by Thot (Financial Brain)
 *
 * Thot owns: financial validation, commissions, reconciliation,
 * budget recommendations, and payment processing.
 *
 * Thot est le 4ème Neter actif du panthéon (Sustainment + Operations,
 * Mission Tier + Ground Tier — cf. PANTHEON.md §2.4 + APOGEE.md §4).
 */

// ── Core (already in financial-brain/) ────────────────────────────

export { validateFinancials } from "./validate-financials";
export { recommendBudget } from "./recommend-budget";
export { projectMultiYear } from "./project-multi-year";
export { elasticityAnalysis } from "./elasticity";
export { scenarioModel } from "./scenario-model";
export { calculateBreakeven } from "./break-even";

// ── Governed Services (external to financial-brain/) ──────────────

export async function loadCommissionEngine() {
  return import("@/server/services/commission-engine");
}
export async function loadFinancialReconciliation() {
  return import("@/server/services/financial-reconciliation");
}
export async function loadMobileMoney() {
  return import("@/server/services/mobile-money");
}
export async function loadFinancialEngine() {
  return import("@/server/services/financial-engine");
}

// ── Governance Manifest ───────────────────────────────────────────

export const THOT_GOVERNED_SERVICES = [
  "financial-brain",
  "financial-engine",
  "commission-engine",
  "financial-reconciliation",
  "mobile-money",
] as const;

export type ThotService = (typeof THOT_GOVERNED_SERVICES)[number];
