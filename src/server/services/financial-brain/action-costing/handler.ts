/**
 * Thot — action-costing Intent handlers (ADR-0093).
 *
 * The only mutations in the action-costing chain, routed via `mestor.emitIntent`
 * (governance rule) :
 *   - THOT_ESTIMATE_ACTION_COST  → compute (deterministic) + persist snapshot +
 *                                  stamp the BrandAction so "une action enregistre
 *                                  son estimation".
 *   - THOT_UPSERT_ZONE_INDEX     → operator adjusts a per-market index value.
 *   - THOT_UPSERT_PROVIDER_RATE  → operator adjusts a per-provider rate.
 */

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import { estimateActionCostFromDb } from "./estimator";
import type { CostDriver, CostUnit, EstimateInput, QualityTier, ZoneIndexFamily } from "./types";

type HandlerResult = Pick<IntentResult, "status" | "summary" | "tool" | "output" | "reason">;

type EstimateIntent = Extract<Intent, { kind: "THOT_ESTIMATE_ACTION_COST" }>;
type UpsertZoneIndexIntent = Extract<Intent, { kind: "THOT_UPSERT_ZONE_INDEX" }>;
type UpsertProviderRateIntent = Extract<Intent, { kind: "THOT_UPSERT_PROVIDER_RATE" }>;

const ZONE_FAMILIES: ZoneIndexFamily[] = [
  "COST_OF_LIVING", "FOREX", "MACRO", "TJM", "MARKETING_BUDGETS", "MOBILE_MONEY_FEES", "TAXES",
];
const COST_DRIVERS: CostDriver[] = [
  "LABOR", "EQUIPMENT_RENTAL", "LOCATION", "TRAVEL", "PER_DIEM", "CONSUMABLES", "POST_PRODUCTION",
  "LICENSE", "MEDIA_SPACE", "LOGISTICS", "AGENCY_MARGIN", "CONTINGENCY", "TAX",
];
const COST_UNITS: CostUnit[] = [
  "HOUR", "DAY", "HALF_DAY", "UNIT", "FLAT", "PERCENT", "KM", "SQUARE_METER", "IMPRESSION",
];

export async function estimateAndPersistActionCost(intent: EstimateIntent): Promise<HandlerResult> {
  const input: EstimateInput = {
    zoneCode: intent.zoneCode,
    qualityTier: (intent.qualityTier as QualityTier | undefined) ?? "STANDARD",
    providerId: intent.providerId,
    marginPct: intent.marginPct,
    contingencyPct: intent.contingencyPct,
    taxRatePct: intent.taxRatePct,
    componentOverrides: intent.componentOverrides,
  };

  let result;
  try {
    result = await estimateActionCostFromDb(intent.templateKey, input);
  } catch (err) {
    return {
      status: "FAILED",
      summary: err instanceof Error ? err.message : "estimation failed",
      reason: "TEMPLATE_NOT_FOUND",
    };
  }

  const snapshot = await db.actionCostEstimate.create({
    data: {
      templateKey: result.templateKey,
      brandActionId: intent.brandActionId ?? null,
      strategyId: intent.strategyId === "(global)" ? null : intent.strategyId,
      zoneCode: result.zoneCode,
      providerId: result.providerId ?? null,
      qualityTier: result.qualityTier,
      currency: result.currency,
      subtotalHt: result.subtotalHt,
      marginAmount: result.marginAmount,
      contingencyAmount: result.contingencyAmount,
      taxAmount: result.taxAmount,
      totalHt: result.totalHt,
      totalTtc: result.totalTtc,
      taxRatePct: result.taxRatePct,
      marginPct: result.marginPct,
      contingencyPct: result.contingencyPct,
      lineItems: result.lineItems as unknown as Prisma.InputJsonValue,
      formula: result.formula,
      breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
      usedFallback: result.usedFallback,
      fallbackChain: result.fallbackChain,
      computedBy: intent.operatorId ?? null,
    },
  });

  if (intent.brandActionId) {
    await db.brandAction.update({
      where: { id: intent.brandActionId },
      data: {
        costTemplateKey: result.templateKey,
        costZoneCode: result.zoneCode,
        costProviderId: result.providerId ?? null,
        costQualityTier: result.qualityTier,
        costInputs: (intent.componentOverrides ?? {}) as object,
        costEstimateId: snapshot.id,
        estimatedCostHt: result.totalHt,
        estimatedCostTtc: result.totalTtc,
        estimatedCostCurrency: result.currency,
      },
    });
  }

  return {
    status: "OK",
    tool: "financial-brain",
    summary:
      `Estimation ${result.templateKey} @ ${result.zoneCode} (${result.qualityTier}) : ` +
      `${result.totalTtc.toLocaleString("fr-FR")} ${result.currency} TTC ` +
      `(${result.lineItems.length} atomes${result.usedFallback ? `, fallback ${result.fallbackChain.join("→")}` : ""}).`,
    output: { estimateId: snapshot.id, ...result },
  };
}

