/**
 * NOTORIA Quality Gates — GOVERNANCE-NETERU implementation
 *
 * Applies confidence gating, destructive-change blocking,
 * and financial validation (Thot / Artemis) to recommendations.
 */

import { validateFinancials } from "@/server/services/financial-brain/validate-financials";
import type { ValidationContext } from "@/server/services/financial-brain/types";
import type { ApplyPolicy, QualityGateResult, RawLLMReco } from "./types";
import { db } from "@/lib/db";

// ── Financial field patterns ──────────────────────────────────────

const FINANCIAL_FIELDS = new Set([
  "unitEconomics",
  "budgetCom",
  "caVise",
  "margeNette",
  "roiEstime",
  "paybackPeriod",
  "prix",
  "cout",
  "pricingJustification",
  "budgetEstime",
  "budget",
]);

const FINANCIAL_PILLAR_PREFIXES = ["v.unitEconomics", "v.prix", "v.cout"];

function isFinancialField(pillarKey: string, field: string): boolean {
  if (FINANCIAL_FIELDS.has(field)) return true;
  return FINANCIAL_PILLAR_PREFIXES.some((p) =>
    `${pillarKey}.${field}`.startsWith(p),
  );
}

// ── Confidence Gates ──────────────────────────────────────────────

function computeApplyPolicy(
  confidence: number,
  destructive: boolean,
): ApplyPolicy {
  if (destructive) return "requires_review";
  if (confidence >= 0.7) return "auto";
  if (confidence >= 0.5) return "suggest";
  return "requires_review";
}

// ── Main Gate Function ────────────────────────────────────────────

export function applyQualityGates(
  reco: RawLLMReco,
  pillarKey: string,
): QualityGateResult {
  const confidence = reco.confidence ?? 0.6;
  const destructive =
    reco.operation === "SET" &&
    (pillarKey === "d" && reco.field === "personas" ? true : false);

  const applyPolicy = computeApplyPolicy(confidence, destructive);

  return {
    applyPolicy,
    blocked: false,
    financialWarnings: [],
  };
}

// ── Financial Gate (async — calls Thot) ───────────────────────────

export async function validateFinancialReco(
  pillarKey: string,
  field: string,
  proposedValue: unknown,
  strategyId: string,
): Promise<{ allowed: boolean; warnings: string[] }> {
  if (!isFinancialField(pillarKey, field)) {
    return { allowed: true, warnings: [] };
  }

  // Load strategy context for financial validation
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { businessContext: true },
  });

  const bctx = (strategy?.businessContext as Record<string, unknown>) ?? {};

  const ctx: Partial<ValidationContext> = {
    actorType: "ADVERTISER",
    sector: (bctx.sector as string) ?? undefined,
    country: (bctx.country as string) ?? undefined,
    positioning: (bctx.positioning as string) ?? undefined,
    businessModel: (bctx.businessModel as string) ?? undefined,
  };

  // Merge proposed value into context if it's a financial object
  if (typeof proposedValue === "object" && proposedValue !== null) {
    const pv = proposedValue as Record<string, unknown>;
    if (pv.cac != null) (ctx as Record<string, unknown>).cac = Number(pv.cac);
    if (pv.ltv != null) (ctx as Record<string, unknown>).ltv = Number(pv.ltv);
    if (pv.budgetCom != null)
      (ctx as Record<string, unknown>).budgetCom = Number(pv.budgetCom);
    if (pv.caVise != null)
      (ctx as Record<string, unknown>).caVise = Number(pv.caVise);
  }

  const report = validateFinancials(ctx as ValidationContext);
  const warnings = [
    ...report.blockers.map((r) => `BLOCK: ${r.message}`),
    ...report.warnings.map((r) => `WARN: ${r.message}`),
  ];

  return {
    allowed: report.blockers.length === 0,
    warnings,
  };
}
