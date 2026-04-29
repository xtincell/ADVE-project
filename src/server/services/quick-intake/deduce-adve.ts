/**
 * deduce-adve — the killer demo of the free intake.
 *
 * From a single offer paragraph (40-200 words written by the founder),
 * deduce a structured ADVE: 4 pillars × structured fields, with confidence
 * markers per inference and narrative reasoning.
 *
 * This is what justifies the paywall: the user gives prose, the OS gives
 * back a Havas-grade brand X-ray.
 *
 * Mission contribution: DIRECT_SUPERFAN (step 1 — Substance).
 *
 * Wire: called from the (intake) result page mutation. Producible without
 * authentication (intake token-gated upstream).
 */

import { z } from "zod";
import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { PILLAR_KEYS, ADVE_KEYS, type AdveKey } from "@/domain/pillars";

// ── Output shape ──────────────────────────────────────────────────────

const DeducedFieldSchema = z.object({
  field: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

const DeducedPillarSchema = z.object({
  key: z.enum(ADVE_KEYS),
  name: z.string(),
  fields: z.array(DeducedFieldSchema).min(1).max(8),
  narrative: z.string().min(80).max(800),
  scoreEstimate: z.number().int().min(0).max(25),
});

const DeducedAdveSchema = z.object({
  pillars: z.array(DeducedPillarSchema).length(4),
  compositeAdve: z.number().int().min(0).max(100),
  classification: z.enum(["ZOMBIE", "FRAGILE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"]),
  /** Top 3 RTIS recos preview (R/T/I/S sneak peek). */
  rtisPreview: z.array(z.object({
    pillar: z.enum(["R", "T", "I", "S"]),
    headline: z.string().min(20).max(120),
    teaser: z.string().min(60).max(300),
  })).length(3),
  /** Stage confirmation in the rocket model. */
  stageObserved: z.enum(["BOOSTER_ADVE", "MID_RT", "UPPER_IS"]),
  /** Critical gaps the OS could fill if upgraded. */
  ifUpgraded: z.array(z.string().min(10)).min(2).max(5),
});

export type DeducedAdve = z.infer<typeof DeducedAdveSchema>;

// ── Input ─────────────────────────────────────────────────────────────

export interface DeduceInput {
  /** Free-form description of the offer / brand. 40–600 words ideal. */
  readonly offerText: string;
  /** Optional brand name to scope the analysis. */
  readonly brandName?: string;
  /** Optional sector slug (powers Tarsis comparison). */
  readonly sector?: string;
  /** Country ISO-2; influences market-tone analysis. */
  readonly countryCode?: string;
}

// ── Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un stratège de marque senior, spécialisé dans la formation de cultes culturels (méthode ADVE/RTIS).

Ton job : à partir d'un paragraphe libre décrivant une offre/marque, **DÉDUIRE** une analyse structurée des 4 piliers ADVE. Tu ne paraphrases pas — tu inférences.

Pour chaque pilier (A=Authenticité, D=Distinction, V=Valeur, E=Engagement), tu produis :
- 4 à 6 champs structurés (tonDeVoix, archetype, promesseMaitre, ennemi, etc.) avec valeurs concrètes inférées
- Une confiance 0-1 par champ (0.3 = inférence faible, 0.9 = explicite dans le texte)
- Un narratif de 80-800 mots qui révèle ce que l'offre dit *sans le dire*
- Un score estimé /25

Tu produis aussi :
- Score composite ADVE /100
- Classification (ZOMBIE/FRAGILE/ORDINAIRE/FORTE/CULTE/ICONE)
- 3 teasers RTIS (R+T+I+S) — phrases d'accroche qui font envie sans tout révéler
- Stage observé dans le modèle fusée (BOOSTER_ADVE / MID_RT / UPPER_IS)
- Liste de 2-5 gaps critiques que la version payante de l'OS comblerait

Tu réponds UNIQUEMENT en JSON conforme au schema. Pas de markdown, pas de texte hors JSON.`;

function buildUserPrompt(input: DeduceInput): string {
  const parts: string[] = [];
  if (input.brandName) parts.push(`Marque : ${input.brandName}`);
  if (input.sector) parts.push(`Secteur : ${input.sector}`);
  if (input.countryCode) parts.push(`Pays : ${input.countryCode}`);
  parts.push("");
  parts.push("Description de l'offre :");
  parts.push(`"""\n${input.offerText.trim()}\n"""`);
  parts.push("");
  parts.push("Produis le JSON ADVE déduit + RTIS preview.");
  return parts.join("\n");
}

// ── Public API ────────────────────────────────────────────────────────

export async function deduceAdveFromOffer(input: DeduceInput): Promise<DeducedAdve> {
  if (!input.offerText || input.offerText.trim().length < 30) {
    throw new Error("deduce-adve: offerText too short (need 30+ chars)");
  }

  const { text } = await callLLM({
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
    caller: "quick-intake:deduce-adve",
    maxTokens: 4000,
    tags: ["DEDUCE_ADVE_FROM_OFFER"],
  });

  const parsed = extractJSON(text);
  if (!parsed) {
    throw new Error("deduce-adve: LLM returned no parseable JSON");
  }

  const result = DeducedAdveSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `deduce-adve: LLM output failed Zod validation: ${result.error.issues.slice(0, 3).map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
    );
  }

  return result.data;
}

export const DeducedAdveOutputSchema = DeducedAdveSchema;
export const DeduceInputSchema = z.object({
  offerText: z.string().min(30).max(4000),
  brandName: z.string().min(1).max(120).optional(),
  sector: z.string().min(1).max(80).optional(),
  countryCode: z.string().length(2).optional(),
});

// ── Mark this module as ADVE-key safe — no hardcoded enum, uses domain ──
void PILLAR_KEYS;
export type { AdveKey };
