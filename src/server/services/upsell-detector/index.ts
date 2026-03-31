import { db } from "@/lib/db";
import { DriverChannel } from "@prisma/client";
import type { BusinessContext } from "@/lib/types/business-context";

interface UpsellOpportunity {
  strategyId: string;
  type: "missing_driver" | "weak_pillar" | "intake_conversion" | "business_model_gap";
  description: string;
  priority: "low" | "medium" | "high";
  suggestedAction: string;
}

export async function detect(strategyId: string): Promise<UpsellOpportunity[]> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: { drivers: { where: { deletedAt: null } }, pillars: true },
  });

  const opportunities: UpsellOpportunity[] = [];
  const vector = (strategy.advertis_vector as Record<string, number>) ?? {};
  const bizContext = (strategy.businessContext as unknown as BusinessContext) ?? null;

  // Check for weak pillars (score < 10/25)
  for (const [key, score] of Object.entries(vector)) {
    if (["a", "d", "v", "e", "r", "t", "i", "s"].includes(key) && (score as number) < 10) {
      opportunities.push({
        strategyId,
        type: "weak_pillar",
        description: `Le pilier ${key.toUpperCase()} est faible (${(score as number).toFixed(1)}/25)`,
        priority: (score as number) < 5 ? "high" : "medium",
        suggestedAction: `Proposer un diagnostic approfondi du pilier ${key.toUpperCase()} et un plan d'action cible.`,
      });
    }
  }

  // Check for missing important channels — now context-aware
  const existingChannels = new Set(strategy.drivers.map((d) => d.channel));
  const essentialChannels = getEssentialChannels(bizContext);
  for (const { channel, reason } of essentialChannels) {
    if (!existingChannels.has(channel)) {
      opportunities.push({
        strategyId,
        type: "missing_driver",
        description: `Aucun Driver ${channel} configure`,
        priority: "medium",
        suggestedAction: `${reason} — proposer l'activation du canal ${channel} avec un Driver dedie.`,
      });
    }
  }

  // Business-model-specific gap detection
  if (bizContext) {
    opportunities.push(...detectBusinessModelGaps(strategyId, bizContext, vector, existingChannels));
  }

  return opportunities.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

/**
 * Returns essential channels based on business context.
 * A luxury brand needs PACKAGING + EVENT; a SaaS needs WEBSITE + LINKEDIN.
 */
function getEssentialChannels(
  bizContext: BusinessContext | null
): Array<{ channel: DriverChannel; reason: string }> {
  // Universal essentials
  const channels: Array<{ channel: DriverChannel; reason: string }> = [
    { channel: DriverChannel.WEBSITE, reason: "Presence web indispensable pour toute marque" },
  ];

  if (!bizContext) {
    channels.push(
      { channel: DriverChannel.INSTAGRAM, reason: "Canal de visibilite principal" },
      { channel: DriverChannel.LINKEDIN, reason: "Credibilite professionnelle" },
    );
    return channels;
  }

  const pos = bizContext.positioningArchetype;
  const bm = bizContext.businessModel;

  // Luxury/premium → PACKAGING + EVENT + PR essential
  if (pos === "ULTRA_LUXE" || pos === "LUXE") {
    channels.push(
      { channel: DriverChannel.PACKAGING, reason: "Le packaging est un pilier de l'experience luxe" },
      { channel: DriverChannel.EVENT, reason: "Les evenements sont essentiels pour l'exclusivite et le lien client luxe" },
      { channel: DriverChannel.PR, reason: "Les relations presse construisent la legitimite premium" },
    );
  } else if (pos === "PREMIUM" || pos === "MASSTIGE") {
    channels.push(
      { channel: DriverChannel.INSTAGRAM, reason: "Vitrine visuelle premium" },
      { channel: DriverChannel.PACKAGING, reason: "Le packaging soutient le positionnement premium" },
    );
  }

  // SaaS/Tech → LINKEDIN essential
  if (bm === "ABONNEMENT" || bm === "FREEMIUM_AD") {
    channels.push(
      { channel: DriverChannel.LINKEDIN, reason: "Canal d'acquisition et de credibilite pour les modeles SaaS/tech" },
    );
  }

  // B2B services → LINKEDIN + PR
  if (bm === "SERVICES") {
    channels.push(
      { channel: DriverChannel.LINKEDIN, reason: "Canal principal d'acquisition pour les services professionnels" },
      { channel: DriverChannel.PR, reason: "Les relations presse renforcent la credibilite expert" },
    );
  }

  // D2C → INSTAGRAM essential
  if (bizContext.salesChannel === "DIRECT") {
    channels.push(
      { channel: DriverChannel.INSTAGRAM, reason: "Canal de vente directe et d'engagement communautaire" },
    );
  }

  // Mass-market → FACEBOOK + TIKTOK
  if (pos === "MAINSTREAM" || pos === "VALUE" || pos === "LOW_COST") {
    channels.push(
      { channel: DriverChannel.FACEBOOK, reason: "Reach massif pour positionnement mass-market" },
    );
  }

  // Deduplicate by channel
  const seen = new Set<DriverChannel>();
  return channels.filter((c) => {
    if (seen.has(c.channel)) return false;
    seen.add(c.channel);
    return true;
  });
}

