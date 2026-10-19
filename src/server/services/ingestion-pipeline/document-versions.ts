/** Extension of canonical sources; no parallel document store or approval system. */
import { Prisma } from "@prisma/client";
import { DocumentEditionInputSchema, documentEdition, type DocumentEdition } from "@/domain/source-document";
import { invalidateSourceDerivatives, sourceFingerprint, type SourceDb } from "./source-usage";
import { z } from "zod";

export async function registerDocumentEdition(tx: SourceDb, input: {
  id: string; expectedSourceHash: string; document: z.infer<typeof DocumentEditionInputSchema>;
}) {
  const spec = DocumentEditionInputSchema.parse(input.document);
  const initial = await tx.brandDataSource.findUniqueOrThrow({ where: { id: input.id } });
  const candidates = await tx.brandDataSource.findMany({ where: { strategyId: initial.strategyId } });
  const ids = [...new Set([input.id, ...candidates.filter(s => documentEdition(s.rawData)?.family === spec.family).map(s => s.id)])].sort();
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "BrandDataSource" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
  const source = await tx.brandDataSource.findUniqueOrThrow({ where: { id: input.id } });
  await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${source.strategyId} FOR UPDATE`;
  if (sourceFingerprint(source) !== input.expectedSourceHash) throw new Error("SOURCE_CHANGED: relisez ce document avant de le classer.");
  if (documentEdition(source.rawData)) throw new Error("Cette édition est conservée. Déposez un nouveau fichier pour créer une nouvelle édition.");
  if (!["EXTRACTED", "PROCESSED"].includes(source.processingStatus)) throw new Error("La lecture de ce document doit être achevée avant son classement.");
  const rows = await tx.brandDataSource.findMany({ where: { strategyId: source.strategyId } });
  const family = rows.flatMap(row => { const doc = documentEdition(row.rawData); return doc?.family === spec.family ? [{ row, doc }] : []; });
  const latest = family.sort((a, b) => b.doc.edition - a.doc.edition)[0];
  if (latest && (!spec.previous || spec.previous.sourceId !== latest.row.id || sourceFingerprint(latest.row) !== spec.previous.contentHash)) {
    throw new Error("SOURCE_CHANGED: une autre édition existe. Relisez la dernière édition avant de poursuivre.");
  }
  if (!latest && spec.previous) throw new Error("Le document précédent n’appartient pas à cette lignée.");
  if (latest && latest.doc.kind !== spec.kind) throw new Error("Le type doit rester identique dans cette lignée documentaire.");
  const { previous: _previous, ...details } = spec;
  const doc: DocumentEdition = { ...details, schema: "document-edition-v1", edition: (latest?.doc.edition ?? 0) + 1,
    recordedAt: new Date().toISOString(), ...(latest ? { previousSourceId: latest.row.id } : {}) };
  // A proposal NEVER withdraws the previous reference. Only an explicit choice
  // of REFERENCE may supersede it; all historical bytes and text remain intact.
  if (spec.status === "REFERENCE") for (const old of family.filter(f => f.doc.status === "REFERENCE")) {
    await tx.brandDataSource.update({ where: { id: old.row.id }, data: {
      rawData: { ...(old.row.rawData as Prisma.JsonObject), _document: { ...old.doc, status: "SUPERSEDED" } },
    } });
    await invalidateSourceDerivatives(tx, old.row.id);
  }
  const updated = await tx.brandDataSource.update({ where: { id: source.id }, data: {
    rawData: { ...(source.rawData && typeof source.rawData === "object" && !Array.isArray(source.rawData) ? source.rawData as Prisma.JsonObject : { _sourceData: source.rawData }), _document: doc },
  } });
  await invalidateSourceDerivatives(tx, source.id);
  return updated;
}

/** Explicit human decision; retained text/original and predecessor stay intact. */
export async function decideDocumentEdition(tx: SourceDb, input: {
  id: string; expectedSourceHash: string; userId: string;
  decision: { status: "REFERENCE" | "ARCHIVED"; reason: string };
}) {
  const initial = await tx.brandDataSource.findUniqueOrThrow({ where: { id: input.id } });
  const doc = documentEdition(initial.rawData);
  if (!doc) throw new Error("Classez ce document avant de choisir sa place.");
  const family = (await tx.brandDataSource.findMany({ where: { strategyId: initial.strategyId } }))
    .filter(row => documentEdition(row.rawData)?.family === doc.family);
  const ids = family.map(row => row.id).sort();
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "BrandDataSource" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
  await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${initial.strategyId} FOR UPDATE`;
  const current = await tx.brandDataSource.findUniqueOrThrow({ where: { id: input.id } });
  if (sourceFingerprint(current) !== input.expectedSourceHash) throw new Error("SOURCE_CHANGED: relisez cette édition avant de décider.");
  if (input.decision.status === "REFERENCE") {
    // Re-read after the family fence; never silently replace another decision.
    const fresh = await tx.brandDataSource.findMany({ where: { strategyId: current.strategyId } });
    for (const row of fresh) {
      const old = documentEdition(row.rawData);
      if (row.id !== current.id && old?.family === doc.family && old.status === "REFERENCE") {
        if (!ids.includes(row.id)) throw new Error("SOURCE_CHANGED: une nouvelle référence est apparue. Relisez le dossier.");
        await tx.brandDataSource.update({ where: { id: row.id }, data: { rawData: { ...(row.rawData as Prisma.JsonObject), _document: { ...old, status: "SUPERSEDED" } } } });
        await invalidateSourceDerivatives(tx, row.id);
      }
    }
  }
  const updated = await tx.brandDataSource.update({ where: { id: current.id }, data: {
    rawData: { ...(current.rawData as Prisma.JsonObject), _document: { ...doc, status: input.decision.status,
      decisions: [...(doc.decisions ?? []), { ...input.decision, by: input.userId, at: new Date().toISOString() }] } },
  } });
  await invalidateSourceDerivatives(tx, current.id);
  return updated;
}

/** Clarifying a deposit is not adopting a proposal. Preserve the full history. */
export async function clarifyDocumentEdition(tx: SourceDb, input: {
  id: string; expectedSourceHash: string; userId: string; clarification: string;
}) {
  const text = z.string().trim().min(1).max(4000).parse(input.clarification);
  await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id = ${input.id} FOR UPDATE`;
  const source = await tx.brandDataSource.findUniqueOrThrow({ where: { id: input.id } });
  await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${source.strategyId} FOR UPDATE`;
  if (sourceFingerprint(source) !== input.expectedSourceHash) throw new Error("SOURCE_CHANGED: relisez cette édition avant de la préciser.");
  const doc = documentEdition(source.rawData);
  if (!doc) throw new Error("Classez ce document avant de préciser sa place.");
  const updated = await tx.brandDataSource.update({ where: { id: source.id }, data: {
    rawData: { ...(source.rawData as Prisma.JsonObject), _document: { ...doc,
      clarifications: [...(doc.clarifications ?? []), { by: input.userId, at: new Date().toISOString(), text }] } },
  } });
  await invalidateSourceDerivatives(tx, source.id);
  return updated;
}
