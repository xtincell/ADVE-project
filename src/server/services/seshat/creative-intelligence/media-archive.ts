/** Durable encrypted evidence, with a pending receipt before external IO and verified removal. */
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { archiveMediaInput, removeMediaInput, archiveReceiptSchema, type ArchiveReceipt } from "@/domain/creative-media";
import { mediaStoreConfiguration, putEncryptedMedia, getEncryptedMedia, deleteEncryptedMedia, oldVolumeObjects } from "@/lib/encrypted-media-store";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { assertWritableSpecimen } from ".";
import { downloadCreativeMedia, extractMediaObservations } from "./media-observations";

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export async function archiveCreativeMedia(input: z.infer<typeof archiveMediaInput>, userId: string, client: PrismaClient = db) {
  input = archiveMediaInput.parse(input);
  if (input.retainUntil <= new Date() || input.retainUntil.getTime() > Date.now() + 366 * 86400000) throw new Error("Choisir une durée de conservation future, au plus un an avant nouvelle revue des droits.");
  const specimen = await assertWritableSpecimen(client, input.specimenId, input.strategyId);
  const store = mediaStoreConfiguration();
  if (!store) return { state: "DEFERRED_AWAITING_CREDENTIALS" as const, connectorId: "creative-media-storage" };
  if (!specimen.mediaUrl) throw new Error("Aucun média source autorisé.");
  const media = await downloadCreativeMedia(specimen.mediaUrl);
  // Validate actual format and decodability before committing an archive receipt.
  const observed = await extractMediaObservations(media.bytes, media.mediaType);
  const receipt: ArchiveReceipt = { schema: "creative-media-archive-v1", state: "PENDING", objectKey: createHash("sha256").update(`${specimen.id}:${randomBytes(32).toString("hex")}`).digest("hex"), storage: store.kind, backendId: store.backendId, keyId: store.keyId, contentHash: observed.contentHash, byteLength: media.bytes.length, mediaType: media.mediaType as ArchiveReceipt["mediaType"], rights: input.rights, rightsEvidenceUrl: input.rightsEvidenceUrl, rightsNote: input.rightsNote, retainUntil: input.retainUntil.toISOString(), recordedBy: userId, recordedAt: new Date().toISOString() };
  await client.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creative-media:${specimen.id}`}))`;
    const current = await tx.contentSpecimen.findUniqueOrThrow({ where: { id: specimen.id } });
    const previous = archiveReceiptSchema.safeParse(current.mediaArchive);
    if (previous.success && previous.data.state !== "PURGED") throw new Error("Une archive existe ou est en cours. Retirez-la avant une nouvelle conservation.");
    await tx.contentSpecimen.update({ where: { id: specimen.id }, data: { mediaArchive: json(receipt), mediaRetentionUntil: new Date(Date.now() + 3600000) } });
  });
  // A crash leaves a pending receipt, eligible for automatic cleanup after one hour.
  return client.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creative-media:${specimen.id}`}))`;
    const current = archiveReceiptSchema.parse((await tx.contentSpecimen.findUniqueOrThrow({ where: { id: specimen.id } })).mediaArchive);
    if (current.objectKey !== receipt.objectKey || current.state !== "PENDING") throw new Error("La conservation a été retirée pendant l'acquisition.");
    await putEncryptedMedia(store, receipt.objectKey, media.bytes);
    const replay = await getEncryptedMedia(store, receipt.objectKey);
    if (createHash("sha256").update(replay).digest("hex") !== receipt.contentHash) throw new Error("Vérification de l'archive échouée.");
    const stored = { ...receipt, state: "STORED" as const };
    await tx.contentSpecimen.update({ where: { id: specimen.id }, data: { mediaArchive: json(stored), mediaRetentionUntil: input.retainUntil } });
    return { state: "LIVE" as const, contentHash: stored.contentHash, byteLength: stored.byteLength, retainUntil: stored.retainUntil };
  }, { timeout: 60000 });
}

