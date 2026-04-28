/**
 * ARTEMIS — I-Pillar Action Extractor (post-processor)
 *
 * After Notoria runs `I_GENERATION`, the recommendations exist in
 * `Recommendation` rows targeting pillar `i` with free-form `proposedValue`
 * payloads. This post-processor distills those recos into structured
 * `BrandAction` rows so they can be filtered, sorted, and selected for
 * S synthesis without re-prompting the LLM.
 *
 * Governance:
 *   - Notoria stays the GENERATOR (LLM tool) — unchanged
 *   - Artemis owns POST-PROCESSING — heuristic structure extraction
 *   - Operator override: existing `Pillar.i` content remains the source
 *     of truth; BrandAction rows are an additional structured view
 *
 * Heuristics (all best-effort, defaults when uncertain):
 *   - Touchpoint inferred from sectionGroup ("catalogueParCanal.DIGITAL" → DIGITAL)
 *     or from keyword scan of the proposed action text
 *   - AARRR intent inferred from keywords (acquérir/lead → ACQUISITION, etc.)
 *   - Title/description extracted from the proposedValue payload
 *   - Other fields (persona, SKU, budget, locality, timing) left null —
 *     filled later by the operator or a more specialized prompt
 */

import { db } from "@/lib/db";

// ── Heuristic dictionaries ───────────────────────────────────────────

const TOUCHPOINT_KEYWORDS: Record<string, string> = {
  DIGITAL: "DIGITAL",
  WEB: "DIGITAL",
  WEBSITE: "DIGITAL",
  SOCIAL: "DIGITAL",
  EMAIL: "DIGITAL",
  SEO: "DIGITAL",
  SEA: "DIGITAL",
  ADS: "DIGITAL",
  ATL: "ATL",
  TV: "ATL",
  RADIO: "ATL",
  PRESSE: "ATL",
  PRINT: "ATL",
  BTL: "BTL",
  EVENT: "BTL",
  EVENEMENT: "BTL",
  SAMPLING: "BTL",
  ACTIVATION: "BTL",
  POS: "BTL",
  TTL: "TTL",
  OWNED: "OWNED",
  EARNED: "EARNED",
  PR: "EARNED",
  INFLUENCER: "EARNED",
  RP: "EARNED",
};

const AARRR_KEYWORDS: Record<string, string> = {
  ACQUERIR: "ACQUISITION",
  ACQUISITION: "ACQUISITION",
  LEAD: "ACQUISITION",
  PROSPECT: "ACQUISITION",
  AWARENESS: "ACQUISITION",
  NOTORIETE: "ACQUISITION",
  ACTIVER: "ACTIVATION",
  ACTIVATION: "ACTIVATION",
  CONVERSION: "ACTIVATION",
  ONBOARDING: "ACTIVATION",
  RETENIR: "RETENTION",
  RETENTION: "RETENTION",
  FIDELISER: "RETENTION",
  FIDELITE: "RETENTION",
  CHURN: "RETENTION",
  RECOMMANDATION: "REFERRAL",
  REFERRAL: "REFERRAL",
  PARRAINAGE: "REFERRAL",
  AMBASSADEUR: "REFERRAL",
  REVENU: "REVENUE",
  REVENUE: "REVENUE",
  VENTE: "REVENUE",
  UPSELL: "REVENUE",
  CROSSSELL: "REVENUE",
};

function inferTouchpoint(sectionGroup: string | null, text: string): string | null {
  // sectionGroup like "catalogueParCanal.DIGITAL" → DIGITAL
  if (sectionGroup) {
    const parts = sectionGroup.toUpperCase().split(/[.\s]/);
    for (const part of parts) {
      if (TOUCHPOINT_KEYWORDS[part]) return TOUCHPOINT_KEYWORDS[part]!;
    }
  }
  const upper = text.toUpperCase();
  for (const [kw, tp] of Object.entries(TOUCHPOINT_KEYWORDS)) {
    if (upper.includes(kw)) return tp;
  }
  return null;
}

function inferAarrr(text: string): string | null {
  const upper = text.toUpperCase();
  for (const [kw, intent] of Object.entries(AARRR_KEYWORDS)) {
    if (upper.includes(kw)) return intent;
  }
  return null;
}

