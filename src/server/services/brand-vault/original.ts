/** Exact private originals in the existing BrandAsset + FileUpload registers.
 * A deposit is a CANDIDATE, never an identity decision or a publication. */
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { assetOriginalReceiptSchema, type AssetOriginalReceipt } from "@/domain/source-original";
import { mediaStoreConfiguration } from "@/lib/encrypted-media-store";
import { isGodModeEmail } from "@/lib/auth/god-mode";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { assertCollaboratorMayEmit } from "@/server/governance/collaborator-firewall";
import { decodeSourceUpload, sourceUploadContentSchema, retainOriginalBytes, verifyOriginal } from "@/server/services/ingestion-pipeline/original";
import { BrandAssetLifecycleError } from "./engine";

export const assetProvenanceSchema = z.object({
  provider: z.literal("GOOGLE_DRIVE"), externalId: z.string().min(1).max(200),
  path: z.string().min(1).max(2000), modifiedAt: z.string().datetime().optional(),
}).strict();
export const assetUploadSchema = z.object({
  name: z.string().min(1).max(500), content: sourceUploadContentSchema,
  mimeType: z.string().min(1).max(200),
}).strict();
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const metadata = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
const summary = ({ state, contentHash, byteLength, receivedAt }: AssetOriginalReceipt) => ({ state, contentHash, byteLength, receivedAt });

async function admit(tx: Prisma.TransactionClient, strategyId: string, actorId: string) {
  await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${strategyId} FOR SHARE`;
  const strategy = await tx.strategy.findUniqueOrThrow({ where: { id: strategyId } });
  const actor = await tx.user.findUnique({ where: { id: actorId } });
  const role = isGodModeEmail(actor?.email) ? "ADMIN" : actor?.role;
  if (!actor || !role || !await canAccessStrategy(strategyId, { userId: actorId, operatorId: actor.operatorId, role }, tx)) {
    throw new BrandAssetLifecycleError("FORBIDDEN", "Accès refusé à ce dépôt.");
  }
  await assertCollaboratorMayEmit({ userId: actorId, role, strategyId, kind: "LEGACY_BRAND_VAULT_CREATE" }, tx);
  if (["ARCHIVED", "DELETED"].includes(strategy.status)) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Cette marque est archivée.");
  return strategy;
}

export async function retainAssetFile(input: {
  strategyId: string; name: string; kind: string; level: string; assetType?: string; pillarTags?: Record<string, number>;
  file: z.infer<typeof assetUploadSchema>; provenance?: z.infer<typeof assetProvenanceSchema>;
}, actorId: string, intentId: string, client: PrismaClient = db) {
  let bytes: Buffer;
  try { bytes = decodeSourceUpload(input.file.content); }
  catch (error) { throw new BrandAssetLifecycleError("PRECONDITION_FAILED", (error as Error).message); }
  const digest = createHash("sha256").update(bytes).digest("hex");
  const store = mediaStoreConfiguration();
  if (!store) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Le stockage privé doit être configuré avant ce dépôt. Aucun actif créé.");
  const origin = input.provenance ? `drive:${input.provenance.externalId}` : `upload:${digest}`;
  // A distinct Drive identity remains distinct, even when its bytes are equal.
  // New bytes for the same identity form a successor, without adopting it.
  const assetId = await client.$transaction(async tx => {
    const strategy = await admit(tx, input.strategyId, actorId);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"brand-vault:" + input.strategyId}, 0))`;
    const editions = await tx.brandAsset.findMany({ where: { strategyId: input.strategyId,
      metadata: { path: ["originalOrigin"], equals: origin } }, orderBy: [{ version: "desc" }, { id: "desc" }] });
    const same = editions.find(asset => metadata(metadata(asset.metadata).original).contentHash === digest);
    if (same) {
      if (same.kind !== input.kind) throw new BrandAssetLifecycleError("CONFLICT", "Ce fichier existe avec un autre rôle. Relisez cet actif avant de le reclasser.");
      return same.id;
    }
    const receipt: AssetOriginalReceipt = { schema: "asset-original-v1", state: "PENDING",
      objectKey: randomBytes(32).toString("hex"), storage: store.kind, backendId: store.backendId, keyId: store.keyId,
      contentHash: digest, byteLength: bytes.length, fileType: input.file.mimeType, receivedAt: new Date().toISOString() };
    const asset = await tx.brandAsset.create({ data: {
      strategyId: input.strategyId, operatorId: strategy.operatorId, sourceIntentId: intentId,
      name: input.name, kind: input.kind, family: "MATERIAL", level: input.level,
      state: "CANDIDATE", batchId: randomBytes(16).toString("hex"),
      version: (editions[0]?.version ?? 0) + 1, parentBrandAssetId: editions[0]?.id,
      mimeType: input.file.mimeType, fileSize: bytes.length,
      pillarTags: json({ ...input.pillarTags, level: input.level, assetType: input.assetType ?? "DOCUMENT" }),
      metadata: json({ originalOrigin: origin, original: summary(receipt), provenance: input.provenance ?? null }),
    } });
    const fileUrl = `/api/brand-assets/${asset.id}/original`;
    await tx.fileUpload.create({ data: { uploaderId: actorId, fileName: input.file.name,
      mimeType: input.file.mimeType, fileSize: bytes.length, fileUrl, entityType: "BRAND_ASSET", entityId: asset.id,
      storageReceipt: json(receipt) } });
    await tx.brandAsset.update({ where: { id: asset.id }, data: { fileUrl } });
    return asset.id;
  });
  return client.$transaction(async tx => {
    await admit(tx, input.strategyId, actorId);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"brand-vault:" + input.strategyId}, 0))`;
    await tx.$queryRaw`SELECT id FROM "BrandAsset" WHERE id=${assetId} FOR UPDATE`;
    const asset = await tx.brandAsset.findFirstOrThrow({ where: { id: assetId, strategyId: input.strategyId } });
    const upload = await tx.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: assetId } });
    const receipt = assetOriginalReceiptSchema.parse(upload.storageReceipt);
    await retainOriginalBytes(store, receipt, bytes);
    const stored = { ...receipt, state: "STORED" as const };
    await tx.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: json(stored) } });
    return tx.brandAsset.update({ where: { id: asset.id }, data: { metadata: json({ ...metadata(asset.metadata), original: summary(stored) }) } });
  }, { timeout: 60000 });
}

/** Caller enforces current strategy access; never exposes a store object key. */
export async function readAssetOriginal(assetId: string, client: Pick<Prisma.TransactionClient, "fileUpload"> = db) {
  const upload = await client.fileUpload.findFirst({ where: { entityType: "BRAND_ASSET", entityId: assetId } });
  if (!upload) return null;
  const receipt = assetOriginalReceiptSchema.parse(upload.storageReceipt);
  if (receipt.state !== "STORED") throw new Error("Dépôt inachevé. Redéposez le même fichier pour reprendre.");
  const store = mediaStoreConfiguration();
  if (!store) throw new Error("Stockage privé indisponible.");
  return { bytes: await verifyOriginal(store, receipt), fileName: upload.fileName, receipt };
}

/** Private originals are eligible only after the existing explicit selection.
 * This URL is an authenticated preview choice, never a public media receipt. */
export function retainedAssetUrl(asset: { id: string; fileUrl: string | null; metadata: unknown }) {
  const info = metadata(metadata(asset.metadata).original);
  return info.state === "STORED" && asset.fileUrl === `/api/brand-assets/${asset.id}/original` ? asset.fileUrl : null;
}
