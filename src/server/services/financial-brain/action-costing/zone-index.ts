/**
 * Thot — Zone-index resolution with economic-neighbor fallback (ADR-0087 §3, ADR-0093).
 *
 * `resolveZoneIndex(family, zone, key)` reads the latest-valid `ZoneIndex` row ;
 * if the zone has no value, it walks the economic-neighbor chain (BF → CI/ML/SN…)
 * then the currency-bloc median (UEMOA/XOF vs CEMAC/XAF). The pure
 * `resolveAcrossChain` helper is DB-free and unit-tested.
 */

import { db } from "@/lib/db";
import type { ZoneIndexFamily } from "./types";
import { CEMAC, ECONOMIC_NEIGHBORS, UEMOA } from "./constants";

export { CEMAC, ECONOMIC_NEIGHBORS, UEMOA } from "./constants";

export interface ZoneIndexResolution {
  value: number | null;
  zoneUsed: string | null;
  usedFallback: boolean;
  fallbackChain: string[];
  sourceRef?: string | null;
}

/** Direct neighbors, then same-bloc median peers (dedup, self excluded). */
export function neighborsOf(zoneCode: string): string[] {
  const direct = ECONOMIC_NEIGHBORS[zoneCode] ?? [];
  const bloc = CEMAC.includes(zoneCode) ? CEMAC : UEMOA.includes(zoneCode) ? UEMOA : [];
  return [...new Set([...direct, ...bloc])].filter((z) => z !== zoneCode);
}

/** Pure: resolve a value across a fallback chain via a synchronous lookup. */
export function resolveAcrossChain(
  zoneCode: string,
  chain: string[],
  lookup: (zone: string) => number | null,
): ZoneIndexResolution {
  const direct = lookup(zoneCode);
  if (direct != null) {
    return { value: direct, zoneUsed: zoneCode, usedFallback: false, fallbackChain: [] };
  }
  const visited: string[] = [];
  for (const z of chain) {
    visited.push(z);
    const v = lookup(z);
    if (v != null) {
      return { value: v, zoneUsed: z, usedFallback: true, fallbackChain: visited };
    }
  }
  return { value: null, zoneUsed: null, usedFallback: true, fallbackChain: visited };
}

/** Resolve the latest-valid ZoneIndex value for (family, zone, key) with neighbor fallback. */
export async function resolveZoneIndex(
  family: ZoneIndexFamily,
  zoneCode: string,
  key: string,
  at: Date = new Date(),
): Promise<ZoneIndexResolution> {
  const chain = neighborsOf(zoneCode);
  const zones = [zoneCode, ...chain];
  const rows = await db.zoneIndex.findMany({
    where: {
      family,
      key,
      zoneCode: { in: zones },
      validFrom: { lte: at },
      OR: [{ validTo: null }, { validTo: { gte: at } }],
    },
    orderBy: { validFrom: "desc" },
  });
  const byZone = new Map<string, number>();
  const refByZone = new Map<string, string | null>();
  for (const r of rows) {
    if (!byZone.has(r.zoneCode)) {
      byZone.set(r.zoneCode, r.value);
      refByZone.set(r.zoneCode, r.sourceRef);
    }
  }
  const res = resolveAcrossChain(zoneCode, chain, (z) => byZone.get(z) ?? null);
  return { ...res, sourceRef: res.zoneUsed ? refByZone.get(res.zoneUsed) ?? null : null };
}
