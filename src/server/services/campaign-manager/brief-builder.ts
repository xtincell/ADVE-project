/**
 * brief-builder.ts — Constructeur de briefs de campagne **déterministe**.
 *
 * Doctrine « Fusée non-dépendante du LLM » + LOI 9 : la conversion d'une action
 * existante en campagne puis en brief est **purement canonique** — aucune
 * intervention LLM, aucun SDK, aucune variance. Même entrée (campagne +
 * stratégie ADVE + action) → même brief, à l'octet près.
 *
 * **Principe : projection, pas invention.** Le brief est une PROJECTION du noyau
 * ADVE de la marque (piliers a/d/v/e) et de l'action déclenchante. Conformément
 * à PROPAGATION-MAP (« Ne jamais combler un trou en inventant des données ») :
 *   - un champ dérivé de l'ADVE absent n'est PAS rempli par une phrase générique
 *     hardcodée → il est **omis** et inscrit dans `meta.gaps` (diagnostic) ;
 *   - les seuls textes constants tolérés sont des **faits de process OS**
 *     (centralisés dans `CANONICAL_PROCESS`), pas de la donnée de marque.
 *
 * Le LLM n'intervient QUE pour croiser une **intention nouvelle** (insight,
 * opportunité, nouveau produit/plateforme) avec la réalité de l'ADVE — ailleurs,
 * en amont de ce module. Ici, tout est mécanique.
 *
 * Forme canonique : `briefClient` + une section typée (`briefCreatif` |
 * `briefMedia` | `briefVendor` | `briefProduction`) + `meta` (avec `gaps`).
 * Réutilise `flattenPillarText` (helper déterministe partagé de la gate C6).
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

/**
 * Faits de **process OS** (pas de la donnée de marque) — seuls textes constants
 * tolérés. Centralisés ici (encadrés) plutôt que dispersés inline : un seul
 * point de maintenance, aucun hardcode de contenu de marque.
 */
const CANONICAL_PROCESS = {
  equipeRequise: "Équipe assemblée via Imhotep (crew) selon les compétences requises par l'action.",
  controleQualite: "Validation BAT puis NARRATIVE_COHERENCE_GATE (cohérence au noyau de marque) avant livraison.",
  criteresVendor: "Qualité, respect du délai, conformité au noyau de marque, capacité d'exécution locale.",
  kpisMedia: "Reach, fréquence, CPM, taux d'engagement — à cibler selon l'étage AARRR visé par l'action.",
} as const;

// ── Helpers déterministes (purs) ────────────────────────────────────────────

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
 * candidates (top-level), aplati récursivement. "" si rien.
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

/**
 * Projecteur ADVE déterministe avec **traçage des trous**. `get` projette un
 * champ depuis un pilier ; si le pilier ne fournit RIEN d'exploitable, retourne
 * `undefined` et inscrit le trou (jamais de prose inventée).
 */
function createAdveProjector(pillars: BriefBuilderPillar[]) {
  const gaps = new Set<string>();
  const get = (storageKey: string, candidates: string[], maxLen: number): string | undefined => {
    const content = pillarContent(pillars, storageKey);
    const targeted = fieldFrom(content, candidates, maxLen);
    if (targeted) return targeted;
    // Repli sur l'aplat global du pilier : c'est toujours de la VRAIE donnée
    // ADVE (juste moins ciblée), donc acceptable. Un trou n'est inscrit que si
    // le pilier est entièrement vide.
    const flat = flattenPillarText(content).trim();
    if (flat) return clip(flat, maxLen);
    gaps.add(`${storageKey}:${candidates[0] ?? "*"}`);
    return undefined;
  };
  return { get, gaps: () => [...gaps].sort() };
}

function ymd(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const dt = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
}