export async function readArchivedMedia(specimenId: string, strategyId?: string, client: PrismaClient = db) {
  const specimen = await assertWritableSpecimen(client, specimenId, strategyId);
  const parsed = archiveReceiptSchema.safeParse(specimen.mediaArchive);
  if (!parsed.success || parsed.data.state !== "STORED") return null;
  const receipt = parsed.data, store = mediaStoreConfiguration();
  if (new Date(receipt.retainUntil) <= new Date()) throw new Error("Les droits de conservation doivent être renouvelés après retrait.");
  if (!store || store.kind !== receipt.storage || store.backendId !== receipt.backendId || store.keyId !== receipt.keyId) throw new Error("Stockage ou clé de lecture indisponible.");
  const bytes = await getEncryptedMedia(store, receipt.objectKey);
  if (createHash("sha256").update(bytes).digest("hex") !== receipt.contentHash || bytes.length !== receipt.byteLength) throw new Error("Intégrité du média non vérifiée.");
  return { bytes, mediaType: receipt.mediaType };
}

export async function removeArchivedMedia(input: z.infer<typeof removeMediaInput>, client: PrismaClient = db) {
  input = removeMediaInput.parse(input);
  // Removal is permitted even when the market has been disabled.
  const where = { id: input.specimenId, strategyId: input.strategyId ?? null, visibility: input.strategyId ? "BRAND" : "PUBLIC" };
  return client.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creative-media:${input.specimenId}`}))`;
    const specimen = await tx.contentSpecimen.findFirstOrThrow({ where });
    const parsed = archiveReceiptSchema.safeParse(specimen.mediaArchive);
    if (!parsed.success || parsed.data.state === "PURGED") return { state: "ABSENT" as const };
    const store = mediaStoreConfiguration(), receipt = parsed.data;
    if (!store || store.kind !== receipt.storage || store.backendId !== receipt.backendId) return { state: "DEFERRED_AWAITING_CREDENTIALS" as const, connectorId: "creative-media-storage" };
    await deleteEncryptedMedia(store, receipt.objectKey);
    await tx.contentSpecimen.update({ where: { id: specimen.id }, data: { mediaArchive: json({ ...receipt, state: "PURGED", purgedAt: new Date().toISOString(), purgeReason: input.reason }), mediaRetentionUntil: null } });
    return { state: "PURGED" as const };
  }, { timeout: 30000 });
}

export async function purgeExpiredCreativeMedia(client: PrismaClient = db, budgetMs = 60000) {
  const startedAt = Date.now();
  const expired = await client.contentSpecimen.findMany({ where: { mediaRetentionUntil: { lte: new Date() } }, take: 20, orderBy: { mediaRetentionUntil: "asc" }, select: { id: true, strategyId: true } });
  const receipts = [];
  for (const s of expired) {
    if (receipts.length && Date.now() - startedAt > Math.max(0, budgetMs - 30000)) break;
    const payload = { specimenId: s.id, strategyId: s.strategyId ?? undefined, reason: "Échéance de conservation ou acquisition inachevée." };
    const id = await openEmission({ kind: "SESHAT_REMOVE_CREATIVE_MEDIA", strategyId: s.strategyId ?? undefined, payload, caller: "cron:creative-media-retention" });
    try { const result = await removeArchivedMedia(payload, client); await closeEmission({ intentId: id, status: "OK", result }); receipts.push({ specimenId: s.id, ...result }); }
    catch { await closeEmission({ intentId: id, status: "FAILED", result: { reason: "MEDIA_REMOVAL_FAILED" } }); receipts.push({ specimenId: s.id, state: "FAILED" }); }
  }
  // Physical orphan cleanup after a strategy cascade; a young/pending upload is never touched.
  const store = mediaStoreConfiguration(); let orphanedRemoved = 0;
  if (store?.kind === "VOLUME") for (const key of await oldVolumeObjects(store, new Date(Date.now() - 86400000))) {
    const owner = await client.contentSpecimen.count({ where: { mediaArchive: { path: ["objectKey"], equals: key } } });
    const sourceOwner = await client.fileUpload.count({ where: { storageReceipt: { path: ["objectKey"], equals: key } } });
    const editionOwner = await client.brandAsset.count({ where: { OR: [
      { metadata: { path: ["logoArchive", "objectKey"], equals: key } },
      { metadata: { path: ["identityArchives"], array_contains: [{ receipt: { objectKey: key } }] } },
    ] } });
    if (!owner && !sourceOwner && !editionOwner) { await deleteEncryptedMedia(store, key); orphanedRemoved++; }
  }
  return { scanned: expired.length, receipts, deferredByTimeBudget: expired.length - receipts.length, orphanedRemoved };
}
