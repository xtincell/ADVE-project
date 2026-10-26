/** Original file retention via the existing private store and FileUpload register. */
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { retainedOriginalReceiptSchema, sourceFileLocationSchema, chunkedOriginalManifestSchema, MAX_SOURCE_BYTES, type SourceOriginalReceipt, type AssetOriginalReceipt } from "@/domain/source-original";
import { mediaStoreConfiguration, putEncryptedMedia, getEncryptedMedia, type MediaStore } from "@/lib/encrypted-media-store";
import { readOriginalChunks } from "@/lib/chunked-original-store";
import { extractReceivedFile } from "./extractors";
import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
import { DocumentEditionInputSchema, DocumentRepresentationInputSchema, documentEdition, documentRepresentation, sourceHasRetainedDocument } from "@/domain/source-document";
import { registerDocumentEdition, registerDocumentRepresentation } from "./document-versions";
import { sourceFingerprint } from "./source-usage";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { assertCollaboratorMayEmit } from "@/server/governance/collaborator-firewall";
import { isGodModeEmail } from "@/lib/auth/god-mode";

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
export function decodeSourceUpload(content: string): Buffer {
  if (content.length > Math.ceil(MAX_SOURCE_BYTES / 3) * 4) throw new Error("Fichier trop volumineux (10 Mo maximum).");
  const bytes = Buffer.from(content, "base64");
  if (!bytes.length || bytes.length > MAX_SOURCE_BYTES || bytes.toString("base64") !== content) throw new Error("Fichier vide ou encodage invalide.");
  return bytes;
}
export const sourceUploadContentSchema = z.string().min(4).max(Math.ceil(MAX_SOURCE_BYTES / 3) * 4)
  .refine(value => { try { decodeSourceUpload(value); return true; } catch { return false; } }, "Fichier vide, trop volumineux ou encodage invalide.");

export type StoredDocumentInput = {
  retainedAsset: { assetId: string; contentHash: string };
  document?: z.infer<typeof DocumentEditionInputSchema>;
  documentRepresentation?: z.infer<typeof DocumentRepresentationInputSchema>;
};
export class UnreadableRetainedSourceError extends Error {
  constructor(readonly sourceId: string, message: string) { super(message); }
}

/** Shared private stream for source and asset receipts, including retained chunks. */
export async function streamOriginalUpload(upload: { storageReceipt: unknown; fileName: string }) {
  const receipt = retainedOriginalReceiptSchema.parse(upload.storageReceipt);
  if (receipt.state !== "STORED") throw new Error("La conservation de l’original est inachevée.");
  const store = mediaStoreConfiguration();
  if (!store || store.kind !== receipt.storage || store.backendId !== receipt.backendId || store.keyId !== receipt.keyId) throw new Error("Le stockage ou la clé de l’original est indisponible.");
  async function* read() {
    if (receipt.schema !== "asset-original-v2") yield await verifyOriginal(store!, receipt);
    else yield* readOriginalChunks(store!, receipt.objectKey, chunkedOriginalManifestSchema.parse({
      schema: "original-chunks-v1", contentHash: receipt.contentHash, byteLength: receipt.byteLength, chunks: receipt.chunks,
    }));
  }
  const iterator = read(), first = await iterator.next();
  async function* body() { try { if (!first.done) yield first.value; yield* iterator; } finally { await iterator.return(undefined); } }
  return { body: body(), receipt, fileName: upload.fileName };
}
async function readOriginalUpload(upload: { storageReceipt: unknown; fileName: string }) {
  const original = await streamOriginalUpload(upload), parts: Buffer[] = [];
  for await (const part of original.body) parts.push(part);
  return { bytes: Buffer.concat(parts), receipt: original.receipt, fileName: original.fileName };
}

