/**
 * Campaign Tracker — Trajectoire & altitude (Phase 19, ADR-0052 Cluster A).
 *
 * Layer 4 — orchestrate Layer 2/3. Lit/écrit DB via `db` (Prisma).
 *
 * Sous-clusters Vague 1 :
 *   - trajectory.snapshot     — fige snapshots immutables READY_TO_LAUNCH → LIVE
 *   - trajectory.fuelBurnRate — Loi 3 Thot (ALLOWED/WARN/DENIED + recommandation)
 *   - trajectory.regretWindow — alarmes J+3/J+7/J+14 (PARTIAL — telemetry-dependent)
 *
 * L2 strict — n'altère JAMAIS L1 Operational en lecture (ADR-0052 §2.5
 * garantie de découplage). Les écritures se font sur les colonnes neuves
 * Phase 19 (`tierBrandSnapshot`, `bigIdeaSnapshotBrandAssetId`, etc.).
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { db } from "@/lib/db";
import {
  type SnapshotPreLiveOutput,
  type FuelBurnRateResult,
  type FuelBurnState,
  type TierBrandSnapshot,
  type ManipulationMixSnapshot,
  type CultIndexSnapshot,
  StageSequencingViolationError,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster trajectory.snapshot
// ─────────────────────────────────────────────────────────────────────────

interface SnapshotPreLiveInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

/**
 * Fige les snapshots immutables Campaign au passage READY_TO_LAUNCH → LIVE.
 *
 * Idempotent : si la Campaign est déjà LIVE et que les snapshots existent,
 * retourne les valeurs existantes sans réécrire (anti-drift snapshots).
 *
 * Loi 2 (séquencement) : refuse si `Campaign.advertis_vector` est null
 * (heuristic MVP). PRODUCTION = règles canoniques RTIS via ADR enfant.
 */
