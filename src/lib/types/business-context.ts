import { z } from "zod";
import type { PillarKey } from "./advertis-vector";

// ============================================================================
// T.14 — Modeles d'affaires (12 familles)
// ============================================================================

export const BUSINESS_MODELS = {
  PRODUCTION: {
    label: "Production / Manufacturing",
    subtypes: ["FABRICATION_DIRECTE", "ASSEMBLAGE_OEM", "CONTRACT_MFG", "PRIVATE_LABEL"] as const,
  },
  DISTRIBUTION: {
    label: "Distribution / Commerce",
    subtypes: ["RETAIL", "WHOLESALE", "ECOMMERCE", "DROPSHIPPING", "D2C", "FLASH_SALES", "COMMODITES"] as const,
  },
  SERVICES: {
    label: "Services Professionnels",
    subtypes: ["AGENCE_CONSEIL", "FREELANCE", "MANAGED_SERVICES", "AUDIT_CERTIFICATION", "FORMATION_COACHING"] as const,
  },
  ABONNEMENT: {
    label: "Abonnement / Recurrence",
    subtypes: ["SAAS", "PAAS_IAAS", "MEMBERSHIP_CLUB", "BOX_ABO", "CONTENT_SUB", "MAINTENANCE_CONTRACT"] as const,
  },
  PLATEFORME: {
    label: "Plateforme / Marketplace",
    subtypes: ["MARKETPLACE_TRANSAC", "MARKETPLACE_SERVICES", "INTERMEDIATION", "APP_STORE", "MATCHING"] as const,
  },
  FREEMIUM_AD: {
    label: "Freemium / Advertising",
    subtypes: ["FREEMIUM", "AD_SUPPORTED", "SPONSORSHIP", "DATA_MONETIZATION", "LEAD_GEN"] as const,
  },
  LICENSING_IP: {
    label: "Licensing / IP",
    subtypes: ["LICENCE_BREVET", "FRANCHISE", "LICENCE_MARQUE", "ROYALTIES", "WHITE_LABEL", "IP_SYNDICATION"] as const,
  },
  RAZOR_BLADE: {
    label: "Razor & Blade / Lock-in",
    subtypes: ["RAZOR_BLADE_CLASSIQUE", "ECOSYSTEM_LOCKIN", "INSTALLED_BASE", "CONSUMABLES"] as const,
  },
  P2P_SHARING: {
    label: "P2P / Sharing Economy",
    subtypes: ["ASSET_SHARING", "SKILL_SHARING", "CROWDFUNDING", "COOPERATIVE"] as const,
  },
  FINANCIARISATION: {
    label: "Financiarisation",
    subtypes: ["BANKING_LENDING", "INSURANCE", "INVESTMENT_MGMT", "PAYMENT_PROCESSING", "BNPL", "FACTORING"] as const,
  },
  INFRASTRUCTURE: {
    label: "Infrastructure / Utilities",
    subtypes: ["TELECOM", "ENERGY", "LOGISTICS_NETWORK", "DATA_CENTER", "TOLL_CONCESSION"] as const,
  },
  HYBRID: {
    label: "Hybrid / Composite",
    subtypes: ["PRODUCT_PLUS_SERVICES", "MARKETPLACE_PLUS_SAAS", "CONTENT_PLUS_COMMERCE", "LOSS_LEADER_ECOSYSTEM"] as const,
  },
} as const;

export type BusinessModelKey = keyof typeof BUSINESS_MODELS;
export const BUSINESS_MODEL_KEYS = Object.keys(BUSINESS_MODELS) as BusinessModelKey[];

// ============================================================================
// T.15 — Modeles economiques (comment la valeur est capturee)
// ============================================================================

