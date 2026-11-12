/** Received intake documents use the existing private FileUpload/original store. */
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { mediaStoreConfiguration } from "@/lib/encrypted-media-store";
import { sourceOriginalReceiptSchema, sourceOriginalSummary, type SourceOriginalReceipt } from "@/domain/source-original";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { extractReceivedFile } from "@/server/services/ingestion-pipeline/extractors";
import { decodeSourceUpload, retainOriginalBytes, verifyOriginal } from "@/server/services/ingestion-pipeline/original";

type IntakeFile = { name: string; content: string; type: string };
const entityType = "QUICK_INTAKE";
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

function intakeFileType(file: Pick<IntakeFile, "name" | "type">) {
  const byMime: Record<string, string> = {
    "application/pdf": "PDF", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX", "text/plain": "TXT",
  };
  return (file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : undefined) ?? byMime[file.type] ?? "TXT";
}

export async function readIntakeDocument(file: IntakeFile) {
  const fileType = intakeFileType(file);
  const result = await extractReceivedFile(fileType, decodeSourceUpload(file.content), "intake");
  const text = result.text.trim();
  if (text.length <= 50) throw new Error("Texte documentaire insuffisant.");
  // Keep the previous PDF/Word context window; plain text is not newly truncated.
  const context = ["PDF", "DOCX"].includes(fileType) ? text.slice(0, 20_000) : text;
  return `[DOCUMENT: ${file.name}]\n${context}`;
}

export async function listIntakeDocuments(token: string, client: PrismaClient = db) {
  const intake = await client.quickIntake.findUnique({ where: { shareToken: token }, select: { id: true } });
  if (!intake) return [];
  const rows = await client.fileUpload.findMany({ where: { entityType, entityId: intake.id }, orderBy: { createdAt: "asc" } });
  return rows.map(row => ({ id: row.id, name: row.fileName, mimeType: row.mimeType,
    byteLength: row.fileSize, originalUrl: `/api/intake/${encodeURIComponent(token)}/documents/${encodeURIComponent(row.id)}`,
    original: sourceOriginalSummary(row.storageReceipt) }));
}

/** The bearer token only grants originals deposited into this exact intake. */
export async function readIntakeOriginal(token: string, uploadId: string, client: PrismaClient = db) {
  const intake = await client.quickIntake.findUnique({ where: { shareToken: token }, select: { id: true } });
  if (!intake) return null;
  const row = await client.fileUpload.findFirst({ where: { id: uploadId, entityType, entityId: intake.id } });
  if (!row) return null;
  const receipt = sourceOriginalReceiptSchema.parse(row.storageReceipt);
  if (receipt.state !== "STORED") throw new Error("Le fichier n’a pas encore été reçu entièrement. Redéposez-le pour reprendre.");
  const store = mediaStoreConfiguration();
  if (!store) throw new Error("Le stockage privé est momentanément indisponible.");
  return { bytes: await verifyOriginal(store, receipt), fileName: row.fileName, mimeType: row.mimeType, receipt };
}

