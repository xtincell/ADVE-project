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
import { sanitizeInline, wrapUntrusted } from "@/server/services/utils/untrusted-content";
import { PILLAR_KEYS, ADVE_KEYS, type AdveKey } from "@/domain/pillars";
import { classifyTier } from "@/domain";

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
  classification: z.enum(["LATENT", "FRAGILE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"]),
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

// Sous-schémas pour l'ÉCLATEMENT du mega-appel (PR-K3-ter) : 1 appel « piliers »
// + 1 appel « teasers ». Le composite/classification/stage sont DÉTERMINISTES.
const PillarsOnlySchema = z.object({ pillars: z.array(DeducedPillarSchema).length(4) });
const TeasersSchema = z.object({
  rtisPreview: DeducedAdveSchema.shape.rtisPreview,
  ifUpgraded: DeducedAdveSchema.shape.ifUpgraded,
});
type DeducedPillar = z.infer<typeof DeducedPillarSchema>;

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

// ── Prompts (ÉCLATÉS : piliers vs teasers — fiabilité sur le 8B local) ──────

const SYSTEM_PILLARS = `Tu es un stratège de marque senior (méthode ADVE). À partir d'un paragraphe libre décrivant une offre/marque, tu DÉDUIS les 4 piliers ADVE. Tu ne paraphrases pas — tu inférences, et tu n'inventes pas de faits absents (marque ta confiance).

Pour CHAQUE pilier (A=Authenticité, D=Distinction, V=Valeur, E=Engagement) :
- 4 à 6 champs structurés (tonDeVoix, archetype, promesseMaitre, ennemi, etc.) avec valeurs concrètes inférées
- une confiance 0-1 par champ (0.3 = inférence faible, 0.9 = explicite dans le texte)
- un narratif de 80 à 800 caractères qui révèle ce que l'offre dit *sans le dire*
- un score estimé /25

Réponds UNIQUEMENT en JSON : { "pillars": [ {key,name,fields,narrative,scoreEstimate} ×4 ] }. Pas de markdown.`;

const SYSTEM_TEASERS = `Tu es un stratège de marque senior (méthode ADVE-RTIS). On te donne les 4 piliers ADVE déjà déduits d'une marque. Tu produis l'accroche commerciale de la suite RTIS.

Produis :
- rtisPreview : 3 teasers (parmi R=Risk, T=Track, I=Implementation, S=Synthèse) — chacun un headline (20-120 caractères) + un teaser (60-300 caractères) qui donnent envie sans tout révéler, ANCRÉS dans les piliers fournis
- ifUpgraded : 2 à 5 gaps critiques (≥10 caractères) que la version payante de l'OS comblerait

Réponds UNIQUEMENT en JSON : { "rtisPreview": [...×3], "ifUpgraded": [...] }. Pas de markdown, n'invente aucun chiffre.`;

function buildBaseContext(input: DeduceInput): string {
  // LOT 1a — entrées utilisateur neutralisées (anti-injection). Ce chemin
  // appelle le LLM en direct (hors chokepoints LOT 0) ; on balise donc ici.
  const parts: string[] = [];
  if (input.brandName) parts.push(`Marque : ${sanitizeInline(input.brandName, { max: 120 })}`);
  if (input.sector) parts.push(`Secteur : ${sanitizeInline(input.sector, { max: 80 })}`);
  if (input.countryCode) parts.push(`Pays : ${sanitizeInline(input.countryCode, { max: 8 })}`);
  parts.push("");
  parts.push(wrapUntrusted("Description de l'offre", input.offerText.trim(), { max: 4000 }));
  return parts.join("\n");
}

// ── Étapes DÉTERMINISTES (zéro LLM) ─────────────────────────────────────

/** Score composite ADVE = somme des 4 scores piliers (/25 chacun → /100). */
function computeComposite(pillars: DeducedPillar[]): number {
  const sum = pillars.reduce((n, p) => n + (p.scoreEstimate ?? 0), 0);
  return Math.max(0, Math.min(100, Math.round(sum)));
}

/** Étage fusée observé — dérivé du composite (déterministe, par seuils). */
function deriveStage(composite: number): "BOOSTER_ADVE" | "MID_RT" | "UPPER_IS" {
  if (composite < 50) return "BOOSTER_ADVE";
  if (composite < 75) return "MID_RT";
  return "UPPER_IS";
}