/**
 * Detects gaps specific to the business model.
 */
function detectBusinessModelGaps(
  strategyId: string,
  ctx: BusinessContext,
  vector: Record<string, number>,
  existingChannels: Set<DriverChannel>
): UpsellOpportunity[] {
  const gaps: UpsellOpportunity[] = [];

  // Freemium without strong V pillar
  if ((ctx.businessModel === "FREEMIUM_AD" || ctx.freeLayer) && (vector.v ?? 0) < 15) {
    gaps.push({
      strategyId,
      type: "business_model_gap",
      description: "Modele freemium avec pilier Valeur insuffisant",
      priority: "high",
      suggestedAction: "Structurer la frontiere gratuit/payant : definir les feature gates, la proposition de valeur premium, et les mecanismes de conversion.",
    });
  }

  // Subscription without strong E pillar (retention)
  if (ctx.businessModel === "ABONNEMENT" && (vector.e ?? 0) < 12) {
    gaps.push({
      strategyId,
      type: "business_model_gap",
      description: "Modele abonnement avec pilier Engagement faible — risque de churn eleve",
      priority: "high",
      suggestedAction: "Deployer une strategie de retention : onboarding structure, engagement loops, programme ambassadeur, et alertes pre-churn.",
    });
  }

  // Marketplace without strong E on both sides
  if (ctx.businessModel === "PLATEFORME" && (vector.e ?? 0) < 15) {
    gaps.push({
      strategyId,
      type: "business_model_gap",
      description: "Marketplace avec engagement communautaire insuffisant",
      priority: "high",
      suggestedAction: "Auditer l'engagement des deux cotes du marketplace — equilibrer la retention offreurs et demandeurs.",
    });
  }

  // Luxury without packaging or event
  if ((ctx.positioningArchetype === "ULTRA_LUXE" || ctx.positioningArchetype === "LUXE")) {
    if (!existingChannels.has(DriverChannel.PACKAGING) && !existingChannels.has(DriverChannel.EVENT)) {
      gaps.push({
        strategyId,
        type: "business_model_gap",
        description: "Positionnement luxe sans canal experiential (packaging ou evenement)",
        priority: "high",
        suggestedAction: "Activer PACKAGING et/ou EVENT — l'experience physique est indispensable pour incarner le positionnement luxe.",
      });
    }
  }

  // Positional good without exclusivity mechanisms in E
  if (ctx.positionalGoodFlag && (vector.e ?? 0) < 15) {
    gaps.push({
      strategyId,
      type: "business_model_gap",
      description: "Bien positionnel sans mecanismes d'exclusivite structures",
      priority: "medium",
      suggestedAction: "La valeur du bien positionnel depend de la rarete percue — structurer les rituels d'appartenance, les niveaux d'acces, et les mecanismes d'exclusion.",
    });
  }

  // D2C with weak Authenticity
  if (ctx.salesChannel === "DIRECT" && (vector.a ?? 0) < 12) {
    gaps.push({
      strategyId,
      type: "business_model_gap",
      description: "Vente directe avec authenticity insuffisante",
      priority: "high",
      suggestedAction: "En D2C, sans intermediaire, la confiance repose sur l'authenticite — renforcer le recit de marque, les preuves sociales, et la transparence.",
    });
  }

  // Partial premium without clear differentiation
  if (ctx.premiumScope === "PARTIAL" && (vector.d ?? 0) < 15) {
    gaps.push({
      strategyId,
      type: "business_model_gap",
      description: "Gamme premium partielle avec distinction insuffisante",
      priority: "medium",
      suggestedAction: "La gamme premium doit etre visuellement et narrativement distincte de la gamme standard — risque de cannibalisation ou de dilution.",
    });
  }

  return gaps;
}
