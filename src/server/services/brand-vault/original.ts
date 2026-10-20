/** Exact private originals in the existing BrandAsset + FileUpload registers.
 * A deposit is a CANDIDATE, never an identity decision or a publication. */
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { assetOriginalReceiptSchema, anyAssetOriginalReceiptSchema, assetChunkedReceiptSchema, assetTransferInputSchema, chunkedOriginalManifestSchema, ORIGINAL_CHUNK_BYTES, MAX_SOURCE_BYTES, type AssetChunkedReceipt, type AssetOriginalReceipt } from "@/domain/source-original";
import { retainOriginalChunk, sealOriginalChunks, readOriginalChunks } from "@/lib/chunked-original-store";
import { mediaStoreConfiguration, type MediaStore } from "@/lib/encrypted-media-store";
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
const summary = ({ state, contentHash, byteLength, receivedAt }: AssetOriginalReceipt | AssetChunkedReceipt) => ({ state, contentHash, byteLength, receivedAt });

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
  const receipt = anyAssetOriginalReceiptSchema.parse(upload.storageReceipt);
  if (receipt.state !== "STORED") throw new Error("Dépôt inachevé. Redéposez le même fichier pour reprendre.");
  const store = mediaStoreConfiguration();
  if (!store) throw new Error("Stockage privé indisponible.");
  if (receipt.schema === "asset-original-v2") {
    if (receipt.byteLength > MAX_SOURCE_BYTES) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Téléchargez ce grand original. Préparez une image de dix Mio maximum pour son usage sur la page de marque.");
    assertReceiptStore(store, receipt);
    const parts: Buffer[] = [];
    for await (const part of readOriginalChunks(store, receipt.objectKey, chunkedOriginalManifestSchema.parse({
      schema: "original-chunks-v1", contentHash: receipt.contentHash, byteLength: receipt.byteLength, chunks: receipt.chunks,
    }))) parts.push(part);
    return { bytes: Buffer.concat(parts), fileName: upload.fileName, receipt };
  }
  return { bytes: await verifyOriginal(store, receipt), fileName: upload.fileName, receipt };
}

/** Private originals are eligible only after the existing explicit selection.
 * This URL is an authenticated preview choice, never a public media receipt. */
export function retainedAssetUrl(asset: { id: string; fileUrl: string | null; metadata: unknown }) {
  const info = metadata(metadata(asset.metadata).original);
  return info.state === "STORED" && asset.fileUrl === `/api/brand-assets/${asset.id}/original` ? asset.fileUrl : null;
}

