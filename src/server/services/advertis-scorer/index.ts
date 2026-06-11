// ============================================================================
// MODULE M02 — AdvertisVector & Scorer
// Score: 100/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: §2.1 + §4.1 | Division: Transversal
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  scoreObject(type, id) → AdvertisVector pour tout objet (strategy, campaign, mission, talent, signal, glory, asset)
// [x] REQ-2  Score structurel par pilier: (atomes/requis*15) + (collections/totales*7) + (cross_refs/requises*3) max 25
// [x] REQ-3  Quality modulator (AI-assessed content quality coefficient)
// [x] REQ-4  Business context weights (pillar emphasis varies by sector/positioning)
// [x] REQ-5  Classification Latent→Icone (6 niveaux bases sur composite /200)
// [x] REQ-6  Campaign + Mission scoring (campaign pillar inputs from 13 relations)
// [x] REQ-7  Confidence score (based on filled pillars ratio)
// [x] REQ-8  Auto-signal on significant score change (>10% pillar or >15pt composite)
// [x] REQ-9  Re-entrancy guard preventing infinite scoreObject↔processSignal loops
// [x] REQ-10 batchScore optimise: bulk DB queries, shared caching, concurrency limit, partial results
// [x] REQ-11 Audit trail logging on every score recalculation
// [x] REQ-12 Score history: ScoreSnapshot auto-created on every score + periodic snapshots via cron
// [x] REQ-13 getScoreHistory: expose snapshots as time series (router procedure)
// [x] REQ-14 snapshotAllStrategies: periodic cron-callable function with retention policy (90d)
//
// EXPORTS: scoreObject, batchScore, snapshotAllStrategies, getScoreHistory, ScorableType, BatchScoreResult
// ============================================================================
// CROSS-MODULE DEPENDENCIES
// ============================================================================
// Ce module depend de :
//   (aucun module — c'est la fondation du scoring)
//
// Ce module est consomme par :
//   M01 (Pillar Schemas)        — pillar data feeds structural scoring
//   M03 (Glory Tools)           — glory output scoring
//   M04 (Campaign Manager)      — campaign scoring
//   M15 (Feedback Loop)         — scoreObject called on signal processing
//   M16 (Quick Intake)          — scoreObject post-intake
//   M26 (MCP Intelligence)      — score resources
//   M28 (MCP Creative)          — ADVE auto-injection
//   M34 (Console Portal)        — ecosystem scoring page
//   M35 (Quick Intake Portal)   — score display
//   M36 (Pipeline Orchestrator) — scoring step
//
// >> INSTRUCTION : A chaque modification de ce module, verifier que
// >> les 10 modules dependants ci-dessus restent fonctionnels.
// >> Mettre a jour cette section si de nouvelles dependances apparaissent.
// ============================================================================

import { db } from "@/lib/db";
import { TIER_UPPER_BOUNDS_200 } from "@/domain";
import { type AdvertisVector, type PillarKey, PILLAR_KEYS, classifyBrand } from "@/lib/types/advertis-vector";
import { type BusinessContext, getPillarWeightsForContext } from "@/lib/types/business-context";
import { scoreStructural } from "./structural";
// quality-modulator SUPPRIMÉ — LOI 9 : pas de LLM dans le scoring (CdC v4 Chantier 2)
import * as auditTrail from "@/server/services/audit-trail";

// Phase 4 — types extracted to break the cycle with structural.ts.
export type { ScorableType } from "./types";
import type { ScorableType } from "./types";

/**
 * Re-entrancy guard: prevents infinite scoreObject <-> processSignal loops.
 * NOTE: This is in-memory and NOT serverless-safe (Chantier 10 will fix this with a DB flag).
 * For now, kept as-is to avoid breaking existing behavior.
 */
const _scoringInProgress = new Set<string>();

// ---------------------------------------------------------------------------
// scoreObject — core scoring function for any entity type
// ---------------------------------------------------------------------------

