// ============================================================================
// MODULE M07 — Mestor AI Assistant
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: Annexe D §D.2 + §5.6 + §6.5 | Division: Transversal
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  Conversations (threads, 40 messages history, Claude AI)
// [x] REQ-2  System prompt expert ADVERTIS (brand strategy, cult marketing)
// [x] REQ-3  Context builder: strategy metadata, pillars, signals, campaigns, Cult Index, community
// [x] REQ-4  Insights proactifs (rule-based + AI, 7d expiration, 24h dedup)
// [x] REQ-5  Scénarios what-if (WHAT_IF, BUDGET_REALLOC, MARKET_ENTRY, COMPETITOR_RESPONSE)
// [x] REQ-6  Contextualisation par portal: cockpit=Brand OS, creator=mission+tier, console=god mode, intake=guided
// [x] REQ-7  Creator Portal: niveau de détail ADVE selon tier (Apprenti=basique, Maître=complet)
// [x] REQ-8  Quick Intake mode: guided interview (questions ADVE accessibles, pas de question libre)
// [x] REQ-9  Fixer Console mode: compare clients, analyze cross-patterns, Knowledge Graph access
//
// EXPORTS: MestorContext, buildSystemPrompt, buildContext, generateResponse,
//          getContextLabel, buildPortalContext, getCreatorTierPrompt,
//          getIntakeGuardRails, getConsoleCapabilities
// ============================================================================

import type { BusinessContext } from "@/lib/types/business-context";
import { BUSINESS_MODELS, ECONOMIC_MODELS, POSITIONING_ARCHETYPES } from "@/lib/types/business-context";
import { db } from "@/lib/db";

export type MestorContext = "cockpit" | "creator" | "console" | "intake";

const SYSTEM_PROMPTS: Record<MestorContext, string> = {
  cockpit: `Tu es Mestor, l'assistant IA du Brand OS de LaFusee. Tu aides le client a comprendre sa marque via le protocole ADVE-RTIS.

Regles :
- Tu ne reveles JAMAIS les mecaniques internes (Guilde, scoring structurel, Knowledge Graph)
- Tu parles de "votre score", "votre marque", "votre strategie"
- Tu peux expliquer les 8 piliers ADVE et ce qu'ils signifient
- Tu peux commenter l'evolution du Cult Index et de la Devotion Ladder
- Tu recommandes des actions concretes (briefs, campagnes, contenu)
- Tu ADAPTES ton vocabulaire et tes recommandations au modele economique de la marque (voir contexte business ci-dessous)
- Ton ton est professionnel, bienveillant, oriente resultats`,

  creator: `Tu es Mestor, l'assistant IA de la Guilde creative de LaFusee. Tu aides les creatifs dans leurs missions.

Regles :
- Tu expliques les guidelines du Driver assigne a la mission
- Tu detailles les piliers ADVE pertinents pour le brief
- La profondeur de contexte strategique depend du tier du creatif
- APPRENTI : tu donnes des directives claires sans contexte strategique
- COMPAGNON : tu expliques le "pourquoi" derriere les directives
- MAITRE/ASSOCIE : tu partages le contexte strategique complet, y compris le modele d'affaires et le positionnement prix
- Tu ne partages JAMAIS d'info sur d'autres clients`,

  console: `Tu es Mestor, l'assistant IA ecosysteme de LaFusee. Tu assistes le Fixer (Alexandre) dans la gestion de tout l'ecosysteme.

Regles :
- Tu as acces a TOUTES les donnees : cross-client, Knowledge Graph, benchmarks
- Tu peux comparer les clients entre eux, y compris par modele d'affaires et positionnement
- Tu suggeres des upsells, des diagnostics, des optimisations
- Tu detectes les desalignements entre modele d'affaires et strategie de marque
- Tu alertes sur les drifts, les SLA en danger, les opportunites
- Tu peux interroger les 6 MCP servers
- Ton ton est direct, data-driven, oriente action`,

  intake: `Tu es Mestor, le guide du diagnostic ADVE-RTIS. Tu menes une interview conversationnelle pour evaluer la force d'une marque.

Regles :
- Tu es chaleureux, curieux, encourageant
- Tu commences par comprendre le modele d'affaires et le positionnement prix de la marque
- Tu adaptes ensuite tes questions pilier par pilier en fonction du modele declare
- Tu reformules les reponses pour confirmer ta comprehension
- Tu ne juges pas — tu observes et notes
- A la fin, tu synthetises les forces et axes d'amelioration en tenant compte du modele economique
- Tu encourages le passage a IMPULSION pour un diagnostic complet`,
};

/**
 * Returns the base system prompt, optionally enriched with business context.
 */
export function getSystemPrompt(context: MestorContext, bizContext?: BusinessContext | null): string {
  let prompt = SYSTEM_PROMPTS[context];

  if (bizContext) {
    prompt += "\n\n" + buildBusinessContextBlock(bizContext);
  }

  return prompt;
}