export async function verifyOriginal(store: MediaStore, receipt: SourceOriginalReceipt | AssetOriginalReceipt) {
  if (store.kind !== receipt.storage || store.backendId !== receipt.backendId || store.keyId !== receipt.keyId) throw new Error("Stockage ou clé de lecture de l’original indisponible.");
  const bytes = await getEncryptedMedia(store, receipt.objectKey);
  if (hash(bytes) !== receipt.contentHash || bytes.length !== receipt.byteLength) throw new Error("L’intégrité de l’original n’est pas vérifiée.");
  return bytes;
}

/** Shared resumable byte primitive. Never replace an existing corrupt object. */
export async function retainOriginalBytes(store: MediaStore, receipt: SourceOriginalReceipt | AssetOriginalReceipt, bytes: Buffer) {
  if (hash(bytes) !== receipt.contentHash || bytes.length !== receipt.byteLength) throw new Error("Le fichier attendu a changé.");
  try { await verifyOriginal(store, receipt); }
  catch (error) {
    if (receipt.state !== "PENDING" || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await putEncryptedMedia(store, receipt.objectKey, bytes);
    await verifyOriginal(store, receipt);
  }
}

/** Primitive behind LEGACY_INGESTION_UPLOAD_FILE, including explicit legacy repair. */
export async function retainSourceFile(
  strategyId: string,
  file: { name: string; content: string; type: string; sourceId?: string; sourceLocation?: z.infer<typeof sourceFileLocationSchema> } | StoredDocumentInput,
  uploaderId: string,
  client: PrismaClient = db,
): Promise<string> {
  if ("retainedAsset" in file) return retainStoredDocument(strategyId, file, uploaderId, client);
  const bytes = decodeSourceUpload(file.content), digest = hash(bytes);
  const location = file.sourceLocation ? sourceFileLocationSchema.parse(file.sourceLocation) : undefined;
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
        const receipt = retainedOriginalReceiptSchema.parse(previous.storageReceipt);
        if (receipt.contentHash !== digest) throw new Error("Cet original existe déjà. Déposez une nouvelle source pour un autre fichier.");
        if ((source.fileType ?? receipt.fileType) !== file.type.toUpperCase()) throw new Error("Le format déclaré diffère du fichier reçu.");
        return source.id;
      }
      // A legacy source has no hash. Match the deterministic extraction, not a
      // similar filename; never attach an arbitrary file to an existing claim.
      const extracted = await extractReceivedFile(file.type, bytes, strategyId);
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
    const receipt = retainedOriginalReceiptSchema.parse(upload.storageReceipt);
    if (receipt.contentHash !== digest) throw new Error("Le fichier attendu a changé.");
    if (receipt.state === "PENDING") {
      if (receipt.schema !== "source-original-v1") throw new Error("Reprenez la conservation du fichier depuis son dépôt d’origine.");
      // The previous attempt may have written the object and lost its DB receipt.
      // Resume by verifying those bytes. An existing corrupt object is not replaced.
      await retainOriginalBytes(store, receipt, bytes);
      await tx.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: json({ ...receipt, state: "STORED" }) } });
    } else {
      await readOriginalUpload(upload);
    }
    // These names/locations were submitted with the same verified bytes. They
    // remain original-file metadata, not new evidence or source fingerprints.
    if (file.name !== upload.fileName || location) {
      const aliases = receipt.aliases ?? [];
      const alias = { fileName: file.name, ...location, receivedAt: new Date().toISOString() };
      if (!aliases.some(old => old.fileName === alias.fileName && old.sourceUrl === alias.sourceUrl && old.sourceRevision === alias.sourceRevision)) {
        if (aliases.length >= 256) throw new Error("Ce fichier contient trop d’emplacements déclarés. Relisez ses références avant d’en ajouter.");
        const next = retainedOriginalReceiptSchema.parse({ ...receipt, state: "STORED", aliases: [...aliases, alias] });
        await tx.fileUpload.update({ where: { id: upload.id }, data: { storageReceipt: json(next) } });
      }
    }
    // Dedup/legacy repair must never replace text that was manually corrected.
    if (source.processingStatus === "EXTRACTED" || source.processingStatus === "PROCESSED") return { sourceId };
    try {
      const extracted = await extractReceivedFile(source.fileType ?? receipt.fileType, bytes, strategyId);
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
  return readOriginalUpload(upload);
}

