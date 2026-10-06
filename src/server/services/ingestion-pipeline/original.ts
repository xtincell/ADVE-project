/** Original file retention via the existing private store and FileUpload register. */
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { sourceOriginalReceiptSchema, MAX_SOURCE_BYTES, type SourceOriginalReceipt } from "@/domain/source-original";
import { mediaStoreConfiguration, putEncryptedMedia, getEncryptedMedia, type MediaStore } from "@/lib/encrypted-media-store";
import { extractAuto } from "./extractors";

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
export function decodeSourceUpload(content: string): Buffer {
  if (content.length > Math.ceil(MAX_SOURCE_BYTES / 3) * 4) throw new Error("Fichier trop volumineux (10 Mo maximum).");
  const bytes = Buffer.from(content, "base64");
  if (!bytes.length || bytes.length > MAX_SOURCE_BYTES || bytes.toString("base64") !== content) throw new Error("Fichier vide ou encodage invalide.");
  return bytes;
}

async function verifyOriginal(store: MediaStore, receipt: SourceOriginalReceipt) {
  if (store.kind !== receipt.storage || store.backendId !== receipt.backendId || store.keyId !== receipt.keyId) throw new Error("Stockage ou clé de lecture de l’original indisponible.");
  const bytes = await getEncryptedMedia(store, receipt.objectKey);
  if (hash(bytes) !== receipt.contentHash || bytes.length !== receipt.byteLength) throw new Error("L’intégrité de l’original n’est pas vérifiée.");
  return bytes;
}

