import type { BrandAsset, Prisma } from "@prisma/client";

const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown) => typeof v === "string" && v.trim() ? v : null;

/** Reads only recorded authorship. Importing an asset does not make its uploader its author. */
export function assetAuthorship(input: { content: unknown; gloryOutput?: unknown; material?: { provider: string; providerModel: string } | null; depositorName?: string | null }) {
  const meta = object(object(input.gloryOutput ?? input.content)._meta);
  return {
    producer: input.material ? "Ptah" : input.gloryOutput ? "Glory · Artemis" : null,
    provider: input.material?.provider ?? text(meta.provider),
    model: input.material?.providerModel ?? text(meta.model),
    generatedAt: text(meta.generatedAt),
    depositedBy: input.depositorName ?? null,
  };
}

/** Caller must enforce brand access before reading this dossier. Every scalar
 * provenance link is resolved within the same strategy, including legacy rows. */
export async function loadAssetDossier(client: Prisma.TransactionClient, asset: BrandAsset) {
  const [glory, material, upload, related, tasks, deliverables, campaign, brief] = await Promise.all([
    asset.sourceGloryOutputId ? client.gloryOutput.findFirst({ where: { id: asset.sourceGloryOutputId, strategyId: asset.strategyId }, select: { id: true, toolSlug: true, output: true, createdAt: true, executionId: true } }) : null,
    asset.sourceAssetVersionId ? client.assetVersion.findFirst({ where: { id: asset.sourceAssetVersionId, strategyId: asset.strategyId }, select: { id: true, parentAssetId: true, createdAt: true, generativeTask: { select: { id: true, strategyId: true, provider: true, providerModel: true } } } }) : null,
    client.fileUpload.findFirst({ where: { entityType: "BRAND_ASSET", entityId: asset.id }, select: { uploaderId: true } }),
    client.brandAsset.findMany({ where: { strategyId: asset.strategyId, OR: [
      { id: { in: [asset.parentBrandAssetId, asset.supersededById].filter((id): id is string => !!id) } },
      { parentBrandAssetId: asset.id }, { supersededById: asset.id },
    ] }, orderBy: [{ version: "asc" }, { createdAt: "asc" }], take: 101, select: { id: true, name: true, version: true, state: true, createdAt: true } }),
    client.generativeTask.findMany({ where: { strategyId: asset.strategyId, sourceBrandAssetId: asset.id }, orderBy: { createdAt: "desc" }, take: 51, select: { id: true, forgeKind: true, status: true, createdAt: true } }),
    client.campaignDeliverable.findMany({ where: { brandAssetId: asset.id, campaign: { strategyId: asset.strategyId } }, take: 51, select: { id: true, deliverableType: true, status: true, campaignId: true, campaign: { select: { name: true } } } }),
    asset.campaignId ? client.campaign.findFirst({ where: { id: asset.campaignId, strategyId: asset.strategyId }, select: { id: true, name: true } }) : null,
    asset.briefId ? client.campaignBrief.findFirst({ where: { id: asset.briefId, campaign: { strategyId: asset.strategyId } }, select: { id: true, title: true, version: true } }) : null,
  ]);
  const userIds = [upload?.uploaderId, asset.selectedById].filter((id): id is string => !!id);
  const users = userIds.length ? await client.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
  const userName = (id: string | null | undefined) => id ? users.find(user => user.id === id)?.name ?? "Compte identifié" : null;
  const materialTask = material?.generativeTask?.strategyId === asset.strategyId ? material.generativeTask : null;
  return {
    governor: "MESTOR" as const,
    authorship: assetAuthorship({ content: asset.content, gloryOutput: glory?.output, material: materialTask, depositorName: userName(upload?.uploaderId) }),
    source: { tool: glory?.toolSlug ?? null, generatedAt: glory?.createdAt ?? material?.createdAt ?? null, executionId: glory?.executionId ?? null, materialVersionId: material?.id ?? null },
    selection: { by: userName(asset.selectedById), at: asset.selectedAt, reason: asset.selectedReason },
    versions: related.slice(0, 100), versionsTruncated: related.length > 100,
    usages: { tasks: tasks.slice(0, 50), deliverables: deliverables.slice(0, 50), truncated: tasks.length > 50 || deliverables.length > 50, campaign, brief },
  };
}
