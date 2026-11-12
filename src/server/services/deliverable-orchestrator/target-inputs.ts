/**
 * Deliverable Orchestrator — contrat d’entrée du livrable cible (dette 4.11.a).
 *
 * Chaque champ déclaré (`inputFields`) de l’outil producteur est classé
 * obligatoire ou facultatif, avec ses origines admises dans l’ordre de
 * préférence. Le compositeur résout les obligatoires avant tout appel, ou rend
 * la liste typée des manques. Les facultatifs absents restent absents.
 *
 * Même logique que `target-mapping.ts` : la table étend le support des
 * livrables cibles sans toucher au registre des outils. Layer 1 — pur, sans IO.
 */

import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import { FORMAT_TO_KIND } from "@/domain/brand-asset-formats";
import type { ProductionSourceManifest } from "@/domain/production-sources";
import {
  isProvidedInputValue,
  prerequisiteReference,
  productionKindLabel,
  type MissingProductionInput,
  type ProductionInputSource,
} from "@/domain/production-inputs";
import { getGloryTool } from "@/server/services/artemis/tools/registry";
import type { SupportedTargetKind } from "./target-mapping";
import type { DeliverableComposition } from "./types";

export interface TargetInputRule {
  readonly required: boolean;
  /** Libellé métier rendu au client. */
  readonly label: string;
  /** Origines admises, la première renseignée l’emporte. */
  readonly sources: readonly ProductionInputSource[];
}

const BRAND: ProductionInputSource = { from: "BRAND_FILE" };
const CALENDAR: ProductionInputSource = { from: "CALENDAR_BRIEF" };
const PROPOSAL: ProductionInputSource = { from: "CREATIVE_PROPOSAL" };
const brief = (kind: BrandAssetKind): ProductionInputSource => ({ from: "PREREQUISITE", kind });
const req = (label: string, ...sources: ProductionInputSource[]): TargetInputRule => ({ required: true, label, sources });
const opt = (label: string, ...sources: ProductionInputSource[]): TargetInputRule => ({ required: false, label, sources });

export const TARGET_INPUT_CONTRACT: { readonly [K in SupportedTargetKind]: Readonly<Record<string, TargetInputRule>> } = {
  KV_VISUAL: {
    concept: req("Concept créatif retenu", CALENDAR, PROPOSAL, brief("BIG_IDEA")),
    chromatic_strategy: req("Direction chromatique", BRAND, brief("CHROMATIC_STRATEGY")),
    // The output declares the format of each prompt; a missing target format is not invented here.
    format: opt("Format cible", CALENDAR),
    campaign_context: opt("Contexte de campagne", CALENDAR),
    archetype: opt("Archétype", BRAND),
    prophecy: opt("Vision de marque", BRAND),
    master_promise: opt("Promesse principale", BRAND),
    tone_of_voice: opt("Ton de voix", BRAND),
    personality: opt("Personnalité de marque", BRAND),
    typography_system: opt("Système typographique", BRAND, brief("KV_ART_DIRECTION_BRIEF")),
    moodboard_keywords: opt("Planche d’inspiration", BRAND, brief("KV_ART_DIRECTION_BRIEF")),
    primary_persona: opt("Persona cible", BRAND),
    linguistic_assets: opt("Signature et accroches", BRAND),
  },
  PRINT_AD_SPEC: {
    concept: req("Concept", CALENDAR, PROPOSAL, brief("CONCEPT"), brief("BIG_IDEA")),
    visual_direction: req("Direction visuelle", BRAND, brief("CHROMATIC_STRATEGY")),
    format: opt("Format de l’annonce", CALENDAR),
    headline: opt("Accroche", BRAND),
  },
  STORYBOARD: {
    script: req("Script", brief("SCRIPT")),
    visual_direction: req("Direction visuelle", BRAND, brief("CHROMATIC_STRATEGY")),
    duration: opt("Durée"),
    chromatic_strategy: opt("Direction chromatique", BRAND, brief("CHROMATIC_STRATEGY")),
  },
  PITCH: {
    client_brief: req("Brief client", brief("CREATIVE_BRIEF")),
    creative_proposal: req("Proposition créative", PROPOSAL, brief("BIG_IDEA")),
    agency_strengths: opt("Forces de l’équipe", BRAND),
    budget: opt("Budget", BRAND),
  },
  VOICEOVER_BRIEF: {
    script: req("Script", brief("SCRIPT")),
    tone: req("Ton", BRAND, brief("TONE_CHARTER")),
    brand_personality: opt("Personnalité de marque", BRAND),
    duration: opt("Durée"),
    format: opt("Format", CALENDAR),
  },
  VENDOR_BRIEF: {
    deliverable: req("Livrable demandé", brief("CREATIVE_BRIEF")),
    specs: opt("Spécifications"),
    deadline: opt("Échéance"),
    budget: opt("Budget", BRAND),
    quality_criteria: opt("Critères de qualité", BRAND),
  },
  CASTING_BRIEF: {
    storyboard: req("Storyboard", brief("STORYBOARD")),
    personas: opt("Personas", BRAND),
    brand_personality: opt("Personnalité de marque", BRAND),
    tone: opt("Ton", BRAND),
  },
  BCG_PORTFOLIO: {
    business_units: req("Offres et unités d’activité", BRAND),
    market_growth_rates: opt("Croissance du marché", BRAND),
    relative_market_shares: opt("Parts de marché relatives"),
    competitive_landscape: opt("Paysage concurrentiel", BRAND),
  },
  MCK_3H: {
    current_business: req("Activité actuelle", BRAND),
    emerging_opportunities: opt("Opportunités émergentes", BRAND),
    future_visions: opt("Visions à long terme", BRAND),
    innovation_pipeline: opt("Innovations en préparation", BRAND),
  },
};

