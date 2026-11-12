/**
 * CONSEIL DE MARQUE — schémas Zod des sorties structurées (ADR-0180).
 *
 * Consommés par `executeStructuredLLMCall` (ADR-0067) : draft du coordinateur,
 * critique adversariale de chaque expert, synthèse finale. Le champ `dissent`
 * de la synthèse est structurel — les désaccords non résolus sont livrés tels
 * quels (honnêteté > consensus fabriqué).
 */

import { z } from "zod";
import { FieldProvenanceSchema } from "@/domain/field-provenance";
import { SourceCertaintySchema, SourceReceiptSchema } from "@/domain/source-certainty";

const fieldReferenceSchema = z.object({
  kind: z.literal("FIELD"), sourceId: z.string().min(1),
  sourceVersion: z.number().int().nonnegative().nullable(),
  source: z.string().min(1), field: z.string().min(1),
  provenance: FieldProvenanceSchema, editedAt: z.string().nullable(),
});
const documentReferenceSchema = SourceReceiptSchema.extend({
  kind: z.literal("DOCUMENT"), certainty: SourceCertaintySchema.nullable(),
  chunkIndex: z.number().int().nonnegative().nullable(),
});
const observationReferenceSchema = z.object({
  kind: z.literal("OBSERVATION"), sourceId: z.string().min(1),
  sourceVersion: z.string().nullable(), observationId: z.string().nullable(),
  observedAt: z.string().nullable(),
});
const councilReferenceSchema = z.discriminatedUnion("kind", [
  fieldReferenceSchema, documentReferenceSchema, observationReferenceSchema,
]);
export type CouncilReference = z.infer<typeof councilReferenceSchema>;
/** Non-persisted excerpt actually supplied to this call, not a truth assessment. */
export interface CouncilEvidenceExcerpt { reference: CouncilReference; text: string }
const quotation = z.string().trim().min(1).describe(
  "Un seul passage continu recopié caractère par caractère depuis l’extrait fourni, sans guillemets ajoutés, ellipse, raccord ou paraphrase. Pour deux passages distincts, fournir deux citations.",
);
export const councilCitationSchema = z.discriminatedUnion("kind", [
  fieldReferenceSchema.extend({ quote: quotation }),
  documentReferenceSchema.extend({ quote: quotation }),
  observationReferenceSchema.extend({ quote: quotation }),
]);
export type CouncilCitation = z.infer<typeof councilCitationSchema>;

/**
 * Extend the existing output contracts; the Gateway's strict Zod validation
 * and retry feedback enforce membership/edition/quotation, without another
 * parser, model call or semantic grounding score. Editorial truth stays open.
 */
export function withCouncilCitations<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>, evidence: readonly CouncilEvidenceExcerpt[],
) {
  return schema.extend({ citations: z.array(councilCitationSchema) }).superRefine((data, ctx) => {
    // Zod has validated this added field; its generic shape remains unresolved in TS.
    const citations = (data as { citations: CouncilCitation[] }).citations;
    if (evidence.length > 0 && citations.length === 0) {
      ctx.addIssue({ code: "custom", path: ["citations"], message: "Cite au moins un extrait fourni, sans en déduire une validation du résultat." });
    }
    for (const [index, citation] of citations.entries()) {
      const reference = JSON.stringify(councilReferenceSchema.parse(citation));
      const excerpts = evidence.filter((item) =>
        JSON.stringify(councilReferenceSchema.parse(item.reference)) === reference);
      if (excerpts.length === 0) ctx.addIssue({ code: "custom", path: ["citations", index],
        message: "Référence, version, champ ou origine/date absents des extraits fournis à cet appel." });
      else if (!excerpts.some(item => item.text.includes(citation.quote))) {
        ctx.addIssue({ code: "custom", path: ["citations", index, "quote"],
          message: "Recopie un seul passage continu de l’extrait fourni, sans guillemets ajoutés, ellipse, raccord ou paraphrase. Utilise deux citations pour deux passages distincts." });
      }
    }
  });
}

export const councilDraftSchema = z.object({
  /** Position stratégique proposée — le « produit » que les experts vont attaquer. */
  position: z.string().min(1),
  arguments: z.array(z.string()).min(2),
  risks: z.array(z.string()),
  /** Optional for old objects/user-supplied positions; mandatory on generated output. */
  citations: z.array(councilCitationSchema).optional(),
});
export type CouncilDraft = z.infer<typeof councilDraftSchema>;

export const expertCritiqueSchema = z.object({
  verdict: z.enum(["APPROVE", "CHALLENGE", "REJECT"]),
  critiques: z.array(
    z.object({
      /** L'affirmation attaquée (ou le manque identifié). */
      claim: z.string(),
      /** Le champ précis du pilier qui fonde la critique (ou « non renseigné »). */
      evidence: z.string(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
    }),
  ),
  /** Angles que le draft n'a pas couverts du point de vue de ce pilier. */
  missingAngles: z.array(z.string()),
  /** Amendements concrets proposés — une critique sans alternative est incomplète. */
  amendments: z.array(z.string()),
  citations: z.array(councilCitationSchema).optional(),
});
export type ExpertCritique = z.infer<typeof expertCritiqueSchema>;

export const councilSynthesisSchema = z.object({
  finalPosition: z.string().min(1),
  acceptedCritiques: z.array(
      z.object({ from: z.string().describe("Code de l’expert : A, D, V ou E."),
        claim: z.string().describe("Texte exact d’une claim réellement fournie par cet expert."), resolution: z.string() }),
  ),
  rejectedCritiques: z.array(
      z.object({ from: z.string().describe("Code de l’expert : A, D, V ou E."),
        claim: z.string().describe("Texte exact d’une claim réellement fournie par cet expert."), reason: z.string() }),
  ),
  actionItems: z.array(z.string()),
  /** Désaccords non résolus — livrés au lecteur, jamais gommés. */
  dissent: z.array(z.string()),
  citations: z.array(councilCitationSchema).optional(),
});
export type CouncilSynthesis = z.infer<typeof councilSynthesisSchema>;
