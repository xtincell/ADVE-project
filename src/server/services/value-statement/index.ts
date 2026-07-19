/**
 * Relevé de valeur mensuel (Phase A état-final, boucle B4 REVENU — le manque
 * n°3 du diagnostic : « la valeur produite est affirmée, jamais prouvée par
 * client »). Composition 100 % DÉTERMINISTE depuis les séries réellement
 * persistées : ce qui a été mesuré, ce qui a bougé, ce que ça a coûté.
 *
 * Honnêteté ADR-0046 : chaque section dit « non mesuré » quand la série est
 * absente — jamais un zéro fabriqué, jamais un delta inventé sur un seul
 * point. Zéro LLM.
 */

import { db } from "@/lib/db";
import { normalizeBrandKey } from "@/server/services/seshat/brand-registry";

export interface SeriesDelta {
  measured: boolean;
  start: number | null;
  end: number | null;
  delta: number | null;
  note?: string;
}

export interface ValueStatement {
  strategyId: string;
  brandName: string;
  monthLabel: string;
  periodStart: string;
  periodEnd: string;
  audience: SeriesDelta;
  communityHealth: SeriesDelta;
  footprintScore: SeriesDelta;
  publicationsCount: number;
  actionsDoneCount: number;
  /** Coût LLM/production réellement enregistré (IntentEmission.costUsd) — jamais estimé. */
  costUsd: number | null;
  forceVerdict: { force: number; tier: string; computedAt: string } | null;
}

function monthBounds(ref: Date): { start: Date; end: Date; label: string } {
  const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
  const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1));
  const label = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, label };
}

/** Delta honnête : besoin d'un point en début ET en fin de fenêtre (± bords). */
function seriesDelta(points: Array<{ t: Date; v: number }>): SeriesDelta {
  if (points.length === 0) return { measured: false, start: null, end: null, delta: null, note: "aucun relevé sur la période" };
  if (points.length === 1) {
    return { measured: true, start: points[0]!.v, end: points[0]!.v, delta: null, note: "un seul relevé — pas de delta calculable" };
  }
  const sorted = [...points].sort((a, b) => a.t.getTime() - b.t.getTime());
  const start = sorted[0]!.v;
  const end = sorted[sorted.length - 1]!.v;
  return { measured: true, start, end, delta: end - start };
}

export async function buildValueStatement(strategyId: string, monthRef?: Date): Promise<ValueStatement> {
  const ref = monthRef ?? new Date(Date.now() - 15 * 86_400_000); // défaut : mois précédent si début de mois
  const { start, end, label } = monthBounds(ref);
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    select: { id: true, name: true, countryCode: true, websiteUrl: true },
  });

  const [followers, community, actionsDone, publications, costAgg, verdict] = await Promise.all([
    db.followerSnapshot.findMany({
      where: { strategyId, capturedAt: { gte: start, lt: end } },
      select: { platform: true, handle: true, followerCount: true, capturedAt: true },
      orderBy: { capturedAt: "asc" },
      take: 2000,
    }),
    db.communitySnapshot.findMany({
      where: { strategyId, measuredAt: { gte: start, lt: end }, health: { not: null } },
      select: { health: true, measuredAt: true },
      orderBy: { measuredAt: "asc" },
      take: 500,
    }),
    db.brandAction.count({
      where: { strategyId, status: "DONE", updatedAt: { gte: start, lt: end } },
    }),
    db.socialPost.count({
      where: { strategyId, publishedAt: { gte: start, lt: end } },
    }),
    db.intentEmission.aggregate({
      where: { strategyId, emittedAt: { gte: start, lt: end }, costUsd: { not: null } },
      _sum: { costUsd: true },
    }),
    db.scoreVerdict.findFirst({
      where: { subjectStrategyId: strategyId },
      orderBy: { computedAt: "desc" },
      select: { force: true, tier: true, computedAt: true },
    }),
  ]);

  // Audience totale par jour : somme des DERNIERS relevés connus par compte.
  const byDay = new Map<number, Map<string, number>>();
  const running = new Map<string, number>();
  for (const f of followers) {
    running.set(`${f.platform}:${f.handle}`, f.followerCount);
    byDay.set(Math.floor(f.capturedAt.getTime() / 86_400_000), new Map(running));
  }
  const audiencePoints = [...byDay.entries()].map(([day, m]) => ({
    t: new Date(day * 86_400_000),
    v: [...m.values()].reduce((a, b) => a + b, 0),
  }));

  // Empreinte : snapshots du répertoire par brandKey (le /scorer public).
  const brandKey = normalizeBrandKey({
    name: strategy.name,
    websiteUrl: strategy.websiteUrl,
    countryCode: strategy.countryCode,
  });
  const footprints = await db.brandFootprintSnapshot.findMany({
    where: { brandKey, capturedAt: { gte: start, lt: end }, total: { not: null } },
    select: { total: true, capturedAt: true },
    orderBy: { capturedAt: "asc" },
    take: 200,
  });

  const cost = costAgg._sum.costUsd;
  return {
    strategyId,
    brandName: strategy.name,
    monthLabel: label,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    audience: seriesDelta(audiencePoints),
    communityHealth: seriesDelta(
      community.map((c) => ({ t: c.measuredAt, v: Math.round((c.health ?? 0) * 1000) / 10 })),
    ),
    footprintScore: seriesDelta(footprints.map((f) => ({ t: f.capturedAt, v: f.total ?? 0 }))),
    publicationsCount: publications,
    actionsDoneCount: actionsDone,
    costUsd: cost === null || cost === undefined ? null : Math.round(Number(cost) * 100) / 100,
    forceVerdict: verdict
      ? { force: verdict.force, tier: verdict.tier, computedAt: verdict.computedAt.toISOString() }
      : null,
  };
}