export async function upsertZoneIndex(intent: UpsertZoneIndexIntent): Promise<HandlerResult> {
  if (!ZONE_FAMILIES.includes(intent.family as ZoneIndexFamily)) {
    return { status: "VETOED", summary: `Famille d'indice invalide : ${intent.family}.`, reason: "INVALID_FAMILY" };
  }
  const validFrom = intent.validFrom ? new Date(intent.validFrom) : new Date();
  const row = await db.zoneIndex.upsert({
    where: {
      family_zoneCode_key_validFrom: {
        family: intent.family as ZoneIndexFamily,
        zoneCode: intent.zoneCode,
        key: intent.key,
        validFrom,
      },
    },
    create: {
      family: intent.family as ZoneIndexFamily,
      zoneCode: intent.zoneCode,
      key: intent.key,
      value: intent.value,
      currency: intent.currency ?? null,
      unit: intent.unit ?? null,
      sourceRef: intent.sourceRef ?? null,
      validFrom,
    },
    update: {
      value: intent.value,
      currency: intent.currency ?? null,
      unit: intent.unit ?? null,
      sourceRef: intent.sourceRef ?? null,
    },
  });
  return {
    status: "OK",
    tool: "financial-brain",
    summary: `ZoneIndex ${intent.family}/${intent.zoneCode}/${intent.key} = ${intent.value} (ajusté par marché).`,
    output: { id: row.id },
  };
}

export async function upsertProviderRate(intent: UpsertProviderRateIntent): Promise<HandlerResult> {
  if (!COST_DRIVERS.includes(intent.driver as CostDriver)) {
    return { status: "VETOED", summary: `Driver invalide : ${intent.driver}.`, reason: "INVALID_DRIVER" };
  }
  const unit = (intent.unit as CostUnit | undefined) ?? "DAY";
  if (!COST_UNITS.includes(unit)) {
    return { status: "VETOED", summary: `Unité invalide : ${intent.unit}.`, reason: "INVALID_UNIT" };
  }
  // Close any open-ended active rate for the same (provider, driver, role, zone).
  await db.providerCostRate.updateMany({
    where: {
      providerId: intent.providerId,
      driver: intent.driver as CostDriver,
      roleKey: intent.roleKey ?? null,
      zoneCode: intent.zoneCode ?? null,
      active: true,
      validTo: null,
    },
    data: { validTo: new Date(), active: false },
  });
  const row = await db.providerCostRate.create({
    data: {
      providerKind: intent.providerKind,
      providerId: intent.providerId,
      providerLabel: intent.providerLabel ?? null,
      driver: intent.driver as CostDriver,
      roleKey: intent.roleKey ?? null,
      zoneCode: intent.zoneCode ?? null,
      rate: intent.rate,
      unit,
      currency: intent.currency ?? "XAF",
      sourceRef: intent.sourceRef ?? null,
    },
  });
  return {
    status: "OK",
    tool: "financial-brain",
    summary: `ProviderCostRate ${intent.providerId}/${intent.driver}${intent.roleKey ? `/${intent.roleKey}` : ""} = ${intent.rate} ${row.currency}/${unit} (ajusté par prestataire).`,
    output: { id: row.id },
  };
}