/** Pure persistence, traced by the existing spine; never starts extraction or a model. */
export async function retainIntakeDocuments(
  token: string, files: IntakeFile[], fields: { rawText?: string; websiteUrl?: string; socialLinksRaw?: string } = {},
  client: PrismaClient = db,
) {
  if (files.length > 5) throw new Error("Cinq fichiers au maximum par diagnostic.");
  const intake = await client.quickIntake.findUnique({ where: { shareToken: token } });
  if (!intake) throw new Error("Diagnostic introuvable.");
  if (!["IN_PROGRESS", "FAILED"].includes(intake.status)) throw new Error("Ce diagnostic n’accepte plus de nouvelles sources pendant ou après son analyse.");
  const decoded = files.map(file => {
    if (!file.name.trim() || file.name.length > 255 || file.type.length > 200) throw new Error("Nom ou format de fichier invalide.");
    const bytes = decodeSourceUpload(file.content);
    return { file, bytes, contentHash: createHash("sha256").update(bytes).digest("hex"), fileType: intakeFileType(file) };
  });
  const store = mediaStoreConfiguration();
  if (files.length && !store) throw new Error("Le stockage privé est indisponible. Le dépôt n’a pas abouti ; les reçus antérieurs restent conservés.");
  // Neither the bearer token nor base64 bytes belong in the audit ledger.
  const emissionId = await openEmission({ kind: "LEGACY_QUICK_INTAKE_PROCESS_INGEST", caller: "quick-intake:retain-sources",
    payload: { intakeId: intake.id, stage: "RETAIN_SOURCES", files: decoded.map(({ file, contentHash, bytes }) =>
      ({ name: file.name, mimeType: file.type, contentHash, byteLength: bytes.length })), fields: Object.keys(fields) } });
  try {
    // Text/links survive a later file IO failure. documentUrl is only a legacy
    // label: the verified FileUpload receipt remains the authority for bytes.
    await client.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "QuickIntake" WHERE id = ${intake.id} FOR UPDATE`;
      const current = await tx.quickIntake.findUniqueOrThrow({ where: { id: intake.id } });
      if (!["IN_PROGRESS", "FAILED"].includes(current.status)) throw new Error("L’analyse a commencé ; aucune source n’a été remplacée.");
      const labels = [...new Set([...(current.documentUrl?.split(", ") ?? []),
        (fields.rawText ?? current.rawText)?.trim() ? "texte" : "", fields.websiteUrl ?? current.websiteUrl ?? "",
        ...(fields.socialLinksRaw ?? current.socialLinksRaw ?? "").split(/\r?\n/), ...files.map(file => file.name)].filter(Boolean))];
      await tx.quickIntake.update({ where: { id: intake.id }, data: { ...fields, ...(labels.length ? { documentUrl: labels.join(", ") } : {}) } });
    });
    for (const { file, bytes, contentHash, fileType } of decoded) {
      const uploadId = await client.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "QuickIntake" WHERE id = ${intake.id} FOR UPDATE`;
        const current = await tx.quickIntake.findUniqueOrThrow({ where: { id: intake.id } });
        if (!["IN_PROGRESS", "FAILED"].includes(current.status)) throw new Error("L’analyse a commencé ; aucune source n’a été remplacée.");
        const rows = await tx.fileUpload.findMany({ where: { entityType, entityId: intake.id } });
        const previous = rows.find(row => sourceOriginalReceiptSchema.parse(row.storageReceipt).contentHash === contentHash);
        if (previous) {
          if (sourceOriginalReceiptSchema.parse(previous.storageReceipt).fileType !== fileType) throw new Error("Le format déclaré diffère de l’original reçu.");
          return previous.id;
        }
        if (rows.length >= 5) throw new Error("Cinq fichiers ont déjà été reçus pour ce diagnostic.");
        const receipt: SourceOriginalReceipt = { schema: "source-original-v1", state: "PENDING", objectKey: randomBytes(32).toString("hex"),
          storage: store!.kind, backendId: store!.backendId, keyId: store!.keyId, contentHash,
          byteLength: bytes.length, fileType, receivedAt: new Date().toISOString() };
        const row = await tx.fileUpload.create({ data: { uploaderId: `INTAKE:${intake.id}`, entityType, entityId: intake.id,
          fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: bytes.length,
          fileUrl: `/api/intake/${encodeURIComponent(token)}/documents`, storageReceipt: json(receipt) } });
        await tx.fileUpload.update({ where: { id: row.id }, data: { fileUrl: `/api/intake/${encodeURIComponent(token)}/documents/${row.id}` } });
        return row.id;
      });
      // Durable plan exists before IO. A failed receipt can resume the same object.
      await client.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "QuickIntake" WHERE id = ${intake.id} FOR UPDATE`;
        const owner = await tx.quickIntake.findUniqueOrThrow({ where: { id: intake.id } });
        if (!["IN_PROGRESS", "FAILED"].includes(owner.status)) throw new Error("L’analyse a commencé ; redéposez le fichier après sa fin si nécessaire.");
        const current = await tx.fileUpload.findFirstOrThrow({ where: { id: uploadId, entityType, entityId: intake.id } });
        const observed = sourceOriginalReceiptSchema.parse(current.storageReceipt);
        if (observed.contentHash !== contentHash || observed.byteLength !== bytes.length) throw new Error("Le reçu du fichier a changé.");
        await retainOriginalBytes(store!, observed, bytes);
        const aliases = observed.aliases ?? [];
        if (file.name !== current.fileName && !aliases.some(alias => alias.fileName === file.name)) {
          aliases.push({ fileName: file.name, receivedAt: new Date().toISOString() });
        }
        const stored = sourceOriginalReceiptSchema.parse({ ...observed, state: "STORED", ...(aliases.length ? { aliases } : {}) });
        await tx.fileUpload.update({ where: { id: uploadId }, data: { storageReceipt: json(stored) } });
      }, { timeout: 60000 });
    }
    const documents = await listIntakeDocuments(token, client);
    await closeEmission({ intentId: emissionId, status: "OK", result: { intakeId: intake.id, documents: documents.map(d => ({ id: d.id, original: d.original })) } });
    return documents;
  } catch (error) {
    await closeEmission({ intentId: emissionId, status: "FAILED", result: { intakeId: intake.id, reason: "SOURCE_RETENTION_FAILED" } });
    throw error;
  }
}

/** A retry reads the received originals, not a now-empty browser FileList. */
export async function readRetainedIntakeDocuments(token: string, client: PrismaClient = db) {
  const documents = await listIntakeDocuments(token, client);
  const texts: string[] = [];
  for (const document of documents) {
    const original = await readIntakeOriginal(token, document.id, client);
    if (!original) throw new Error("Une source reçue n’est plus accessible pour ce diagnostic.");
    try {
      texts.push(await readIntakeDocument({ name: original.fileName, type: original.mimeType, content: original.bytes.toString("base64") }));
    } catch {
      texts.push(`[Fichier reçu mais texte non lisible : ${original.fileName}]`);
    }
  }
  return texts;
}

/** Completion and dossier attachment commit together; the encrypted object is not copied. */
export async function persistCompletedIntake(
  token: string, strategyId: string,
  result: { advertis_vector: Prisma.InputJsonValue; classification: string; diagnostic: Prisma.InputJsonValue },
  client: PrismaClient = db,
) {
  const intake = await client.quickIntake.findUniqueOrThrow({ where: { shareToken: token } });
  const uploads = await client.fileUpload.findMany({ where: { entityType, entityId: intake.id }, orderBy: { id: "asc" } });
  const prepared: Array<{ upload: (typeof uploads)[number]; receipt: SourceOriginalReceipt;
    extracted: Awaited<ReturnType<typeof extractReceivedFile>> | null; errorMessage: string | null }> = [];
  for (const upload of uploads) {
    const original = await readIntakeOriginal(token, upload.id, client);
    if (!original) throw new Error("Une source reçue est devenue inaccessible.");
    let extracted = null;
    let errorMessage: string | null = null;
    try { extracted = await extractReceivedFile(original.receipt.fileType, original.bytes, strategyId); }
    catch (error) { errorMessage = error instanceof Error ? error.message : "Texte non lisible."; }
    prepared.push({ upload, receipt: original.receipt, extracted, errorMessage });
  }
  const emissionId = await openEmission({ kind: "LEGACY_QUICK_INTAKE_COMPLETE", caller: "quick-intake:bind-sources",
    strategyId, payload: { intakeId: intake.id, documents: prepared.map(p => ({ id: p.upload.id, contentHash: p.receipt.contentHash })) } });
  try {
    const completed = await client.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "QuickIntake" WHERE id = ${intake.id} FOR UPDATE`;
      const current = await tx.quickIntake.findUniqueOrThrow({ where: { id: intake.id } });
      if (current.status === "CONVERTED" || (current.status === "COMPLETED" && current.convertedToId !== strategyId)) {
        throw new Error("Ce diagnostic est déjà rattaché à une autre marque ; ses sources restent conservées.");
      }
      const target = await tx.strategy.findUniqueOrThrow({ where: { id: strategyId } });
      if (target.status !== "QUICK_INTAKE" || target.name !== `Quick Intake: ${current.companyName}`) {
        throw new Error("Le dossier de destination ne correspond pas à ce diagnostic.");
      }
      await tx.$queryRaw`SELECT id FROM "FileUpload" WHERE "entityType" = ${entityType} AND "entityId" = ${intake.id} FOR UPDATE`;
      const rows = await tx.fileUpload.findMany({ where: { entityType, entityId: intake.id }, orderBy: { id: "asc" } });
      if (rows.map(row => row.id).join() !== prepared.map(p => p.upload.id).join()) throw new Error("Les sources ont changé pendant l’analyse. Reprenez le diagnostic.");
      for (const item of prepared) {
        const upload = rows.find(row => row.id === item.upload.id)!;
        const receipt = sourceOriginalReceiptSchema.parse(upload.storageReceipt);
        if (receipt.state !== "STORED" || receipt.contentHash !== item.receipt.contentHash || receipt.objectKey !== item.receipt.objectKey) {
          throw new Error("Le reçu d’un original a changé. Le diagnostic n’a pas été finalisé.");
        }
        if (upload.sourceId) {
          const source = await tx.brandDataSource.findUniqueOrThrow({ where: { id: upload.sourceId } });
          if (source.strategyId !== strategyId) throw new Error("Cet original est déjà rattaché à un autre dossier.");
          continue; // A replay never replaces corrected source text or document qualification.
        }
        const source = await tx.brandDataSource.create({ data: {
          strategyId, sourceType: "FILE", fileName: upload.fileName, fileType: receipt.fileType,
          origin: `upload:${receipt.contentHash}`, certainty: "DECLARED",
          rawContent: item.extracted?.text,
          rawData: item.extracted?.structured ? json(item.extracted.structured) : undefined,
          extractedFields: item.extracted ? json(item.extracted.metadata) : undefined,
          processingStatus: item.extracted ? "EXTRACTED" : "FAILED", errorMessage: item.errorMessage,
        } });
        await tx.fileUpload.update({ where: { id: upload.id }, data: { sourceId: source.id } });
      }
      return tx.quickIntake.update({ where: { id: intake.id }, data: {
        ...result, convertedToId: strategyId, status: "COMPLETED", completedAt: current.completedAt ?? new Date(),
      } });
    }, { timeout: 60_000 });
    await closeEmission({ intentId: emissionId, status: "OK", result: { intakeId: intake.id, strategyId, documents: prepared.length } });
    return completed;
  } catch (error) {
    await closeEmission({ intentId: emissionId, status: "FAILED", result: { intakeId: intake.id, reason: "INTAKE_COMPLETION_FAILED" } });
    throw error;
  }
}
