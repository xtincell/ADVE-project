/**
 * seed-media-benchmarks.ts — Benchmarks média (CPM/CPC) **en base, sourcés, datés**.
 *
 * Doctrine « rien codé en dur, base de données, les chiffres/faits/sources » : les
 * tarifs média ne sont JAMAIS des constantes dans le code. Ils sont des **lignes
 * de référence** dans `MarketCostSnapshot` (ADR-0099), chacune portant marché +
 * période + devise + **source (nom/URL/année)** + confiance. L'opérateur les met à
 * jour via les Intents market-cost ; le moteur média (`media-metrics.ts`) lit ces
 * valeurs, il n'en code aucune.
 *
 * Audit marché 2026 (cf. lifecycle-gap-analysis-multi-actor.md). Tous les chiffres
 * sont **time/market-varying** → impérativement year-stamped + sourcés. Les marchés
 * africains sont des **proxys** (estimations Meta/AdSense par pays, pas des rate
 * cards audités) → confiance basse, flag explicite dans les notes.
 *
 * Run : `npm run db:seed:media-benchmarks`
 */

import type { PrismaClient } from "@prisma/client";

export interface MediaBenchmarkRow {
  countryCode: string;
  metric: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  unit: string;
  currency: string;
  p10: number | null;
  p50: number;
  p90: number | null;
  source: string;
  sourceRef: Array<{ name: string; url: string; year: number; notes?: string }>;
  confidence: number;
  notes: string | null;
}

function year(y: number): { start: Date; end: Date; period: string } {
  return { start: new Date(`${y}-01-01T00:00:00Z`), end: new Date(`${y}-12-31T23:59:59Z`), period: String(y) };
}

interface Spec {
  countryCode: string;
  metric: string;
  y: number;
  p10?: number;
  p50: number;
  p90?: number;
  currency?: string;
  source: { name: string; url: string; year: number; notes?: string };
  confidence: number;
  notes?: string;
}

function row(s: Spec): MediaBenchmarkRow {
  const { start, end, period } = year(s.y);
  return {
    countryCode: s.countryCode,
    metric: s.metric,
    period,
    periodStart: start,
    periodEnd: end,
    unit: s.currency ?? "USD",
    currency: s.currency ?? "USD",
    p10: s.p10 ?? null,
    p50: s.p50,
    p90: s.p90 ?? null,
    source: "SEED",
    sourceRef: [s.source],
    confidence: s.confidence,
    notes: s.notes ?? null,
  };
}

/**
 * Construit les lignes de benchmark média (PURE — aucune I/O). Les valeurs
 * proviennent de l'audit marché sourcé ; chaque ligne porte sa source + année.
 */