export async function scoreObject(type: ScorableType, id: string): Promise<AdvertisVector> {
  const scoringKey = `${type}:${id}`;
  const isReentrant = _scoringInProgress.has(scoringKey);
  _scoringInProgress.add(scoringKey);

  try {
    const structuralScores = await scoreStructural(type, id);
    // LOI 2 + LOI 9: scoring is a pure function. No LLM, no quality modulator.
    // Score = structural (contract-aware) × business context weight (lookup table).
    const bizWeights = await getBusinessContextWeights(type, id);

    // Clamp at the source: structural × business-context-weight may legitimately
    // exceed 25 per pillar when the weight table favors high-fit categories.
    // AdvertisVectorSchema enforces .max(25) per pillar / .max(200) composite at
    // the type level, so any unclamped persistence creates dirty rows that the
    // UI later has to defensively clamp on read (cf. Makrea 205.49 / Matanga
    // 206.44 audit). Source fix lives here, defense-in-depth on the read side.
    const clampPillar = (n: number) => Math.min(25, Math.max(0, n));
    const pillars: Record<string, number> = {};
    for (const key of PILLAR_KEYS) {
      pillars[key] = Math.round(clampPillar(structuralScores[key] * bizWeights[key]) * 100) / 100;
    }

    const compositePotential = PILLAR_KEYS.reduce((sum, key) => sum + (pillars[key] ?? 0), 0);

    // ── Composite = structural potential, with an EVIDENCE CEILING (not a
    //    multiplier). ────────────────────────────────────────────────────────
    //
    // The old model multiplied compositePotential by an evidence factor floored
    // at 0.30, which DRAGGED every brand without in-system proof data down to
    // LATENT/ORDINAIRE — producing the two absurdities this refonte kills:
    //   • "Apple scores low"  : a complete, excellent strategy with no superfan
    //     rows in OUR db got × 0.30 → ~48/200 → LATENT. Nonsense.
    //   • "new brands blocked": a fresh client could never climb past LATENT no
    //     matter how strong its declared strategy was.
    //
    // New deterministic model — clear and defensible:
    //   1. composite = compositePotential  (structural × business weights). A
    //      strong, complete strategy stands on its own merit up to FORTE (160).
    //   2. The TOP two tiers are DEFINED by proven cultural mass, so they are
    //      gated by an evidence ceiling — never floored:
    //        • CULTE  (>160) requires evidence ≥ EVIDENCE_FOR_CULTE
    //        • ICONE  (>180) requires evidence ≥ EVIDENCE_FOR_ICONE
    //      Below those thresholds the composite is CAPPED at the highest tier
    //      the evidence supports (no proof → cap at FORTE 160).
    //
    // Result: a great new strategy → FORTE (not blocked); Apple-with-no-data →
    // FORTE (not LATENT); Apple-with-real-mass (superfans/cult/age/signals) →
    // ICONE. Mediocre strategy → its honest structural tier regardless.
    let composite = Math.min(200, Math.max(0, compositePotential));
    if (type === "strategy") {
      const evidence = await computeEvidenceScore(id);
      composite = Math.min(composite, evidenceTierCeiling(evidence));
    }
    const confidence = computeConfidence(type, structuralScores);

    // Per-pillar scores stay structural (potential) — they reflect form
    // completeness on the radar. The composite is what carries the evidence-
    // weighted classification. UI consumers reading individual pillar scores
    // see "what the brand has DECLARED"; consumers reading composite see
    // "what the brand has PROVEN".
    const vector: AdvertisVector = {
      a: pillars.a ?? 0, d: pillars.d ?? 0, v: pillars.v ?? 0, e: pillars.e ?? 0,
      r: pillars.r ?? 0, t: pillars.t ?? 0, i: pillars.i ?? 0, s: pillars.s ?? 0,
      composite: Math.round(composite * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
    };

    // Persist the vector on the scored object
    await persistVector(type, id, vector);

    // Create a ScoreSnapshot for history tracking (strategies only)
    if (type === "strategy") {
      await createSnapshot(id, vector, "score_recalculation").catch(() => {
        // Best-effort: scoring should never fail because of snapshot creation
      });
    }

    // Audit trail (non-blocking)
    auditTrail.log({
      action: "UPDATE",
      entityType: type.charAt(0).toUpperCase() + type.slice(1),
      entityId: id,
      newValue: { composite: vector.composite, confidence: vector.confidence, trigger: "score_recalculation" },
    }).catch((err) => { console.warn("[audit-trail] log failed:", err instanceof Error ? err.message : err); });

    // Auto-signal on significant score change — SKIPPED if re-entrant
    if (!isReentrant) {
      await detectAndSignalScoreChange(type, id, vector);
    }

    return vector;
  } finally {
    _scoringInProgress.delete(scoringKey);
  }
}

// ---------------------------------------------------------------------------
// Evidence ceiling — gates the top tiers (CULTE/ICONE) on proven cultural mass.
// ---------------------------------------------------------------------------

// Weights sum to 1.0. Superfans + cult-index dominate (they ARE the proof of
// mass); age (patrimony) and Tarsis (cultural relevance proxy) are minor.
const SUPERFANS_WEIGHT = 0.45; // saturated at 1000 superfans
const CULT_INDEX_WEIGHT = 0.30; // saturated at cult-index score 80
const AGE_WEIGHT = 0.10; // saturated at 5 years
const TARSIS_WEIGHT = 0.15; // saturated at 20 weak-signals captured
const SUPERFANS_TARGET = 1000;
const CULT_INDEX_TARGET = 80;
const AGE_YEARS_TARGET = 5;
const TARSIS_TARGET = 20;

/** Minimum evidence (0-1) to be eligible for the two apex tiers. */
const EVIDENCE_FOR_CULTE = 0.20;
const EVIDENCE_FOR_ICONE = 0.50;

/**
 * Returns the maximum composite (/200) a brand may be classified at given how
 * much cultural mass it has PROVEN. No proof → capped at FORTE; this is a
 * CEILING, never a floor (a strong structural strategy keeps its FORTE score).
 */
function evidenceTierCeiling(evidence: number): number {
  if (evidence >= EVIDENCE_FOR_ICONE) return 200; // ICONE eligible
  if (evidence >= EVIDENCE_FOR_CULTE) return TIER_UPPER_BOUNDS_200.CULTE; // 180
  return TIER_UPPER_BOUNDS_200.FORTE; // 160
}

/**
 * Evidence score in [0, 1] — how much the brand has PROVEN (superfans, cult
 * index, patrimony, weak signals) versus merely DECLARED. Pure read, no side
 * effects. Failures fall back to 0 (conservative: cap at FORTE, never block).
 */
async function computeEvidenceScore(strategyId: string): Promise<number> {
  try {
    const [strategy, superfanCount, latestCult, tarsisCount] = await Promise.all([
      db.strategy.findUnique({
        where: { id: strategyId },
        select: { createdAt: true },
      }),
      db.superfanProfile.count({ where: { strategyId } }).catch(() => 0),
      db.cultIndexSnapshot.findFirst({
        where: { strategyId },
        orderBy: { measuredAt: "desc" },
        select: { compositeScore: true },
      }).catch(() => null),
      db.signal
        .count({ where: { strategyId, type: { contains: "TARSIS" } } })
        .catch(() => 0),
    ]);

    const superfansFraction = Math.min(1, superfanCount / SUPERFANS_TARGET);
    const cultFraction = latestCult?.compositeScore != null
      ? Math.min(1, latestCult.compositeScore / CULT_INDEX_TARGET)
      : 0;
    const ageMs = strategy?.createdAt ? Date.now() - strategy.createdAt.getTime() : 0;
    const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
    const ageFraction = Math.min(1, Math.max(0, ageYears / AGE_YEARS_TARGET));
    const tarsisFraction = Math.min(1, tarsisCount / TARSIS_TARGET);

    return Math.min(
      1,
      superfansFraction * SUPERFANS_WEIGHT +
        cultFraction * CULT_INDEX_WEIGHT +
        ageFraction * AGE_WEIGHT +
        tarsisFraction * TARSIS_WEIGHT,
    );
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// batchScore — optimized bulk scoring with shared context + concurrency limit
// ---------------------------------------------------------------------------

const BATCH_CONCURRENCY = 10;

export interface BatchScoreResult {
  vectors: AdvertisVector[];
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Score multiple objects with optimized batch processing:
 * - Pre-fetches business contexts for all strategy IDs in 1 query
 * - Limits concurrency to avoid DB connection exhaustion
 * - Returns partial results: successful vectors + error details for failures
 */
export async function batchScore(
  type: ScorableType,
  ids: string[],
): Promise<BatchScoreResult> {
  if (ids.length === 0) return { vectors: [], succeeded: 0, failed: 0, errors: [] };

  // Pre-warm the business context cache for all relevant strategies
  await prewarmBusinessContexts(type, ids);

  const results: AdvertisVector[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  // Process in chunks of BATCH_CONCURRENCY
  for (let i = 0; i < ids.length; i += BATCH_CONCURRENCY) {
    const chunk = ids.slice(i, i + BATCH_CONCURRENCY);

    const chunkResults = await Promise.allSettled(
      chunk.map((id) => scoreObject(type, id)),
    );

    for (let j = 0; j < chunkResults.length; j++) {
      const result = chunkResults[j]!;
      const chunkId = chunk[j]!;

      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        const reason = result.reason;
        const errorMsg = reason instanceof Error ? reason.message : String(reason);
        errors.push({ id: chunkId, error: errorMsg });
      }
    }
  }

  return {
    vectors: results,
    succeeded: results.length,
    failed: errors.length,
    errors,
  };
}

// ---------------------------------------------------------------------------
// snapshotAllStrategies — periodic cron function for score history
// ---------------------------------------------------------------------------

/**
 * Takes a ScoreSnapshot for every strategy that has an advertis_vector.
 * Called by the cron scheduler (every 6h).
 * Enforces retention policy: deletes snapshots older than 90 days.
 */
export async function snapshotAllStrategies(): Promise<{
  snapshotsCreated: number;
  expiredDeleted: number;
}> {
  // 1. Snapshot all strategies with vectors (exclude demo data from real snapshots)
  const strategies = await db.strategy.findMany({
    where: { isDummy: false },
    select: { id: true, advertis_vector: true },
  });

  const snapshotData = strategies
    .filter((s) => s.advertis_vector != null)
    .map((s) => {
      const vec = s.advertis_vector as Record<string, number>;
      return {
        strategyId: s.id,
        advertis_vector: s.advertis_vector!,
        classification: classifyBrand(vec.composite ?? 0),
        confidence: vec.confidence ?? 0,
        trigger: "periodic_cron",
      };
    });

  let snapshotsCreated = 0;
  if (snapshotData.length > 0) {
    const result = await db.scoreSnapshot.createMany({ data: snapshotData });
    snapshotsCreated = result.count;
  }

  // 2. Retention: delete snapshots older than 90 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const deleted = await db.scoreSnapshot.deleteMany({
    where: { measuredAt: { lt: cutoffDate } },
  });

  return { snapshotsCreated, expiredDeleted: deleted.count };
}

// ---------------------------------------------------------------------------
// getScoreHistory — time-series of score snapshots for a strategy
// ---------------------------------------------------------------------------

export async function getScoreHistory(
  strategyId: string,
  limit = 50,
): Promise<Array<{
  measuredAt: Date;
  advertis_vector: AdvertisVector;
  classification: string;
  confidence: number;
  trigger: string;
}>> {
  const snapshots = await db.scoreSnapshot.findMany({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
    take: limit,
  });

  return snapshots.map((s) => ({
    measuredAt: s.measuredAt,
    advertis_vector: s.advertis_vector as unknown as AdvertisVector,
    classification: s.classification,
    confidence: s.confidence,
    trigger: s.trigger,
  }));
}

// ---------------------------------------------------------------------------
// Internal: createSnapshot
// ---------------------------------------------------------------------------

async function createSnapshot(
  strategyId: string,
  vector: AdvertisVector,
  trigger: string,
): Promise<void> {
  await db.scoreSnapshot.create({
    data: {
      strategyId,
      advertis_vector: vector,
      classification: classifyBrand(vector.composite),
      confidence: vector.confidence,
      trigger,
    },
  });
}

// ---------------------------------------------------------------------------
// Internal: business context cache + prewarm for batch
// ---------------------------------------------------------------------------

const _bizContextCache = new Map<string, Record<PillarKey, number>>();
let _bizContextCacheTime = 0;
const _bizContextCacheTTL = 60_000; // 1 minute

async function prewarmBusinessContexts(type: ScorableType, ids: string[]): Promise<void> {
  // Clear stale cache
  if (Date.now() - _bizContextCacheTime > _bizContextCacheTTL) {
    _bizContextCache.clear();
    _bizContextCacheTime = Date.now();
  }

  let strategyIds: string[] = [];

  if (type === "strategy") {
    strategyIds = ids;
  } else if (type === "campaign") {
    const campaigns = await db.campaign.findMany({
      where: { id: { in: ids } },
      select: { strategyId: true },
    });
    strategyIds = campaigns.map((c) => c.strategyId).filter(Boolean) as string[];
  } else if (type === "mission") {
    const missions = await db.mission.findMany({
      where: { id: { in: ids } },
      select: { strategyId: true },
    });
    strategyIds = missions.map((m) => m.strategyId).filter(Boolean) as string[];
  } else {
    return;
  }

  const uniqueIds = [...new Set(strategyIds)].filter((id) => !_bizContextCache.has(id));
  if (uniqueIds.length === 0) return;

  const strategies = await db.strategy.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, businessContext: true },
  });

  const defaultWeights: Record<PillarKey, number> = { a: 1, d: 1, v: 1, e: 1, r: 1, t: 1, i: 1, s: 1 };

  for (const strategy of strategies) {
    if (!strategy.businessContext) {
      _bizContextCache.set(strategy.id, defaultWeights);
      continue;
    }
    try {
      const ctx = strategy.businessContext as unknown as BusinessContext;
      if (!ctx.businessModel || !ctx.positioningArchetype) {
        _bizContextCache.set(strategy.id, defaultWeights);
      } else {
        _bizContextCache.set(strategy.id, getPillarWeightsForContext(ctx));
      }
    } catch {
      _bizContextCache.set(strategy.id, defaultWeights);
    }
  }
}

