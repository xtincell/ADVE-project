import { z } from "zod";
import { SourceReceiptSchema } from "./source-certainty";

/** A document edition is evidence, never an implicit strategic approval. */
export const DOCUMENT_KINDS = ["LEAN_CANVAS", "BMC", "MARKET_STUDY", "STRATEGY", "FINANCE", "PRESENTATION", "BRAND_GUIDE", "RESEARCH_DATA", "TECHNICAL", "ASSET", "OTHER"] as const;
export const DOCUMENT_KIND_LABEL: Record<typeof DOCUMENT_KINDS[number], string> = {
  LEAN_CANVAS: "Lean Canvas", BMC: "Business Model Canvas", MARKET_STUDY: "Étude de marché",
  STRATEGY: "Stratégie", FINANCE: "Finances", PRESENTATION: "Présentation", BRAND_GUIDE: "Charte et identité",
  RESEARCH_DATA: "Données de recherche", TECHNICAL: "Documentation technique", ASSET: "Ressource de marque", OTHER: "Autre document",
};
export const DOCUMENT_STATUS_LABEL = { PROPOSED: "Proposition · à valider", REFERENCE: "Référence de travail", SUPERSEDED: "Édition antérieure", ARCHIVED: "Archive" } as const;
export const DocumentEditionInputSchema = z.object({
  family: z.string().trim().min(1).max(180), kind: z.enum(DOCUMENT_KINDS),
  label: z.string().trim().min(1).max(120),
  status: z.enum(["PROPOSED", "REFERENCE", "ARCHIVED"]).default("PROPOSED"),
  changeSummary: z.string().trim().min(1).max(4000),
  sourceUrl: z.string().url().refine(v => /^https?:\/\//.test(v)).optional(),
  sourceRevision: z.string().max(300).optional(),
  previous: SourceReceiptSchema.optional(),
  before: SourceReceiptSchema.optional(),
});
export const DocumentEditionSchema = DocumentEditionInputSchema.omit({ previous: true, before: true, status: true }).extend({
  schema: z.literal("document-edition-v1"), edition: z.number().int().positive(),
  status: z.enum(["PROPOSED", "REFERENCE", "SUPERSEDED", "ARCHIVED"]),
  previousSourceId: z.string().optional(), beforeSourceId: z.string().optional(), recordedAt: z.string().datetime(),
  decisions: z.array(z.object({ by: z.string(), at: z.string().datetime(), status: z.enum(["REFERENCE", "ARCHIVED"]), reason: z.string() })).optional(),
  clarifications: z.array(z.object({ by: z.string(), at: z.string().datetime(), text: z.string().trim().min(1).max(4000) })).optional(),
});
export type DocumentEdition = z.infer<typeof DocumentEditionSchema>;
export const DocumentRepresentationInputSchema = z.object({
  canonical: SourceReceiptSchema,
  reason: z.string().trim().min(1).max(4000),
});
export const DocumentRepresentationSchema = DocumentRepresentationInputSchema.omit({ canonical: true }).extend({
  schema: z.literal("document-representation-v1"), canonicalSourceId: z.string().min(1),
  canonicalSourceHash: SourceReceiptSchema.shape.contentHash,
  recordedAt: z.string().datetime(), recordedBy: z.string().min(1),
});
export type DocumentRepresentation = z.infer<typeof DocumentRepresentationSchema>;
export function documentRepresentation(rawData: unknown): DocumentRepresentation | null {
  const value = rawData && typeof rawData === "object" ? (rawData as Record<string, unknown>)._documentRepresentation : undefined;
  const parsed = DocumentRepresentationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
/** Even malformed retained metadata cannot be silently corrected or deleted. */
export function sourceHasRetainedDocument(rawData: unknown): boolean {
  return Boolean(rawData && typeof rawData === "object" && ("_document" in rawData || "_documentRepresentation" in rawData));
}
export function documentEdition(rawData: unknown): DocumentEdition | null {
  const value = rawData && typeof rawData === "object" ? (rawData as Record<string, unknown>)._document : undefined;
  const parsed = DocumentEditionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
/** Registered identity is a search heading, not source text or an approval. */
export function documentIdentity(rawData: unknown): string | null {
  const doc = documentEdition(rawData);
  return doc ? `${doc.family} · ${doc.label} · ${DOCUMENT_KIND_LABEL[doc.kind]}` : null;
}
/** Unknown edition metadata fails closed; legacy documents remain compatible. */
export function sourceIsUsable(rawData: unknown): boolean {
  // A format is consultable evidence for one version, never an extra vote in RAG.
  if (rawData && typeof rawData === "object" && "_documentRepresentation" in rawData) return false;
  if (!rawData || typeof rawData !== "object" || !("_document" in rawData)) return true;
  const doc = documentEdition(rawData);
  return doc?.status === "REFERENCE" || doc?.status === "PROPOSED";
}
export function documentContext(rawData: unknown): string {
  const doc = documentEdition(rawData);
  if (!doc) return "";
  return `Document : ${doc.family} · ${doc.label} · ${DOCUMENT_STATUS_LABEL[doc.status]}. `
    + (doc.status === "PROPOSED" ? "HYPOTHÈSE NON VALIDÉE PAR L’ÉQUIPE : examiner cette piste sans la présenter comme une décision adoptée. " : "Une référence de travail ne certifie pas ses assertions. ")
    + (doc.sourceUrl ? `Source : ${doc.sourceUrl}. ` : "")
    + (doc.clarifications?.length ? `Précisions ultérieures (sans changement d’usage) : ${doc.clarifications.map(c => `${c.at} : ${c.text}`).join("\n")} ` : "");
}

/** Explicit predecessor/before links determine order; admission numbers only break ties. */
export function orderDocumentEditions<T extends { id: string; document?: DocumentEdition | null }>(rows: readonly T[]): T[] {
  const byId = new Map(rows.map(row => [row.id, row]));
  const remaining = new Map(rows.map(row => [row.id, new Set<string>()]));
  for (const row of rows) {
    const previous = row.document?.previousSourceId;
    if (previous && byId.has(previous)) remaining.get(row.id)!.add(previous);
    const before = row.document?.beforeSourceId;
    if (before && byId.has(before)) remaining.get(before)!.add(row.id);
  }
  const ordered: T[] = [];
  while (remaining.size) {
    const ready = [...remaining].filter(([, dependencies]) => dependencies.size === 0).map(([id]) => byId.get(id)!)
      .sort((a, b) => (a.document?.edition ?? 0) - (b.document?.edition ?? 0) || a.id.localeCompare(b.id));
    // Retained legacy/corrupt cycles remain visible and never hang a consultation.
    const next = ready[0] ?? byId.get([...remaining.keys()].sort()[0]!)!;
    ordered.push(next); remaining.delete(next.id);
    for (const dependencies of remaining.values()) dependencies.delete(next.id);
  }
  return ordered.reverse();
}
