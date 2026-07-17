/**
 * ADR-0156 — Registre des prédictions (sous-domaine SESHAT, mesure).
 *
 * SINGLE-WRITER de `PredictionRecord` (test HARD). Trois responsabilités :
 *   1. `recordAudienceForecasts` — enregistre chaque jour (idempotent) un
 *      forecast d'audience 30 j par marque active, produit par le moteur
 *      déterministe (`domain/forecast`, Theil-Sen + backtest) ;
 *   2. `recordThesis` — consigne les thèses des signaux faibles (LLM causal)
 *      pour qu'elles soient un jour CONFRONTÉES au réel, pas juste affichées ;
 *   3. `resolveMaturedForecasts` — à l'échéance, relit la MÊME série et tranche
 *      HIT/MISS (vérité terrain) + score de Brier. La calibration
 *      (`getCalibration`) corrige la confiance affichée par famille.
 *
 * 0 LLM ici. Jamais de donnée fabriquée : sans série suffisante, AUCUN
 * enregistrement (le rapport dit « pas encore assez d'historique »).
 */

import { db } from "@/lib/db";
import {
  calibrateConfidence,
  forecastSeries,
  slopeDirection,
  type ForecastResult,
  type SeriesPoint,
} from "@/domain/forecast";

const DAY_MS = 86_400_000;
export const FORECAST_HORIZON_DAYS = 30;
/** HIT si l'écart relatif à l'échéance est ≤ 25 % (sinon MISS). */
const HIT_TOLERANCE = 0.25;

/** Série d'audience totale (somme des derniers relevés par plateforme, par jour). */
export async function buildAudienceSeries(strategyId: string): Promise<SeriesPoint[]> {
  const snaps = await db.followerSnapshot.findMany({
    where: { strategyId },
    select: { platform: true, handle: true, followerCount: true, capturedAt: true },
    orderBy: { capturedAt: "asc" },
    take: 2000,
  });
  // Par jour : somme des DERNIERS relevés par (platform,handle) connus à ce jour.
  const byDay = new Map<number, Map<string, number>>();
  const running = new Map<string, number>();
  for (const s of snaps) {
    running.set(`${s.platform}:${s.handle}`, s.followerCount);
    byDay.set(Math.floor(s.capturedAt.getTime() / DAY_MS), new Map(running));
  }
  return [...byDay.entries()].map(([day, m]) => ({
    t: day * DAY_MS,
    v: [...m.values()].reduce((a, b) => a + b, 0),
  }));
}

export async function forecastAudience(strategyId: string): Promise<ForecastResult> {
  const series = await buildAudienceSeries(strategyId);
  return forecastSeries(series, { horizonDays: FORECAST_HORIZON_DAYS });
}

/**
 * Enregistre le forecast d'audience du jour pour les marques actives —
 * idempotent (au plus un FORECAST AUDIENCE_TOTAL par marque et par jour).
 */
