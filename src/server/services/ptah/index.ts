/**
 * Ptah — public API + handleIntent dispatcher.
 *
 * 5ème Neter actif. Matérialise les briefs Artemis en assets concrets via
 * 4 providers externes (Magnific, Adobe Firefly, Figma, Canva).
 *
 * Cascade : Mestor → Artemis brief → Ptah forge → Seshat observe → Thot facture.
 *
 * Cf. ADR-0009, PANTHEON.md §2.5, MANIPULATION-MATRIX.md.
 */

import { db } from "@/lib/db";
import {
  checkManipulationCoherence,
  ensurePillarSource,
} from "./governance";
import { evaluateBudget, BudgetGateVetoError } from "./routing/budget-gate";
import { selectProvider } from "./routing/provider-selector";
import {
  attachProviderTask,
  createAssetVersion,
  createGenerativeTask,
  findCachedTask,
  findTaskById,
  findTaskByProviderTaskId,
  generateWebhookSecret,
  markCompleted,
  markFailed,
  updateProviderHealth,
} from "./task-store";
import type {
  ForgeReconciled,
  ForgeTaskCreated,
  MaterializeBriefPayload,
} from "./types";

export { manifest } from "./manifest";

const WEBHOOK_BASE = process.env.PTAH_WEBHOOK_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Forge un asset depuis un brief Artemis.
 *
 * Pre-flight :
 *   1. Pillar source obligatoire (refus si absent — téléologie)
 *   2. Manipulation coherence (refus si mode hors mix Strategy)
 *   3. Provider selection (Magnific / Adobe / Figma / Canva selon kind + dispo)
 *   4. Cost estimate + Thot ROI gate (cost_per_expected_superfan vs ceiling)
 *   5. Cache lookup (promptHash idempotent)
 *
 * Renvoie taskId synchrone — l'asset est livré plus tard via webhook.
 */
