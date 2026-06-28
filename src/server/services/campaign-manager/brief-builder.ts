/**
 * brief-builder.ts — Constructeur de briefs de campagne **déterministe**.
 *
 * Doctrine « Fusée non-dépendante du LLM » + LOI 9 : la génération de brief de
 * campagne est purement mécanique. Aucun appel LLM, aucun SDK externe, aucune
 * variance. Même entrée (campagne + stratégie ADVE + action) → même brief, à
 * l'octet près.
 *
 * Le brief est dérivé du **noyau ADVE** de la marque (piliers a/d/v/e) et de
 * l'action déclenchante. Le LLM n'a JAMAIS été un bon outil ici : un brief de
 * production est une projection structurée de données déjà déclarées (piliers,
 * persona, touchpoint, budget). Le rendre déterministe le rend aussi reproductible
 * et auditable.
 *
 * Forme canonique de sortie (alignée sur `strategy.generateProjectsFromActions`
 * et le rendu cockpit `BriefsTab`) : `briefClient` + une section typée
 * (`briefCreatif` | `briefMedia` | `briefVendor` | `briefProduction`) + `meta`.
 *
 * Réutilise `flattenPillarText` (helper déterministe partagé de la gate C6) pour
 * aplatir un contenu pilier JSON arbitraire en texte lisible.
 */

import { flattenPillarText } from "@/server/services/mestor/gates/brief-adve-coherence-score";

export type CampaignBriefType = "CREATIVE" | "MEDIA" | "VENDOR" | "PRODUCTION";

export interface BriefBuilderPillar {
  key: string;
  content: unknown;
}

export interface BriefBuilderAction {
  title?: string | null;
  description?: string | null;
  persona?: string | null;
  locality?: string | null;
  touchpoint?: string | null;
  channel?: string | null;
  sku?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetCurrency?: string | null;
  timingStart?: Date | string | null;
  timingEnd?: Date | string | null;
}

