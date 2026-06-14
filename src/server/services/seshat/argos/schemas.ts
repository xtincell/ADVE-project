/**
 * Argos — schémas Zod du dossier de référence. ADR-0095.
 * `harvestOutputSchema` = contrat de sortie LLM (executeStructuredLLMCall).
 */

import { z } from "zod";

export const dnaSchema = z.object({
  palette: z.array(z.string().max(60)).max(12).default([]),
  typography: z.array(z.string().max(80)).max(8).default([]),
  voice: z.string().max(600).default(""),
  visualCodes: z.array(z.string().max(120)).max(16).default([]),
  keyPhrases: z.array(z.string().max(160)).max(16).default([]),
  axes: z.array(z.string().max(120)).max(10).default([]),
});
export type DossierDna = z.infer<typeof dnaSchema>;

export const editorialSectionSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(4000),
});

export const dossierEditorialSchema = z.object({
  sections: z.array(editorialSectionSchema).max(12).default([]),
});
export type DossierEditorial = z.infer<typeof dossierEditorialSchema>;

export const dossierSourceSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().max(2000),
});

/** Sortie attendue du Hunter (LLM via Gateway). */
export const harvestOutputSchema = z.object({
  brand: z.string().min(1).max(160),
  campaign: z.string().max(200).optional(),
  sector: z.string().max(120).optional(),
  market: z.string().max(120).optional(),
  dna: dnaSchema,
  editorial: dossierEditorialSchema,
  sources: z.array(dossierSourceSchema).max(12).default([]),
});
export type HarvestOutput = z.infer<typeof harvestOutputSchema>;

/** Entrée de création manuelle (parité manual-first, ADR-0060). */
export const manualDossierInputSchema = z.object({
  brand: z.string().min(1).max(160),
  campaign: z.string().max(200).optional(),
  sector: z.string().max(120).optional(),
  market: z.string().max(120).optional(),
  dna: dnaSchema,
  editorial: dossierEditorialSchema.optional(),
  sources: z.array(dossierSourceSchema).max(12).optional(),
});
export type ManualDossierInput = z.infer<typeof manualDossierInputSchema>;
