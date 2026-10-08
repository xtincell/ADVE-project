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
import { Prisma, type GenerativeTask } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import {
  checkManipulationCoherence,
  ensurePillarSource,
} from "./governance";
import { evaluateBudget, BudgetGateVetoError } from "./routing/budget-gate";
import { selectProvider, NoAvailableProviderError } from "./routing/provider-selector";
import {
  attachProviderTask,
  createAssetVersion,
  createGenerativeTask,
  findCachedTask,
  findTaskById,
  findTaskByProviderTaskId,
  generateWebhookSecret,
  markDeferred,
  markFailed,
  updateProviderHealth,
} from "./task-store";
import type {
  ForgeBrief,
  ForgeKind,
  ForgeReconciled,
  ForgeTaskCreated,
  ManipulationMode,
  MaterializeBriefPayload,
  ProviderName,
} from "./types";
import { PILLAR_KEYS, type PillarKey } from "@/domain";
import { FORGE_KINDS, MANIPULATION_MODES } from "./types";

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
  const strategy = await db.strategy.findUnique({ where: { id: payload.strategyId }, select: { operatorId: true } });
  if (!strategy || strategy.operatorId !== ctx.operatorId) throw new Error("PTAH_TASK_SCOPE_MISMATCH");
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

  // Ship-able sans clés (ADR-0021) : `selectProvider` LÈVE
  // `NoAvailableProviderError` quand aucun provider du kind n'est configuré
  // (ex. génération d'image sans `OPENAI_API_KEY` — routing exclusif OpenAI).
  // On convertit ce throw en forge DIFFÉRÉE (task tracée + retriable), au lieu
  // de crasher la cascade. Depuis l'audit 2026-07-16, Magnific SANS clé n'est
  // plus disponible (mock gaté derrière PTAH_ALLOW_MOCK_FORGE=1) — ce chemin
  // couvre donc aussi les kinds Magnific sans credentials.
  let provider: Awaited<ReturnType<typeof selectProvider>>;
  try {
    provider = await selectProvider(payload.brief);
  } catch (e) {
    if (e instanceof NoAvailableProviderError) {
      const nominal: ProviderName = e.tried[0] ?? "magnific";
      const deferredSecret = generateWebhookSecret();
      const deferredTask = await createGenerativeTask({
        intentId: ctx.intentId,
        sourceIntentId: payload.sourceIntentId,
        operatorId: ctx.operatorId,
        strategyId: payload.strategyId,
        brief: payload.brief,
        provider: nominal,
        providerModel: payload.brief.forgeSpec.modelHint ?? "default",
        estimatedCostUsd: 0,
        expectedSuperfans: 0,
        webhookSecret: deferredSecret,
      });
      await markDeferred(
        deferredTask.id,
        `AWAITING_CREDENTIALS: aucun provider disponible pour le kind "${payload.brief.forgeSpec.kind}" (essayés: ${e.tried.join(", ")}) — ADR-0021.`,
      );
      return {
        taskId: deferredTask.id,
        provider: nominal,
        providerModel: payload.brief.forgeSpec.modelHint ?? "default",
        estimatedCostUsd: 0,
        status: "DEFERRED",
        webhookSecret: deferredSecret,
      };
    }
    throw e;
  }
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

  // NB : le deferral « ship-able sans clés » (ADR-0021) est désormais traité EN
  // AMONT via le catch `NoAvailableProviderError` autour de `selectProvider`
  // (qui filtre déjà par `isAvailable`). Ici le provider est garanti disponible.

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

    // Provider SYNCHRONE (OpenAI Images) : le résultat est déjà prêt
    // (providerTaskId = URL). Aucun webhook ne viendra → on réconcilie inline
    // pour matérialiser l'asset (markCompleted + AssetVersion + BrandAsset).
    // Le forge ayant réussi, un échec de réconciliation n'est PAS fatal :
    // l'URL est stockée, la task reste réconciliable plus tard.
    if (provider.sync) {
      const { emitIntent } = await import("../mestor/intents");
      await emitIntent({ kind: "PTAH_RECONCILE_TASK", strategyId: payload.strategyId,
        taskId: task.id, webhookPayload: null }, { caller: "ptah:sync", operatorId: ctx.operatorId }).then((receipt) => {
        if (receipt.status !== "OK") throw new Error(receipt.reason ?? receipt.summary);
      }).catch((e) => {
        console.warn(
          `[ptah] inline reconcile (sync provider ${provider.name}) failed:`,
          e instanceof Error ? e.message : e,
        );
      });
    }

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
  scope?: { strategyId: string },
): Promise<ForgeReconciled> {
  const task = await findTaskById(taskId);
  if (!task) throw new Error("PTAH_TASK_NOT_FOUND");
  await assertTaskScope(db, task, scope?.strategyId);

  // Provider results are checkpointed separately from admission. An interrupted
  // admission retries from this receipt, never by launching another forge.
  if (task.resultUrls === null) {
    const provider = (await import("./providers")).getProvider(task.provider as ProviderName);
    let receipt: ReturnType<typeof validateReceipt>;
    try {
      const result = await provider.reconcile(task.providerTaskId ?? "", webhookPayload);
      receipt = validateReceipt(result.resultUrls, result.realisedCostUsd);
    } catch (error) {
      // A concurrent successful receipt wins over a later failed poll.
      const failed = await db.generativeTask.updateMany({ where: { id: task.id,
        resultUrls: { equals: Prisma.DbNull }, status: { in: ["CREATED", "IN_PROGRESS", "FAILED"] } },
      data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : String(error) } });
      if (failed.count) await updateProviderHealth(task.provider as ProviderName, { failure: true });
      throw error;
    }
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "GenerativeTask" WHERE id=${task.id} FOR UPDATE`;
      const current = await tx.generativeTask.findUniqueOrThrow({ where: { id: task.id } });
      await assertTaskScope(tx, current, scope?.strategyId);
      if (current.resultUrls !== null) {
        const saved = validateReceipt(current.resultUrls, current.realisedCostUsd);
        if (JSON.stringify(saved) !== JSON.stringify(receipt)) throw new Error("PTAH_RESULT_CONFLICT");
        return;
      }
      await tx.generativeTask.update({ where: { id: task.id }, data: {
        resultUrls: receipt.resultUrls, realisedCostUsd: receipt.realisedCostUsd,
        status: "IN_PROGRESS", completedAt: null, errorMessage: null,
      } });
    });
  }

  try { return await db.$transaction(async (tx) => {
    // Vault mutations share this mutex; serialize one task's callbacks too.
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${task.strategyId} FOR SHARE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"brand-vault:" + task.strategyId}, 0))`;
    await tx.$queryRaw`SELECT id FROM "GenerativeTask" WHERE id=${task.id} FOR UPDATE`;
    const current = await tx.generativeTask.findUniqueOrThrow({ where: { id: task.id } });
    if (current.strategyId !== task.strategyId || current.operatorId !== task.operatorId) throw new Error("PTAH_TASK_SCOPE_CHANGED");
    await assertTaskScope(tx, current, scope?.strategyId);
    const receipt = validateReceipt(current.resultUrls, current.realisedCostUsd);
    const versions = await tx.assetVersion.findMany({ where: { generativeTaskId: task.id } });
    if (versions.some((v) => v.strategyId !== current.strategyId || v.operatorId !== current.operatorId
      || v.kind !== forgeKindToAssetKind(current.forgeKind) || !receipt.resultUrls.includes(v.url)) || new Set(versions.map((v) => v.url)).size !== versions.length) {
      throw new Error("PTAH_VERSION_CONFLICT");
    }
    const { createBrandAsset } = await import("../brand-vault/engine");
    const materialKindMap: Record<string, string> = {
      image: "KV_VISUAL", video: "VIDEO_SPOT", audio: "AUDIO_JINGLE", icon: "ICON",
      refine: "KV_VISUAL", transform: "KV_VISUAL", design: "DESIGN_EXPORT",
      stock: "STOCK_ASSET", classify: "CLASSIFICATION_REPORT",
    };
    const assetVersionIds: string[] = [];
    for (const url of receipt.resultUrls) {
      const version = versions.find((v) => v.url === url) ?? await createAssetVersion({
        parentAssetId: null, generativeTaskId: current.id, operatorId: current.operatorId,
        strategyId: current.strategyId, kind: forgeKindToAssetKind(current.forgeKind), url,
        metadata: { provider: current.provider, model: current.providerModel },
      }, tx);
      const assets = await tx.brandAsset.findMany({ where: { sourceAssetVersionId: version.id } });
      if (assets.length > 1 || assets.some((asset) => asset.strategyId !== current.strategyId
        || asset.operatorId !== current.operatorId || asset.campaignId !== current.campaignId
        || asset.briefId !== current.briefId || asset.sourceIntentId !== current.intentId
        || asset.kind !== (materialKindMap[current.forgeKind] ?? "GENERIC") || asset.family !== "MATERIAL")) {
        throw new Error("PTAH_VAULT_CONFLICT");
      }
      // An admitted asset keeps its current lifecycle (including ARCHIVED).
      if (!assets.length) await createBrandAsset({
        strategyId: current.strategyId!, operatorId: current.operatorId,
        name: `${current.forgeKind} forge — ${current.providerModel}`,
        kind: materialKindMap[current.forgeKind] ?? "GENERIC", format: current.forgeKind,
        family: "MATERIAL", fileUrl: version.cdnUrl ?? version.url,
        summary: `Forgé via ${current.provider}/${current.providerModel}`,
        pillarSource: current.pillarSource as PillarKey,
        manipulationMode: current.manipulationMode as ManipulationMode,
        state: "ACTIVE", sourceIntentId: current.intentId, sourceAssetVersionId: version.id,
        campaignId: current.campaignId ?? undefined, briefId: current.briefId ?? undefined,
        metadata: { provider: current.provider, providerModel: current.providerModel,
          realisedCostUsd: receipt.realisedCostUsd, sourceBrandAssetId: current.sourceBrandAssetId },
      }, tx);
      assetVersionIds.push(version.id);
    }
    const context = `ptah:${current.forgeKind}:${current.id}`;
    const logs = await tx.aICostLog.findMany({ where: { context } });
    if (logs.length > 1 || logs.some((log) => log.strategyId !== current.strategyId)) {
      throw new Error("PTAH_COST_RECEIPT_CONFLICT");
    }
    if (!logs.length) {
      const { track } = await import("../ai-cost-tracker");
      await track({ model: current.providerModel, provider: current.provider, inputTokens: 0,
        outputTokens: 0, realisedCostUsd: receipt.realisedCostUsd, context, strategyId: current.strategyId! }, tx);
    } else if (logs[0]!.provider !== current.provider || logs[0]!.cost !== receipt.realisedCostUsd) {
      // Repair the old zero-token Anthropic-shaped receipt using the saved result,
      // never an estimate or a fresh provider charge.
      if (logs[0]!.provider !== "anthropic" || logs[0]!.inputTokens !== 0 || logs[0]!.outputTokens !== 0
        || logs[0]!.cost !== 0) throw new Error("PTAH_COST_RECEIPT_CONFLICT");
      await tx.aICostLog.update({ where: { id: logs[0]!.id }, data: {
        provider: current.provider, model: current.providerModel, cost: receipt.realisedCostUsd,
      } });
    }
    if (current.status !== "COMPLETED") await updateProviderHealth(current.provider as ProviderName,
      { success: true, cost: receipt.realisedCostUsd }, tx);
    // Terminal status, versions, vault entries and cost receipt commit together.
    await tx.generativeTask.update({ where: { id: current.id }, data: {
      status: "COMPLETED", completedAt: current.completedAt ?? new Date(), errorMessage: null,
    } });
    return { taskId: current.id, assetVersionIds, ...receipt };
  }, { timeout: 15_000 });
  } catch (error) {
    await db.generativeTask.updateMany({ where: { id: task.id, status: { not: "COMPLETED" } },
      data: { errorMessage: error instanceof Error ? error.message : String(error) } });
    throw error;
  }
}