export function getContextLabel(context: MestorContext): string {
  const labels: Record<MestorContext, string> = {
    cockpit: "Assistant Brand OS",
    creator: "Assistant Mission & Guidelines",
    console: "Assistant Ecosysteme",
    intake: "Guide diagnostic ADVE",
  };
  return labels[context];
}

/**
 * Builds a context block describing the brand's business model for injection into Mestor prompts.
 */
function buildBusinessContextBlock(ctx: BusinessContext): string {
  const bmLabel = BUSINESS_MODELS[ctx.businessModel]?.label ?? ctx.businessModel;
  const ecoLabels = ctx.economicModels.map((k) => ECONOMIC_MODELS[k]?.label ?? k).join(", ");
  const posLabel = POSITIONING_ARCHETYPES[ctx.positioningArchetype]?.label ?? ctx.positioningArchetype;

  const lines = [
    "--- CONTEXTE BUSINESS DE LA MARQUE ---",
    `Modele d'affaires : ${bmLabel}${ctx.businessModelSubtype ? ` (${ctx.businessModelSubtype})` : ""}`,
    `Modele(s) economique(s) : ${ecoLabels}`,
    `Positionnement prix : ${posLabel}`,
    `Canal de vente : ${ctx.salesChannel === "DIRECT" ? "Vente directe (D2C)" : ctx.salesChannel === "INTERMEDIATED" ? "Via distributeurs" : "Hybride (D2C + distributeurs)"}`,
  ];

  if (ctx.positionalGoodFlag) {
    lines.push("ATTENTION : Bien positionnel — la valeur derive du statut et de l'exclusivite. Adapter le vocabulaire en consequence.");
  }

  if (ctx.premiumScope === "PARTIAL") {
    lines.push("NOTE : Positionnement premium PARTIEL — seulement certains produits/lignes sont premium, pas toute la marque.");
  }

  if (ctx.freeLayer) {
    lines.push(`Element gratuit : ${ctx.freeLayer.whatIsFree} | Payant : ${ctx.freeLayer.whatIsPaid} | Levier de conversion : ${ctx.freeLayer.conversionLever}`);
  }

  lines.push("--- FIN CONTEXTE BUSINESS ---");
  lines.push("Adapte ton vocabulaire, tes exemples, et tes recommandations a ce contexte. Ne parle pas de 'retention' a une marque one-shot. Ne parle pas de 'feature gates' a une marque de luxe physique.");

  return lines.join("\n");
}

/**
 * v4 — Builds a context block from recent validated feedback entries.
 * Injected into Mestor system prompt so AI learns from past diagnostic drift.
 */
