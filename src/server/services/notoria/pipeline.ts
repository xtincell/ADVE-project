/**
 * NOTORIA Pipeline — Sequential ADVERTIS completion.
 *
 * Stage 1: ADVE_UPDATE (R+T → A,D,V,E) → review gate
 * Stage 2: I_GENERATION (ADVE+R+T → I) → review gate
 * Stage 3: S_SYNTHESIS  (all → S)       → review gate → FULL
 *
 * Pipeline state stored in Strategy.notoriaPipeline JSON field.
 */

import { db } from "@/lib/db";
import { generateBatch } from "./engine";
import type { PipelineState, PipelineStatus, PipelineStageStatus } from "./types";

// ── Read Pipeline State ───────────────────────────────────────────

export async function getPipelineStatus(
  strategyId: string,
): Promise<PipelineStatus> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { notoriaPipeline: true },
  });

  const state = strategy?.notoriaPipeline as PipelineState | null;

  if (!state) {
    return {
      strategyId,
      currentStage: 0,
      stages: [
        { stage: 1, missionType: "ADVE_UPDATE", status: "READY", pendingRecos: 0, completedRecos: 0 },
        { stage: 2, missionType: "I_GENERATION", status: "LOCKED", pendingRecos: 0, completedRecos: 0 },
        { stage: 3, missionType: "S_SYNTHESIS", status: "LOCKED", pendingRecos: 0, completedRecos: 0 },
      ],
    };
  }

  // Enrich with live reco counts
  const stages = await Promise.all(
    state.stages.map(async (s) => {
      if (!s.batchId) {
        return { ...s, pendingRecos: 0, completedRecos: 0 };
      }
      const batch = await db.recommendationBatch.findUnique({
        where: { id: s.batchId },
        select: { pendingCount: true, appliedCount: true, rejectedCount: true },
      });
      return {
        ...s,
        pendingRecos: batch?.pendingCount ?? 0,
        completedRecos: (batch?.appliedCount ?? 0) + (batch?.rejectedCount ?? 0),
      };
    }),
  );

  return {
    strategyId,
    currentStage: state.currentStage,
    stages,
    startedAt: state.startedAt,
  };
}

// ── Launch Pipeline ───────────────────────────────────────────────

export async function launchPipeline(
  strategyId: string,
): Promise<PipelineStatus> {
  // Verify R and T exist
  const rtPillars = await db.pillar.findMany({
    where: { strategyId, key: { in: ["r", "t"] } },
    select: { key: true, content: true },
  });

  const hasR = rtPillars.some((p) => p.key === "r" && p.content);
  const hasT = rtPillars.some((p) => p.key === "t" && p.content);

  if (!hasR && !hasT) {
    throw new Error(
      "R et T sont vides — lancez d'abord la cascade RTIS avant le pipeline Notoria.",
    );
  }

  // Generate ADVE_UPDATE batch (Stage 1)
  const result = await generateBatch({
    strategyId,
    missionType: "ADVE_UPDATE",
  });

  const state: PipelineState = {
    currentStage: 1,
    stages: [
      { stage: 1, missionType: "ADVE_UPDATE", batchId: result.batchId || null, status: result.batchId ? "REVIEW" : "READY" },
      { stage: 2, missionType: "I_GENERATION", batchId: null, status: "LOCKED" },
      { stage: 3, missionType: "S_SYNTHESIS", batchId: null, status: "LOCKED" },
    ],
    startedAt: new Date().toISOString(),
  };

  await db.strategy.update({
    where: { id: strategyId },
    data: { notoriaPipeline: state as unknown as import("@prisma/client").Prisma.InputJsonValue },
  });

  return getPipelineStatus(strategyId);
}

// ── Advance Pipeline ──────────────────────────────────────────────

export async function advancePipeline(
  strategyId: string,
): Promise<PipelineStatus> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { notoriaPipeline: true },
  });

  const state = strategy?.notoriaPipeline as PipelineState | null;
  if (!state) {
    throw new Error("Aucun pipeline actif — lancez launchPipeline d'abord.");
  }

  const currentStageData = state.stages.find(
    (s) => s.stage === state.currentStage,
  );
  if (!currentStageData) {
    throw new Error(`Stage ${state.currentStage} introuvable dans le pipeline.`);
  }

  // Check gate: no PENDING recos in current stage
  if (currentStageData.batchId) {
    const pendingCount = await db.recommendation.count({
      where: { batchId: currentStageData.batchId, status: "PENDING" },
    });
    if (pendingCount > 0) {
      throw new Error(
        `Il reste ${pendingCount} recommandation(s) en attente dans le stage ${state.currentStage}. Traitez-les avant de passer au stage suivant.`,
      );
    }
  }

  // Mark current stage as COMPLETED
  currentStageData.status = "COMPLETED";

  // Advance to next stage
  const nextStage = state.currentStage + 1;
  if (nextStage > 3) {
    // Pipeline complete
    state.currentStage = 4;
    await db.strategy.update({
      where: { id: strategyId },
      data: { notoriaPipeline: state as unknown as import("@prisma/client").Prisma.InputJsonValue },
    });
    return getPipelineStatus(strategyId);
  }

  // Generate next stage batch
  const nextStageData = state.stages.find((s) => s.stage === nextStage);
  if (!nextStageData) {
    throw new Error(`Stage ${nextStage} introuvable.`);
  }

  const missionType = nextStageData.missionType;
  const result = await generateBatch({ strategyId, missionType });

  nextStageData.batchId = result.batchId || null;
  nextStageData.status = result.batchId ? "REVIEW" : "READY";
  state.currentStage = nextStage;

  await db.strategy.update({
    where: { id: strategyId },
    data: { notoriaPipeline: state as unknown as import("@prisma/client").Prisma.InputJsonValue },
  });

  return getPipelineStatus(strategyId);
}
