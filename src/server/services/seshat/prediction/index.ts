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

// ── ADR-0159 — Paris déclarés (PLEDGE / ACTION_EFFECT) ──────────────────────

/** Sujets auto-mesurables : leur série se relit à l'échéance (résolution auto). */
export const MEASURABLE_SUBJECTS = ["AUDIENCE_TOTAL", "COMMUNITY_HEALTH", "FOOTPRINT_SCORE"] as const;
export type MeasurableSubject = (typeof MEASURABLE_SUBJECTS)[number];

/** Horizon maximal d'un pari PUBLIC (vérifiable dans une fenêtre raisonnable). */
export const PUBLIC_PLEDGE_MAX_HORIZON_DAYS = 180;

/** Série santé communauté (fraction 0-1, telle que mesurée — jamais fabriquée). */
export async function buildCommunityHealthSeries(strategyId: string): Promise<SeriesPoint[]> {
  const rows = await db.communitySnapshot.findMany({
    where: { strategyId, health: { not: null } },
    select: { health: true, measuredAt: true },
    orderBy: { measuredAt: "asc" },
    take: 1000,
  });
  return rows.map((r) => ({ t: r.measuredAt.getTime(), v: r.health ?? 0 }));
}

/** Série empreinte publique (/scorer) par brandKey de la marque. */
export async function buildFootprintSeries(strategyId: string): Promise<SeriesPoint[]> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { name: true, websiteUrl: true, countryCode: true },
  });
  if (!strategy) return [];
  const { normalizeBrandKey } = await import("@/server/services/seshat/brand-registry");
  const brandKey = normalizeBrandKey({
    name: strategy.name,
    websiteUrl: strategy.websiteUrl,
    countryCode: strategy.countryCode,
  });
  const rows = await db.brandFootprintSnapshot.findMany({
    where: { brandKey, total: { not: null } },
    select: { total: true, capturedAt: true },
    orderBy: { capturedAt: "asc" },
    take: 500,
  });
  return rows.map((r) => ({ t: r.capturedAt.getTime(), v: r.total ?? 0 }));
}

async function buildSubjectSeries(strategyId: string, subjectType: string): Promise<SeriesPoint[] | null> {
  if (subjectType === "AUDIENCE_TOTAL") return buildAudienceSeries(strategyId);
  if (subjectType === "COMMUNITY_HEALTH") return buildCommunityHealthSeries(strategyId);
  if (subjectType === "FOOTPRINT_SCORE") return buildFootprintSeries(strategyId);
  return null; // sujet non mesurable → résolution manuelle
}

export interface DeclarePredictionInput {
  strategyId: string;
  kind: "PLEDGE" | "ACTION_EFFECT";
  subjectType: string;
  subjectKey?: string | null;
  statement: string;
  predictedValue?: number | null;
  predictedDirection?: "UP" | "DOWN" | "FLAT" | null;
  confidence: number;
  horizonDays: number;
  isPublic?: boolean;
  declaredBy?: string | null;
}

/**
 * Déclare un pari (ADR-0159). Append-only. La baseline d'un sujet mesurable est
 * LUE de la série au moment de la déclaration (mesure, pas fabrication) — sujet
 * non mesurable → baseline null et résolution manuelle assumée.
 */
export async function declarePrediction(input: DeclarePredictionInput) {
  if (input.isPublic && input.horizonDays > PUBLIC_PLEDGE_MAX_HORIZON_DAYS) {
    throw new Error(`PUBLIC_PLEDGE_HORIZON_TOO_FAR (max ${PUBLIC_PLEDGE_MAX_HORIZON_DAYS} j)`);
  }
  const series = await buildSubjectSeries(input.strategyId, input.subjectType);
  const baseline = series && series.length > 0 ? series[series.length - 1]!.v : null;
  return db.predictionRecord.create({
    data: {
      strategyId: input.strategyId,
      kind: input.kind,
      subjectType: input.subjectType,
      subjectKey: input.subjectKey ?? null,
      statement: input.statement.slice(0, 1000),
      baseline,
      predictedValue: input.predictedValue ?? null,
      predictedDirection: input.predictedDirection ?? null,
      confidence: Math.max(0.05, Math.min(0.95, input.confidence)),
      horizonAt: new Date(Date.now() + input.horizonDays * DAY_MS),
      method: "DECLARED_V1",
      isPublic: input.isPublic ?? false,
      declaredBy: input.declaredBy ?? null,
    },
  });
}

/**
 * Résolution MANUELLE d'un pari OPEN (sujet non auto-mesurable, ou échéance
 * passée sans mesure). Note obligatoire, jamais de réécriture d'un résolu.
 */