export const ECONOMIC_MODELS = {
  VENTE_DIRECTE: { label: "Vente directe (one-shot)" },
  ABONNEMENT: { label: "Abonnement recurrent" },
  FREEMIUM: { label: "Freemium (base gratuite + options payantes)" },
  COMMISSION: { label: "Commission / Take rate" },
  PUBLICITE: { label: "Publicite / Attention" },
  LICENCE: { label: "Licence / Royalties" },
  LOW_COST: { label: "Low-cost / Volume" },
  PREMIUM_PRICING: { label: "Premium pricing / Marge haute" },
  ECONOMIE_CIRCULAIRE: { label: "Economie circulaire" },
  USAGE_BASED: { label: "Paiement a l'usage" },
} as const;

export type EconomicModelKey = keyof typeof ECONOMIC_MODELS;
export const ECONOMIC_MODEL_KEYS = Object.keys(ECONOMIC_MODELS) as EconomicModelKey[];

// ============================================================================
// T.16 — Archetypes de positionnement prix
// ============================================================================

export const POSITIONING_ARCHETYPES = {
  ULTRA_LUXE: { label: "Ultra-luxe", positionalGood: true as const, priceElasticity: "rigid" as const },
  LUXE: { label: "Luxe", positionalGood: true as const, priceElasticity: "rigid" as const },
  PREMIUM: { label: "Premium", positionalGood: "partial" as const, priceElasticity: "moderate" as const },
  MASSTIGE: { label: "Masstige (mass prestige)", positionalGood: "partial" as const, priceElasticity: "moderate" as const },
  MAINSTREAM: { label: "Mainstream / Mass-market", positionalGood: false as const, priceElasticity: "elastic" as const },
  VALUE: { label: "Value / Rapport qualite-prix", positionalGood: false as const, priceElasticity: "elastic" as const },
  LOW_COST: { label: "Low-cost / Discount", positionalGood: false as const, priceElasticity: "very_elastic" as const },
} as const;

export type PositioningArchetypeKey = keyof typeof POSITIONING_ARCHETYPES;
export const POSITIONING_ARCHETYPE_KEYS = Object.keys(POSITIONING_ARCHETYPES) as PositioningArchetypeKey[];

// ============================================================================
// Sales channel + Free layer + Premium scope
// ============================================================================

export type SalesChannel = "DIRECT" | "INTERMEDIATED" | "HYBRID";
export type PremiumScope = "FULL" | "PARTIAL" | "NONE";

export interface FreeLayer {
  whatIsFree: string;
  whatIsPaid: string;
  conversionLever: string;
}

// ============================================================================
// BusinessContext composite — stored on Strategy as JSON
// ============================================================================

export interface BusinessContext {
  businessModel: BusinessModelKey;
  businessModelSubtype?: string;
  economicModels: EconomicModelKey[];
  positioningArchetype: PositioningArchetypeKey;
  salesChannel: SalesChannel;
  freeLayer?: FreeLayer;
  positionalGoodFlag: boolean;
  premiumScope: PremiumScope;
  premiumProducts?: string[];
}

export const BusinessContextSchema = z.object({
  businessModel: z.enum(BUSINESS_MODEL_KEYS as [string, ...string[]]),
  businessModelSubtype: z.string().optional(),
  economicModels: z.array(z.enum(ECONOMIC_MODEL_KEYS as [string, ...string[]])).min(1),
  positioningArchetype: z.enum(POSITIONING_ARCHETYPE_KEYS as [string, ...string[]]),
  salesChannel: z.enum(["DIRECT", "INTERMEDIATED", "HYBRID"]),
  freeLayer: z.object({
    whatIsFree: z.string(),
    whatIsPaid: z.string(),
    conversionLever: z.string(),
  }).optional(),
  positionalGoodFlag: z.boolean(),
  premiumScope: z.enum(["FULL", "PARTIAL", "NONE"]),
  premiumProducts: z.array(z.string()).optional(),
});

// ============================================================================
// Pillar weight modulation by business context
// ============================================================================

type PillarWeights = Record<PillarKey, number>;