const transferStatus = (assetId: string, receipt: AssetOriginalReceipt | AssetChunkedReceipt) => ({
  assetId, ...summary(receipt), chunkBytes: ORIGINAL_CHUNK_BYTES,
  partCount: receipt.schema === "asset-original-v2" ? receipt.chunks.length : 0,
  receivedParts: receipt.schema === "asset-original-v2" ? receipt.chunks.flatMap((part, i) => part.contentHash ? [i] : []) : [],
});
function assertReceiptStore(store: MediaStore, receipt: AssetOriginalReceipt | AssetChunkedReceipt) {
  if (store.kind !== receipt.storage || store.backendId !== receipt.backendId || store.keyId !== receipt.keyId) {
    throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Le stockage ou la clé de ce dépôt est indisponible.");
  }
}
/** Same create permission, emission and registers as a small original; no adoption. */
export async function transferAssetFile(input: z.infer<typeof assetTransferInputSchema>, actorId: string, intentId: string, client: PrismaClient = db) {
  input = assetTransferInputSchema.parse(input);
  const store = mediaStoreConfiguration();
  if (!store) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Le stockage privé doit être configuré avant ce dépôt.");
  return client.$transaction(async tx => {
    const strategy = await admit(tx, input.strategyId, actorId);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"brand-vault:" + input.strategyId}, 0))`;
    const step = input.transfer;
    if (step.action === "BEGIN") {
      const origin = step.provenance ? `drive:${step.provenance.externalId}` : `upload:${step.contentHash}`;
      const kinds: Record<string, string> = { LOGO: "LOGO_FINAL", FONT: "GENERIC", COLOR: "CHROMATIC_STRATEGY", IMAGE: "KV_VISUAL", DOCUMENT: "GENERIC" };
      const kind = kinds[step.type]!;
      const editions = await tx.brandAsset.findMany({ where: { strategyId: input.strategyId,
        metadata: { path: ["originalOrigin"], equals: origin } }, orderBy: [{ version: "desc" }, { id: "desc" }] });
      const same = editions.find(asset => metadata(metadata(asset.metadata).original).contentHash === step.contentHash);
      if (same) {
        const upload = await tx.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: same.id } });
        const receipt = anyAssetOriginalReceiptSchema.parse(upload.storageReceipt);
        if (same.kind !== kind || receipt.byteLength !== step.byteLength || receipt.fileType !== step.mimeType) {
          throw new BrandAssetLifecycleError("CONFLICT", "Ce fichier existe avec un autre rôle ou format. Relisez cet actif avant de le reclasser.");
        }
        assertReceiptStore(store, receipt);
        return transferStatus(same.id, receipt);
      }
      const receipt = assetChunkedReceiptSchema.parse({ schema: "asset-original-v2", state: "PENDING",
        objectKey: randomBytes(32).toString("hex"), storage: store.kind, backendId: store.backendId, keyId: store.keyId,
        contentHash: step.contentHash, byteLength: step.byteLength, fileType: step.mimeType, receivedAt: new Date().toISOString(),
        chunks: Array.from({ length: Math.ceil(step.byteLength / ORIGINAL_CHUNK_BYTES) }, (_, index) => ({
          objectKey: randomBytes(32).toString("hex"), contentHash: null,
          byteLength: Math.min(ORIGINAL_CHUNK_BYTES, step.byteLength - index * ORIGINAL_CHUNK_BYTES),
        })),
      });
      const asset = await tx.brandAsset.create({ data: { strategyId: input.strategyId, operatorId: strategy.operatorId,
        sourceIntentId: intentId, name: step.name, kind, family: "MATERIAL", state: "CANDIDATE",
        level: "production", batchId: randomBytes(16).toString("hex"), version: (editions[0]?.version ?? 0) + 1,
        parentBrandAssetId: editions[0]?.id, mimeType: step.mimeType, fileSize: step.byteLength,
        pillarTags: json({ ...step.pillarTags, level: "production", assetType: step.type }),
        metadata: json({ originalOrigin: origin, original: summary(receipt), provenance: step.provenance ?? null }),
      } });
      const fileUrl = `/api/brand-assets/${asset.id}/original`;
      await tx.fileUpload.create({ data: { uploaderId: actorId, fileName: step.fileName, mimeType: step.mimeType,
        fileSize: step.byteLength, fileUrl, entityType: "BRAND_ASSET", entityId: asset.id, storageReceipt: json(receipt) } });
      await tx.brandAsset.update({ where: { id: asset.id }, data: { fileUrl } });
      return transferStatus(asset.id, receipt);
    }
    // Resolving by both IDs prevents a delegated caller from switching brands mid-transfer.
    const asset = await tx.brandAsset.findFirst({ where: { id: step.assetId, strategyId: input.strategyId } });
    if (!asset) throw new BrandAssetLifecycleError("FORBIDDEN", "Dépôt introuvable dans cette marque.");
    const upload = await tx.fileUpload.findFirstOrThrow({ where: { entityType: "BRAND_ASSET", entityId: asset.id } });
    const receipt = anyAssetOriginalReceiptSchema.parse(upload.storageReceipt);
    assertReceiptStore(store, receipt);
    if (receipt.schema !== "asset-original-v2") {
      if (step.action === "FINISH" && receipt.state === "STORED") return transferStatus(asset.id, receipt);
      throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Ce dépôt utilise le transfert simple.");
    }
    if (step.action === "PART") {
      const part = receipt.chunks[step.index];
      if (!part) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Ce fragment ne fait pas partie du fichier attendu.");
      const bytes = Buffer.from(step.content, "base64");
      if (bytes.length !== part.byteLength || bytes.toString("base64") !== step.content) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Fragment vide, incomplet ou encodage invalide.");
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (part.contentHash && part.contentHash !== digest) throw new BrandAssetLifecycleError("CONFLICT", "Le fichier a changé. Reprenez avec le fichier original.");
      const stored = await retainOriginalChunk(store, { objectKey: part.objectKey, byteLength: part.byteLength }, bytes);
      receipt.chunks[step.index] = stored;
    } else {
      if (receipt.chunks.some(part => !part.contentHash)) throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Le transfert est incomplet. Reprenez avec le même fichier.");
      const manifest = chunkedOriginalManifestSchema.parse({ schema: "original-chunks-v1", contentHash: receipt.contentHash,
        byteLength: receipt.byteLength, chunks: receipt.chunks });
      try { await sealOriginalChunks(store, receipt.objectKey, manifest); }
      catch (error) {
        if (error instanceof Error && error.message === "L’empreinte du fichier complet ne correspond pas au transfert.") {
          throw new BrandAssetLifecycleError("PRECONDITION_FAILED", "Les parties reçues ne correspondent pas au fichier annoncé. Déposez à nouveau le fichier exact.");
        }
        throw error;
      }
      receipt.state = "STORED";
    }
    const finalReceipt = assetChunkedReceiptSchema.parse(receipt);
    await tx.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: json(finalReceipt) } });
    await tx.brandAsset.update({ where: { id: asset.id }, data: { metadata: json({ ...metadata(asset.metadata), original: summary(finalReceipt) }) } });
    return transferStatus(asset.id, finalReceipt);
  }, { timeout: 120000 });
}

/** Authenticated attachment readers consume and verify the complete stream. */
export async function streamAssetOriginal(assetId: string, client: Pick<Prisma.TransactionClient, "fileUpload"> = db) {
  const upload = await client.fileUpload.findFirst({ where: { entityType: "BRAND_ASSET", entityId: assetId } });
  if (!upload) return null;
  const receipt = anyAssetOriginalReceiptSchema.parse(upload.storageReceipt);
  if (receipt.state !== "STORED") throw new Error("Dépôt inachevé. Redéposez le même fichier pour reprendre.");
  const store = mediaStoreConfiguration();
  if (!store) throw new Error("Stockage privé indisponible.");
  assertReceiptStore(store, receipt);
  async function* read() {
    if (receipt.schema === "asset-original-v1") yield await verifyOriginal(store!, receipt);
    else yield* readOriginalChunks(store!, receipt.objectKey, chunkedOriginalManifestSchema.parse({
      schema: "original-chunks-v1", contentHash: receipt.contentHash, byteLength: receipt.byteLength, chunks: receipt.chunks,
    }));
  }
  const iterator = read();
  const first = await iterator.next(); // Receive the manifest and first verified part before HTTP 200.
  async function* body() { try { if (!first.done) yield first.value; yield* iterator; } finally { await iterator.return(undefined); } }
  return { body: body(), fileName: upload.fileName, receipt };
}
