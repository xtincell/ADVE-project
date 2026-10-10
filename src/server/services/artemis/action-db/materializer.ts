/**
 * ARTEMIS — BrandAction materializer (ADR-0094).
 *
 * Turns the heterogeneous I-pillar action collections (catalogueParCanal,
 * actionsByDevotionLevel, actionsByOvertonPhase) into ONE homogeneous, queryable
 * `BrandAction` table — the canonical read projection consumed by the cockpit
 * I-pillar surface and the Oracle action sections.
 *
 * Governance / SSOT:
 *   - The blob (Pillar.content "i") stays the authoring + cascade substrate
 *     (ADR-0088). This is a deterministic projection of it — never an inverse SSOT.
 *   - Idempotent: upsert keyed by (strategyId, sourceInitiativeId). Re-running
 *     reconciles. Rows the operator created by hand (source !== "MATERIALIZED")
 *     are NEVER touched or deleted.
 *   - 100% deterministic (zero LLM) — reuses the pure `collectNormalizedInitiatives`
 *     normalizer (ADR-0088) + the pure cost-template resolver (ADR-0093/0094).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { collectNormalizedInitiatives, type NormalizedInitiative } from "@/lib/types/pillar-schemas";
import { resolveActionTemplateKey } from "@/server/services/financial-brain/action-costing/resolve-template";

const MATERIALIZED_SOURCE = "MATERIALIZED" as const;

/** I-pillar channel / context → BrandAction touchpoint family. */
const TOUCHPOINT_BY_CHANNEL: Record<string, string> = {
  DIGITAL: "DIGITAL",
  SOCIAL: "DIGITAL",
  WEB: "DIGITAL",
  WEBSITE: "DIGITAL",
  APP: "OWNED",
  EMAIL: "OWNED",
  B2B: "DIGITAL",
  MEDIA_TRADITIONNEL: "ATL",
  MEDIA: "ATL",
  EVENEMENTIEL: "BTL",
  EVENT: "BTL",
  RETAIL_DISTRIBUTION: "BTL",
  RETAIL: "BTL",
  PRODUCTION: "BTL",
  PR_INFLUENCE: "EARNED",
  PR: "EARNED",
  INFLUENCE: "EARNED",
};

const AARRR_KEYWORDS: Array<[RegExp, string]> = [
  [/acqui|notori|awareness|decouv|découv|reach|lead|prospect|viral/i, "ACQUISITION"],
  [/activ|conversion|onboarding|inscription|telecharg|télécharg|essai/i, "ACTIVATION"],
  [/reten|fidel|fidél|habitude|rituel|engage|recurren|récurren/i, "RETENTION"],
  [/recommand|parrain|ambassad|referral|bouche|partage/i, "REFERRAL"],
  [/revenu|vente|premium|upsell|monetis|monétis|abonnement|paiement|achat/i, "REVENUE"],
];

/** Channel string → BrandAction touchpoint family. Exported for the proposer. */
export function touchpointForChannel(channel: string | null | undefined): string | null {
  const ch = (channel || "").toUpperCase();
  if (!ch) return null;
  if (TOUCHPOINT_BY_CHANNEL[ch]) return TOUCHPOINT_BY_CHANNEL[ch]!;
  for (const [k, v] of Object.entries(TOUCHPOINT_BY_CHANNEL)) {
    if (ch.includes(k)) return v;
  }
  return null;
}

function mapTouchpoint(init: NormalizedInitiative): string | null {
  return touchpointForChannel(init.channel);
}

function inferAarrr(init: NormalizedInitiative): string | null {
  const hay = `${init.action} ${init.objectif} ${init.format}`;
  for (const [re, intent] of AARRR_KEYWORDS) {
    if (re.test(hay)) return intent;
  }
  return null;
}

/** INITIATIVE status (ADR-0088) → BrandAction (status, selected). */
function mapStatus(init: NormalizedInitiative): { status: string; selected: boolean } {
  switch (init.status) {
    case "SELECTED_FOR_ROADMAP":
      return { status: "ACCEPTED", selected: true };
    case "RECOMMENDED":
      return { status: "PROPOSED", selected: false };
    case "REJECTED":
      return { status: "CANCELLED", selected: false };
    default:
      return { status: "DRAFT", selected: false };
  }
}

function mapPriority(init: NormalizedInitiative): string | null {
  // SELECTED_FOR_ROADMAP + SPRINT_90 = most urgent; long-term = lowest.
  if (init.timeframe === "SPRINT_90") return init.status === "SELECTED_FOR_ROADMAP" ? "P0" : "P1";
  if (init.timeframe === "PHASE_1") return "P1";
  if (init.timeframe === "PHASE_2") return "P2";
  return init.timeframe === "LONG_TERM" ? "P3" : null;
}

export interface MaterializeResult {
  strategyId: string;
  initiatives: number;
  upserted: number;
  deleted: number;
}

/**
 * Materialize the strategy's I-pillar initiatives into BrandAction rows.
 * Idempotent. Operator-authored rows (source !== "MATERIALIZED") are preserved.
 */