export async function recordAudienceForecasts(opts?: { max?: number }): Promise<{ recorded: number; skipped: number }> {
  const strategies = await db.strategy.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, name: true },
    orderBy: { updatedAt: "desc" },
    take: opts?.max ?? 100,
  });
  const todayStart = new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);
  let recorded = 0;
  let skipped = 0;
  for (const s of strategies) {
    try {
      const existing = await db.predictionRecord.findFirst({
        where: {
          strategyId: s.id,
          kind: "FORECAST",
          subjectType: "AUDIENCE_TOTAL",
          createdAt: { gte: todayStart },
        },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
      const fc = await forecastAudience(s.id);
      if (fc.status !== "OK" || fc.points.length === 0 || fc.lastValue === null) {
        skipped++;
        continue;
      }
      const target = fc.points[fc.points.length - 1]!;
      // Confiance déclarée dérivée de l'erreur backtestée : MAPE 0 → 0.9, MAPE ≥ 50 % → 0.5.
      const conf = fc.backtestMape === null ? 0.6 : Math.max(0.5, 0.9 - fc.backtestMape * 0.8);
      await db.predictionRecord.create({
        data: {
          strategyId: s.id,
          kind: "FORECAST",
          subjectType: "AUDIENCE_TOTAL",
          statement: `Audience totale de ${s.name} à J+${FORECAST_HORIZON_DAYS} : ~${Math.round(target.v)} (intervalle ${Math.round(target.lo)}–${Math.round(target.hi)}).`,
          baseline: fc.lastValue,
          predictedValue: target.v,
          predictedDirection: slopeDirection(fc.slopePerDay, fc.lastValue),
          confidence: Math.round(conf * 100) / 100,
          horizonAt: new Date(target.t),
          method: "THEIL_SEN_V1",
          backtestMape: fc.backtestMape,
        },
      });
      recorded++;
    } catch {
      skipped++;
    }
  }
  return { recorded, skipped };
}

/** Consigne une thèse de signal faible (pour confrontation future au réel). */
export async function recordThesis(input: {
  strategyId: string;
  category: string;
  thesis: string;
  confidence: number;
  horizonDays?: number;
}): Promise<void> {
  await db.predictionRecord.create({
    data: {
      strategyId: input.strategyId,
      kind: "THESIS",
      subjectType: `WEAK_SIGNAL_${input.category}`,
      statement: input.thesis.slice(0, 1000),
      confidence: Math.max(0, Math.min(1, input.confidence)),
      horizonAt: new Date(Date.now() + (input.horizonDays ?? 90) * DAY_MS),
      method: "LLM_CAUSAL_V1",
    },
  });
}

/**
 * Résolution des FORECAST échus : on relit la même série, on compare à la
 * prédiction. HIT si écart relatif ≤ 25 %, MISS sinon, UNRESOLVED si la série
 * n'a pas de valeur à l'échéance. Brier = (confiance − issue)².
 */
export async function resolveMaturedForecasts(): Promise<{ resolved: number; unresolved: number }> {
  const due = await db.predictionRecord.findMany({
    where: { kind: "FORECAST", status: "OPEN", horizonAt: { lte: new Date() } },
    take: 200,
  });
  let resolved = 0;
  let unresolved = 0;
  for (const p of due) {
    try {
      if (!p.strategyId || p.predictedValue === null) throw new Error("unresolvable");
      const series = await buildAudienceSeries(p.strategyId);
      // Valeur observée : dernier point ≤ horizon + 7 j de grâce, ≥ horizon − 3 j.
      const windowLo = p.horizonAt.getTime() - 3 * DAY_MS;
      const windowHi = p.horizonAt.getTime() + 7 * DAY_MS;
      const obs = [...series].reverse().find((pt) => pt.t >= windowLo && pt.t <= windowHi);
      if (!obs) {
        // Pas de mesure à l'échéance → UNRESOLVED honnête (jamais un MISS fabriqué).
        await db.predictionRecord.update({
          where: { id: p.id },
          data: { status: "UNRESOLVED", resolvedAt: new Date() },
        });
        unresolved++;
        continue;
      }
      const err = obs.v === 0 ? Math.abs(p.predictedValue) : Math.abs((p.predictedValue - obs.v) / obs.v);
      const hit = err <= HIT_TOLERANCE;
      await db.predictionRecord.update({
        where: { id: p.id },
        data: {
          status: hit ? "HIT" : "MISS",
          outcomeValue: obs.v,
          resolvedAt: new Date(),
          brier: Math.pow(p.confidence - (hit ? 1 : 0), 2),
        },
      });
      resolved++;
    } catch {
      unresolved++;
    }
  }
  return { resolved, unresolved };
}

export interface CalibrationSummary {
  resolved: number;
  hits: number;
  hitRate: number | null;
  meanBrier: number | null;
}

/** Vérité terrain de la famille FORECAST (globale — les séries se ressemblent). */
export async function getCalibration(): Promise<CalibrationSummary> {
  const rows = await db.predictionRecord.findMany({
    where: { kind: "FORECAST", status: { in: ["HIT", "MISS"] } },
    select: { status: true, brier: true },
    take: 1000,
  });
  const resolved = rows.length;
  const hits = rows.filter((r) => r.status === "HIT").length;
  const briers = rows.map((r) => r.brier).filter((b): b is number => b !== null);
  return {
    resolved,
    hits,
    hitRate: resolved > 0 ? hits / resolved : null,
    meanBrier: briers.length > 0 ? briers.reduce((a, b) => a + b, 0) / briers.length : null,
  };
}

// ── Rapport prédictif par marque (composé, honnête, zéro LLM) ────────────────

export interface PredictiveReport {
  audience: ForecastResult & { calibratedConfidence: number | null };
  calibration: CalibrationSummary;
  theses: Array<{
    statement: string;
    category: string;
    confidence: number;
    createdAt: string;
    status: string;
  }>;
  openForecasts: Array<{
    statement: string;
    horizonAt: string;
    confidence: number;
    backtestMape: number | null;
  }>;
}

export async function buildPredictiveReport(strategyId: string): Promise<PredictiveReport> {
  const [audience, calibration, theses, openForecasts] = await Promise.all([
    forecastAudience(strategyId),
    getCalibration(),
    db.predictionRecord.findMany({
      where: { strategyId, kind: "THESIS" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.predictionRecord.findMany({
      where: { strategyId, kind: "FORECAST", status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const conf =
    audience.status === "OK" && audience.backtestMape !== null
      ? calibrateConfidence(Math.max(0.5, 0.9 - audience.backtestMape * 0.8), {
          hits: calibration.hits,
          resolved: calibration.resolved,
        })
      : null;
  return {
    audience: { ...audience, calibratedConfidence: conf === null ? null : Math.round(conf * 100) / 100 },
    calibration,
    theses: theses.map((t) => ({
      statement: t.statement,
      category: t.subjectType.replace(/^WEAK_SIGNAL_/, ""),
      confidence: t.confidence,
      createdAt: t.createdAt.toISOString(),
      status: t.status,
    })),
    openForecasts: openForecasts.map((f) => ({
      statement: f.statement,
      horizonAt: f.horizonAt.toISOString(),
      confidence: f.confidence,
      backtestMape: f.backtestMape,
    })),
  };
}
