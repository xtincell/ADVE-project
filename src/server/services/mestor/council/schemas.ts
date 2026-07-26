/**
 * CONSEIL DE MARQUE — schémas Zod des sorties structurées (ADR-0180).
 *
 * Consommés par `executeStructuredLLMCall` (ADR-0067) : draft du coordinateur,
 * critique adversariale de chaque expert, synthèse finale. Le champ `dissent`
 * de la synthèse est structurel — les désaccords non résolus sont livrés tels
 * quels (honnêteté > consensus fabriqué).
 */

import { z } from "zod";

export const councilDraftSchema = z.object({
  /** Position stratégique proposée — le « produit » que les experts vont attaquer. */
  position: z.string().min(1),
  arguments: z.array(z.string()).min(2),
  risks: z.array(z.string()),
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
});
export type ExpertCritique = z.infer<typeof expertCritiqueSchema>;

export const councilSynthesisSchema = z.object({
  finalPosition: z.string().min(1),
  acceptedCritiques: z.array(
    z.object({ from: z.string(), claim: z.string(), resolution: z.string() }),
  ),
  rejectedCritiques: z.array(
    z.object({ from: z.string(), claim: z.string(), reason: z.string() }),
  ),
  actionItems: z.array(z.string()),
  /** Désaccords non résolus — livrés au lecteur, jamais gommés. */
  dissent: z.array(z.string()),
});
export type CouncilSynthesis = z.infer<typeof councilSynthesisSchema>;