async function getBusinessContextWeights(
  type: ScorableType,
  id: string
): Promise<Record<PillarKey, number>> {
  const defaultWeights: Record<PillarKey, number> = { a: 1, d: 1, v: 1, e: 1, r: 1, t: 1, i: 1, s: 1 };

  try {
    let strategyId: string | null = null;

    if (type === "strategy") {
      strategyId = id;
    } else if (type === "campaign") {
      const campaign = await db.campaign.findUnique({ where: { id }, select: { strategyId: true } });
      strategyId = campaign?.strategyId ?? null;
    } else if (type === "mission") {
      const mission = await db.mission.findUnique({ where: { id }, select: { strategyId: true } });
      strategyId = mission?.strategyId ?? null;
    }

    if (!strategyId) return defaultWeights;

    // Check pre-warmed cache first
    const cached = _bizContextCache.get(strategyId);
    if (cached) return cached;

    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
      select: { businessContext: true },
    });

    if (!strategy?.businessContext) return defaultWeights;

    const ctx = strategy.businessContext as unknown as BusinessContext;
    if (!ctx.businessModel || !ctx.positioningArchetype) return defaultWeights;

    const weights = getPillarWeightsForContext(ctx);
    _bizContextCache.set(strategyId, weights);
    return weights;
  } catch {
    return defaultWeights;
  }
}