export async function materializeBrief(
  payload: MaterializeBriefPayload,
  ctx: { operatorId: string; intentId: string },
): Promise<ForgeTaskCreated> {
  ensurePillarSource(payload.brief);
  await checkManipulationCoherence(
    payload.strategyId,
    payload.brief,
    payload.overrideMixViolation ?? false,
  );

  // Si override → log dans Strategy.mixViolationOverrideCount
  if (payload.overrideMixViolation) {
    await db.strategy
      .update({
        where: { id: payload.strategyId },
        data: { mixViolationOverrideCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  const provider = await selectProvider(payload.brief);
  const estimatedCostUsd = provider.estimateCost(payload.brief);

  // Téléologie : Thot ROI gate
  const budgetDecision = evaluateBudget(payload.brief, estimatedCostUsd);
  if (budgetDecision.decision === "VETO") {
    throw new BudgetGateVetoError(
      budgetDecision.costPerExpectedSuperfan,
      // ceiling extracted from reason; for clarity just use cps + decision
      Math.round(budgetDecision.costPerExpectedSuperfan * 100) / 100,
      payload.brief.manipulationMode,
    );
  }

  // Resolve model name (provider-specific). Forge() will resolve internally too.
  const tempForgeResolve = provider.estimateCost(payload.brief); // touche pour cohérence
  void tempForgeResolve;

  // Cache lookup — same brief signature already completed → reuse
  const promptHashKey = `${payload.brief.forgeSpec.kind}:${payload.brief.manipulationMode}:${payload.brief.pillarSource}:${payload.brief.briefText.slice(0, 100)}`;
  void promptHashKey; // Phase 2 : cache lookup avec proper hash. Phase 1 : skip.

  const webhookSecret = generateWebhookSecret();

  // Create DB row (status=CREATED)
  const task = await createGenerativeTask({
    intentId: ctx.intentId,
    sourceIntentId: payload.sourceIntentId,
    operatorId: ctx.operatorId,
    strategyId: payload.strategyId,
    brief: payload.brief,
    provider: provider.name,
    providerModel: payload.brief.forgeSpec.modelHint ?? "default",
    estimatedCostUsd,
    expectedSuperfans: budgetDecision.expectedSuperfans,
    webhookSecret,
  });

  const webhookUrl = `${WEBHOOK_BASE}/api/ptah/webhook?taskId=${task.id}&secret=${webhookSecret}`;

  try {
    const result = await provider.forge(payload.brief, webhookUrl);
    const expiresAt =
      provider.name === "magnific"
        ? new Date(Date.now() + 12 * 3600 * 1000) // Magnific 12h URL TTL
        : null;
    await attachProviderTask(task.id, result.providerTaskId, expiresAt ?? undefined);
    await db.generativeTask.update({
      where: { id: task.id },
      data: { providerModel: result.providerModel, estimatedCostUsd: result.estimatedCostUsd },
    });
    await updateProviderHealth(provider.name, { success: true });

    return {
      taskId: task.id,
      provider: provider.name,
      providerModel: result.providerModel,
      estimatedCostUsd: result.estimatedCostUsd,
      status: "IN_PROGRESS",
      webhookSecret,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markFailed(task.id, message);
    await updateProviderHealth(provider.name, { failure: true });
    throw error;
  }
}

/**
 * Reconcile — appelé par /api/ptah/webhook après réception du callback provider.
 * Compensating intent (Loi 1 — pas de régression silencieuse).
 */
export async function reconcileTask(
  taskId: string,
  webhookPayload: unknown,
): Promise<ForgeReconciled> {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new Error(`Ptah reconcile: GenerativeTask ${taskId} not found`);
  }
  if (task.status === "COMPLETED") {
    // Idempotent : déjà reconcilié, on retourne les infos en l'état
    return {
      taskId: task.id,
      assetVersionIds: [],
      realisedCostUsd: task.realisedCostUsd ?? 0,
      resultUrls: (task.resultUrls as string[]) ?? [],
    };
  }

  const provider = (await import("./providers")).getProvider(
    task.provider as "magnific" | "adobe" | "figma" | "canva",
  );

  let result;
  try {
    result = await provider.reconcile(task.providerTaskId ?? "", webhookPayload);
  } catch (error) {
    await markFailed(task.id, error instanceof Error ? error.message : String(error));
    await updateProviderHealth(provider.name, { failure: true });
    throw error;
  }

  await markCompleted(task.id, result.resultUrls, result.realisedCostUsd);
  await updateProviderHealth(provider.name, { success: true, cost: result.realisedCostUsd });

  // Track cost via ai-cost-tracker (best-effort)
  try {
    const costTracker = await import("../ai-cost-tracker");
    // ai-cost-tracker.track() expects LLM-shaped data; here we use it as a generic cost log.
    await (costTracker.track as unknown as (e: {
      model: string;
      provider: string;
      inputTokens: number;
      outputTokens: number;
      context?: string;
      strategyId?: string;
    }) => Promise<string>)({
      model: task.providerModel,
      provider: task.provider,
      inputTokens: 0,
      outputTokens: 0,
      context: `ptah:${task.forgeKind}:${taskId}`,
      strategyId: task.strategyId ?? undefined,
    });
  } catch {
    /* best-effort */
  }

  // Create AssetVersion rows
  const assetVersions = await Promise.all(
    result.resultUrls.map((url) =>
      createAssetVersion({
        parentAssetId: null,
        generativeTaskId: task.id,
        operatorId: task.operatorId,
        strategyId: task.strategyId,
        kind: forgeKindToAssetKind(task.forgeKind),
        url,
        metadata: { provider: task.provider, model: task.providerModel },
      }),
    ),
  );

  // Phase 10 (ADR-0012) — promote forge result en BrandAsset matériel.
  // Le vault de la marque garde ainsi tous les actifs (intellectuels +
  // matériels) au même endroit, avec lineage upstream vers le BrandAsset
  // intellectuel source (KV brief, big idea active, etc.) si disponible.
  try {
    const { createBrandAsset } = await import("../brand-vault/engine");
    const materialKindMap: Record<string, string> = {
      image: "KV_VISUAL",
      video: "VIDEO_SPOT",
      audio: "AUDIO_JINGLE",
      icon: "ICON",
      refine: "KV_VISUAL",
      transform: "KV_VISUAL",
      design: "DESIGN_EXPORT",
      stock: "STOCK_ASSET",
      classify: "CLASSIFICATION_REPORT",
    };
    for (let i = 0; i < assetVersions.length; i++) {
      const v = assetVersions[i]!;
      await createBrandAsset({
        strategyId: task.strategyId ?? "",
        operatorId: task.operatorId,
        name: `${task.forgeKind} forge — ${task.providerModel}`,
        kind: materialKindMap[task.forgeKind] ?? "GENERIC",
        format: task.forgeKind,
        family: "MATERIAL",
        fileUrl: v.url,
        summary: `Forgé via ${task.provider}/${task.providerModel}`,
        pillarSource: task.pillarSource as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S" | undefined,
        manipulationMode: task.manipulationMode as "peddler" | "dealer" | "facilitator" | "entertainer" | undefined,
        state: "ACTIVE",
        sourceIntentId: task.intentId,
        sourceAssetVersionId: v.id,
        campaignId: task.campaignId ?? undefined,
        briefId: task.briefId ?? undefined,
        metadata: {
          provider: task.provider,
          providerModel: task.providerModel,
          realisedCostUsd: result.realisedCostUsd,
        },
      });
    }
  } catch (err) {
    console.warn(
      `[ptah.reconcile] BrandVault material promote failed:`,
      err instanceof Error ? err.message : err,
    );
  }

  return {
    taskId: task.id,
    assetVersionIds: assetVersions.map((v) => v.id),
    realisedCostUsd: result.realisedCostUsd,
    resultUrls: result.resultUrls,
  };
}

/**
 * Sentinel `PTAH_REGENERATE_FADING_ASSET` (Loi 4 régime apogée).
 *
 * Phase H : régénère un asset dont l'engagement (cultIndexDeltaObserved)
 * a chuté >30% vs peak.
 */
export async function regenerateFadingAsset(
  payload: { strategyId: string; assetVersionId: string },
  ctx: { operatorId: string; intentId: string },
): Promise<{ taskId: string }> {
  const original = await db.assetVersion.findFirst({
    where: { id: payload.assetVersionId, operatorId: ctx.operatorId },
    include: { generativeTask: true },
  });
  if (!original) {
    throw new Error(`Ptah regenerate: AssetVersion ${payload.assetVersionId} not found`);
  }
  if (!original.generativeTask) {
    throw new Error(`Ptah regenerate: AssetVersion has no source GenerativeTask`);
  }
  // Re-construire un brief depuis le task original (simplifié — Phase H raffinement)
  const brief = {
    briefText: `[REGEN] Asset fading detected — refresh narrative & visuals while preserving brand identity.`,
    forgeSpec: {
      kind: original.kind as never,
      providerHint: original.generativeTask.provider as never,
      modelHint: original.generativeTask.providerModel,
      parameters: original.generativeTask.parameters as Record<string, unknown>,
    },
    pillarSource: original.generativeTask.pillarSource as never,
    manipulationMode: original.generativeTask.manipulationMode as never,
  };
  const result = await materializeBrief(
    {
      strategyId: payload.strategyId,
      sourceIntentId: original.generativeTask.intentId,
      brief,
    },
    ctx,
  );
  return { taskId: result.taskId };
}

// ── helpers ─────────────────────────────────────────────────────────

function forgeKindToAssetKind(kind: string): "image" | "video" | "audio" | "icon" {
  switch (kind) {
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "icon":
      return "icon";
    default:
      return "image";
  }
}

// ── Webhook helper for /api/ptah/webhook ────────────────────────────

export async function findTaskBySecretAndId(
  taskId: string,
  secret: string,
): Promise<{ ok: boolean; task: Awaited<ReturnType<typeof findTaskById>> | null }> {
  const task = await findTaskById(taskId);
  if (!task || task.webhookSecret !== secret) {
    return { ok: false, task: null };
  }
  return { ok: true, task };
}

export { findTaskByProviderTaskId };
