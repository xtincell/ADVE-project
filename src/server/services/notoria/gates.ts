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
import * as auditTrail from "@/server/services/audit-trail";

// ── Destructive markers (cross-pillar) ────────────────────────────────

/**
 * Field paths whose amendment irreversibly invalidates downstream assets
 * (claims, KV, briefs, Oracle compilation). The `applyPolicy` is forced
 * to "requires_review" and gate emits a destructive=true marker.
 */
const DESTRUCTIVE_FIELDS = new Set<string>([
  "d.personas",
  "v.unitEconomics",
  "v.businessModel.coreEngine",
  "a.noyauIdentitaire",
]);

function isDestructiveField(pillarKey: string, field: string): boolean {
  return DESTRUCTIVE_FIELDS.has(`${pillarKey.toLowerCase()}.${field}`);
}

// ── Financial field patterns ──────────────────────────────────────

// Note: `budgetEstime` (i.activationsPossibles[].budgetEstime) is an enum
// LOW/MEDIUM/HIGH, not a numeric currency — financial validation is moot.
// Generic `budget` was polysemic (matched any *.budget field across pillars).
// Both removed; numeric financial fields are caught via FINANCIAL_PILLAR_PREFIXES
// (v.unitEconomics.*, v.prix, v.cout) plus the explicit list below.
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

// ── ADR-0023 — PILLAR_COHERENCE gate (OPERATOR_AMEND_PILLAR) ─────────

export interface PillarCoherenceInput {
  strategyId: string;
  pillarKey: string;
  field: string;
  mode: "PATCH_DIRECT" | "LLM_REPHRASE" | "STRATEGIC_REWRITE";
  proposedValue: unknown;
  currentStatus: "DRAFT" | "AI_PROPOSED" | "VALIDATED" | "LOCKED";
  overrideLocked: boolean;
}

export interface PillarCoherenceResult {
  blocked: boolean;
  reason?: string;
  destructive?: boolean;
  warnings: string[];
}

/**
 * PILLAR_COHERENCE — gate dédié à OPERATOR_AMEND_PILLAR.
 *
 * Order:
 *   1. LOCKED check — refuse unless overrideLocked + audit log.
 *   2. Destructive amplifier — forces requires_review for STRATEGIC_REWRITE.
 *   3. Cross-ADVE warning (non-blocking).
 *   4. Financial reuse — delegate to validateFinancialReco.
 *
 * The cost gate (Thot pre-flight) lives in the handler, not here, so the
 * gate stays cheap (no LLM, minimal IO).
 */
export async function applyPillarCoherenceGate(
  input: PillarCoherenceInput,
): Promise<PillarCoherenceResult> {
  const warnings: string[] = [];

  // ── 1. LOCKED ──
  if (input.currentStatus === "LOCKED" && !input.overrideLocked) {
    return {
      blocked: true,
      reason: "LOCKED_NO_OVERRIDE",
      warnings,
    };
  }
  if (input.currentStatus === "LOCKED" && input.overrideLocked) {
    try {
      await auditTrail.log({
        action: "APPROVE",
        entityType: "Pillar",
        entityId: `${input.strategyId}:${input.pillarKey}`,
        newValue: {
          gate: "PILLAR_LOCKED_OVERRIDE",
          field: input.field,
          mode: input.mode,
        },
      });
    } catch {
      /* best-effort */
    }
    warnings.push("LOCKED override appliqué — audit trail enregistré.");
  }

  // ── 2. Destructive ──
  const destructive = isDestructiveField(input.pillarKey, input.field);
  if (destructive && input.mode !== "STRATEGIC_REWRITE") {
    return {
      blocked: true,
      reason: "DESTRUCTIVE_REQUIRES_STRATEGIC_REWRITE",
      destructive: true,
      warnings,
    };
  }

  // ── 3. Cross-ADVE warning (non-blocking) ──
  // Authoring d.personas warns about e.superfanPortrait dependency etc.
  // The exhaustive map lives in variable-bible.feedsInto — we surface a
  // generic warning here; the modal prefetches feedsInto[] for detail.
  if (input.field === "personas" && input.pillarKey.toLowerCase() === "d") {
    warnings.push("CROSS_ADVE_DEP: e.superfanPortrait dépend de d.personas.");
  }

  // ── 4. Financial reuse ──
  if (isFinancialField(input.pillarKey, input.field)) {
    const fin = await validateFinancialReco(
      input.pillarKey,
      input.field,
      input.proposedValue,
      input.strategyId,
    );
    if (!fin.allowed) {
      return {
        blocked: true,
        reason: "FINANCIAL_BLOCKED",
        destructive,
        warnings: [...warnings, ...fin.warnings],
      };
    }
    warnings.push(...fin.warnings);
  }

  return { blocked: false, destructive, warnings };
}

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