export async function snapshotTrajectoryPreLive(
  input: SnapshotPreLiveInput,
): Promise<SnapshotPreLiveOutput> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      state: true,
      advertis_vector: true,
      activeBigIdeaId: true,
      activeManifestoId: true,
      tierBrandSnapshot: true,
      bigIdeaSnapshotBrandAssetId: true,
      manifestoSnapshotBrandAssetId: true,
      bigIdeaSnapshotContent: true,
      manifestoSnapshotContent: true,
      manipulationMixSnapshot: true,
      cultIndexSnapshotPre: true,
    },
  });

  if (!campaign) {
    throw new Error(`Campaign ${input.campaignId} not found`);
  }

  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} does not belong to strategy ${input.strategyId}`);
  }

  // Idempotent — si déjà snapshotté, retourner tel quel.
  if (campaign.tierBrandSnapshot && campaign.bigIdeaSnapshotBrandAssetId) {
    return {
      campaignId: campaign.id,
      tierBrandSnapshot: campaign.tierBrandSnapshot as unknown as TierBrandSnapshot | null,
      bigIdeaSnapshotBrandAssetId: campaign.bigIdeaSnapshotBrandAssetId,
      manifestoSnapshotBrandAssetId: campaign.manifestoSnapshotBrandAssetId,
      bigIdeaSnapshotContent: campaign.bigIdeaSnapshotContent,
      manifestoSnapshotContent: campaign.manifestoSnapshotContent,
      manipulationMixSnapshot: campaign.manipulationMixSnapshot as unknown as ManipulationMixSnapshot | null,
      cultIndexSnapshotPre: campaign.cultIndexSnapshotPre as unknown as CultIndexSnapshot | null,
      warnings: ["IDEMPOTENT_NOOP"],
    };
  }

  const warnings: string[] = [];

  // Loi 2 — heuristic MVP : Campaign.advertis_vector requis.
  if (!campaign.advertis_vector) {
    throw new StageSequencingViolationError(campaign.id, ["advertis_vector"]);
  }

  // Charger Strategy pour récupérer manipulation mix.
  const strategy = await db.strategy.findUnique({
    where: { id: input.strategyId },
    select: {
      id: true,
      manipulationMix: true,
      cultIndex: true,
    },
  });

  if (!strategy) {
    throw new Error(`Strategy ${input.strategyId} not found`);
  }

  const now = new Date();
  const snapshotAt = now.toISOString();

  // Tier brand snapshot — null-honest. Lit depuis CultIndexSnapshot le plus récent
  // (qui porte tier + compositeScore canoniques). Pas de fallback magic (ADR-0046).
  const cultSnap = await db.cultIndexSnapshot
    .findFirst({
      where: { strategyId: input.strategyId },
      orderBy: { measuredAt: "desc" as const },
      select: {
        compositeScore: true,
        tier: true,
        measuredAt: true,
        engagementDepth: true,
        superfanVelocity: true,
        communityCohesion: true,
        evangelismScore: true,
      },
    })
    .catch(() => null);

  const tierBrandSnapshot: TierBrandSnapshot | null = cultSnap
    ? {
        tier: String(cultSnap.tier),
        compositeScore: Number(cultSnap.compositeScore),
        // byPillar : MVP utilise les sous-scores CultIndex comme proxy ; PRODUCTION
        // lira ScoreSnapshot par pillar quand le service est exposé.
        byPillar: {
          a: Number(cultSnap.engagementDepth ?? 0),
          d: Number(cultSnap.communityCohesion ?? 0),
          v: Number(cultSnap.superfanVelocity ?? 0),
          e: Number(cultSnap.evangelismScore ?? 0),
        },
        snapshotAt,
      }
    : null;

  if (!tierBrandSnapshot) warnings.push("MISSING_CULT_INDEX_SNAPSHOT");

  // BigIdea snapshot — résolu via Campaign.activeBigIdeaId vers BrandAsset.content.
  const { id: bigIdeaBrandAssetId, content: bigIdeaContent } =
    await loadActiveBrandAsset(campaign.activeBigIdeaId);
  if (!bigIdeaBrandAssetId) warnings.push("MISSING_BIG_IDEA_SNAPSHOT");

  const { id: manifestoBrandAssetId, content: manifestoContent } =
    await loadActiveBrandAsset(campaign.activeManifestoId);
  if (!manifestoBrandAssetId) warnings.push("MISSING_MANIFESTO_SNAPSHOT");

  // Manipulation mix snapshot.
  const mix = strategy.manipulationMix as unknown as Record<string, unknown> | null;
  const manipulationMixSnapshot: ManipulationMixSnapshot | null = mix?.primary
    ? {
        primary: mix.primary as ManipulationMixSnapshot["primary"],
        allowed: (Array.isArray(mix.allowed) ? mix.allowed : [mix.primary]) as ManipulationMixSnapshot["allowed"],
        rationale: typeof mix.rationale === "string" ? mix.rationale : null,
        snapshotAt,
      }
    : null;

  if (!manipulationMixSnapshot) warnings.push("MISSING_MANIPULATION_MIX");

  // CultIndex snapshot pre — null-honest (cf. ADR-0046).
  const cultIndexSnapshotPre: CultIndexSnapshot | null = cultSnap
    ? {
        score: Number(cultSnap.compositeScore),
        tier: String(cultSnap.tier),
        snapshotAt,
      }
    : null;

  // Persister les snapshots.
  await db.campaign.update({
    where: { id: campaign.id },
    data: {
      tierBrandSnapshot: tierBrandSnapshot as unknown as object,
      bigIdeaSnapshotBrandAssetId: bigIdeaBrandAssetId,
      manifestoSnapshotBrandAssetId: manifestoBrandAssetId,
      bigIdeaSnapshotContent: (bigIdeaContent as object) ?? undefined,
      manifestoSnapshotContent: (manifestoContent as object) ?? undefined,
      manipulationMixSnapshot: manipulationMixSnapshot as unknown as object,
      cultIndexSnapshotPre: cultIndexSnapshotPre as unknown as object,
    },
  });

  return {
    campaignId: campaign.id,
    tierBrandSnapshot,
    bigIdeaSnapshotBrandAssetId: bigIdeaBrandAssetId,
    manifestoSnapshotBrandAssetId: manifestoBrandAssetId,
    bigIdeaSnapshotContent: bigIdeaContent,
    manifestoSnapshotContent: manifestoContent,
    manipulationMixSnapshot,
    cultIndexSnapshotPre,
    warnings,
  };
}

async function loadActiveBrandAsset(
  brandAssetId: string | null,
): Promise<{ id: string | null; content: unknown }> {
  if (!brandAssetId) return { id: null, content: null };
  try {
    const asset = await db.brandAsset.findUnique({
      where: { id: brandAssetId },
      select: { id: true, content: true },
    });
    return { id: asset?.id ?? null, content: asset?.content ?? null };
  } catch {
    return { id: null, content: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster trajectory.fuelBurnRate
// ─────────────────────────────────────────────────────────────────────────

interface FuelBurnRateInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
  readonly asOf?: Date;
}

const BURN_RATE_DENY_THRESHOLD = 1.5; // 150% du planned sans recovery
const BURN_RATE_WARN_THRESHOLD = 1.15; // 115%
const REVENUE_PACING_RECOVERY_THRESHOLD = 0.5; // si revenue pacing < 50% du timeRatio, on ne récupère pas

/**
 * Vérifie burn-rate vs revenue pacing pour décider si la campagne flame-out.
 *
 * MVP heuristic :
 *   - burnRatio = budgetSpent / budget
 *   - timeRatio = elapsedTime / totalDuration
 *   - DENIED si burnRatio > 1.5 × timeRatio ET revenuePacing < 0.5 × timeRatio
 *   - WARN si burnRatio > 1.15 × timeRatio
 *   - ALLOWED sinon
 *
 * PRODUCTION (ADR enfant) ajoutera : régression logistique calibrée sur
 * historique campaigns réussies vs flame-out.
 */
export async function checkFuelBurnRate(input: FuelBurnRateInput): Promise<FuelBurnRateResult> {
  const asOf = input.asOf ?? new Date();

  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      state: true,
      budget: true,
      startDate: true,
      endDate: true,
      aarrTargets: true,
      killTriggeredAt: true,
    },
  });

  if (!campaign) {
    throw new Error(`Campaign ${input.campaignId} not found`);
  }

  if (campaign.killTriggeredAt) {
    return {
      state: "DENIED",
      burnRatio: NaN,
      timeRatio: NaN,
      revenuePacing: null,
      recommendation: `Already paused at ${campaign.killTriggeredAt.toISOString()}`,
      regretWindowFlag: false,
    };
  }

  if (!campaign.budget || !campaign.startDate || !campaign.endDate) {
    return {
      state: "ALLOWED",
      burnRatio: 0,
      timeRatio: 0,
      revenuePacing: null,
      recommendation: "INSUFFICIENT_DATA — missing budget/startDate/endDate",
      regretWindowFlag: false,
    };
  }

  // Time ratio — fraction écoulée du window campagne.
  const totalMs = campaign.endDate.getTime() - campaign.startDate.getTime();
  const elapsedMs = asOf.getTime() - campaign.startDate.getTime();
  const timeRatio = totalMs > 0 ? Math.max(0, Math.min(1, elapsedMs / totalMs)) : 0;

  // Budget spent — agrège CampaignExecution.devisAmount + CampaignFieldOp.budget.
  const budgetSpent = await aggregateBudgetSpent(campaign.id);
  const burnRatio = campaign.budget > 0 ? budgetSpent / campaign.budget : 0;

  // Revenue pacing — agrège CampaignAARRMetric stage REVENUE actual / target.
  const revenuePacing = await computeRevenuePacing(campaign.id, campaign.aarrTargets);

  // Decision.
  let state: FuelBurnState = "ALLOWED";
  let recommendation = "On track.";
  const regretWindowFlag = isInRegretWindow(elapsedMs);

  const expectedBurn = timeRatio;
  if (burnRatio > BURN_RATE_DENY_THRESHOLD * Math.max(0.01, expectedBurn)) {
    if (revenuePacing !== null && revenuePacing < REVENUE_PACING_RECOVERY_THRESHOLD * timeRatio) {
      state = "DENIED";
      recommendation =
        `Flame-out detected: burn ${(burnRatio * 100).toFixed(0)}% vs time ${(timeRatio * 100).toFixed(0)}%, ` +
        `revenue pacing ${revenuePacing.toFixed(2)}× target. Recommend THOT_PAUSE_CAMPAIGN_FLAME_OUT.`;
    } else {
      state = "WARN_AT_BURN_RATE";
      recommendation = `Burn rate elevated (${(burnRatio * 100).toFixed(0)}%) but revenue holding. Monitor closely.`;
    }
  } else if (burnRatio > BURN_RATE_WARN_THRESHOLD * Math.max(0.01, expectedBurn)) {
    state = "WARN_AT_BURN_RATE";
    recommendation = `Burn rate trending high (${(burnRatio * 100).toFixed(0)}% vs ${(timeRatio * 100).toFixed(0)}% time).`;
  }

  return {
    state,
    burnRatio,
    timeRatio,
    revenuePacing,
    recommendation,
    regretWindowFlag,
  };
}

async function aggregateBudgetSpent(campaignId: string): Promise<number> {
  // Fallback non-throwing : MVP retourne 0 plutôt que casser le gate Loi 3.
  try {
    const executions = await db.campaignExecution.findMany({
      where: { campaignId },
      select: { devisAmount: true },
    });
    const exec = executions.reduce((acc, e) => acc + (Number(e.devisAmount) || 0), 0);
    const fieldOps = await db.campaignFieldOp.findMany({
      where: { campaignId },
      select: { budget: true },
    });
    const field = fieldOps.reduce((acc, f) => acc + (Number(f.budget) || 0), 0);
    return exec + field;
  } catch {
    return 0;
  }
}

async function computeRevenuePacing(campaignId: string, aarrTargets: unknown): Promise<number | null> {
  try {
    const metrics = await db.campaignAARRMetric.findMany({
      where: { campaignId, stage: "REVENUE" },
      orderBy: { measuredAt: "desc" as const },
      take: 10,
      select: { value: true, target: true },
    });
    if (metrics.length === 0) return null;
    const sumValue = metrics.reduce((acc, m) => acc + Number(m.value || 0), 0);
    const sumTarget = metrics.reduce((acc, m) => acc + Number(m.target || 0), 0);
    if (sumTarget <= 0) {
      const target = extractRevenueTarget(aarrTargets);
      if (target && target > 0) return sumValue / target;
      return null;
    }
    return sumValue / sumTarget;
  } catch {
    return null;
  }
}

function extractRevenueTarget(aarrTargets: unknown): number | null {
  if (typeof aarrTargets !== "object" || aarrTargets === null) return null;
  const t = (aarrTargets as Record<string, unknown>).REVENUE ?? (aarrTargets as Record<string, unknown>).revenue;
  return typeof t === "number" ? t : null;
}

function isInRegretWindow(elapsedMs: number): boolean {
  const days = elapsedMs / (1000 * 60 * 60 * 24);
  return [3, 7, 14].some((d) => Math.abs(days - d) < 0.5);
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster pauseFlameOut (THOT_PAUSE_CAMPAIGN_FLAME_OUT)
// ─────────────────────────────────────────────────────────────────────────

interface PauseFlameOutInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
  readonly reason: string;
}

interface PauseFlameOutOutput {
  readonly campaignId: string;
  readonly killTriggeredAt: string;
  readonly previousStatus: string;
  readonly idempotent: boolean;
}

export async function pauseFlameOut(input: PauseFlameOutInput): Promise<PauseFlameOutOutput> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, status: true, killTriggeredAt: true, strategyId: true },
  });

  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} does not belong to strategy ${input.strategyId}`);
  }

  if (campaign.killTriggeredAt) {
    return {
      campaignId: campaign.id,
      killTriggeredAt: campaign.killTriggeredAt.toISOString(),
      previousStatus: campaign.status,
      idempotent: true,
    };
  }

  const now = new Date();
  await db.campaign.update({
    where: { id: campaign.id },
    data: {
      killTriggeredAt: now,
      status: "PAUSED",
    },
  });

  return {
    campaignId: campaign.id,
    killTriggeredAt: now.toISOString(),
    previousStatus: campaign.status,
    idempotent: false,
  };
}
