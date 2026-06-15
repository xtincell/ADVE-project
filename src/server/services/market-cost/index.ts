/**
 * Market Cost — base de coûts marché historisés (ADR-0099).
 *
 * Répond à « ai-je une base de données des coûts d'un marché donné à une période
 * donnée ? » : oui. Série temporelle de coûts réels (CPM/CPC/prod/salaires/
 * cost-of-living) par (pays, secteur, métrique, période), requêtable. 100 %
 * déterministe (DB-only, zéro LLM). Complète MarketBenchmark (statique) ;
 * distinct des ZoneIndex ADR-0087 (multiplicateurs d'indice).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// ─── Période → bornes (pur, testable) ──────────────────────────────────────────

/** Parse une clé de période canonique "YYYY" | "YYYY-Qn" | "YYYY-MM" → bornes UTC. */
export function parsePeriod(period: string): { start: Date; end: Date } {
  const year = /^(\d{4})$/.exec(period);
  if (year) {
    const y = Number(year[1]);
    return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y, 11, 31, 23, 59, 59)) };
  }
  const quarter = /^(\d{4})-Q([1-4])$/.exec(period);
  if (quarter) {
    const y = Number(quarter[1]);
    const startMonth = (Number(quarter[2]) - 1) * 3;
    return {
      start: new Date(Date.UTC(y, startMonth, 1)),
      end: new Date(Date.UTC(y, startMonth + 3, 0, 23, 59, 59)),
    };
  }
  const month = /^(\d{4})-(\d{2})$/.exec(period);
  if (month) {
    const y = Number(month[1]);
    const m = Number(month[2]) - 1;
    if (m < 0 || m > 11) throw new Error(`Mois invalide dans la période: ${period}`);
    return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)) };
  }
  throw new Error(`Période invalide: "${period}" (attendu YYYY | YYYY-Qn | YYYY-MM)`);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MarketCostInput {
  countryCode: string;
  sector?: string;
  metric: string;
  period: string;
  unit?: string;
  currency?: string;
  p10?: number | null;
  p50: number;
  p90?: number | null;
  sampleSize?: number;
  source?: string;
  sourceRef?: unknown;
  confidence?: number;
  notes?: string | null;
}

// ─── CRUD déterministe ─────────────────────────────────────────────────────────

/** Coût d'un marché à une période (ou le plus récent si `period` omis). */
export async function getMarketCost(args: {
  countryCode: string;
  sector?: string;
  metric: string;
  period?: string;
}) {
  const sector = args.sector ?? "ALL";
  if (args.period) {
    return db.marketCostSnapshot.findUnique({
      where: {
        countryCode_sector_metric_period: {
          countryCode: args.countryCode,
          sector,
          metric: args.metric,
          period: args.period,
        },
      },
    });
  }
  return db.marketCostSnapshot.findFirst({
    where: { countryCode: args.countryCode, sector, metric: args.metric },
    orderBy: { periodStart: "desc" },
  });
}

/** Série historique d'une métrique pour un marché (ordonnée chronologiquement). */
export async function getMarketCostHistory(args: {
  countryCode: string;
  sector?: string;
  metric: string;
}) {
  return db.marketCostSnapshot.findMany({
    where: { countryCode: args.countryCode, sector: args.sector ?? "ALL", metric: args.metric },
    orderBy: { periodStart: "asc" },
  });
}

/** Liste filtrée (console). */
export async function listMarketCosts(args: {
  countryCode?: string;
  sector?: string;
  metric?: string;
  limit?: number;
}) {
  return db.marketCostSnapshot.findMany({
    where: {
      ...(args.countryCode ? { countryCode: args.countryCode } : {}),
      ...(args.sector ? { sector: args.sector } : {}),
      ...(args.metric ? { metric: args.metric } : {}),
    },
    orderBy: [{ countryCode: "asc" }, { metric: "asc" }, { periodStart: "desc" }],
    take: args.limit ?? 200,
  });
}

/** Upsert idempotent par (pays, secteur, métrique, période). */
export async function upsertMarketCost(input: MarketCostInput) {
  const sector = input.sector ?? "ALL";
  const { start, end } = parsePeriod(input.period);
  const data = {
    periodStart: start,
    periodEnd: end,
    unit: input.unit ?? "FCFA",
    currency: input.currency ?? "XAF",
    p10: input.p10 ?? null,
    p50: input.p50,
    p90: input.p90 ?? null,
    sampleSize: input.sampleSize ?? 0,
    source: input.source ?? "OPERATOR",
    sourceRef: (input.sourceRef ?? undefined) as Prisma.InputJsonValue | undefined,
    confidence: input.confidence ?? 0.5,
    notes: input.notes ?? null,
  };
  return db.marketCostSnapshot.upsert({
    where: {
      countryCode_sector_metric_period: {
        countryCode: input.countryCode,
        sector,
        metric: input.metric,
        period: input.period,
      },
    },
    create: { countryCode: input.countryCode, sector, metric: input.metric, period: input.period, ...data },
    update: data,
  });
}

// ─── Seed baseline (Afrique francophone, illustratif mais réaliste, FCFA) ───────

/** Jeu de coûts de référence — point de départ, enrichi ensuite par l'opérateur. */
export const MARKET_COST_SEED: MarketCostInput[] = (() => {
  const rows: MarketCostInput[] = [];
  // p50 par (pays, métrique) au Q1 2026 + drift léger au Q2.
  const base: Record<string, Record<string, { p50: number; unit: string }>> = {
    CM: {
      CPM_META: { p50: 2500, unit: "FCFA/1000 imp." },
      CPC_GOOGLE: { p50: 180, unit: "FCFA/clic" },
      PROD_SPOT_30S: { p50: 2_000_000, unit: "FCFA" },
      SALARY_DIRECTOR: { p50: 1_200_000, unit: "FCFA/mois" },
    },
    CI: {
      CPM_META: { p50: 2800, unit: "FCFA/1000 imp." },
      CPC_GOOGLE: { p50: 210, unit: "FCFA/clic" },
      PROD_SPOT_30S: { p50: 2_500_000, unit: "FCFA" },
      SALARY_DIRECTOR: { p50: 1_500_000, unit: "FCFA/mois" },
    },
    SN: {
      CPM_META: { p50: 2600, unit: "FCFA/1000 imp." },
      CPC_GOOGLE: { p50: 195, unit: "FCFA/clic" },
      PROD_SPOT_30S: { p50: 2_200_000, unit: "FCFA" },
      SALARY_DIRECTOR: { p50: 1_350_000, unit: "FCFA/mois" },
    },
  };
  for (const [countryCode, metrics] of Object.entries(base)) {
    for (const [metric, { p50, unit }] of Object.entries(metrics)) {
      for (const [period, drift] of [["2026-Q1", 1], ["2026-Q2", 1.04]] as const) {
        const v = Math.round(p50 * drift);
        rows.push({
          countryCode,
          sector: "ALL",
          metric,
          period,
          unit,
          currency: "XAF",
          p10: Math.round(v * 0.7),
          p50: v,
          p90: Math.round(v * 1.5),
          sampleSize: 20,
          source: "SEED",
          confidence: 0.5,
        });
      }
    }
  }
  return rows;
})();

/** Seed idempotent (upsert) du jeu baseline. */
export async function seedMarketCosts(): Promise<{ upserted: number }> {
  let upserted = 0;
  for (const row of MARKET_COST_SEED) {
    await upsertMarketCost({ ...row, source: "SEED" });
    upserted++;
  }
  return { upserted };
}
