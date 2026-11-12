import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { type CreativeDirectionDoctrine, creativeDirectionDoctrine } from "@/domain/creative-direction";
import { documentEdition, sourceIsUsable } from "@/domain/source-document";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";

export const CREATIVE_DIRECTION_DOCUMENT_FAMILY = "Direction artistique · complément documentaire du pilier D";
export const CREATIVE_DIRECTION_DOCUMENT_LINK = "irrigation:D.directionArtistique.doctrine";

export interface DirectionEdition {
  doctrine: CreativeDirectionDoctrine;
  receipt: {
    label: string;
    sourceId: string;
    edition: number;
    status: "PROPOSED" | "REFERENCE";
    sha256: string;
    sourceHash: string;
  };
}

export async function readCreativeDirectionEdition(strategyId: string, content: unknown, client: Prisma.TransactionClient = db): Promise<DirectionEdition | null> {
  const d = content as {directionArtistique?: Record<string, unknown>; _fieldProvenance?: Record<string, unknown>} | null;
  // An explicit leaf, even an empty decision, belongs to D. A document only supplements the parent.
  const leafPaths = ["directionArtistique.doctrine", "d.directionArtistique.doctrine"];
  if (!d || Object.hasOwn(d.directionArtistique ?? {}, "doctrine")
    || leafPaths.some(path => d._fieldProvenance?.[path] === "HUMAN")) return null;
  const rows = await client.brandDataSource.findMany({
    where: {
      strategyId, sourceType: "FILE", fileType: "JSON", processingStatus: {in: ["EXTRACTED", "PROCESSED"]},
      rawData: {path: ["_document", "family"], equals: CREATIVE_DIRECTION_DOCUMENT_FAMILY},
    },
    select: {
      id: true, rawContent: true, rawData: true, extractedFields: true, fileName: true,
      sourceType: true, fileType: true, certainty: true, originalUpload: {select: {storageReceipt: true}},
    },
  });
  const candidates = rows.flatMap(row => {
    const doc = documentEdition(row.rawData);
    if (!doc || !sourceIsUsable(row.rawData) || doc.kind !== "BRAND_GUIDE"
      || !doc.tags?.includes(CREATIVE_DIRECTION_DOCUMENT_LINK)
      || (doc.status !== "REFERENCE" && doc.status !== "PROPOSED")) return [];
    return [{row, doc, status: doc.status}];
  }).sort((a, b) => Number(b.status === "REFERENCE") - Number(a.status === "REFERENCE") || b.doc.edition - a.doc.edition);
  const chosen = candidates[0];
  if (!chosen) return null;
  const {row, doc, status} = chosen;
  const original = row.originalUpload?.storageReceipt as {state?: string; contentHash?: string} | null;
  const text = row.rawContent;
  if (!doc.sourceRevision || !text || original?.state !== "STORED" || original.contentHash !== doc.sourceRevision
    || createHash("sha256").update(text).digest("hex") !== doc.sourceRevision) {
    throw new Error("Le complément de direction artistique a changé. Relisez son édition et son original avant de produire.");
  }
  const parsed = creativeDirectionDoctrine.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("Le complément documentaire de D n’a pas le format de direction artistique attendu.");
  return {doctrine: parsed.data, receipt: {
    label: doc.label, sourceId: row.id, edition: doc.edition, status, sha256: doc.sourceRevision, sourceHash: sourceFingerprint(row),
  }};
}
