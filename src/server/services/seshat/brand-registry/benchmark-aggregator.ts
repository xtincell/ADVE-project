/**
 * ADR-0156 — Benchmarks marché AUTOMATIQUES depuis le répertoire de marques.
 *
 * `MarketBenchmark` était une table morte (0 writer applicatif — seed only).
 * Or le répertoire Seshat (`BrandFootprintSnapshot`, ADR-0151) accumule de la
 * donnée RÉELLE et légale à chaque scan public : score d'empreinte /100 et
 * audience totale mesurée, par pays (et secteur quand connu). Cet agrégateur
 * (cron) la transforme en distributions p10/p50/p90 — le remplissage manuel
 * (études, sources payantes) devient une source SUPPLÉMENTAIRE, pas la seule.
 *
 * Honnêteté : agrégat seulement si ≥ 5 marques distinctes (sinon pas de ligne
 * — jamais un benchmark fabriqué sur 2 points). `sourceRef` trace la
 * provenance FOOTPRINT_AGGREGATE. 100 % déterministe, zéro LLM.
 */

import { db } from "@/lib/db";

const MIN_SAMPLE = 5;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx]!;
}

interface Bucket {
  country: string;
  sector: string;
  scores: number[];
  audiences: number[];
  brands: Set<string>;
}

export async function aggregateFootprintBenchmarks(): Promise<{ upserted: number; skipped: number }> {
  // Dernière observation par marque (distinct brandKey, capturedAt desc).
  const rows = await db.brandFootprintSnapshot.findMany({
    orderBy: { capturedAt: "desc" },
    distinct: ["brandKey"],
    select: { brandKey: true, countryCode: true, sectorSlug: true, total: true, followerCounts: true },
    take: 5000,
  });

  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    const country = (r.countryCode ?? "??").toUpperCase();
    if (country === "??") continue; // pays inconnu → pas de benchmark honnête
    const sector = r.sectorSlug ?? "ALL";
    const key = `${country}|${sector}`;
    const b = buckets.get(key) ?? { country, sector, scores: [], audiences: [], brands: new Set<string>() };
    b.brands.add(r.brandKey);
    if (typeof r.total === "number") b.scores.push(r.total);
    const followers = Array.isArray(r.followerCounts)
      ? (r.followerCounts as Array<{ followerCount?: unknown }>).reduce(
          (s, f) => s + (typeof f.followerCount === "number" ? f.followerCount : 0),
          0,
        )
      : 0;
    if (followers > 0) b.audiences.push(followers);
    buckets.set(key, b);
  }

  let upserted = 0;
  let skipped = 0;
  for (const b of buckets.values()) {
    const metrics: Array<{ metric: string; unit: string; values: number[] }> = [
      { metric: "FOOTPRINT_SCORE", unit: "score", values: b.scores },
      { metric: "AUDIENCE_TOTAL", unit: "count", values: b.audiences },
    ];
    for (const m of metrics) {
      if (m.values.length < MIN_SAMPLE) {
        skipped++;
        continue;
      }
      const sorted = [...m.values].sort((a, c) => a - c);
      const data = {
        p10: percentile(sorted, 10),
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        sampleSize: m.values.length,
        sourceRef: [{ name: "FOOTPRINT_AGGREGATE", notes: `${b.brands.size} marques distinctes, répertoire Seshat` }],
        confidence: Math.min(0.9, 0.4 + m.values.length / 50),
        lastReviewedAt: new Date(),
      };
      const existing = await db.marketBenchmark.findFirst({
        where: { country: b.country, sector: b.sector, metric: m.metric },
        select: { id: true },
      });
      if (existing) {
        await db.marketBenchmark.update({ where: { id: existing.id }, data });
      } else {
        await db.marketBenchmark.create({
          data: { country: b.country, sector: b.sector, metric: m.metric, unit: m.unit, ...data },
        });
      }
      upserted++;
    }
  }
  return { upserted, skipped };
}
