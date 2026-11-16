/**
 * Seshat — global brand variation after a confirmed publication.
 *
 * The reviewed package binds the exact material to a network receipt; the
 * synced SocialPost supplies the actual publication date. Two existing brand
 * snapshots bracket that date (after >=24h). This is a correlation, not an
 * effect attributed to the asset, a tool or a number of acquired superfans.
 * Provenance lives in existing AssetVersion.metadata; legacy bare deltas are
 * not evidence. A proved observation is stable across repeated runs.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ASSET_BRAND_OBSERVATION, ASSET_OBSERVATION_WINDOW_MS, assetBrandObservation, readAssetBrandObservation } from "@/domain/asset-brand-observation";
import { SOCIAL_PUBLICATION_PACKAGE, socialPublicationContent } from "@/domain/social-publication-package";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";

export interface ImpactResult {
  scanned: number;
  measured: number;
  skipped: number;
  errors: Array<{ assetVersionId: string; error: string }>;
  durationMs: number;
}

const MAX_BATCH = 100;
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : {};

export async function trackAssetImpacts(): Promise<ImpactResult> {
  const startedAt = Date.now();
  const observedAt = new Date(startedAt);
  const cutoff = new Date(startedAt - ASSET_OBSERVATION_WINDOW_MS);
  const result: ImpactResult = { scanned: 0, measured: 0, skipped: 0, errors: [], durationMs: 0 };
  let cursor: string | undefined;

  // Page through packages: unpublished or previously measured assets must not
  // permanently occupy the first batch and starve later eligible publications.
  while (result.measured < MAX_BATCH) {
    const packages = await db.brandAsset.findMany({
      where: { format: SOCIAL_PUBLICATION_PACKAGE, sourceAssetVersionId: { not: null } },
      select: { id: true, strategyId: true, operatorId: true, sourceAssetVersionId: true, content: true, metadata: true },
      orderBy: { id: "asc" }, take: MAX_BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const packet of packages) {
      result.scanned++;
      try {
        const parsed = socialPublicationContent.safeParse(packet.content);
        const packageMeta = record(packet.metadata);
        if (!parsed.success || !packet.operatorId || parsed.data.material.id !== packet.sourceAssetVersionId || typeof packageMeta.actionId !== "string"
            || !["FACEBOOK", "INSTAGRAM"].includes(parsed.data.platform.toUpperCase())) {
          result.skipped++; continue;
        }
        const content = parsed.data;
        const packageHash = sourceFingerprint({ rawData: packet.content });
        const review = record(packageMeta.editorialReview);
        if (packageMeta.contentHash !== packageHash || review.contentHash !== packageHash
            || typeof review.userId !== "string" || typeof review.reviewedAt !== "string") {
          result.skipped++; continue;
        }
        const version = await db.assetVersion.findFirst({
          where: { id: content.material.id, strategyId: packet.strategyId, operatorId: packet.operatorId, generativeTaskId: content.material.taskId },
          select: { id: true, metadata: true, generativeTask: { select: { sourceBrandAssetId: true, strategyId: true, operatorId: true } } },
        });
        if (!version || version.generativeTask?.sourceBrandAssetId !== content.brief.id
            || version.generativeTask.strategyId !== packet.strategyId || version.generativeTask.operatorId !== packet.operatorId
            || readAssetBrandObservation(version.metadata, version.id, packet.strategyId)) {
          result.skipped++; continue;
        }
        const action = await db.brandAction.findFirst({
          where: { id: packageMeta.actionId, strategyId: packet.strategyId }, select: { id: true, metadata: true },
        });
        const actionMeta = record(action?.metadata), publish = record(actionMeta.socialPublish);
        const target = record(publish.publicationTarget);
        if (!action || actionMeta.publicationPackageId !== packet.id || actionMeta.contentHash !== packageHash
            || publish.publicationPackageId !== packet.id || publish.publicationPackageHash !== packageHash
            || typeof target.connectionId !== "string" || typeof target.accountId !== "string") {
          result.skipped++; continue;
        }
        const receipts = (Array.isArray(publish.results) ? publish.results : []).map(record).filter(receipt =>
          receipt.state === "PUBLISHED" && receipt.platform === content.platform.toUpperCase()
          && receipt.connectionId === target.connectionId && typeof receipt.externalPostId === "string" && receipt.externalPostId.trim());
        if (!receipts.length) { result.skipped++; continue; }
        const post = await db.socialPost.findFirst({
          where: { strategyId: packet.strategyId, connectionId: target.connectionId,
            connection: { strategyId: packet.strategyId, accountId: target.accountId, platform: content.platform.toUpperCase() as "FACEBOOK" | "INSTAGRAM" },
            externalPostId: { in: receipts.map(receipt => String(receipt.externalPostId)) }, publishedAt: { lte: cutoff } },
          orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
          select: { id: true, connectionId: true, externalPostId: true, publishedAt: true },
        });
        if (!post?.publishedAt || post.publishedAt > cutoff) { result.skipped++; continue; }
        const [before, after] = await Promise.all([
          db.cultIndexSnapshot.findFirst({
            where: { strategyId: packet.strategyId, measuredAt: { lt: post.publishedAt } },
            orderBy: [{ measuredAt: "desc" }, { id: "desc" }], select: { id: true, measuredAt: true, compositeScore: true },
          }),
          db.cultIndexSnapshot.findFirst({
            where: { strategyId: packet.strategyId, measuredAt: { gte: new Date(post.publishedAt.getTime() + ASSET_OBSERVATION_WINDOW_MS), lte: observedAt } },
            orderBy: [{ measuredAt: "asc" }, { id: "asc" }], select: { id: true, measuredAt: true, compositeScore: true },
          }),
        ]);
        if (!before || !after) { result.skipped++; continue; }
        const observation = assetBrandObservation.parse({
          schema: ASSET_BRAND_OBSERVATION, assetVersionId: version.id, strategyId: packet.strategyId,
          publication: { packageId: packet.id, packageHash, actionId: action.id, socialPostId: post.id,
            connectionId: post.connectionId, externalPostId: post.externalPostId, publishedAt: post.publishedAt.toISOString() },
          before: { id: before.id, measuredAt: before.measuredAt.toISOString(), score: before.compositeScore },
          after: { id: after.id, measuredAt: after.measuredAt.toISOString(), score: after.compositeScore },
          delta: Math.round((after.compositeScore - before.compositeScore) * 100) / 100,
        });
        // Compare-and-set protects other metadata writers and concurrent cron runs.
        const written = await db.assetVersion.updateMany({
          where: { id: version.id, strategyId: packet.strategyId, metadata: { equals: version.metadata === null ? Prisma.JsonNull : version.metadata } },
          data: { cultIndexDeltaObserved: observation.delta,
            metadata: { ...record(version.metadata), brandVariationObservation: observation } as Prisma.InputJsonValue },
        });
        if (written.count === 1) result.measured++;
        else result.skipped++;
      } catch (error) {
        result.errors.push({ assetVersionId: packet.sourceAssetVersionId ?? packet.id, error: error instanceof Error ? error.message : String(error) });
      }
      if (result.measured >= MAX_BATCH) break;
    }
    if (packages.length < MAX_BATCH) break;
    cursor = packages.at(-1)!.id;
  }
  result.durationMs = Date.now() - startedAt;
  return result;
}
