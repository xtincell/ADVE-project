/**
 * Thot — Provider rate resolution (ADR-0093, the "par prestataire" lever).
 *
 * Resolves a `ProviderCostRate` for (providerId, driver, role, zone), preferring
 * an exact-zone match, then an any-zone rate. Provider rates are absolute for
 * that provider (NOT zone-multiplied downstream). DAY/HALF_DAY/HOUR rates are
 * normalized to the component's unit (HOURS_PER_DAY = 8).
 */

import { db } from "@/lib/db";
import type { CostDriver, CostUnit } from "./types";

export const HOURS_PER_DAY = 8;

/** Convert a rate between time units (HOUR/HALF_DAY/DAY). Non-time units pass through. */
export function convertRateUnit(rate: number, from: CostUnit, to: CostUnit): number {
  const TIME: CostUnit[] = ["HOUR", "HALF_DAY", "DAY"];
  if (from === to || !TIME.includes(from) || !TIME.includes(to)) return rate;
  const perHour =
    from === "DAY" ? rate / HOURS_PER_DAY : from === "HALF_DAY" ? rate / (HOURS_PER_DAY / 2) : rate;
  return to === "DAY" ? perHour * HOURS_PER_DAY : to === "HALF_DAY" ? perHour * (HOURS_PER_DAY / 2) : perHour;
}

export async function resolveProviderRate(args: {
  providerId: string;
  driver: CostDriver;
  roleKey?: string | null;
  zoneCode: string;
  targetUnit: CostUnit;
  at?: Date;
}): Promise<{ rate: number; currency: string; resolvedFrom: string } | null> {
  const at = args.at ?? new Date();
  const rows = await db.providerCostRate.findMany({
    where: {
      providerId: args.providerId,
      driver: args.driver,
      active: true,
      validFrom: { lte: at },
      OR: [{ validTo: null }, { validTo: { gte: at } }],
      ...(args.roleKey ? { roleKey: args.roleKey } : {}),
    },
    orderBy: { validFrom: "desc" },
  });
  const pick =
    rows.find((r) => r.zoneCode === args.zoneCode) ?? rows.find((r) => r.zoneCode == null) ?? rows[0];
  if (!pick) return null;
  return {
    rate: convertRateUnit(pick.rate, pick.unit as CostUnit, args.targetUnit),
    currency: pick.currency,
    resolvedFrom: `provider:${pick.providerId}:${pick.driver}${pick.roleKey ? `:${pick.roleKey}` : ""}`,
  };
}