/** Primitive behind LEGACY_INGESTION_UPLOAD_FILE, including explicit legacy repair. */
export async function retainSourceFile(
  strategyId: string,
  file: { name: string; content: string; type: string; sourceId?: string },
  uploaderId: string,
  client: PrismaClient = db,
): Promise<string> {
  const bytes = decodeSourceUpload(file.content), digest = hash(bytes);
  const store = mediaStoreConfiguration();
  if (!store) throw new Error("Le stockage privé des originaux doit être configuré avant ce dépôt. Votre fichier n’a pas été enregistré.");
  const origin = `upload:${digest}`;
  // Admission is committed before external IO. A crash leaves a visible PENDING
  // receipt. Retrying the same bytes resumes this source instead of duplicating it.
  const sourceId = await client.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`source-upload:${strategyId}:${digest}`}))`;
    const deposited = await tx.brandDataSource.findFirst({ where: { strategyId, origin }, orderBy: { createdAt: "asc" } });
    if (file.sourceId && deposited && deposited.id !== file.sourceId) throw new Error("Ce fichier est déjà reçu dans une autre source de cette marque. Conservez cette référence existante.");
    let source = file.sourceId
      ? await tx.brandDataSource.findFirst({ where: { id: file.sourceId, strategyId } })
      : deposited;
    if (file.sourceId && !source) throw new Error("Source à compléter introuvable dans cette marque.");
    if (source) {
      await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id = ${source.id} FOR UPDATE`;
      source = await tx.brandDataSource.findUniqueOrThrow({ where: { id: source.id } });
      if (source.sourceType !== "FILE") throw new Error("Seule une source déposée comme fichier peut recevoir un original.");
      const previous = await tx.fileUpload.findUnique({ where: { sourceId: source.id } });
      if (previous) {
        const receipt = sourceOriginalReceiptSchema.parse(previous.storageReceipt);
        if (receipt.contentHash !== digest) throw new Error("Cet original existe déjà. Déposez une nouvelle source pour un autre fichier.");
        if (receipt.fileType !== file.type.toUpperCase()) throw new Error("Le format déclaré diffère du fichier reçu.");
        return source.id;
      }
      // A legacy source has no hash. Match the deterministic extraction, not a
      // similar filename; never attach an arbitrary file to an existing claim.
      const extracted = await extractAuto(file.type, file.content, strategyId);
      if (source.rawContent !== extracted.text) throw new Error("Le texte du fichier diffère de cette source. Déposez-le comme nouvelle source.");
    } else {
      source = await tx.brandDataSource.create({ data: {
        strategyId, sourceType: "FILE", fileName: file.name, fileType: file.type.toUpperCase(),
        origin, processingStatus: "EXTRACTING",
      } });
    }
    const receipt: SourceOriginalReceipt = {
      schema: "source-original-v1", state: "PENDING", objectKey: randomBytes(32).toString("hex"),
      storage: store.kind, backendId: store.backendId, keyId: store.keyId,
      contentHash: digest, byteLength: bytes.length, fileType: file.type.toUpperCase(), receivedAt: new Date().toISOString(),
    };
    await tx.fileUpload.create({ data: {
      uploaderId, fileName: file.name, fileUrl: `/api/brand-sources/${source.id}/original`,
      mimeType: "application/octet-stream", fileSize: bytes.length,
      entityType: "BRAND_SOURCE", entityId: source.id, sourceId: source.id, storageReceipt: json(receipt),
    } });
    await tx.brandDataSource.update({ where: { id: source.id }, data: { origin } });
    return source.id;
  }, { timeout: 60000 });

  const result = await client.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id = ${sourceId} FOR UPDATE`;
    const source = await tx.brandDataSource.findUniqueOrThrow({ where: { id: sourceId } });
    const upload = await tx.fileUpload.findUniqueOrThrow({ where: { sourceId } });
    const receipt = sourceOriginalReceiptSchema.parse(upload.storageReceipt);
    if (receipt.contentHash !== digest) throw new Error("Le fichier attendu a changé.");
    if (receipt.state === "PENDING") {
      // The previous attempt may have written the object and lost its DB receipt.
      // Resume by verifying those bytes. An existing corrupt object is not replaced.
      try { await verifyOriginal(store, receipt); }
      catch (error) {
        const absent = (error as NodeJS.ErrnoException).code === "ENOENT";
        if (!absent) {
          // A newly admitted object also has no file; all other failures fail closed.
          throw error;
        }
        await putEncryptedMedia(store, receipt.objectKey, bytes);
        await verifyOriginal(store, receipt);
      }
      await tx.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: json({ ...receipt, state: "STORED" }) } });
    } else {
      await verifyOriginal(store, receipt);
    }
    // Dedup/legacy repair must never replace text that was manually corrected.
    if (source.processingStatus === "EXTRACTED" || source.processingStatus === "PROCESSED") return { sourceId };
    try {
      const extracted = await extractAuto(receipt.fileType, file.content, strategyId);
      await tx.brandDataSource.update({ where: { id: sourceId }, data: {
        rawContent: extracted.text, rawData: extracted.structured as Prisma.InputJsonValue ?? undefined,
        extractedFields: json(extracted.metadata), processingStatus: "EXTRACTED", errorMessage: null,
      } });
      return { sourceId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lecture du fichier impossible.";
      await tx.brandDataSource.update({ where: { id: sourceId }, data: { processingStatus: "FAILED", errorMessage: message } });
      return { sourceId, error: `Original conservé, mais texte non extrait : ${message}` };
    }
  }, { timeout: 60000 });
  if (result.error) throw new Error(result.error);
  return result.sourceId;
}

/** Caller must first enforce source access; no public URL to the encrypted object. */
export async function readSourceOriginal(sourceId: string, client: PrismaClient = db) {
  const upload = await client.fileUpload.findUnique({ where: { sourceId } });
  if (!upload) return null;
  const receipt = sourceOriginalReceiptSchema.parse(upload.storageReceipt);
  if (receipt.state !== "STORED") throw new Error("La conservation de l’original est inachevée. Redéposez le même fichier pour reprendre.");
  const store = mediaStoreConfiguration();
  if (!store) throw new Error("Stockage privé indisponible.");
  return { bytes: await verifyOriginal(store, receipt), fileName: upload.fileName, receipt };
}
