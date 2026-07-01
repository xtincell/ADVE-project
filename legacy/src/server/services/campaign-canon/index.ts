/**
 * campaign-canon/ — Amorçage des campagnes canon depuis le Pilier S (ADR-0119,
 * ré-câblé ADR-0120 « Nouveau Pipeline de Production »).
 *
 * AUTOMATIQUE & déterministe (exception explicite à STOP-à-Jehuty : projection
 * aval, pas écriture ADVE). Lit les initiatives I + les templates seedés + le tier
 * de marque, planifie les 3 frames canon (plan.ts PUR) et persiste les `Campaign`
 * comme CADRE stratégique (budget conseillé + AARRR + dates). Zéro LLM.
 *
 * ADR-0120 — le frame ne rattache PLUS d'action à l'amorçage. Les actions + briefs
 * de production naissent à la VALIDATION de la direction créative (Proposition
 * Créative), pas depuis l'Advertis : le trigger a déménagé de « Advertis complet »
 * vers « direction créative validée ». Le frame préfillé attend cette direction.
 * Manual-first : l'opérateur édite ensuite campagnes & frames.
 */

import { db } from "@/lib/db";
import { BRAND_TIERS, classifyTier, type BrandTier } from "@/domain/brand-tier";
import { planCanonicalCampaigns, type InitiativeLite, type CanonTemplateLite, type PlannedCampaign } from "./plan";
import { ensureCanonTemplates } from "./reference";

export * from "./plan";
export * from "./reference";

function tierToOrdinal(tier: BrandTier): number {
  const i = BRAND_TIERS.indexOf(tier);
  return i < 0 ? 0 : i;
}

/** Résout le tier de marque depuis le score composite courant (best-effort → LATENT). */
async function resolveTierOrdinal(strategyId: string): Promise<number> {
  const strat = await db.strategy.findUnique({ where: { id: strategyId }, select: { advertis_vector: true } });
  const vec = (strat?.advertis_vector ?? {}) as Record<string, unknown>;
  const composite = typeof vec.compositeScore === "number" ? vec.compositeScore : null;
  if (composite == null) return 0;
  return tierToOrdinal(classifyTier(composite));
}

/** Budget global conseillé (Pilier S computed.globalBudget → Pilier V → 0). */
async function resolveGlobalBudget(strategyId: string): Promise<number> {
  const pillars = await db.pillar.findMany({ where: { strategyId, key: { in: ["s", "v"] } }, select: { key: true, content: true } });
  for (const p of pillars) {
    const c = (p.content ?? {}) as Record<string, unknown>;
    const computed = (c.computed ?? {}) as Record<string, unknown>;
    const gb = computed.globalBudget ?? c.globalBudget ?? c.budgetDisponible;
    if (typeof gb === "number" && gb > 0) return gb;
  }
  return 0;
}

export interface GenerateCanonResult {
  status: "OK" | "DEFERRED";
  reason?: string;
  routeKey: string;
  /**
   * Frames canon amorcés (cadre stratégique). PAS d'action rattachée ici : depuis
   * ADR-0120 les actions + briefs de production naissent à la validation de la
   * direction créative. Le frame porte budget conseillé + AARRR + dates et attend
   * la direction créative.
   */
  campaigns: Array<{ id: string; canonType: string; recommendedBudget: number }>;
}

/**
 * Génère (ou met à jour) les 3 campagnes canon d'une route pour une stratégie.
 * Idempotent par (strategyId, canonType, routeKey).
 */