export async function syncBrandActionsFromBlob(strategyId: string, transaction?: Prisma.TransactionClient): Promise<MaterializeResult> {
  const perform = async (tx: Prisma.TransactionClient): Promise<MaterializeResult> => {
    // Same strategy-first lock as the pillar writer and action decision handler.
    // A source refresh and a human choice cannot interleave their read/write halves.
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${strategyId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "BrandAction" WHERE "strategyId" = ${strategyId} FOR UPDATE`;
    const [pillar, strategy] = await Promise.all([
      tx.pillar.findUnique({ where: { strategyId_key: { strategyId, key: "i" } }, select: { content: true } }),
      tx.strategy.findUnique({ where: { id: strategyId }, select: { countryCode: true, currencyCode: true } }),
    ]);
    const existing = await tx.brandAction.findMany({ where: { strategyId } });
    const byInitiative = new Map(existing.filter(row => row.sourceInitiativeId).map(row => [row.sourceInitiativeId!, row]));

    const initiatives = collectNormalizedInitiatives(pillar?.content ?? null);
    const zoneCode = strategy?.countryCode ?? null;
    const currency = strategy?.currencyCode ?? "XAF";

    let upserted = 0;
    for (const init of initiatives) {
      const previous = byInitiative.get(init.id);
      // The unique key can also belong to an operator-authored row. Upsert alone
      // would change its source and overwrite it despite the old preservation claim.
      if (previous && previous.source !== MATERIALIZED_SOURCE) continue;
      const previousMetadata = previous?.metadata && typeof previous.metadata === "object" && !Array.isArray(previous.metadata)
        ? previous.metadata as Record<string, unknown> : {};
      const { status, selected } = mapStatus(init);
      const costTemplateKey = resolveActionTemplateKey({
        title: init.action,
        format: init.format,
        channel: init.channel,
        touchpoint: mapTouchpoint(init),
        objectif: init.objectif,
      });
      const metadata = {
        ...previousMetadata,
        channel: init.channel,
        format: init.format || null,
        pilierImpact: init.pilierImpact ?? null,
        devotionImpact: init.devotionImpact ?? null,
        overtonPhase: init.overtonPhase ?? null,
        overtonShift: init.overtonShift ?? null,
        budgetEstime: init.budgetEstime ?? null,
        budgetBasis: init.budgetBasis,
        timeframe: init.timeframe ?? null,
        initiativeStatus: init.status,
        mitigatesRiskIds: init.mitigatesRiskIds,
        targetsPersonaIds: init.targetsPersonaIds,
        materializedFrom: "I_BLOB",
        // Projection baseline, never an authority: lets a later source budget
        // refresh distinguish its own old estimate from an operational override.
        projectedBudget: init.budget ?? null,
        projectedPriority: mapPriority(init),
      } satisfies Record<string, unknown>;

      const data = {
        title: init.action.slice(0, 200) || "(action sans titre)",
        description: init.objectif || null,
        touchpoint: mapTouchpoint(init),
        aarrrIntent: inferAarrr(init),
        budgetMin: init.budget ?? null,
        budgetMax: init.budget ?? null,
        budgetCurrency: currency,
        priority: mapPriority(init),
        selected,
        status,
        source: MATERIALIZED_SOURCE,
        costTemplateKey,
        costZoneCode: zoneCode,
        metadata: metadata as Prisma.InputJsonValue,
      };

      // An empty projection has no operational amount to protect. Fill it
      // from the actual source; preserve a populated override independently.
      const emptyBudget = previous?.budgetMin === null && previous?.budgetMax === null;
      const update = previous ? {
        ...data,
        selected: data.selected,
        status: ["SCHEDULED", "EXECUTED", "CANCELLED"].includes(previous.status) ? previous.status : data.status,
        priority: previous.priority === null || previousMetadata.projectedPriority === previous.priority ? data.priority : previous.priority,
        budgetMin: emptyBudget || previousMetadata.projectedBudget === previous.budgetMin ? data.budgetMin : previous.budgetMin,
        budgetMax: emptyBudget || previousMetadata.projectedBudget === previous.budgetMax ? data.budgetMax : previous.budgetMax,
        budgetCurrency: previous.budgetCurrency,
      } : data;
      await tx.brandAction.upsert({
        where: { strategyId_sourceInitiativeId: { strategyId, sourceInitiativeId: init.id } },
        create: { strategyId, sourceInitiativeId: init.id, ...data },
        update,
      });
      upserted++;
    }

    // Reconcile: drop materialized rows whose source initiative disappeared from the
    // blob. Operator-authored rows (source !== MATERIALIZED) are never touched.
    const currentIds = new Set(initiatives.map(i => i.id));
    const disposable = existing.filter(row => row.source === MATERIALIZED_SOURCE && row.sourceInitiativeId
      && !currentIds.has(row.sourceInitiativeId) && !row.selected && ["DRAFT", "PROPOSED"].includes(row.status)
      && !row.timingStart && !row.timingEnd && !row.campaignId && !row.missionId && !row.costEstimateId
      && !(row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) && row.metadata.socialPublish));
    const { count: deleted } = await tx.brandAction.deleteMany({ where: { strategyId, id: { in: disposable.map(row => row.id) } } });

    return { strategyId, initiatives: initiatives.length, upserted, deleted };
  };
  return transaction ? perform(transaction) : db.$transaction(perform, { timeout: 30000, maxWait: 15000 });
}
