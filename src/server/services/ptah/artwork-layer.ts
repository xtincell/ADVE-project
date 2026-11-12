/** Preserve the placed photographic layer as a private vault original. It is not a second post. */
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { mediaStoreConfiguration } from "@/lib/encrypted-media-store";
import { assetOriginalReceiptSchema } from "@/domain/source-original";
import type { ProductionArtwork } from "@/domain/production-artwork";
import { createBrandAsset } from "@/server/services/brand-vault/engine";
import { retainOriginalBytes } from "@/server/services/ingestion-pipeline/original";

export async function retainArtworkLayer(
  taskId: string,
  slot: ProductionArtwork,
  png: Buffer,
  providerPhotoHash: string,
  model: string,
) {
  const store = mediaStoreConfiguration();
  if (!store) throw new Error("Le stockage privé du calque de production est indisponible.");
  const hash = createHash("sha256").update(png).digest("hex");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "GenerativeTask" WHERE id=${taskId} FOR UPDATE`;
    const task = await tx.generativeTask.findUniqueOrThrow({ where: { id: taskId } });
    if (!task.strategyId) throw new Error("Marque absente du reçu de montage.");
    const previous = await tx.brandAsset.findFirst({
      where: { strategyId: task.strategyId, sourceIntentId: task.intentId, format: "PRODUCTION_PHOTO_LAYER" },
    });
    if (previous) {
      const meta = previous.metadata as { original?: { contentHash?: string }; providerPhotoHash?: string } | null;
      if (meta?.original?.contentHash !== hash || meta.providerPhotoHash !== providerPhotoHash) {
        throw new Error("Le calque de cette production possède déjà une autre version.");
      }
      return previous;
    }
    const receipt = assetOriginalReceiptSchema.parse({
      schema: "asset-original-v1",
      state: "STORED",
      objectKey: randomBytes(32).toString("hex"),
      storage: store.kind,
      backendId: store.backendId,
      keyId: store.keyId,
      contentHash: hash,
      byteLength: png.length,
      fileType: "image/png",
      receivedAt: new Date().toISOString(),
    });
    await retainOriginalBytes(store, { ...receipt, state: "PENDING" }, png);
    const asset = await createBrandAsset({
      strategyId: task.strategyId,
      operatorId: task.operatorId,
      name: `Photo du calque ${slot.photoLayerId}`,
      kind: "KV_VISUAL",
      format: "PRODUCTION_PHOTO_LAYER",
      family: "MATERIAL",
      mimeType: "image/png",
      fileSize: png.length,
      state: "CANDIDATE",
      sourceIntentId: task.intentId,
      campaignId: task.campaignId ?? undefined,
      briefId: task.briefId ?? undefined,
      metadata: {
        producer: "Ptah",
        provider: "openai",
        model,
        generativeTaskId: task.id,
        master: slot,
        providerPhotoHash,
        original: {
          state: receipt.state,
          contentHash: hash,
          byteLength: png.length,
          receivedAt: receipt.receivedAt,
        },
      },
    }, tx);
    const fileUrl = `/api/brand-assets/${asset.id}/original`;
    await tx.fileUpload.create({
      data: {
        uploaderId: "ptah:" + task.operatorId,
        fileName: `photo-${slot.photoLayerId}.png`,
        mimeType: "image/png",
        fileSize: png.length,
        fileUrl,
        entityType: "BRAND_ASSET",
        entityId: asset.id,
        storageReceipt: receipt,
      },
    });
    return tx.brandAsset.update({ where: { id: asset.id }, data: { fileUrl } });
  }, { timeout: 60_000 });
}
