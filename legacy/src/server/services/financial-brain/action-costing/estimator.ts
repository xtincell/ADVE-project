/**
 * Thot — Composite atomized action-cost estimator (ADR-0093, child of ADR-0087).
 *
 * `computeActionCost` is a PURE deterministic function (zero LLM, zero DB) :
 * given resolved atoms + a market context, it composes the estimate. The DB
 * wrapper `estimateActionCostFromDb` resolves each atom's unit rate from
 * ProviderCostRate → ZoneIndex → MarketBenchmark → baseRate, plus the zone
 * cost-of-living multiplier and the zone VAT, then delegates to the pure core.
 */

import { db } from "@/lib/db";
import type {
  ActionCostEstimateResult,
  CatalogTemplate,
  ComputeContext,
  CostDriver,
  CostUnit,
  EstimateInput,
  EstimateLineItem,
  QualityTier,
  ResolvedComponent,
  ZoneIndexFamily,
} from "./types";
import { resolveZoneIndex } from "./zone-index";
import { resolveProviderRate } from "./provider-rate";

// ── Deterministic constants ────────────────────────────────────────────

export const QUALITY_MULTIPLIER: Record<QualityTier, number> = {
  BASIC: 0.7,
  STANDARD: 1.0,
  PREMIUM: 1.6,
};

/** Drivers whose cost scales with the creative quality tier. */
export const QUALITY_SENSITIVE_DRIVERS: ReadonlySet<CostDriver> = new Set<CostDriver>([
  "LABOR",
  "EQUIPMENT_RENTAL",
  "POST_PRODUCTION",
  "CONSUMABLES",
  "LICENSE",
]);

/** Ultimate fallback VAT when no TAXES ZoneIndex exists for the zone or its neighbors. */
export const DEFAULT_TAX_RATE = 0.18;

const round = (n: number): number => Math.round(n);
const qualityMultiplier = (driver: CostDriver, tier: QualityTier): number =>
  QUALITY_SENSITIVE_DRIVERS.has(driver) ? QUALITY_MULTIPLIER[tier] : 1;

// ── Pure core ──────────────────────────────────────────────────────────

/**
 * Compose an action cost from resolved atoms + a market context. Pure +
 * deterministic — same inputs always yield the same output. Margin / contingency
 * are template-level percentages of the atom subtotal ; VAT is applied on totalHt.
 */
export function computeActionCost(args: {
  templateKey: string;
  baseCurrency: string;
  defaultMarginPct: number;
  defaultContingencyPct: number;
  components: ResolvedComponent[];
  context: ComputeContext;
  input: EstimateInput;
}): ActionCostEstimateResult {
  const { templateKey, defaultMarginPct, defaultContingencyPct, components, context, input } = args;
  const qualityTier: QualityTier = input.qualityTier ?? "STANDARD";
  const marginPct = input.marginPct ?? defaultMarginPct;
  const contingencyPct = input.contingencyPct ?? defaultContingencyPct;
  const taxRatePct = input.taxRatePct ?? context.taxRatePct;
  const overrides = input.componentOverrides ?? {};

  const lineItems: EstimateLineItem[] = [];
  for (const c of components) {
    const ov = overrides[c.label];
    if (ov?.disabled) continue;
    const quantity = ov?.quantity ?? c.quantity;
    const qMult = qualityMultiplier(c.driver, qualityTier);
    const zMult = c.zoneAdjustable ? context.zoneMultiplier : 1;
    const unitRate = c.unitRate * zMult * qMult;
    const amount = round(unitRate * quantity);
    lineItems.push({
      driver: c.driver,
      label: c.label,
      quantity,
      unit: c.unit,
      unitRate: round(unitRate),
      zoneMultiplier: zMult,
      qualityMultiplier: qMult,
      amount,
      rateBasis: c.rateBasis,
      resolvedFrom: c.resolvedFrom,
    });
  }

  const subtotalHt = lineItems.reduce((s, li) => s + li.amount, 0);
  const marginAmount = round(subtotalHt * marginPct);
  const contingencyAmount = round(subtotalHt * contingencyPct);
  const totalHt = subtotalHt + marginAmount + contingencyAmount;
  const taxAmount = round(totalHt * taxRatePct);
  const totalTtc = totalHt + taxAmount;

  return {
    templateKey,
    zoneCode: context.zoneCode,
    providerId: input.providerId,
    qualityTier,
    currency: context.currency,
    subtotalHt,
    marginPct,
    marginAmount,
    contingencyPct,
    contingencyAmount,
    taxRatePct,
    taxAmount,
    totalHt,
    totalTtc,
    amount: totalTtc,
    formula:
      "Σ(atome.unitRate × zoneIndex × qualité × quantité) " +
      "+ marge + contingence + TVA(totalHt)",
    breakdown: { subtotalHt, marginAmount, contingencyAmount, taxAmount, totalHt, totalTtc },
    lineItems,
    usedFallback: context.usedFallback,
    fallbackChain: context.fallbackChain,
    computedAt: new Date().toISOString(),
  };
}