function validateReceipt(urls: unknown, cost: unknown): { resultUrls: string[]; realisedCostUsd: number } {
  if (!Array.isArray(urls) || !urls.length || new Set(urls).size !== urls.length
    || typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) throw new Error("PTAH_INVALID_RESULT");
  for (const url of urls) {
    if (typeof url !== "string" || !url.length) throw new Error("PTAH_INVALID_RESULT");
    // OpenAI's existing synchronous path can return an embedded image.
    if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(url)) continue;
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error("PTAH_INVALID_RESULT"); }
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new Error("PTAH_INVALID_RESULT");
    }
  }
  return { resultUrls: urls as string[], realisedCostUsd: cost };
}

async function assertTaskScope(client: Prisma.TransactionClient, task: GenerativeTask, strategyId?: string) {
  if (!(FORGE_KINDS as readonly string[]).includes(task.forgeKind)
    || !(PILLAR_KEYS as readonly string[]).includes(task.pillarSource)
    || !(MANIPULATION_MODES as readonly string[]).includes(task.manipulationMode)) throw new Error("PTAH_TASK_PROVENANCE_INVALID");
  if (["VETOED", "EXPIRED"].includes(task.status)) throw new Error("PTAH_TASK_NOT_RECONCILABLE");
  if (!task.strategyId || (strategyId && task.strategyId !== strategyId)) throw new Error("PTAH_TASK_SCOPE_MISMATCH");
  const strategy = await client.strategy.findUnique({ where: { id: task.strategyId }, select: { operatorId: true } });
  if (!strategy || strategy.operatorId !== task.operatorId) throw new Error("PTAH_TASK_SCOPE_MISMATCH");
  if (task.campaignId) {
    const campaign = await client.campaign.findUnique({ where: { id: task.campaignId }, select: { strategyId: true } });
    if (campaign?.strategyId !== task.strategyId) throw new Error("PTAH_CAMPAIGN_SCOPE_MISMATCH");
  }
  if (task.briefId) {
    const brief = await client.campaignBrief.findUnique({ where: { id: task.briefId }, include: { campaign: true } });
    if (!brief || brief.campaign.strategyId !== task.strategyId || brief.campaignId !== task.campaignId) {
      throw new Error("PTAH_BRIEF_SCOPE_MISMATCH");
    }
  }
  if (task.sourceBrandAssetId) {
    const source = await client.brandAsset.findUnique({ where: { id: task.sourceBrandAssetId } });
    if (!source || source.strategyId !== task.strategyId || source.operatorId !== task.operatorId
      || source.campaignId !== task.campaignId || source.briefId !== task.briefId) throw new Error("PTAH_SOURCE_SCOPE_MISMATCH");
  }
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
    where: { id: payload.assetVersionId, operatorId: ctx.operatorId, strategyId: payload.strategyId },
    include: { generativeTask: true },
  });
  if (!original) {
    throw new Error(`Ptah regenerate: AssetVersion ${payload.assetVersionId} not found`);
  }
  if (!original.generativeTask) {
    throw new Error(`Ptah regenerate: AssetVersion has no source GenerativeTask`);
  }
  // Re-construire un brief depuis le task original (simplifié — Phase H raffinement)
  const brief: ForgeBrief = {
    briefText: `[REGEN] Asset fading detected — refresh narrative & visuals while preserving brand identity.`,
    forgeSpec: {
      kind: original.kind as ForgeKind,
      providerHint: original.generativeTask.provider as ProviderName,
      modelHint: original.generativeTask.providerModel ?? undefined,
      parameters: original.generativeTask.parameters as Record<string, unknown>,
    },
    pillarSource: original.generativeTask.pillarSource as PillarKey,
    manipulationMode: original.generativeTask.manipulationMode as ManipulationMode,
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
  const expected = Buffer.from(task?.webhookSecret ?? "");
  const supplied = Buffer.from(secret);
  if (!task || !expected.length || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return { ok: false, task: null };
  }
  return { ok: true, task };
}

export { findTaskByProviderTaskId };