/** Teasers de secours si l'appel LLM B échoue — respecte le schéma (jamais de crash démo). */
function fallbackTeasers(pillars: DeducedPillar[]): { rtisPreview: DeducedAdve["rtisPreview"]; ifUpgraded: string[] } {
  const weakest = [...pillars].sort((a, b) => a.scoreEstimate - b.scoreEstimate)[0];
  return {
    rtisPreview: [
      { pillar: "R", headline: "Les failles que vos concurrents exploitent", teaser: "Le protocole Risk cartographie les vulnérabilités de votre marque avant qu'elles ne coûtent cher — diagnostic complet dans la version OS." },
      { pillar: "T", headline: "Là où le marché vous attend vraiment", teaser: "Le protocole Track confronte votre identité à la réalité terrain : taille de marché, perception réelle, signaux faibles — pour viser juste." },
      { pillar: "I", headline: "Le plan qui transforme l'intuition en système", teaser: "Le protocole Implementation décline votre stratégie en sprint 90 jours, calendrier annuel et budget — exécutable dès demain." },
    ],
    ifUpgraded: [
      `Renforcer le pilier ${weakest?.name ?? "le plus faible"} avec des données marché vérifiées.`,
      "Débloquer les protocoles RTIS complets (Risk, Track, Implementation, Synthèse).",
    ],
  };
}

// ── Appels LLM focalisés ────────────────────────────────────────────────

/** Appel A — les 4 piliers ADVE (cœur, essentiel). Throw si invalide. */
async function deducePillars(input: DeduceInput): Promise<DeducedPillar[]> {
  const { text } = await callLLM({
    system: SYSTEM_PILLARS,
    prompt: `${buildBaseContext(input)}\n\nProduis le JSON des 4 piliers ADVE déduits.`,
    caller: "quick-intake:deduce-adve:pillars",
    purpose: "extraction",
    maxOutputTokens: 2800,
    tags: ["DEDUCE_ADVE_FROM_OFFER"],
  });
  const result = PillarsOnlySchema.safeParse(extractJSON(text));
  if (!result.success) {
    throw new Error(
      `deduce-adve: pillars failed Zod: ${result.error.issues.slice(0, 3).map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
    );
  }
  return result.data.pillars;
}

/** Appel B — teasers RTIS + gaps (créatif). Fallback déterministe si échec. */
async function deduceTeasers(
  input: DeduceInput,
  pillars: DeducedPillar[],
): Promise<{ rtisPreview: DeducedAdve["rtisPreview"]; ifUpgraded: string[] }> {
  try {
    const pillarsSummary = pillars
      .map((p) => `${p.key} (${p.name}, ${p.scoreEstimate}/25): ${p.narrative.slice(0, 200)}`)
      .join("\n");
    const { text } = await callLLM({
      system: SYSTEM_TEASERS,
      prompt: `${buildBaseContext(input)}\n\nPILIERS ADVE DÉJÀ DÉDUITS :\n${pillarsSummary}\n\nProduis le JSON { rtisPreview, ifUpgraded }.`,
      caller: "quick-intake:deduce-adve:teasers",
      purpose: "extraction",
      maxOutputTokens: 1200,
      tags: ["DEDUCE_ADVE_FROM_OFFER"],
    });
    const result = TeasersSchema.safeParse(extractJSON(text));
    if (result.success) return result.data;
  } catch {
    // chute sur le fallback déterministe
  }
  return fallbackTeasers(pillars);
}

// ── Public API ────────────────────────────────────────────────────────

export async function deduceAdveFromOffer(input: DeduceInput): Promise<DeducedAdve> {
  if (!input.offerText || input.offerText.trim().length < 30) {
    throw new Error("deduce-adve: offerText too short (need 30+ chars)");
  }

  // 1) Les 4 piliers ADVE (cœur) — appel LLM focalisé.
  const pillars = await deducePillars(input);

  // 2) Méta DÉTERMINISTE (zéro LLM) : composite = somme des scores piliers,
  //    classification par seuils (classifyTier), étage fusée dérivé.
  const compositeAdve = computeComposite(pillars);
  const classification = classifyTier(compositeAdve, 100) as DeducedAdve["classification"];
  const stageObserved = deriveStage(compositeAdve);

  // 3) Teasers RTIS + gaps (créatif) — appel LLM focalisé, fallback déterministe.
  const { rtisPreview, ifUpgraded } = await deduceTeasers(input, pillars);

  // Contrat final (revalide l'assemblage complet).
  return DeducedAdveSchema.parse({ pillars, compositeAdve, classification, rtisPreview, stageObserved, ifUpgraded });
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