/**
 * Mirrors `prepareUpstreamBriefs.visit`: an active version is terminal, otherwise
 * the declared producer must exist and its own prerequisites must be obtainable.
 * `unavailable` lists the root causes only (no active version and no producer).
 */
export function prerequisiteAvailability(composition: Pick<DeliverableComposition, "targetKind" | "briefDag" | "vaultMatches">) {
  const target = composition.briefDag.find(n => n.depth === 0);
  const known = new Map<BrandAssetKind, boolean>();
  const unavailable: BrandAssetKind[] = [];
  const visiting = new Set<BrandAssetKind>();
  function obtainable(kind: BrandAssetKind): boolean {
    const cached = known.get(kind);
    if (cached !== undefined) return cached;
    if (visiting.has(kind)) return false;
    visiting.add(kind);
    const node = composition.briefDag.find(n => n.kind === kind);
    const match = composition.vaultMatches.find(m => m.kind === kind);
    let ok: boolean;
    if (node && match?.status === "ACTIVE_REUSE") ok = true;
    else {
      const tool = node?.producerSlug ? getGloryTool(node.producerSlug) : undefined;
      ok = !!node && !!match && !!tool && FORMAT_TO_KIND[tool.outputFormat] === kind;
      if (!ok) unavailable.push(kind);
      // Report every root cause, not only the first one met.
      for (const parent of node?.requires ?? []) if (!obtainable(parent)) ok = false;
    }
    visiting.delete(kind);
    known.set(kind, ok);
    return ok;
  }
  for (const kind of target?.requires ?? []) obtainable(kind);
  return {
    unavailable,
    obtainable: new Set([...known].filter(([, ok]) => ok).map(([kind]) => kind)),
  };
}

/** Calendar values the producer receives today, kept verbatim and without blanks. */
export function calendarToolFields(manifest: ProductionSourceManifest): Record<string, string> {
  const calendar = manifest.calendarBrief;
  if (!calendar) return {};
  const fields: Record<string, string | null | undefined> = {
    format: calendar.format, platform: calendar.platform, theme: calendar.theme, angle: calendar.angle,
    creativeFamily: calendar.family, creativeMode: calendar.mode, campaign_context: calendar.name,
    concept: manifest.creativeProposal?.direction || calendar.angle || calendar.theme || calendar.name,
  };
  return Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, string] => isProvidedInputValue(entry[1])));
}

export interface PreparedPrerequisite {
  readonly kind: BrandAssetKind;
  readonly versions: readonly { id: string; version: number }[];
}

export interface TargetInputPlan {
  /** Values of the contract fields that have a declared origin. Absent optional fields are omitted. */
  readonly values: Readonly<Record<string, string>>;
  readonly required: readonly string[];
  readonly optionalAbsent: readonly string[];
  readonly missing: readonly MissingProductionInput[];
}

/**
 * Before the cascade (`prepared` absent) a prerequisite counts when it is active or
 * can be prepared. After the cascade only the versions actually prepared count.
 */
export function planTargetInputs(args: {
  composition: Pick<DeliverableComposition, "targetKind" | "briefDag" | "vaultMatches">;
  brandFile: Readonly<Record<string, string>>;
  manifest: ProductionSourceManifest;
  prepared?: readonly PreparedPrerequisite[];
}): TargetInputPlan {
  const contract = TARGET_INPUT_CONTRACT[args.composition.targetKind as SupportedTargetKind];
  if (!contract) throw new Error(`Aucun contrat d’entrée pour le livrable « ${productionKindLabel(args.composition.targetKind)} ».`);
  const availability = prerequisiteAvailability(args.composition);
  const prerequisites = new Map<BrandAssetKind, string>();
  if (args.prepared) for (const p of args.prepared) prerequisites.set(p.kind, prerequisiteReference(p.kind, p.versions));
  else for (const kind of availability.obtainable) prerequisites.set(kind, prerequisiteReference(kind, []));
  const calendar = calendarToolFields(args.manifest);
  const proposal = args.manifest.creativeProposal?.direction;
  const read = (field: string, source: ProductionInputSource): string | undefined => {
    switch (source.from) {
      case "BRAND_FILE": return args.brandFile[field];
      case "CALENDAR_BRIEF": return calendar[field];
      case "CREATIVE_PROPOSAL": return proposal;
      case "PREREQUISITE": return prerequisites.get(source.kind);
    }
  };
  const values: Record<string, string> = {};
  const missing: MissingProductionInput[] = (args.prepared ? [] : availability.unavailable)
    .map(kind => ({ code: "PREREQUISITE_UNAVAILABLE" as const, kind }));
  const required: string[] = [];
  const optionalAbsent: string[] = [];
  for (const [field, rule] of Object.entries(contract)) {
    const value = rule.sources.map(source => read(field, source)).find(isProvidedInputValue);
    if (rule.required) required.push(field);
    if (value !== undefined) values[field] = value;
    else if (rule.required) missing.push({ code: "MISSING_REQUIRED_INPUT", field, label: rule.label, expected: [...rule.sources] });
    else optionalAbsent.push(field);
  }
  return { values, required, optionalAbsent, missing };
}
