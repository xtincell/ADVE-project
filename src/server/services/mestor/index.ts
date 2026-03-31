import type { BusinessContext } from "@/lib/types/business-context";
import { BUSINESS_MODELS, ECONOMIC_MODELS, POSITIONING_ARCHETYPES } from "@/lib/types/business-context";

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
