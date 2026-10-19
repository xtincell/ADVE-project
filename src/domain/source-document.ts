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
});
export const DocumentEditionSchema = DocumentEditionInputSchema.omit({ previous: true, status: true }).extend({
  schema: z.literal("document-edition-v1"), edition: z.number().int().positive(),
  status: z.enum(["PROPOSED", "REFERENCE", "SUPERSEDED", "ARCHIVED"]),
  previousSourceId: z.string().optional(), recordedAt: z.string().datetime(),
  decisions: z.array(z.object({ by: z.string(), at: z.string().datetime(), status: z.enum(["REFERENCE", "ARCHIVED"]), reason: z.string() })).optional(),
  clarifications: z.array(z.object({ by: z.string(), at: z.string().datetime(), text: z.string().trim().min(1).max(4000) })).optional(),
});
export type DocumentEdition = z.infer<typeof DocumentEditionSchema>;
export function documentEdition(rawData: unknown): DocumentEdition | null {
  const value = rawData && typeof rawData === "object" ? (rawData as Record<string, unknown>)._document : undefined;
  const parsed = DocumentEditionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
/** Unknown edition metadata fails closed; legacy documents remain compatible. */
export function sourceIsUsable(rawData: unknown): boolean {
  if (!rawData || typeof rawData !== "object" || !("_document" in rawData)) return true;
  const doc = documentEdition(rawData);
  return doc?.status === "REFERENCE" || doc?.status === "PROPOSED";
}
export function documentContext(rawData: unknown): string {
  const doc = documentEdition(rawData);
  if (!doc) return "";
  return `Document : ${doc.family} · ${doc.label} · édition ${doc.edition} · ${DOCUMENT_STATUS_LABEL[doc.status]}. `
    + (doc.status === "PROPOSED" ? "HYPOTHÈSE NON VALIDÉE PAR L’ÉQUIPE : examiner cette piste sans la présenter comme une décision adoptée. " : "Une référence de travail ne certifie pas ses assertions. ")
    + (doc.sourceUrl ? `Source : ${doc.sourceUrl}. ` : "")
    + (doc.clarifications?.length ? `Précisions ultérieures (sans changement d’usage) : ${doc.clarifications.map(c => `${c.at} : ${c.text}`).join("\n")} ` : "");
}