export async function streamSourceOriginal(sourceId: string, client: PrismaClient = db) {
  const upload = await client.fileUpload.findUnique({ where: { sourceId } });
  return upload ? streamOriginalUpload(upload) : null;
}

/** Explicit documentary use of an existing original; no storage IO or asset adoption. */
async function retainStoredDocument(strategyId: string, input: StoredDocumentInput, actorId: string, client: PrismaClient) {
  if (Boolean(input.document) === Boolean(input.documentRepresentation)) throw new Error("Choisissez une édition ou un autre format de la même version.");
  const document = input.document ? DocumentEditionInputSchema.parse(input.document) : undefined;
  const representation = input.documentRepresentation ? DocumentRepresentationInputSchema.parse(input.documentRepresentation) : undefined;
  async function admit(tx: Prisma.TransactionClient) {
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    const role = isGodModeEmail(actor?.email) ? "ADMIN" : actor?.role;
    if (!actor || !role || !await canAccessStrategy(strategyId, { userId: actorId, operatorId: actor.operatorId, role }, tx)) throw new Error("Accès refusé à ce dossier documentaire.");
    await assertCollaboratorMayEmit({ userId: actorId, role, strategyId, kind: "LEGACY_INGESTION_UPLOAD_FILE" }, tx);
    const strategy = await tx.strategy.findUniqueOrThrow({ where: { id: strategyId } });
    if (["ARCHIVED", "DELETED"].includes(strategy.status)) throw new Error("Cette marque est archivée.");
    const asset = await tx.brandAsset.findFirst({ where: { id: input.retainedAsset.assetId, strategyId } });
    if (!asset) throw new Error("Cet original n’appartient pas à ce dossier.");
    const uploads = await tx.fileUpload.findMany({ where: { entityType: "BRAND_ASSET", entityId: asset.id }, take: 2 });
    if (uploads.length !== 1) throw new Error("L’original conservé doit être identifié sans ambiguïté.");
    const upload = uploads[0]!, receipt = retainedOriginalReceiptSchema.parse(upload.storageReceipt);
    const meta = asset.metadata as { original?: { state?: string; contentHash?: string; byteLength?: number } } | null;
    if (receipt.state !== "STORED" || receipt.schema === "source-original-v1" || receipt.contentHash !== input.retainedAsset.contentHash
      || meta?.original?.state !== "STORED" || meta.original.contentHash !== receipt.contentHash || meta.original.byteLength !== receipt.byteLength) throw new Error("L’original a changé ou sa conservation est inachevée. Relisez cet actif.");
    return { asset, upload, receipt };
  }
  const snapshot = await client.$transaction(admit);
  const type = snapshot.upload.fileName.split(".").at(-1)?.toUpperCase();
  if (!type || !["PDF", "DOCX", "PPTX", "TXT", "MD", "JSON", "CSV", "XLSX"].includes(type)) throw new Error("Ce format ne se lit pas comme un document. Son original reste consultable au coffre.");
  const original = await readOriginalUpload(snapshot.upload); // Full physical integrity before any source write.
  let extracted: Awaited<ReturnType<typeof extractReceivedFile>> | undefined, readingError: string | undefined;
  try { extracted = await extractReceivedFile(type, original.bytes, strategyId); }
  catch (error) { readingError = error instanceof Error ? error.message : "Texte non extrait."; }
  const outcome = await client.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`source-upload:${strategyId}:${original.receipt.contentHash}`}))`;
    let source = await tx.brandDataSource.findFirst({ where: { strategyId, origin: `upload:${original.receipt.contentHash}` }, orderBy: { createdAt: "asc" } });
    if (source) await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id = ${source.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${strategyId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "BrandAsset" WHERE id = ${input.retainedAsset.assetId} FOR SHARE`;
    const current = await admit(tx);
    if (current.upload.id !== snapshot.upload.id || current.upload.fileName !== snapshot.upload.fileName || !isDeepStrictEqual(current.upload.storageReceipt, snapshot.upload.storageReceipt)) throw new Error("L’original a changé pendant sa lecture. Relisez cet actif.");
    if (source) source = await tx.brandDataSource.findUniqueOrThrow({ where: { id: source.id } });
    if (source) {
      const upload = await tx.fileUpload.findUnique({ where: { sourceId: source.id } });
      if (!upload || retainedOriginalReceiptSchema.parse(upload.storageReceipt).state !== "STORED"
        || retainedOriginalReceiptSchema.parse(upload.storageReceipt).contentHash !== original.receipt.contentHash
        || source.sourceType !== "FILE" || source.fileType !== type) throw new Error("Une source existe déjà pour ce fichier. Consultez-la et achevez sa conservation avant de poursuivre.");
      const edition = documentEdition(source.rawData), format = documentRepresentation(source.rawData);
      if (sourceHasRetainedDocument(source.rawData)) {
        if ((document && edition?.family === document.family && edition.kind === document.kind && edition.label === document.label
          && edition.status === document.status && edition.changeSummary === document.changeSummary
          && edition.sourceUrl === document.sourceUrl && edition.sourceRevision === document.sourceRevision
          && edition.beforeSourceId === document.before?.sourceId && edition.previousSourceId === document.previous?.sourceId)
          || (representation && format?.canonicalSourceId === representation.canonical.sourceId
            && format.reason === representation.reason && format.canonicalSourceHash === representation.canonical.contentHash)) return { sourceId: source.id };
        throw new Error("Ce fichier est déjà classé. Consultez sa place actuelle dans le dossier documentaire.");
      }
      if (["EXTRACTED", "PROCESSED"].includes(source.processingStatus) && source.rawContent !== extracted?.text) throw new Error("Le texte de cette source a été corrigé. Consultez-la avant de la classer.");
    } else {
      source = await tx.brandDataSource.create({ data: { strategyId, sourceType: "FILE", fileName: snapshot.upload.fileName,
        fileType: type, origin: `upload:${original.receipt.contentHash}`, processingStatus: "EXTRACTING" } });
      await tx.fileUpload.create({ data: { uploaderId: actorId, fileName: snapshot.upload.fileName, mimeType: snapshot.upload.mimeType,
        fileSize: original.receipt.byteLength, fileUrl: `/api/brand-sources/${source.id}/original`, entityType: "BRAND_SOURCE", entityId: source.id,
        sourceId: source.id, storageReceipt: json(original.receipt) } });
    }
    if (!["EXTRACTED", "PROCESSED"].includes(source.processingStatus)) source = await tx.brandDataSource.update({ where: { id: source.id }, data: extracted ? {
      rawContent: extracted.text, rawData: extracted.structured as Prisma.InputJsonValue ?? undefined,
      extractedFields: json(extracted.metadata), processingStatus: "EXTRACTED", errorMessage: null,
    } : { processingStatus: "FAILED", errorMessage: readingError } });
    if (!extracted) return { sourceId: source.id, readingError };
    const expectedSourceHash = sourceFingerprint(source);
    if (document) await registerDocumentEdition(tx, { id: source.id, expectedSourceHash, document });
    else await registerDocumentRepresentation(tx, { id: source.id, expectedSourceHash, representation: representation!, userId: actorId });
    return { sourceId: source.id };
  }, { timeout: 60_000 });
  if (outcome.readingError) throw new UnreadableRetainedSourceError(outcome.sourceId, outcome.readingError);
  return outcome.sourceId;
}