const DEFAULT_WEIGHTS: PillarWeights = { a: 1.0, d: 1.0, v: 1.0, e: 1.0, r: 1.0, t: 1.0, i: 1.0, s: 1.0 };

/**
 * Business model base weights — how much each pillar matters for this model.
 * Values > 1 = more important, < 1 = less critical.
 */
const BUSINESS_MODEL_WEIGHTS: Partial<Record<BusinessModelKey, PillarWeights>> = {
  PRODUCTION:      { a: 1.1, d: 1.2, v: 1.3, e: 1.0, r: 1.0, t: 1.0, i: 1.1, s: 1.0 },
  DISTRIBUTION:    { a: 0.9, d: 1.1, v: 1.3, e: 1.1, r: 1.0, t: 1.1, i: 1.0, s: 0.9 },
  SERVICES:        { a: 1.3, d: 1.2, v: 1.1, e: 1.1, r: 0.9, t: 0.9, i: 1.0, s: 1.1 },
  ABONNEMENT:      { a: 1.0, d: 1.0, v: 1.3, e: 1.3, r: 1.0, t: 1.2, i: 1.0, s: 0.9 },
  PLATEFORME:      { a: 0.8, d: 1.1, v: 1.2, e: 1.4, r: 1.1, t: 1.2, i: 1.0, s: 0.9 },
  FREEMIUM_AD:     { a: 0.9, d: 1.0, v: 1.4, e: 1.3, r: 1.0, t: 1.2, i: 1.1, s: 0.9 },
  LICENSING_IP:    { a: 1.2, d: 1.3, v: 1.0, e: 0.8, r: 1.2, t: 0.9, i: 0.9, s: 1.2 },
  RAZOR_BLADE:     { a: 0.9, d: 1.1, v: 1.3, e: 1.2, r: 1.1, t: 1.1, i: 1.0, s: 1.0 },
  P2P_SHARING:     { a: 1.0, d: 1.0, v: 1.1, e: 1.4, r: 1.2, t: 1.1, i: 1.0, s: 0.8 },
  FINANCIARISATION:{ a: 1.1, d: 0.9, v: 1.2, e: 1.0, r: 1.4, t: 1.2, i: 1.0, s: 1.0 },
  INFRASTRUCTURE:  { a: 0.8, d: 0.8, v: 1.1, e: 0.9, r: 1.3, t: 1.3, i: 1.2, s: 1.1 },
  HYBRID:          { a: 1.0, d: 1.1, v: 1.2, e: 1.1, r: 1.0, t: 1.1, i: 1.1, s: 1.0 },
};

/**
 * Positioning overlay — applied on top of business model weights.
 * Luxury amplifies A and D; low-cost amplifies V and T.
 */
const POSITIONING_OVERLAYS: Partial<Record<PositioningArchetypeKey, Partial<PillarWeights>>> = {
  ULTRA_LUXE: { a: 1.3, d: 1.4, e: 1.2, v: 0.8, t: 0.8 },
  LUXE:       { a: 1.2, d: 1.3, e: 1.2, v: 0.9, t: 0.9 },
  PREMIUM:    { a: 1.1, d: 1.2, e: 1.1 },
  MASSTIGE:   { a: 1.05, d: 1.1, v: 1.1 },
  MAINSTREAM: {},
  VALUE:      { v: 1.2, t: 1.1, d: 0.9 },
  LOW_COST:   { v: 1.3, t: 1.2, d: 0.8, a: 0.8 },
};

/**
 * Sales channel overlay — D2C needs stronger A (no intermediary trust proxy).
 */
const SALES_CHANNEL_OVERLAYS: Record<SalesChannel, Partial<PillarWeights>> = {
  DIRECT:        { a: 1.1, e: 1.1 },
  INTERMEDIATED: { r: 1.1, s: 1.1 },
  HYBRID:        {},
};