export interface BriefBuilderCampaign {
  name: string;
  objectives?: unknown;
  advertis_vector?: unknown;
  budget?: number | null;
  budgetCurrency?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export interface BriefBuilderStrategy {
  name: string;
  pillars: BriefBuilderPillar[];
}

export interface BriefBuilderContext {
  campaign: BriefBuilderCampaign;
  strategy: BriefBuilderStrategy;
  /** Action déclenchante (roadmap). Optionnelle : la campagne en tient lieu. */
  action?: BriefBuilderAction | null;
}

// ── Helpers déterministes ──────────────────────────────────────────────────

/** Tronque proprement sur une frontière de mot, suffixe « … ». */
function clip(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function pillarContent(pillars: BriefBuilderPillar[], storageKey: string): unknown {
  const p = pillars.find((x) => x.key.toLowerCase() === storageKey);
  return p?.content ?? null;
}

/**
 * Premier champ string non-vide d'un objet pilier parmi une liste de clés
 * candidates (top-level). Aplati récursivement (objets/tableaux imbriqués) via
 * `flattenPillarText`. Retourne "" si rien d'exploitable.
 */
function fieldFrom(content: unknown, candidates: string[], maxLen: number): string {
  if (!content || typeof content !== "object") return "";
  const obj = content as Record<string, unknown>;
  for (const key of candidates) {
    if (key in obj) {
      const flat = flattenPillarText(obj[key]).trim();
      if (flat.length > 0) return clip(flat, maxLen);
    }
  }
  return "";
}

/** Champ pilier avec repli déterministe : champ ciblé, sinon aplat global, sinon defaultText. */
function salient(
  pillars: BriefBuilderPillar[],
  storageKey: string,
  candidates: string[],
  maxLen: number,
  defaultText: string,
): string {
  const content = pillarContent(pillars, storageKey);
  const targeted = fieldFrom(content, candidates, maxLen);
  if (targeted) return targeted;
  const flat = flattenPillarText(content).trim();
  if (flat) return clip(flat, maxLen);
  return defaultText;
}

function ymd(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const dt = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
}

function budgetLabel(
  action: BriefBuilderAction | null | undefined,
  campaign: BriefBuilderCampaign,
): string {
  const cur = action?.budgetCurrency ?? campaign.budgetCurrency ?? "XAF";
  const min = action?.budgetMin ?? null;
  const max = action?.budgetMax ?? null;
  if (min || max) {
    return `${(min ?? 0).toLocaleString("fr-FR")} – ${max ? max.toLocaleString("fr-FR") : "—"} ${cur}`;
  }
  if (campaign.budget) return `${campaign.budget.toLocaleString("fr-FR")} ${cur}`;
  return `À cadrer (${cur})`;
}

function objectiveDescription(campaign: BriefBuilderCampaign): string {
  const o = campaign.objectives;
  if (o && typeof o === "object" && "description" in o) {
    const d = (o as { description?: unknown }).description;
    if (typeof d === "string" && d.trim()) return d.trim();
  }
  return "";
}

/** Synthétise une action depuis la campagne quand aucune action n'est fournie. */
function resolveAction(ctx: BriefBuilderContext): BriefBuilderAction {
  if (ctx.action) return ctx.action;
  return {
    title: ctx.campaign.name,
    description: objectiveDescription(ctx.campaign),
    budgetMin: ctx.campaign.budget ?? null,
    budgetCurrency: ctx.campaign.budgetCurrency ?? null,
    timingStart: ctx.campaign.startDate ?? null,
    timingEnd: ctx.campaign.endDate ?? null,
  };
}

// ── Sections ────────────────────────────────────────────────────────────────

function buildBriefClient(
  ctx: BriefBuilderContext,
  action: BriefBuilderAction,
): Record<string, string> {
  const { strategy, campaign } = ctx;
  const noyau = salient(
    strategy.pillars, "a",
    ["noyauIdentitaire", "citationFondatrice", "promesseFondamentale"],
    600,
    `${strategy.name} — marque opérée par La Fusée d'UPgraders.`,
  );
  const secteur = fieldFrom(pillarContent(strategy.pillars, "d"), ["secteur"], 120);
  const cible = action.persona
    ? action.persona
    : salient(strategy.pillars, "d", ["publicCible", "personas"], 300, "Cible principale à confirmer avec le client.");
  const bigIdea = salient(
    strategy.pillars, "d",
    ["promesseMaitre", "promesseFondamentale", "accroche"],
    300,
    salient(strategy.pillars, "a", ["citationFondatrice"], 300, `Faire rayonner ${strategy.name}.`),
  );
  const businessContext = action.description?.trim()
    || objectiveDescription(campaign)
    || `Déploiement de l'action « ${action.title ?? campaign.name} » au service de la trajectoire de marque.`;

  return {
    client: strategy.name,
    contexte_business: businessContext,
    contexte_marque: noyau,
    contexte_market: [
      action.locality ? `Localité : ${action.locality}.` : null,
      secteur ? `Secteur : ${secteur}.` : null,
    ].filter(Boolean).join(" ") || "Marché à préciser.",
    cible_principale: cible,
    obj_business: `Concrétiser « ${action.title ?? campaign.name} » et nourrir la trajectoire ADVE de ${strategy.name}.`,
    big_idea: bigIdea,
  };
}

function buildCreative(ctx: BriefBuilderContext, action: BriefBuilderAction): Record<string, string> {
  const { strategy } = ctx;
  return {
    message_claim: action.title ?? ctx.campaign.name,
    challenge_creatif: `Traduire « ${action.title ?? ctx.campaign.name} » en exécution créative distinctive et cohérente avec le noyau de marque.`,
    tone_of_voice: salient(strategy.pillars, "d", ["tonDeVoix", "archetypalExpression"], 300, "Ton aligné sur l'archétype de marque."),
    direction_artistique: salient(strategy.pillars, "d", ["directionArtistique", "assetsLinguistiques"], 400, "Direction artistique à dériver du système visuel de marque."),
    messages_cles: salient(strategy.pillars, "d", ["sousPromesses", "promesseMaitre"], 400, "Messages clés à décliner depuis la promesse maître."),
    livrables: action.touchpoint ? `Supports créatifs pour le touchpoint ${action.touchpoint}.` : "Supports créatifs multi-touchpoints.",
  };
}

function buildMedia(ctx: BriefBuilderContext, action: BriefBuilderAction): Record<string, string> {
  const canal = action.channel ?? action.touchpoint ?? "Mix média à arbitrer";
  return {
    objectifs_media: `Maximiser la portée utile de « ${action.title ?? ctx.campaign.name} » sur la cible prioritaire.`,
    cibles: action.persona ?? salient(ctx.strategy.pillars, "d", ["publicCible", "personas"], 300, "Cible média à confirmer."),
    canaux: canal,
    budget_repartition: budgetLabel(action, ctx.campaign),
    calendrier: [ymd(action.timingStart), ymd(action.timingEnd)].filter(Boolean).join(" → ") || "Fenêtre à planifier.",
    kpis: "Reach, fréquence, CPM, taux d'engagement — à cibler selon l'étage AARRR.",
  };
}

function buildVendor(ctx: BriefBuilderContext, action: BriefBuilderAction): Record<string, string> {
  return {
    contexte: `Prestation requise pour « ${action.title ?? ctx.campaign.name} »${action.locality ? ` (${action.locality})` : ""}.`,
    specifications_techniques: action.touchpoint ? `Spécifications liées au touchpoint ${action.touchpoint}.` : "Spécifications à détailler avec le prestataire.",
    quantites: action.sku ? `Référence produit : ${action.sku}.` : "Quantités à cadrer.",
    delais: ymd(action.timingEnd) ? `Livraison attendue avant le ${ymd(action.timingEnd)}.` : "Délais à fixer.",
    budget_indicatif: budgetLabel(action, ctx.campaign),
    criteres_selection: "Qualité, respect du délai, conformité au noyau de marque, capacité terrain locale.",
  };
}

function buildProduction(ctx: BriefBuilderContext, action: BriefBuilderAction): Record<string, string> {
  return {
    livrable_principal: action.touchpoint ? `Supports requis pour le touchpoint ${action.touchpoint}.` : "Livrables de production à cadrer.",
    specifications_techniques: salient(ctx.strategy.pillars, "d", ["directionArtistique"], 300, "Spécifications dérivées de la direction artistique de marque."),
    planning_production: [ymd(action.timingStart), ymd(action.timingEnd)].filter(Boolean).join(" → ") || "Planning à établir.",
    equipe_requise: "Équipe à assembler via Imhotep (crew) selon les compétences requises.",
    budget_production: budgetLabel(action, ctx.campaign),
    controle_qualite: "Validation BAT + contrôle de cohérence narrative (NARRATIVE_COHERENCE_GATE) avant livraison.",
    deadline_prod: ymd(action.timingEnd) ?? "",
  };
}

// ── API publique ──────────────────────────────────────────────────────────

/** Driver tRPC stocké sur `CampaignBrief.targetDriver` par type de brief. */
export const BRIEF_TARGET_DRIVER: Record<CampaignBriefType, string> = {
  CREATIVE: "CREATIVE",
  MEDIA: "MEDIA",
  VENDOR: "VENDOR",
  PRODUCTION: "PRODUCTION",
};

/** Titre lisible du brief par type. */
export function briefTitle(briefType: CampaignBriefType, campaignName: string): string {
  const label: Record<CampaignBriefType, string> = {
    CREATIVE: "Brief Créatif",
    MEDIA: "Brief Média",
    VENDOR: "Brief Fournisseur",
    PRODUCTION: "Brief Production",
  };
  return `${label[briefType]} — ${campaignName}`;
}

/**
 * Construit le contenu structuré d'un brief de campagne, de manière 100 %
 * déterministe (zéro LLM). Toujours non-vide : chaque champ a un repli déclaratif.
 */
export function buildCampaignBrief(
  briefType: CampaignBriefType,
  ctx: BriefBuilderContext,
): Record<string, unknown> {
  const action = resolveAction(ctx);
  const briefClient = buildBriefClient(ctx, action);

  const section: Record<string, Record<string, string>> = {};
  switch (briefType) {
    case "CREATIVE":
      section.briefCreatif = buildCreative(ctx, action);
      break;
    case "MEDIA":
      section.briefMedia = buildMedia(ctx, action);
      break;
    case "VENDOR":
      section.briefVendor = buildVendor(ctx, action);
      break;
    case "PRODUCTION":
      section.briefProduction = buildProduction(ctx, action);
      break;
  }

  return {
    briefClient,
    ...section,
    caseStudy: {},
    meta: {
      briefType,
      generatedBy: "deterministic-builder",
      pillarsUsed: ctx.strategy.pillars.map((p) => p.key.toLowerCase()).sort(),
    },
  };
}