// ── Catalog → resolved components (FIXED / base-zone) — pure, DB-free ───

/** Map a catalog template's atoms to ResolvedComponents using their baseRate. */
export function resolveCatalogComponentsFixed(template: CatalogTemplate): ResolvedComponent[] {
  return template.components.map((c) => ({
    driver: c.driver,
    label: c.label,
    quantity: c.quantity ?? 1,
    unit: c.unit ?? "FLAT",
    rateBasis: c.rateBasis ?? "FIXED",
    unitRate: c.baseRate ?? 0,
    zoneAdjustable: true,
    resolvedFrom: `fixed:base@${template.baseZoneCode ?? "CM"}`,
    optional: c.optional ?? false,
  }));
}

// ── DB-resolving wrapper ───────────────────────────────────────────────

interface DbComponent {
  driver: CostDriver;
  label: string;
  quantity: number;
  unit: CostUnit;
  rateBasis: string;
  rateKey: string | null;
  indexFamily: string | null;
  baseRate: number;
  optional: boolean;
}

/**
 * Resolve one atom's effective unit rate from the richest available source :
 * PROVIDER_RATE → MARKET_INDEX → BENCHMARK → baseRate (FIXED).
 */
async function resolveComponentRate(
  c: DbComponent,
  zoneCode: string,
  baseZoneCode: string,
  providerId: string | undefined,
): Promise<{ unitRate: number; zoneAdjustable: boolean; resolvedFrom: string; usedFallback: boolean; fallbackChain: string[] }> {
  // 1. Provider-specific rate (absolute, not zone-multiplied).
  if (c.rateBasis === "PROVIDER_RATE" && providerId) {
    const pr = await resolveProviderRate({
      providerId,
      driver: c.driver,
      roleKey: c.rateKey,
      zoneCode,
      targetUnit: c.unit,
    });
    if (pr) {
      return { unitRate: pr.rate, zoneAdjustable: false, resolvedFrom: pr.resolvedFrom, usedFallback: false, fallbackChain: [] };
    }
  }
  // 2. Market index (zone-specific value).
  if (c.rateBasis === "MARKET_INDEX" && c.indexFamily && c.rateKey) {
    const zi = await resolveZoneIndex(c.indexFamily as ZoneIndexFamily, zoneCode, c.rateKey);
    if (zi.value != null) {
      return {
        unitRate: zi.value,
        zoneAdjustable: false,
        resolvedFrom: `zoneIndex:${c.indexFamily}:${zi.zoneUsed}:${c.rateKey}`,
        usedFallback: zi.usedFallback,
        fallbackChain: zi.fallbackChain,
      };
    }
  }
  // 3. Base de marché Seshat — snapshot daté & sourcé (ADR-0099), PRIORITAIRE sur
  //    le benchmark statique : c'est la « base de données de marché » canonique.
  if (c.rateBasis === "BENCHMARK" && c.rateKey) {
    const { getMarketCost } = await import("@/server/services/market-cost");
    const snap = await getMarketCost({ countryCode: zoneCode, metric: c.rateKey });
    if (snap) {
      return {
        unitRate: snap.p50,
        zoneAdjustable: false,
        resolvedFrom: `seshat-market:${zoneCode}:${c.rateKey}@${snap.period}`,
        usedFallback: false,
        fallbackChain: [],
      };
    }
    // 3-bis. Repli : benchmark statique (country p50).
    const bench = await db.marketBenchmark.findFirst({
      where: { country: zoneCode, metric: c.rateKey },
      orderBy: { updatedAt: "desc" },
    });
    if (bench) {
      return { unitRate: bench.p50, zoneAdjustable: false, resolvedFrom: `benchmark:${zoneCode}:${c.rateKey}`, usedFallback: true, fallbackChain: ["seshat-market→benchmark"] };
    }
  }
  // 4. Fixed baseRate (zone-multiplied downstream).
  return { unitRate: c.baseRate, zoneAdjustable: true, resolvedFrom: `fixed:base@${baseZoneCode}`, usedFallback: false, fallbackChain: [] };
}