/**
 * Computes pillar weights for a given business context.
 * Multiplies base model weights * positioning overlay * sales channel overlay.
 */
export function getPillarWeightsForContext(ctx: BusinessContext): PillarWeights {
  const base = BUSINESS_MODEL_WEIGHTS[ctx.businessModel] ?? DEFAULT_WEIGHTS;
  const posOverlay = POSITIONING_OVERLAYS[ctx.positioningArchetype] ?? {};
  const salesOverlay = SALES_CHANNEL_OVERLAYS[ctx.salesChannel] ?? {};

  const result = { ...DEFAULT_WEIGHTS };
  for (const key of Object.keys(result) as PillarKey[]) {
    result[key] = base[key] * (posOverlay[key] ?? 1.0) * (salesOverlay[key] ?? 1.0);
    // Clamp between 0.5 and 2.0 to avoid extreme distortions
    result[key] = Math.max(0.5, Math.min(2.0, Math.round(result[key] * 100) / 100));
  }
  return result;
}

// ============================================================================
// Channel weight modulation by business context
// ============================================================================

type ChannelModifiers = Record<string, number>;

/**
 * Adjustments to channel pillar priorities based on business context.
 * Positive = boost, negative = reduce. Applied as additive offsets.
 */
const POSITIONING_CHANNEL_MODIFIERS: Partial<Record<PositioningArchetypeKey, ChannelModifiers>> = {
  ULTRA_LUXE: { PACKAGING: 0.3, EVENT: 0.3, PR: 0.2, VIDEO: 0.1, TIKTOK: -0.2, FACEBOOK: -0.1 },
  LUXE:       { PACKAGING: 0.2, EVENT: 0.2, PR: 0.2, TIKTOK: -0.1 },
  PREMIUM:    { PACKAGING: 0.1, EVENT: 0.1, PR: 0.1 },
  LOW_COST:   { FACEBOOK: 0.2, TIKTOK: 0.2, PR: -0.2, EVENT: -0.2, PACKAGING: -0.1 },
};

const BUSINESS_MODEL_CHANNEL_MODIFIERS: Partial<Record<BusinessModelKey, ChannelModifiers>> = {
  ABONNEMENT:  { WEBSITE: 0.3, LINKEDIN: 0.2, PACKAGING: -0.3, OOH: -0.2 },
  PLATEFORME:  { FACEBOOK: 0.2, INSTAGRAM: 0.2, PR: -0.1 },
  SERVICES:    { LINKEDIN: 0.3, PR: 0.2, TIKTOK: -0.2 },
  PRODUCTION:  { PACKAGING: 0.2, VIDEO: 0.1 },
  DISTRIBUTION:{ INSTAGRAM: 0.1, FACEBOOK: 0.1, OOH: 0.1 },
};

const SALES_CHANNEL_MODIFIERS: Record<SalesChannel, ChannelModifiers> = {
  DIRECT:        { WEBSITE: 0.2, INSTAGRAM: 0.1, PACKAGING: 0.1 },
  INTERMEDIATED: { PR: 0.1, EVENT: 0.1, LINKEDIN: 0.1 },
  HYBRID:        {},
};

/**
 * Returns additive channel weight adjustments for a given business context.
 * These offsets are added to the base channel weights in the driver engine.
 */
export function getChannelModifiersForContext(ctx: BusinessContext): ChannelModifiers {
  const result: ChannelModifiers = {};

  const layers = [
    POSITIONING_CHANNEL_MODIFIERS[ctx.positioningArchetype] ?? {},
    BUSINESS_MODEL_CHANNEL_MODIFIERS[ctx.businessModel] ?? {},
    SALES_CHANNEL_MODIFIERS[ctx.salesChannel] ?? {},
  ];

  for (const layer of layers) {
    for (const [channel, mod] of Object.entries(layer)) {
      result[channel] = (result[channel] ?? 0) + mod;
    }
  }

  return result;
}