export async function generateCanonicalCampaigns(input: {
  strategyId: string;
  routeKey?: string;
  startDate?: Date;
}): Promise<GenerateCanonResult> {
  const routeKey = input.routeKey ?? "TARGET";
  const startDate = input.startDate ?? new Date();

  let templatesRaw = await db.campaignCanonTemplate.findMany({ orderBy: { sortOrder: "asc" } });
  if (templatesRaw.length === 0) {
    // Auto-amorçage : le seed ne tourne pas au déploiement (migrate deploy seul).
    // On matérialise les templates de référence (idempotent, zéro LLM) plutôt que
    // de DEFER — le bouton ne doit jamais paraître inerte (ADR-0119).
    await ensureCanonTemplates(db);
    templatesRaw = await db.campaignCanonTemplate.findMany({ orderBy: { sortOrder: "asc" } });
  }
  if (templatesRaw.length === 0) {
    return { status: "DEFERRED", reason: "Templates canon indisponibles (échec d'amorçage de la base de référence).", routeKey, campaigns: [] };
  }
  const templates: CanonTemplateLite[] = templatesRaw.map((t) => ({
    canonType: t.canonType,
    label: t.label,
    aarrrPrimary: t.aarrrPrimary,
    aarrrSecondary: t.aarrrSecondary,
    durationDays: t.durationDays,
    isAlwaysOn: t.isAlwaysOn,
    budgetShare: t.budgetShare,
  }));

  const actionRows = await db.brandAction.findMany({
    where: { strategyId: input.strategyId, selected: true },
    select: { id: true, budgetMin: true, budgetMax: true, metadata: true },
  });
  const initiatives: InitiativeLite[] = actionRows.map((a) => ({
    id: a.id,
    timeframe: typeof (a.metadata as Record<string, unknown> | null)?.timeframe === "string"
      ? ((a.metadata as Record<string, unknown>).timeframe as string)
      : null,
    budgetMin: a.budgetMin,
    budgetMax: a.budgetMax,
  }));

  const [tierOrdinal, globalBudget, strategy] = await Promise.all([
    resolveTierOrdinal(input.strategyId),
    resolveGlobalBudget(input.strategyId),
    db.strategy.findUniqueOrThrow({ where: { id: input.strategyId }, select: { currencyCode: true } }),
  ]);

  const planned = planCanonicalCampaigns({ initiatives, templates, tierOrdinal, startDate, globalBudget });
  const currency = strategy.currencyCode ?? "XAF";

  const out: GenerateCanonResult["campaigns"] = [];
  for (const p of planned) {
    const campaign = await upsertCanonCampaign(input.strategyId, routeKey, currency, p);
    // ADR-0120 — DÉCOUPLAGE : l'amorçage canon ne rattache plus d'action. Le frame
    // est le cadre stratégique (budget conseillé + AARRR + dates), préfillé depuis
    // l'Advertis et en attente de la direction créative. Les actions + briefs de
    // production sont générés à la validation de la Proposition Créative. `p.actionIds`
    // sert encore au planner PUR pour le budget conseillé — jamais à l'attache ici.
    out.push({ id: campaign.id, canonType: p.canonType, recommendedBudget: p.recommendedBudget });
  }

  return { status: "OK", routeKey, campaigns: out };
}

/**
 * ADR-0119 — campagne PONCTUELLE (hors canon) déclenchée par un insight externe /
 * Jehuty. Crée une `Campaign` `canonType=PUNCTUAL` + une action de tête rattachée
 * (invariant : toute action a une campagne). Déterministe, zéro LLM. Une mécanique
 * d'ajout d'actions de soutien réutilise ensuite le rattachement `campaignId`.
 */
export async function createPunctualCampaign(input: {
  strategyId: string;
  title: string;
  description?: string;
  budget?: number;
  aarrrPrimary?: string;
  aarrrSecondary?: string;
  insightSource?: string; // "JEHUTY" | "EXTERNAL_INSIGHT" | …
  startDate?: Date;
  endDate?: Date;
}) {
  const strategy = await db.strategy.findUniqueOrThrow({ where: { id: input.strategyId }, select: { currencyCode: true } });
  const currency = strategy.currencyCode ?? "XAF";
  const campaign = await db.campaign.create({
    data: {
      strategyId: input.strategyId,
      name: input.title,
      description: input.description ?? "",
      canonType: "PUNCTUAL",
      routeKey: input.insightSource ?? "PUNCTUAL",
      aarrrPrimary: input.aarrrPrimary ?? null,
      aarrrSecondary: input.aarrrSecondary ?? null,
      recommendedBudget: input.budget ?? null,
      budget: input.budget ?? 0,
      budgetCurrency: currency,
      isAlwaysOn: false,
      startDate: input.startDate ?? new Date(),
      endDate: input.endDate ?? null,
      code: `PUNCT-${Date.now().toString(36).toUpperCase()}`.slice(0, 40),
      state: "BRIEF_DRAFT",
      status: "PLANNING",
    },
  });
  // Action de tête rattachée (invariant : pas d'action orpheline).
  await db.brandAction.create({
    data: {
      strategyId: input.strategyId,
      campaignId: campaign.id,
      title: input.title.slice(0, 200),
      description: input.description ?? null,
      budgetMin: input.budget ?? null,
      budgetMax: input.budget ?? null,
      budgetCurrency: currency,
      priority: "P1",
      selected: true,
      status: "PROPOSED",
      source: input.insightSource ?? "PUNCTUAL",
    },
  });
  return campaign;
}

async function upsertCanonCampaign(strategyId: string, routeKey: string, currency: string, p: PlannedCampaign) {
  const existing = await db.campaign.findFirst({
    where: { strategyId, canonType: p.canonType, routeKey },
    select: { id: true },
  });
  const data = {
    name: p.label,
    canonType: p.canonType,
    routeKey,
    aarrrPrimary: p.aarrrPrimary,
    aarrrSecondary: p.aarrrSecondary,
    isAlwaysOn: p.isAlwaysOn,
    recommendedBudget: p.recommendedBudget,
    budget: p.recommendedBudget,
    budgetCurrency: currency,
    startDate: p.startDate,
    endDate: p.endDate,
  };
  if (existing) {
    return db.campaign.update({ where: { id: existing.id }, data });
  }
  return db.campaign.create({
    data: {
      strategyId,
      ...data,
      code: `CANON-${p.canonType}-${routeKey}`.slice(0, 40),
      state: "BRIEF_DRAFT",
      status: "PLANNING",
    },
  });
}