/** Libellé budgétaire depuis l'action/campagne — `undefined` si aucune donnée. */
function budgetLabel(
  action: BriefBuilderAction | null | undefined,
  campaign: BriefBuilderCampaign,
): string | undefined {
  const cur = action?.budgetCurrency ?? campaign.budgetCurrency ?? "XAF";
  const min = action?.budgetMin ?? null;
  const max = action?.budgetMax ?? null;
  if (min || max) {
    return `${(min ?? 0).toLocaleString("fr-FR")} – ${max ? max.toLocaleString("fr-FR") : "—"} ${cur}`;
  }
  if (campaign.budget) return `${campaign.budget.toLocaleString("fr-FR")} ${cur}`;
  return undefined;
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

/** Retire les clés à valeur `undefined` (champ ADVE absent → omis, pas inventé). */
function prune(obj: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return out;
}

type Projector = ReturnType<typeof createAdveProjector>;

// ── Sections (projections pures) ────────────────────────────────────────────

function buildBriefClient(
  ctx: BriefBuilderContext,
  action: BriefBuilderAction,
  adve: Projector,
): Record<string, string> {
  const { strategy, campaign } = ctx;
  const dateRange = [ymd(action.timingStart), ymd(action.timingEnd)].filter(Boolean).join(" → ");
  const secteur = fieldFrom(pillarContent(strategy.pillars, "d"), ["secteur"], 120);
  const market = [
    action.locality ? `Localité : ${action.locality}.` : null,
    secteur ? `Secteur : ${secteur}.` : null,
  ].filter(Boolean).join(" ");

  return prune({
    client: strategy.name,
    // Donnée réelle d'action/objectif (jamais inventée) — sinon omis.
    contexte_business: action.description?.trim() || objectiveDescription(campaign) || undefined,
    // Projection ADVE pilier A — omis + tracé si A vide.
    contexte_marque: adve.get("a", ["noyauIdentitaire", "citationFondatrice", "promesseFondamentale"], 600),
    contexte_market: market || undefined,
    // Persona réel de l'action, sinon projection ADVE pilier D, sinon trou.
    cible_principale: action.persona?.trim() || adve.get("d", ["publicCible", "personas"], 300),
    // Restatement structurel à partir de données réelles (titre + nom marque).
    obj_business: `Concrétiser « ${action.title ?? campaign.name} » et nourrir la trajectoire ADVE de ${strategy.name}.`,
    big_idea: adve.get("d", ["promesseMaitre", "promesseFondamentale", "accroche"], 300)
      ?? adve.get("a", ["citationFondatrice"], 300),
    fenetre: dateRange || undefined,
  });
}

function buildCreative(ctx: BriefBuilderContext, action: BriefBuilderAction, adve: Projector): Record<string, string> {
  return prune({
    message_claim: action.title ?? ctx.campaign.name,
    challenge_creatif: `Traduire « ${action.title ?? ctx.campaign.name} » en exécution distinctive, cohérente avec le noyau de marque.`,
    tone_of_voice: adve.get("d", ["tonDeVoix", "archetypalExpression"], 300),
    direction_artistique: adve.get("d", ["directionArtistique", "assetsLinguistiques"], 400),
    messages_cles: adve.get("d", ["sousPromesses", "promesseMaitre"], 400),
    livrables: action.touchpoint ? `Supports créatifs pour le touchpoint ${action.touchpoint}.` : undefined,
  });
}

function buildMedia(ctx: BriefBuilderContext, action: BriefBuilderAction, adve: Projector): Record<string, string> {
  return prune({
    objectifs_media: `Maximiser la portée utile de « ${action.title ?? ctx.campaign.name} » sur la cible prioritaire.`,
    cibles: action.persona?.trim() || adve.get("d", ["publicCible", "personas"], 300),
    canaux: action.channel ?? action.touchpoint ?? undefined,
    budget_repartition: budgetLabel(action, ctx.campaign),
    calendrier: [ymd(action.timingStart), ymd(action.timingEnd)].filter(Boolean).join(" → ") || undefined,
    kpis: CANONICAL_PROCESS.kpisMedia,
  });
}

function buildVendor(ctx: BriefBuilderContext, action: BriefBuilderAction): Record<string, string> {
  return prune({
    contexte: `Prestation requise pour « ${action.title ?? ctx.campaign.name} »${action.locality ? ` (${action.locality})` : ""}.`,
    specifications_techniques: action.touchpoint ? `Spécifications liées au touchpoint ${action.touchpoint}.` : undefined,
    quantites: action.sku ? `Référence produit : ${action.sku}.` : undefined,
    delais: ymd(action.timingEnd) ? `Livraison attendue avant le ${ymd(action.timingEnd)}.` : undefined,
    budget_indicatif: budgetLabel(action, ctx.campaign),
    criteres_selection: CANONICAL_PROCESS.criteresVendor,
  });
}

function buildProduction(ctx: BriefBuilderContext, action: BriefBuilderAction, adve: Projector): Record<string, string> {
  return prune({
    livrable_principal: action.touchpoint ? `Supports requis pour le touchpoint ${action.touchpoint}.` : undefined,
    specifications_techniques: adve.get("d", ["directionArtistique"], 300),
    planning_production: [ymd(action.timingStart), ymd(action.timingEnd)].filter(Boolean).join(" → ") || undefined,
    equipe_requise: CANONICAL_PROCESS.equipeRequise,
    budget_production: budgetLabel(action, ctx.campaign),
    controle_qualite: CANONICAL_PROCESS.controleQualite,
    deadline_prod: ymd(action.timingEnd),
  });
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
 * déterministe (zéro LLM). PROJECTION du noyau ADVE : un champ dérivé d'un
 * pilier vide est **omis** et tracé dans `meta.gaps` — jamais inventé.
 */
export function buildCampaignBrief(
  briefType: CampaignBriefType,
  ctx: BriefBuilderContext,
): Record<string, unknown> {
  const action = resolveAction(ctx);
  const adve = createAdveProjector(ctx.strategy.pillars);
  const briefClient = buildBriefClient(ctx, action, adve);

  const section: Record<string, Record<string, string>> = {};
  switch (briefType) {
    case "CREATIVE":
      section.briefCreatif = buildCreative(ctx, action, adve);
      break;
    case "MEDIA":
      section.briefMedia = buildMedia(ctx, action, adve);
      break;
    case "VENDOR":
      section.briefVendor = buildVendor(ctx, action);
      break;
    case "PRODUCTION":
      section.briefProduction = buildProduction(ctx, action, adve);
      break;
  }

  const gaps = adve.gaps();
  return {
    briefClient,
    ...section,
    caseStudy: {},
    meta: {
      briefType,
      generatedBy: "deterministic-builder",
      pillarsUsed: ctx.strategy.pillars.map((p) => p.key.toLowerCase()).sort(),
      // Diagnostic : champs ADVE manquants pour ce brief (facilite le triage
      // opérateur — quels piliers remplir pour un brief 100 % dérivé).
      gaps,
      adveComplete: gaps.length === 0,
    },
  };
}