function inferUrgencyToPriority(urgency: string | null): string {
  switch (urgency) {
    case "NOW":
      return "P0";
    case "SOON":
      return "P1";
    case "LATER":
      return "P2";
    default:
      return "P2";
  }
}

function extractTitleAndDescription(value: unknown, fallbackField: string): { title: string; description: string | null } {
  if (typeof value === "string") {
    return { title: value.slice(0, 120), description: value.length > 120 ? value : null };
  }
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    const title =
      (typeof v.title === "string" && v.title) ||
      (typeof v.name === "string" && v.name) ||
      (typeof v.action === "string" && v.action) ||
      fallbackField;
    const description =
      (typeof v.description === "string" && v.description) ||
      (typeof v.detail === "string" && v.detail) ||
      (typeof v.rationale === "string" && v.rationale) ||
      null;
    return { title: String(title).slice(0, 120), description };
  }
  return { title: fallbackField, description: null };
}

function extractBudget(value: unknown): { budgetMin: number | null; budgetMax: number | null } {
  if (!value || typeof value !== "object") return { budgetMin: null, budgetMax: null };
  const v = value as Record<string, unknown>;
  const budget = v.budget ?? v.cost ?? v.investment;
  if (typeof budget === "number") return { budgetMin: budget, budgetMax: budget };
  if (budget && typeof budget === "object") {
    const b = budget as Record<string, unknown>;
    const min = typeof b.min === "number" ? b.min : null;
    const max = typeof b.max === "number" ? b.max : null;
    return { budgetMin: min, budgetMax: max };
  }
  return { budgetMin: null, budgetMax: null };
}

// ── Main entry point ─────────────────────────────────────────────────

export interface ExtractResult {
  strategyId: string;
  recosScanned: number;
  actionsCreated: number;
  actionsSkipped: number;
}

/**
 * Scan I_GENERATION recos for the strategy and create BrandAction rows.
 * Idempotent: if a BrandAction with the same recoId exists, it's skipped.
 */
export async function extractBrandActionsFromRecos(
  strategyId: string,
  options: { batchId?: string; limit?: number } = {},
): Promise<ExtractResult> {
  const limit = options.limit ?? 100;
  const recos = await db.recommendation.findMany({
    where: {
      strategyId,
      missionType: "I_GENERATION",
      targetPillarKey: "i",
      ...(options.batchId ? { batchId: options.batchId } : {}),
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      targetField: true,
      proposedValue: true,
      explain: true,
      impact: true,
      urgency: true,
      sectionGroup: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const r of recos) {
    // Idempotency: skip if a BrandAction already references this reco
    const existing = await db.brandAction.findFirst({
      where: { recoId: r.id },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const { title, description } = extractTitleAndDescription(r.proposedValue, r.targetField);
    const inferredTouchpoint = inferTouchpoint(r.sectionGroup, `${title} ${description ?? ""} ${r.explain}`);
    const inferredAarrr = inferAarrr(`${title} ${description ?? ""} ${r.explain}`);
    const { budgetMin, budgetMax } = extractBudget(r.proposedValue);

    try {
      await db.brandAction.create({
        data: {
          strategyId,
          title,
          description,
          touchpoint: inferredTouchpoint,
          aarrrIntent: inferredAarrr,
          persona: null,
          sku: null,
          budgetMin,
          budgetMax,
          budgetCurrency: "XAF",
          opportunity: null,
          locality: null,
          timingStart: null,
          timingEnd: null,
          priority: inferUrgencyToPriority(r.urgency),
          selected: false,
          source: "NOTORIA_GENERATED",
          recoId: r.id,
          metadata: {
            sourceField: r.targetField,
            sourceImpact: r.impact,
            sourceSectionGroup: r.sectionGroup,
          } as never,
          status: "PROPOSED",
        },
      });
      created++;
    } catch (err) {
      skipped++;
      console.warn(
        `[i-action-extractor] failed to create BrandAction from reco ${r.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    strategyId,
    recosScanned: recos.length,
    actionsCreated: created,
    actionsSkipped: skipped,
  };
}