export async function resolvePredictionManually(input: {
  id: string;
  outcome: "HIT" | "MISS" | "UNRESOLVED";
  note: string;
  outcomeValue?: number | null;
}) {
  const record = await db.predictionRecord.findUniqueOrThrow({
    where: { id: input.id },
    select: { status: true, confidence: true },
  });
  if (record.status !== "OPEN") throw new Error("PREDICTION_ALREADY_RESOLVED");
  return db.predictionRecord.update({
    where: { id: input.id },
    data: {
      status: input.outcome,
      outcomeValue: input.outcomeValue ?? null,
      resolvedAt: new Date(),
      resolutionNote: input.note.slice(0, 1000),
      brier:
        input.outcome === "UNRESOLVED"
          ? null
          : Math.pow(record.confidence - (input.outcome === "HIT" ? 1 : 0), 2),
    },
  });
}

// ── ADR-0159 amendement — pont RTIS → registre (le plan d'actions propose) ───

/**
 * AARRR de l'action → sujet de mesure suggéré. Déterministe. `BUSINESS` par
 * défaut (résolution manuelle) — on ne présume jamais qu'un effet est
 * auto-mesurable.
 */
const AARRR_TO_SUBJECT: Record<string, string> = {
  ACQUISITION: "AUDIENCE_TOTAL",
  ACTIVATION: "COMMUNITY_HEALTH",
  RETENTION: "COMMUNITY_HEALTH",
  REFERRAL: "AUDIENCE_TOTAL",
  REVENUE: "BUSINESS",
};

export interface ActionEffectCandidate {
  actionId: string;
  title: string;
  status: string;
  aarrrIntent: string | null;
  suggestedSubjectType: string;
  suggestedHorizonDays: number;
  timingStart: string | null;
  timingEnd: string | null;
}

/**
 * Actions du plan (pilier I matérialisé, ADR-0094) SANS effet prédit déclaré —
 * le RTIS propose le CADRE (action, sujet, échéance), l'humain écrit l'énoncé
 * et le chiffre (LOI 9 / ADR-0046 : la machine ne fabrique jamais un chiffre
 * prédit). Lecture pure, zéro écriture.
 */
export async function listActionEffectCandidates(strategyId: string, limit = 12): Promise<ActionEffectCandidate[]> {
  const [actions, covered] = await Promise.all([
    db.brandAction.findMany({
      where: { strategyId, status: { in: ["PROPOSED", "ACCEPTED", "SCHEDULED"] } },
      orderBy: [{ timingStart: "asc" }, { createdAt: "desc" }],
      take: 60,
      select: { id: true, title: true, status: true, aarrrIntent: true, timingStart: true, timingEnd: true },
    }),
    db.predictionRecord.findMany({
      where: { strategyId, kind: "ACTION_EFFECT", subjectKey: { not: null } },
      select: { subjectKey: true },
    }),
  ]);
  const coveredIds = new Set(covered.map((c) => c.subjectKey));
  return actions
    .filter((a) => !coveredIds.has(a.id))
    .slice(0, limit)
    .map((a) => {
      // Échéance suggérée : fin de l'action + 30 j d'effet, sinon 45 j.
      const horizonMs = a.timingEnd
        ? a.timingEnd.getTime() + 30 * DAY_MS - Date.now()
        : 45 * DAY_MS;
      return {
        actionId: a.id,
        title: a.title,
        status: a.status,
        aarrrIntent: a.aarrrIntent,
        suggestedSubjectType: AARRR_TO_SUBJECT[a.aarrrIntent ?? ""] ?? "BUSINESS",
        suggestedHorizonDays: Math.max(7, Math.min(365, Math.round(horizonMs / DAY_MS))),
        timingStart: a.timingStart?.toISOString() ?? null,
        timingEnd: a.timingEnd?.toISOString() ?? null,
      };
    });
}

/** Paris OPEN échus SANS voie auto — à trancher par l'opérateur (honnêteté : rien ne se résout tout seul sans mesure). */
export async function listDueForManualResolution(limit = 50) {
  const due = await db.predictionRecord.findMany({
    where: {
      status: "OPEN",
      horizonAt: { lte: new Date() },
      kind: { in: ["PLEDGE", "ACTION_EFFECT", "THESIS"] },
    },
    orderBy: { horizonAt: "asc" },
    take: limit,
  });
  // Les sujets mesurables avec valeur prédite seront tranchés par la voie auto — on ne liste que le reste.
  return due.filter(
    (p) => !(p.predictedValue !== null && (MEASURABLE_SUBJECTS as readonly string[]).includes(p.subjectType)),
  );
}