export function buildMediaBenchmarkRows(): MediaBenchmarkRow[] {
  const ADWAVE = { name: "Adwave — TV Advertising CPM by Platform", url: "https://adwave.com/resources/tv-advertising-cpm-by-platform", year: 2024 };
  const REMNANT = { name: "Remnant Agency — CPM across digital and traditional media", url: "https://www.theremnantagency.com/comparing-cpm-across-digital-and-traditional-media/", year: 2025 };
  const WORDSTREAM = { name: "WordStream — 2024 Google Ads Benchmarks", url: "https://www.wordstream.com/blog/2024-google-ads-benchmarks", year: 2024 };
  const GUPTA = { name: "Gupta Media — Social Media Ads Cost tracker", url: "https://www.guptamedia.com/social-media-ads-cost", year: 2025 };
  const ADQUICK = { name: "AdQuick — Movie Theater / Cinema Advertising", url: "https://www.adquick.com/movie-theater-cinema-advertising", year: 2024 };
  const ADRESULTS = { name: "AdResults Media — Podcast Ad Cost", url: "https://www.adresultsmedia.com/news-insights/how-much-do-podcast-ads-cost/", year: 2024 };
  const ADAMIGO = { name: "Adamigo — Meta Ads CPM/CPC benchmarks by country 2026", url: "https://www.adamigo.ai/blog/meta-ads-cpm-cpc-benchmarks-by-country-2026", year: 2026 };

  return [
    // ── US — TV / vidéo (Adwave 2024, Remnant 2025) ──
    row({ countryCode: "US", metric: "CPM_TV_BROADCAST", y: 2024, p50: 45.34, source: ADWAVE, confidence: 0.6, notes: "Broadcast networks 30s, −6% YoY" }),
    row({ countryCode: "US", metric: "CPM_TV_CABLE", y: 2024, p50: 20.60, source: ADWAVE, confidence: 0.6, notes: "Cable networks, −7% YoY" }),
    row({ countryCode: "US", metric: "CPM_CTV", y: 2024, p10: 20, p50: 25.68, p90: 65, source: ADWAVE, confidence: 0.6, notes: "CTV blended, −21% YoY; premium up to ~65" }),
    row({ countryCode: "US", metric: "CPM_CTV_NETFLIX", y: 2024, p50: 37.02, source: ADWAVE, confidence: 0.6 }),
    row({ countryCode: "US", metric: "CPM_YOUTUBE", y: 2025, p50: 3.67, source: REMNANT, confidence: 0.5, notes: "June 2025" }),
    // ── US — audio / OOH / display / cinéma ──
    row({ countryCode: "US", metric: "CPM_RADIO", y: 2025, p10: 4.78, p50: 12, p90: 20, source: REMNANT, confidence: 0.45, notes: "4.78 top-50 mkts (Westwood One) → ~12 network (Nielsen)" }),
    row({ countryCode: "US", metric: "CPM_OOH", y: 2025, p10: 2, p50: 5.5, p90: 9, source: REMNANT, confidence: 0.5, notes: "billboards/posters/transit" }),
    row({ countryCode: "US", metric: "CPM_DISPLAY", y: 2025, p10: 3, p50: 9, p90: 25, source: REMNANT, confidence: 0.5, notes: "median 6-12" }),
    row({ countryCode: "US", metric: "CPM_CINEMA", y: 2024, p10: 20, p50: 35, p90: 70, source: ADQUICK, confidence: 0.45, notes: "national preshow NCM/Screenvision; marquee 50-70" }),
    row({ countryCode: "US", metric: "CPM_PODCAST", y: 2024, p10: 18, p50: 34, p90: 50, source: ADRESULTS, confidence: 0.45, notes: "host-read 25-50" }),
    // ── US — social / search ──
    row({ countryCode: "US", metric: "CPM_META", y: 2025, p50: 6.59, source: GUPTA, confidence: 0.5, notes: "Oct 2025 blended" }),
    row({ countryCode: "US", metric: "CPM_TIKTOK", y: 2025, p50: 4.67, source: GUPTA, confidence: 0.5, notes: "Oct 2025 blended" }),
    row({ countryCode: "US", metric: "CPC_GOOGLE", y: 2024, p50: 4.66, source: WORDSTREAM, confidence: 0.55, notes: "all industries, +10% YoY" }),

    // ── Afrique — PROXYS (estimations Meta par pays, pas des rate cards) ──
    row({ countryCode: "NG", metric: "CPM_META", y: 2026, p50: 1.50, source: ADAMIGO, confidence: 0.3, notes: "PROXY estimation, projection 2026" }),
    row({ countryCode: "NG", metric: "CPC_META", y: 2026, p50: 0.12, source: ADAMIGO, confidence: 0.3, notes: "PROXY" }),
    row({ countryCode: "KE", metric: "CPM_META", y: 2026, p50: 2.40, source: ADAMIGO, confidence: 0.3, notes: "PROXY" }),
    row({ countryCode: "KE", metric: "CPC_META", y: 2026, p50: 0.22, source: ADAMIGO, confidence: 0.3, notes: "PROXY" }),
    row({ countryCode: "ZA", metric: "CPM_META", y: 2026, p50: 4.20, source: ADAMIGO, confidence: 0.3, notes: "PROXY" }),
    row({ countryCode: "ZA", metric: "CPC_META", y: 2026, p50: 0.65, source: ADAMIGO, confidence: 0.3, notes: "PROXY" }),
    row({ countryCode: "EG", metric: "CPM_META", y: 2026, p50: 2.90, source: ADAMIGO, confidence: 0.3, notes: "PROXY" }),
    row({ countryCode: "EG", metric: "CPC_META", y: 2026, p50: 0.25, source: ADAMIGO, confidence: 0.3, notes: "PROXY" }),
  ];
}

/** Upsert idempotent des benchmarks média dans `MarketCostSnapshot`. */
export async function seedMediaBenchmarks(prisma: PrismaClient): Promise<number> {
  const rows = buildMediaBenchmarkRows();
  for (const r of rows) {
    await prisma.marketCostSnapshot.upsert({
      where: { countryCode_sector_metric_period: { countryCode: r.countryCode, sector: "ALL", metric: r.metric, period: r.period } },
      update: { p10: r.p10, p50: r.p50, p90: r.p90, unit: r.unit, currency: r.currency, source: r.source, sourceRef: r.sourceRef, confidence: r.confidence, notes: r.notes, periodStart: r.periodStart, periodEnd: r.periodEnd },
      create: { countryCode: r.countryCode, sector: "ALL", metric: r.metric, period: r.period, periodStart: r.periodStart, periodEnd: r.periodEnd, unit: r.unit, currency: r.currency, p10: r.p10, p50: r.p50, p90: r.p90, source: r.source, sourceRef: r.sourceRef, confidence: r.confidence, notes: r.notes },
    });
  }
  return rows.length;
}