/**
 * Estimate an action cost by template key, resolving all rates from the DB
 * (zone-index cost-of-living + VAT + per-component rate sources).
 */
export async function estimateActionCostFromDb(
  templateKey: string,
  input: EstimateInput,
): Promise<ActionCostEstimateResult> {
  let template = await db.actionCostTemplate.findUnique({
    where: { actionKey: templateKey },
    include: { components: { orderBy: { sortOrder: "asc" } } },
  });
  // Auto-amorçage (ADR-0119 pattern) : le build Vercel ne lance que
  // `migrate deploy`, pas `db:seed:action-costs` → table vide en prod. Plutôt
  // que de throw (estimation morte / panneau inerte), on amorce le catalogue
  // canon (idempotent, zéro LLM) quand la table est entièrement vide, puis on
  // relit. Une clé réellement inconnue throw toujours.
  if (!template) {
    const total = await db.actionCostTemplate.count();
    if (total === 0) {
      const { ensureActionCostCatalog } = await import("./catalog");
      await ensureActionCostCatalog(db);
      template = await db.actionCostTemplate.findUnique({
        where: { actionKey: templateKey },
        include: { components: { orderBy: { sortOrder: "asc" } } },
      });
    }
  }
  if (!template) {
    throw new Error(`action-costing: unknown templateKey '${templateKey}'.`);
  }

  const baseZoneCode = template.baseZoneCode;
  const currency = template.baseCurrency;

  // Cost-of-living multiplier (zone vs base). 1.0 if same zone or no index.
  let zoneMultiplier = 1;
  let usedFallback = false;
  const fallbackChain: string[] = [];
  if (input.zoneCode !== baseZoneCode) {
    const colZone = await resolveZoneIndex("COST_OF_LIVING", input.zoneCode, "general");
    const colBase = await resolveZoneIndex("COST_OF_LIVING", baseZoneCode, "general");
    if (colZone.value != null && colBase.value != null && colBase.value > 0) {
      zoneMultiplier = colZone.value / colBase.value;
      if (colZone.usedFallback) {
        usedFallback = true;
        fallbackChain.push(...colZone.fallbackChain);
      }
    }
  }

  // Zone VAT.
  const vat = await resolveZoneIndex("TAXES", input.zoneCode, "vat_standard");
  const taxRatePct = vat.value ?? DEFAULT_TAX_RATE;
  if (vat.usedFallback) {
    usedFallback = true;
    fallbackChain.push(...vat.fallbackChain);
  }

  const resolved: ResolvedComponent[] = [];
  for (const c of template.components) {
    const r = await resolveComponentRate(
      {
        driver: c.driver as CostDriver,
        label: c.label,
        quantity: c.quantity,
        unit: c.unit as CostUnit,
        rateBasis: c.rateBasis,
        rateKey: c.rateKey,
        indexFamily: c.indexFamily,
        baseRate: c.baseRate,
        optional: c.optional,
      },
      input.zoneCode,
      baseZoneCode,
      input.providerId,
    );
    if (r.usedFallback) {
      usedFallback = true;
      fallbackChain.push(...r.fallbackChain);
    }
    resolved.push({
      driver: c.driver as CostDriver,
      label: c.label,
      quantity: c.quantity,
      unit: c.unit as CostUnit,
      rateBasis: c.rateBasis as ResolvedComponent["rateBasis"],
      unitRate: r.unitRate,
      zoneAdjustable: r.zoneAdjustable,
      resolvedFrom: r.resolvedFrom,
      optional: c.optional,
    });
  }

  const context: ComputeContext = {
    zoneCode: input.zoneCode,
    baseZoneCode,
    currency,
    zoneMultiplier,
    taxRatePct,
    usedFallback,
    fallbackChain: [...new Set(fallbackChain)],
  };

  return computeActionCost({
    templateKey: template.actionKey,
    baseCurrency: currency,
    defaultMarginPct: template.defaultMarginPct,
    defaultContingencyPct: template.defaultContingencyPct,
    components: resolved,
    context,
    input,
  });
}
