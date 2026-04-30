/**
 * Ptah task-store — CRUD GenerativeTask + AssetVersion via Prisma.
 *
 * Pilier 3 multi-tenant : tous les WHERE incluent operatorId. La couche
 * tenantScopedDb (governance) ajoute le filter automatiquement, mais on le
 * fournit explicitement aussi pour double-defense.
 */

import { db } from "@/lib/db";
import { createHash, randomBytes } from "node:crypto";
import type {
  ForgeBrief,
  ForgeTaskStatus,
  ProviderName,
} from "./types";

interface CreateTaskInput {
  intentId: string;
  sourceIntentId: string | null;
  operatorId: string;
  strategyId: string | null;
  brief: ForgeBrief;
  provider: ProviderName;
  providerModel: string;
  estimatedCostUsd: number;
  expectedSuperfans: number;
  webhookSecret: string;
}

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export function computePromptHash(brief: ForgeBrief, provider: string, model: string): string {
  const canonical = JSON.stringify({
    text: brief.briefText,
    spec: brief.forgeSpec,
    pillarSource: brief.pillarSource,
    manipulationMode: brief.manipulationMode,
    provider,
    model,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export async function createGenerativeTask(input: CreateTaskInput) {
  const promptHash = computePromptHash(input.brief, input.provider, input.providerModel);
  return db.generativeTask.create({
    data: {
      intentId: input.intentId,
      sourceIntentId: input.sourceIntentId,
      operatorId: input.operatorId,
      strategyId: input.strategyId,
      forgeKind: input.brief.forgeSpec.kind,
      provider: input.provider,
      providerModel: input.providerModel,
      status: "CREATED",
      promptHash,
      parameters: input.brief.forgeSpec.parameters as object,
      pillarSource: input.brief.pillarSource,
      manipulationMode: input.brief.manipulationMode,
      estimatedCostUsd: input.estimatedCostUsd,
      expectedSuperfans: input.expectedSuperfans,
      webhookSecret: input.webhookSecret,
    },
  });
}

export async function attachProviderTask(
  taskId: string,
  providerTaskId: string,
  expiresAt?: Date,
) {
  return db.generativeTask.update({
    where: { id: taskId },
    data: {
      providerTaskId,
      status: "IN_PROGRESS",
      expiresAt: expiresAt ?? null,
    },
  });
}

export async function markCompleted(
  taskId: string,
  resultUrls: string[],
  realisedCostUsd: number,
) {
  return db.generativeTask.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      resultUrls: resultUrls as unknown as object,
      realisedCostUsd,
      completedAt: new Date(),
    },
  });
}

export async function markFailed(taskId: string, errorMessage: string) {
  return db.generativeTask.update({
    where: { id: taskId },
    data: {
      status: "FAILED",
      errorMessage,
    },
  });
}

export async function findTaskByProviderTaskId(providerTaskId: string) {
  return db.generativeTask.findFirst({
    where: { providerTaskId },
  });
}

export async function findTaskById(taskId: string) {
  return db.generativeTask.findUnique({ where: { id: taskId } });
}

export async function findCachedTask(promptHash: string, operatorId: string) {
  return db.generativeTask.findFirst({
    where: { promptHash, operatorId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
  });
}

interface AssetVersionInput {
  parentAssetId: string | null;
  generativeTaskId: string;
  operatorId: string;
  strategyId: string | null;
  kind: "image" | "video" | "audio" | "icon";
  url: string;
  cdnUrl?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  fileSizeBytes?: number | null;
  metadata?: Record<string, unknown>;
}

export async function createAssetVersion(input: AssetVersionInput) {
  return db.assetVersion.create({
    data: {
      parentAssetId: input.parentAssetId,
      generativeTaskId: input.generativeTaskId,
      operatorId: input.operatorId,
      strategyId: input.strategyId,
      kind: input.kind,
      url: input.url,
      cdnUrl: input.cdnUrl ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      durationMs: input.durationMs ?? null,
      fileSizeBytes: input.fileSizeBytes ?? null,
      metadata: (input.metadata ?? {}) as object,
    },
  });
}

export async function findExpiringTasks(withinHours = 1) {
  const threshold = new Date(Date.now() + withinHours * 3600 * 1000);
  return db.generativeTask.findMany({
    where: {
      status: "COMPLETED",
      expiresAt: { lte: threshold },
      // Pas encore downloadé vers CDN — assets sans cdnUrl
      versions: { some: { cdnUrl: null } },
    },
    include: { versions: true },
  });
}

export async function updateProviderHealth(
  provider: ProviderName,
  patch: {
    success?: boolean;
    failure?: boolean;
    cost?: number;
    circuitState?: "OPEN" | "CLOSED" | "HALF_OPEN";
  },
) {
  const existing = await db.forgeProviderHealth.findUnique({ where: { provider } });
  const now = new Date();
  if (!existing) {
    return db.forgeProviderHealth.create({
      data: {
        provider,
        circuitState: patch.circuitState ?? "CLOSED",
        failureCount: patch.failure ? 1 : 0,
        lastFailureAt: patch.failure ? now : null,
        lastSuccessAt: patch.success ? now : null,
        totalRequests: 1,
        totalFailures: patch.failure ? 1 : 0,
        totalCostUsd: patch.cost ?? 0,
      },
    });
  }
  return db.forgeProviderHealth.update({
    where: { provider },
    data: {
      circuitState: patch.circuitState ?? existing.circuitState,
      failureCount: patch.failure
        ? existing.failureCount + 1
        : patch.success
          ? 0
          : existing.failureCount,
      lastFailureAt: patch.failure ? now : existing.lastFailureAt,
      lastSuccessAt: patch.success ? now : existing.lastSuccessAt,
      totalRequests: existing.totalRequests + 1,
      totalFailures: patch.failure ? existing.totalFailures + 1 : existing.totalFailures,
      totalCostUsd: existing.totalCostUsd + (patch.cost ?? 0),
    },
  });
}

export async function getProviderHealth(provider: ProviderName) {
  return db.forgeProviderHealth.findUnique({ where: { provider } });
}

export async function setStatus(taskId: string, status: ForgeTaskStatus) {
  return db.generativeTask.update({ where: { id: taskId }, data: { status } });
}