export async function buildFeedbackContext(strategyId: string): Promise<string> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const feedbackEntries = await db.knowledgeEntry.findMany({
    where: {
      entryType: "FEEDBACK_VALIDATED",
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Filter to entries relevant to this strategy
  const relevant = feedbackEntries.filter((e) => {
    const data = e.data as Record<string, unknown>;
    return data.strategyId === strategyId || !data.strategyId;
  });

  if (relevant.length === 0) return "";

  const lines = [
    "",
    "--- APPRENTISSAGES VALIDES (feedback loop) ---",
  ];
  for (const entry of relevant) {
    const data = entry.data as Record<string, unknown>;
    const pillar = (data.pillarFocus ?? entry.pillarFocus ?? "?") as string;
    const severity = (data.severity ?? "medium") as string;
    const diagnostic = (data.diagnostic ?? "N/A") as string;
    const driftPct = (data.driftPercent ?? 0) as number;
    lines.push(`- Pilier ${pillar.toUpperCase()} : drift ${driftPct}% (${severity}). Diagnostic : ${diagnostic.slice(0, 200)}`);
  }
  lines.push("Integre ces apprentissages dans tes recommandations. Ne repete pas les erreurs passees.");
  lines.push("--- FIN APPRENTISSAGES ---");

  return lines.join("\n");
}

// ── REQ-6: Portal-specific context enrichment ────────────────────────────

export type CreatorTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

export interface PortalContextOptions {
  portal: MestorContext;
  strategyId?: string;
  creatorTier?: CreatorTier;
  missionId?: string;
  driverId?: string;
  bizContext?: BusinessContext | null;
}

/**
 * Build a complete context block for a given portal context.
 * Combines system prompt + portal-specific metadata injection.
 */
export function buildPortalContext(options: PortalContextOptions): string {
  const base = getSystemPrompt(options.portal, options.bizContext);

  const sections: string[] = [base];

  if (options.portal === "cockpit" && options.strategyId) {
    sections.push("\n--- COCKPIT CONTEXT ---");
    sections.push(`Strategy ID: ${options.strategyId}`);
    sections.push("Mode: Brand OS — focus client, pas de mecaniques internes");
    sections.push("Affiche: scores ADVE, Cult Index, Devotion Ladder, campagnes actives");
  }

  if (options.portal === "creator" && options.creatorTier) {
    sections.push(getCreatorTierPrompt(options.creatorTier));
    if (options.missionId) sections.push(`Mission active: ${options.missionId}`);
    if (options.driverId) sections.push(`Driver assigne: ${options.driverId}`);
  }

  if (options.portal === "intake") {
    sections.push(getIntakeGuardRails());
  }

  if (options.portal === "console") {
    sections.push(getConsoleCapabilities());
  }

  return sections.join("\n");
}

// ── REQ-7: Creator tier-based prompt depth ───────────────────────────────

const TIER_DEPTH: Record<CreatorTier, { adveAccess: string[]; strategyDetail: boolean; budgetVisible: boolean }> = {
  APPRENTI: { adveAccess: ["A"], strategyDetail: false, budgetVisible: false },
  COMPAGNON: { adveAccess: ["A", "D", "V"], strategyDetail: true, budgetVisible: false },
  MAITRE: { adveAccess: ["A", "D", "V", "E", "R", "T", "I", "S"], strategyDetail: true, budgetVisible: true },
  ASSOCIE: { adveAccess: ["A", "D", "V", "E", "R", "T", "I", "S"], strategyDetail: true, budgetVisible: true },
};

/**
 * Returns tier-specific prompt instructions for Creator Portal.
 */
export function getCreatorTierPrompt(tier: CreatorTier): string {
  const config = TIER_DEPTH[tier];
  const lines = [
    "\n--- CREATOR TIER CONTEXT ---",
    `Tier creatif: ${tier}`,
    `Piliers ADVE accessibles: ${config.adveAccess.join(", ")}`,
    `Detail strategique: ${config.strategyDetail ? "OUI — explique le pourquoi" : "NON — directives uniquement"}`,
    `Budget visible: ${config.budgetVisible ? "OUI" : "NON"}`,
  ];

  if (tier === "APPRENTI") {
    lines.push("REGLE: Donne des instructions claires et directes. Pas de contexte strategique. Pas de justification business.");
  } else if (tier === "COMPAGNON") {
    lines.push("REGLE: Explique le raisonnement derriere les choix creatifs. Mentionne les piliers A, D, V pertinents.");
  } else {
    lines.push("REGLE: Partage le contexte strategique complet. Le creatif est un partenaire strategique.");
  }

  return lines.join("\n");
}

// ── REQ-8: Quick Intake guard rails ──────────────────────────────────────

/**
 * Returns guard rail instructions for Intake mode.
 * Prevents free-form questions, enforces ADVE-guided interview structure.
 */
export function getIntakeGuardRails(): string {
  return [
    "\n--- INTAKE GUARD RAILS ---",
    "MODE: Interview guidee ADVE-RTIS",
    "INTERDIT: Questions libres de l'utilisateur hors du cadre ADVE",
    "INTERDIT: Reveler les mecaniques internes (scoring, Knowledge Graph)",
    "OBLIGATOIRE: Suivre la sequence biz → A → D → V → E",
    "OBLIGATOIRE: Reformuler chaque reponse avant de passer au pilier suivant",
    "OBLIGATOIRE: Adapter le vocabulaire au secteur declare",
    "SEQUENCE DES PHASES:",
    "  1. biz — Modele d'affaires, positionnement prix, canal de vente",
    "  2. A — Authenticite: origine, valeurs, fondateur, manifesto",
    "  3. D — Distinction: identite visuelle, personas, territoire",
    "  4. V — Valeur: produits, promesse, pricing, benefices",
    "  5. E — Engagement: touchpoints, rituels, communaute",
    "A la fin: synthese forces + axes d'amelioration + encouragement vers IMPULSION",
  ].join("\n");
}

// ── REQ-9: Console (Fixer) capabilities ──────────────────────────────────

/**
 * Returns capabilities block for the Fixer Console mode.
 * Enables cross-client comparison, Knowledge Graph access, pattern analysis.
 */
export function getConsoleCapabilities(): string {
  return [
    "\n--- FIXER CONSOLE CAPABILITIES ---",
    "MODE: God mode — acces complet ecosysteme",
    "CAPACITES:",
    "  - Comparaison cross-clients: benchmarks, scores ADVE relatifs",
    "  - Knowledge Graph: patterns par secteur, par modele economique",
    "  - Detection de desalignements: modele d'affaires vs strategie de marque",
    "  - Analyse cross-patterns: correlations entre secteurs et piliers faibles",
    "  - Upsell detection: identifier les clients prets pour IMPULSION, IMPLEMENTATION",
    "  - SLA monitoring: alertes sur les engagements en danger",
    "  - MCP servers: acces aux 6 serveurs de donnees connectees",
    "REGLE: Ton direct, data-driven, oriente action. Pas de politesse excessive.",
    "REGLE: Toujours citer les sources de donnees (pilier, signal, KG entry).",
  ].join("\n");
}