/** Vérité terrain par famille (FORECAST / PLEDGE / ACTION_EFFECT / THESIS). */
export async function getCalibrationByKind(): Promise<Record<string, CalibrationSummary>> {
  const rows = await db.predictionRecord.findMany({
    where: { status: { in: ["HIT", "MISS"] } },
    select: { kind: true, status: true, brier: true },
    take: 5000,
  });
  const out: Record<string, CalibrationSummary> = {};
  for (const kind of ["FORECAST", "PLEDGE", "ACTION_EFFECT", "THESIS"]) {
    const sub = rows.filter((r) => r.kind === kind);
    const hits = sub.filter((r) => r.status === "HIT").length;
    const briers = sub.map((r) => r.brier).filter((b): b is number => b !== null);
    out[kind] = {
      resolved: sub.length,
      hits,
      hitRate: sub.length > 0 ? hits / sub.length : null,
      meanBrier: briers.length > 0 ? briers.reduce((a, b) => a + b, 0) / briers.length : null,
    };
  }
  return out;
}

export interface PublicPledge {
  id: string;
  brandName: string;
  brandSlug: string | null;
  statement: string;
  status: string;
  confidence: number;
  horizonAt: string;
  createdAt: string;
  resolvedAt: string | null;
  baseline: number | null;
  predictedValue: number | null;
  outcomeValue: number | null;
  resolutionNote: string | null;
}

/** Le registre public /paris — paris PUBLICS uniquement, jamais declaredBy. */
export async function listPublicPledges(limit = 100): Promise<PublicPledge[]> {
  const rows = await db.predictionRecord.findMany({
    where: { isPublic: true, kind: "PLEDGE" },
    orderBy: [{ status: "asc" }, { horizonAt: "asc" }],
    take: limit,
  });
  const strategyIds = [...new Set(rows.map((r) => r.strategyId).filter(Boolean))] as string[];
  const strategies = await db.strategy.findMany({
    where: { id: { in: strategyIds } },
    select: { id: true, name: true, publicSlug: true },
  });
  const byId = new Map(strategies.map((s) => [s.id, s]));
  return rows.map((r) => {
    const s = r.strategyId ? byId.get(r.strategyId) : null;
    return {
      id: r.id,
      brandName: s?.name ?? "Marque",
      brandSlug: s?.publicSlug ?? null,
      statement: r.statement,
      status: r.status,
      confidence: r.confidence,
      horizonAt: r.horizonAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      baseline: r.baseline,
      predictedValue: r.predictedValue,
      outcomeValue: r.outcomeValue,
      resolutionNote: r.resolutionNote,
    };
  });
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
    where: {
      // ADR-0159 : la voie auto tranche aussi les paris déclarés dont le sujet
      // est mesurable (la même série se relit) — le reste va à la voie manuelle.
      kind: { in: ["FORECAST", "PLEDGE", "ACTION_EFFECT"] },
      subjectType: { in: [...MEASURABLE_SUBJECTS] },
      predictedValue: { not: null },
      status: "OPEN",
      horizonAt: { lte: new Date() },
    },
    take: 200,
  });
  let resolved = 0;
  let unresolved = 0;
  for (const p of due) {
    try {
      if (!p.strategyId || p.predictedValue === null) throw new Error("unresolvable");
      const series = (await buildSubjectSeries(p.strategyId, p.subjectType)) ?? [];
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
  /** ADR-0159 — paris déclarés de la marque (PLEDGE/ACTION_EFFECT, tout statut). */
  declared: Array<{
    id: string;
    kind: string;
    statement: string;
    status: string;
    isPublic: boolean;
    horizonAt: string;
    confidence: number;
    resolvedAt: string | null;
    resolutionNote: string | null;
  }>;
}

export async function buildPredictiveReport(strategyId: string): Promise<PredictiveReport> {
  const [audience, calibration, theses, openForecasts, declared] = await Promise.all([
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
    db.predictionRecord.findMany({
      where: { strategyId, kind: { in: ["PLEDGE", "ACTION_EFFECT"] } },
      orderBy: [{ status: "asc" }, { horizonAt: "asc" }],
      take: 12,
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
    declared: declared.map((d) => ({
      id: d.id,
      kind: d.kind,
      statement: d.statement,
      status: d.status,
      isPublic: d.isPublic,
      horizonAt: d.horizonAt.toISOString(),
      confidence: d.confidence,
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      resolutionNote: d.resolutionNote,
    })),
  };
}