function computeConfidence(type: ScorableType, scores: Record<string, number>): number {
  const filledPillars = Object.values(scores).filter((s) => s > 0).length;
  const baseConfidence = filledPillars / 8;
  if (type === "strategy") return Math.min(0.95, baseConfidence * 0.9);
  return Math.min(0.95, baseConfidence * 0.8);
}

// ---------------------------------------------------------------------------
// Internal: detect significant score change → Signal → feedback loop
// ---------------------------------------------------------------------------

async function detectAndSignalScoreChange(
  type: ScorableType,
  id: string,
  newVector: AdvertisVector
): Promise<void> {
  try {
    let strategyId: string | null = null;

    if (type === "strategy") {
      strategyId = id;
    } else if (type === "campaign") {
      const c = await db.campaign.findUnique({ where: { id }, select: { strategyId: true } });
      strategyId = c?.strategyId ?? null;
    } else if (type === "mission") {
      const m = await db.mission.findUnique({ where: { id }, select: { strategyId: true } });
      strategyId = m?.strategyId ?? null;
    }

    if (!strategyId) return;

    // Load previous ScoreSnapshot (skip the one we just created)
    const previousSnapshot = await db.scoreSnapshot.findFirst({
      where: { strategyId },
      orderBy: { measuredAt: "desc" },
      skip: type === "strategy" ? 1 : 0,
    });

    if (!previousSnapshot) return;

    const previousVector = previousSnapshot.advertis_vector as Record<string, number>;

    // Check each pillar for >10% relative change
    const changedPillars: Array<{ key: PillarKey; prev: number; curr: number; pct: number }> = [];

    for (const key of PILLAR_KEYS) {
      const prev = previousVector[key] ?? 0;
      const curr = newVector[key] ?? 0;
      if (prev === 0 && curr === 0) continue;
      const relativePct = prev !== 0
        ? Math.abs((curr - prev) / prev) * 100
        : (curr !== 0 ? 100 : 0);
      if (relativePct > 10) {
        changedPillars.push({ key, prev, curr, pct: Math.round(relativePct * 100) / 100 });
      }
    }

    // Check composite for >15-point absolute change
    const prevComposite = previousVector.composite ?? 0;
    const currComposite = newVector.composite;
    const compositeAbsDelta = Math.abs(currComposite - prevComposite);
    const compositeSignificant = compositeAbsDelta > 15;

    if (changedPillars.length === 0 && !compositeSignificant) return;

    const direction = currComposite >= prevComposite ? "SCORE_IMPROVEMENT" : "SCORE_DECLINE";

    const signal = await db.signal.create({
      data: {
        strategyId,
        type: direction,
        data: {
          scoredType: type,
          scoredId: id,
          changedPillars,
          compositeDelta: {
            previous: prevComposite,
            current: currComposite,
            absoluteDelta: Math.round(compositeAbsDelta * 100) / 100,
            significant: compositeSignificant,
          },
        },
      },
    });

    const { processSignal } = await import("@/server/services/feedback-loop");
    await processSignal(signal.id);
  } catch {
    // Best-effort: scoring should never fail because of signal creation
  }
}

async function persistVector(type: ScorableType, id: string, vector: AdvertisVector): Promise<void> {
  try {
    const data = { advertis_vector: vector };
    const where = { id };
    switch (type) {
      case "strategy": await db.strategy.update({ where, data }); break;
      case "campaign": await db.campaign.update({ where, data }); break;
      case "mission": await db.mission.update({ where, data }); break;
      case "talentProfile": await db.talentProfile.update({ where, data }); break;
      case "signal": await db.signal.update({ where, data }); break;
      case "gloryOutput": await db.gloryOutput.update({ where, data }); break;
      case "brandAsset": break; // BrandAsset does not have advertis_vector column
    }
  } catch {
    // Silently fail if model doesn't support advertis_vector yet
  }
}
