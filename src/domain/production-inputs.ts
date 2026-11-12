/**
 * Entrées du livrable cible (dette 4.11.a, ADR-0050 / ADR-0136).
 *
 * Avant tout appel, la production résout chaque entrée obligatoire de l’outil
 * qui produit le livrable depuis une origine déclarée — fiche de marque, brief
 * du post, proposition créative validée ou brief amont — sinon elle s’arrête et
 * rend la liste typée des manques. Une entrée facultative absente reste
 * absente : aucune valeur n’est fabriquée.
 *
 * Layer 0 — pur, sans IO. Les textes sont rendus au client (vocabulaire métier).
 */
import { z } from "zod";
import { BrandAssetKindSchema, type BrandAssetKind } from "./brand-asset-kinds";

export const productionInputSource = z.discriminatedUnion("from", [
  z.object({ from: z.literal("BRAND_FILE") }),
  z.object({ from: z.literal("CALENDAR_BRIEF") }),
  z.object({ from: z.literal("CREATIVE_PROPOSAL") }),
  z.object({ from: z.literal("PREREQUISITE"), kind: BrandAssetKindSchema }),
]);
export type ProductionInputSource = z.infer<typeof productionInputSource>;

export const missingProductionInput = z.discriminatedUnion("code", [
  z.object({
    code: z.literal("MISSING_REQUIRED_INPUT"),
    field: z.string(),
    label: z.string(),
    expected: z.array(productionInputSource),
  }),
  z.object({ code: z.literal("PREREQUISITE_UNAVAILABLE"), kind: BrandAssetKindSchema }),
]);
export type MissingProductionInput = z.infer<typeof missingProductionInput>;
export const missingProductionInputs = z.array(missingProductionInput);

/** A blank, an empty list or an empty object is an absence, never a value. */
export function isProvidedInputValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return text.length > 0 && !["{}", "[]", "null", "undefined"].includes(text);
}

export const PRODUCTION_KIND_LABELS: Readonly<Record<string, string>> = {
  KV_VISUAL: "Visuel principal", PRINT_AD_SPEC: "Annonce imprimée", STORYBOARD: "Storyboard",
  PITCH: "Présentation", VOICEOVER_BRIEF: "Voix off", VENDOR_BRIEF: "Brief prestataire",
  CASTING_BRIEF: "Brief casting", BCG_PORTFOLIO: "Matrice de portefeuille",
  MCK_3H: "Trois horizons", KV_ART_DIRECTION_BRIEF: "Direction artistique",
  BIG_IDEA: "Idée directrice", CONCEPT: "Concept", CHROMATIC_STRATEGY: "Palette de couleurs",
  TYPOGRAPHY_SYSTEM: "Système typographique", SEMIOTIC_ANALYSIS: "Analyse sémiotique",
  VISUAL_LANDSCAPE_MAP: "Paysage visuel", MOODBOARD: "Planche d’inspiration", CREATIVE_BRIEF: "Brief créatif",
  SCRIPT: "Script", SOUND_BRIEF: "Direction sonore", PERSONA: "Persona",
  VALUE_PROPOSITION: "Proposition de valeur", POSITIONING: "Positionnement",
  SOCIAL_COPY: "Texte social", TONE_CHARTER: "Ton éditorial",
};
export const productionKindLabel = (kind: string): string =>
  PRODUCTION_KIND_LABELS[kind] ?? kind.toLowerCase().replaceAll("_", " ");

const PRECONDITION_LABELS: Readonly<Record<string, string>> = {
  MISSING_ACTIVE_ADVE_PILLAR: "activer un pilier ADVE",
  MISSING_MANIPULATION_MIX_PRIMARY: "définir le mode stratégique principal",
  STRATEGY_ARCHIVED: "rouvrir la marque archivée",
  STRATEGY_NOT_FOUND: "sélectionner une marque accessible",
};
export const describeProductionPrecondition = (code: string): string =>
  PRECONDITION_LABELS[code] ?? "compléter la préparation de la marque";

export function describeProductionInputSource(source: ProductionInputSource): string {
  switch (source.from) {
    case "BRAND_FILE": return "la fiche de marque";
    case "CALENDAR_BRIEF": return "le brief du post";
    case "CREATIVE_PROPOSAL": return "une proposition créative validée";
    case "PREREQUISITE": return `le brief « ${productionKindLabel(source.kind)} »`;
  }
}

export function describeMissingProductionInput(missing: MissingProductionInput): string {
  if (missing.code === "PREREQUISITE_UNAVAILABLE")
    return `${productionKindLabel(missing.kind)} : aucune version à jour dans le coffre de la marque et aucune préparation automatique possible. Ajoutez ou retenez ce document.`;
  const origins = missing.expected.map(describeProductionInputSource);
  return `${missing.label} : à renseigner dans ${origins.length ? origins.join(" ou ") : "la préparation de ce livrable"}.`;
}

export function summarizeMissingProductionInputs(missing: readonly MissingProductionInput[]): string {
  if (!missing.length) return "";
  const lead = missing.length > 1 ? `${missing.length} entrées obligatoires manquent` : "Une entrée obligatoire manque";
  return `${lead} ; aucun appel n’est lancé tant qu’elles ne sont pas réunies. ${missing.map(describeMissingProductionInput).join(" ")}`;
}

/** Reference sent in the prompt field. The prerequisite's full text travels in the production sources. */
export function prerequisiteReference(kind: BrandAssetKind, versions: readonly { id: string; version: number }[]): string {
  const receipt = versions.map(v => `version ${v.version} · ${v.id}`).join(", ");
  return `Brief « ${productionKindLabel(kind)} »${receipt ? ` (${receipt})` : ""} — texte intégral transmis dans les sources de production ci-dessous.`;
}
