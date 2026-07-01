/**
 * src/server/services/market-lifecycle/index.ts — ADR-0105 market kill-switch.
 *
 * Cycle de vie marché gouverné (governor MESTOR) :
 *   NEUTRALIZE_MARKET (FREEZE | SHADOWBAN) → FROZEN | SHADOWBANNED
 *   REINSTATE_MARKET                       → ACTIVE (réintégration sans perte)
 *   PURGE_MARKET                           → PURGED (cascade BFS par stratégie)
 *
 * Le statut vit sur `Country` (ADR-0105). La purge réutilise la cascade
 * `information_schema` de `strategy-archive`, bouclée sur les stratégies du
 * marché (force = bypass des gardes dummy/archived — la neutralisation marché
 * EST le geste délibéré). Anti-foot-gun : PURGE exige un marché SHADOWBANNED.
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import { db } from "@/lib/db";
import { invalidateMarketVisibility } from "@/server/services/market-visibility";
import { purgeStrategy } from "@/server/services/strategy-archive";

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost"
>;

type NeutralizeIntent = Extract<Intent, { kind: "NEUTRALIZE_MARKET" }>;
type ReinstateIntent = Extract<Intent, { kind: "REINSTATE_MARKET" }>;
type PurgeIntent = Extract<Intent, { kind: "PURGE_MARKET" }>;

const ZERO = { amount: 0, currency: "USD" };

// ── Intent handlers (entry points called by commandant.execute) ──────

export async function neutralizeMarketHandler(intent: NeutralizeIntent): Promise<HandlerResult> {
  try {
    const r = await neutralizeMarket(intent.countryCode, intent.mode, intent.reason, intent.operatorId);
    return {
      status: "OK",
      summary: `Marché ${intent.countryCode} → ${r.status}`,
      tool: "market-lifecycle.neutralize",
      output: r,
      estimatedCost: ZERO,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "VETOED", summary: msg, tool: "market-lifecycle.neutralize", reason: msg.includes("not found") ? "NOT_FOUND" : "INVALID" };
  }
}

export async function reinstateMarketHandler(intent: ReinstateIntent): Promise<HandlerResult> {
  try {
    const r = await reinstateMarket(intent.countryCode, intent.operatorId);
    return {
      status: "OK",
      summary: `Marché ${intent.countryCode} réintégré (ACTIVE)`,
      tool: "market-lifecycle.reinstate",
      output: r,
      estimatedCost: ZERO,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "VETOED", summary: msg, tool: "market-lifecycle.reinstate", reason: msg.includes("PURGED") ? "PURGED_IRREVERSIBLE" : "NOT_FOUND" };
  }
}

export async function purgeMarketHandler(intent: PurgeIntent): Promise<HandlerResult> {
  try {
    const r = await purgeMarket(intent.countryCode, intent.operatorId);
    return {
      status: "OK",
      summary: `Marché ${intent.countryCode} purgé — ${r.strategiesPurged} stratégies, ${r.totalRowsDeleted} lignes supprimées`,
      tool: "market-lifecycle.purge",
      output: r,
      estimatedCost: ZERO,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "VETOED", summary: msg, tool: "market-lifecycle.purge", reason: msg.includes("SHADOWBANNED first") ? "NOT_SHADOWBANNED" : "NOT_FOUND" };
  }
}

// ── Core operations ───────────────────────────────────────────────────

export async function neutralizeMarket(
  code: string,
  mode: "FREEZE" | "SHADOWBAN",
  reason: string | undefined,
  by: string,
) {
  const country = await db.country.findUnique({ where: { code }, select: { code: true } });
  if (!country) throw new Error(`Country ${code} not found`);
  const status = mode === "FREEZE" ? "FROZEN" : "SHADOWBANNED";
  const updated = await db.country.update({
    where: { code },
    data: { status, statusReason: reason ?? null, statusChangedAt: new Date(), statusChangedBy: by },
    select: { code: true, status: true, statusChangedAt: true },
  });
  invalidateMarketVisibility();
  return updated;
}

export async function reinstateMarket(code: string, by: string) {
  const country = await db.country.findUnique({ where: { code }, select: { status: true } });
  if (!country) throw new Error(`Country ${code} not found`);
  if (country.status === "PURGED") throw new Error(`Country ${code} is PURGED — cannot reinstate purged data`);
  const updated = await db.country.update({
    where: { code },
    data: { status: "ACTIVE", statusReason: null, statusChangedAt: new Date(), statusChangedBy: by },
    select: { code: true, status: true },
  });
  invalidateMarketVisibility();
  return updated;
}

export async function purgeMarket(code: string, by: string) {
  const country = await db.country.findUnique({ where: { code }, select: { status: true } });
  if (!country) throw new Error(`Country ${code} not found`);
  if (country.status !== "SHADOWBANNED") {
    throw new Error(`Country ${code} must be SHADOWBANNED first (anti-foot-gun) — current: ${country.status}`);
  }

  const directStrategies = await db.strategy.findMany({ where: { countryCode: code }, select: { id: true } });
  const clients = await db.client.findMany({ where: { country: code }, select: { id: true } });
  const clientIds = clients.map((c) => c.id);
  const clientStrategies = clientIds.length
    ? await db.strategy.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } })
    : [];
  const strategyIds = [...new Set([...directStrategies.map((s) => s.id), ...clientStrategies.map((s) => s.id)])];

  let totalRowsDeleted = 0;
  let strategiesPurged = 0;
  for (const id of strategyIds) {
    try {
      const r = await purgeStrategy(id, { force: true });
      totalRowsDeleted += r.totalRowsDeleted;
      strategiesPurged += 1;
    } catch {
      // Skip individual purge failures — keep sweeping the market.
    }
  }

  await db.country.update({
    where: { code },
    data: { status: "PURGED", statusChangedAt: new Date(), statusChangedBy: by },
  });
  invalidateMarketVisibility();
  return { code, strategiesPurged, totalRowsDeleted };
}

export interface MarketSummary {
  code: string;
  name: string;
  status: string;
  statusReason: string | null;
  statusChangedAt: Date | null;
  strategyCount: number;
}

export async function listMarkets(): Promise<MarketSummary[]> {
  const countries = await db.country.findMany({
    select: { code: true, name: true, status: true, statusReason: true, statusChangedAt: true },
    orderBy: [{ name: "asc" }],
  });
  const counts = await db.strategy.groupBy({ by: ["countryCode"], _count: { _all: true } });
  const byCode = new Map(counts.map((c) => [c.countryCode, c._count._all]));
  return countries.map((c) => ({ ...c, strategyCount: byCode.get(c.code) ?? 0 }));
}
