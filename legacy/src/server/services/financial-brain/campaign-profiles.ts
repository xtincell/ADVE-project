/**
 * Campaign Profiles — Budget allocation templates for 8 campaign types
 *
 * Each profile defines how budget should be distributed across all 5 taxonomy axes,
 * phase structure, typical duration, and primary KPIs.
 */

import type { CampaignProfile, CampaignType } from "./types";

// ─── Campaign Profile Definitions ───────────────────────────────────────────

export const CAMPAIGN_PROFILES: Record<CampaignType, CampaignProfile> = {
  PRODUCT_LAUNCH: {
    type: "PRODUCT_LAUNCH",
    label: "Lancement Produit / Marque",
    typicalDuration: { min: 60, max: 120 },
    budgetAllocation: {
      mediaType: { atl: 0.20, btl: 0.15, ttl: 0.10, digital: 0.50, experiential: 0.05 },
      workingSplit: { working: 0.55, nonWorking: 0.45 },
      eop: { paid: 0.60, owned: 0.25, earned: 0.15 },
      operational: { media: 0.40, production: 0.20, talent: 0.10, logistics: 0.05, tech: 0.05, contingency: 0.08, agencyFee: 0.12 },
      phase: { strategy: 0.08, creation: 0.25, production: 0.15, diffusion: 0.40, mesure: 0.12 },
    },
    kpiPrimary: ["Notoriete assistee", "Reach", "Consideration rate", "Premiere vente"],
    phases: [
      { name: "Teasing", durationPct: 0.15, budgetPct: 0.10, objective: "Creer le mystere et l'anticipation" },
      { name: "Revelation", durationPct: 0.10, budgetPct: 0.25, objective: "Lancement officiel, maximum d'impact" },
      { name: "Amplification", durationPct: 0.35, budgetPct: 0.35, objective: "Elargir la portee, premières conversions" },
      { name: "Conversion", durationPct: 0.25, budgetPct: 0.20, objective: "Transformer l'interet en achat" },
      { name: "Ancrage", durationPct: 0.15, budgetPct: 0.10, objective: "Fidéliser les premiers clients" },
    ],
  },

  SEASONAL: {
    type: "SEASONAL",
    label: "Campagne Saisonniere",
    typicalDuration: { min: 30, max: 45 },
    budgetAllocation: {
      mediaType: { atl: 0.25, btl: 0.20, ttl: 0.05, digital: 0.45, experiential: 0.05 },
      workingSplit: { working: 0.65, nonWorking: 0.35 },
      eop: { paid: 0.70, owned: 0.15, earned: 0.15 },
      operational: { media: 0.50, production: 0.15, talent: 0.05, logistics: 0.10, tech: 0.03, contingency: 0.05, agencyFee: 0.12 },
      phase: { strategy: 0.05, creation: 0.15, production: 0.15, diffusion: 0.55, mesure: 0.10 },
    },
    kpiPrimary: ["Ventes periode", "Part de voix", "Top of mind saisonnier"],
    phases: [
      { name: "Pre-saison", durationPct: 0.20, budgetPct: 0.15, objective: "Creer l'attente saisonniere" },
      { name: "Pic saisonnier", durationPct: 0.40, budgetPct: 0.55, objective: "Maximum de presence au moment cle" },
      { name: "Queue de saison", durationPct: 0.25, budgetPct: 0.20, objective: "Capitaliser sur le momentum" },
      { name: "Bilan", durationPct: 0.15, budgetPct: 0.10, objective: "Mesurer et preparer la prochaine" },
    ],
  },

  PROMOTIONAL: {
    type: "PROMOTIONAL",
    label: "Campagne Promotionnelle / Soldes",
    typicalDuration: { min: 7, max: 21 },
    budgetAllocation: {
      mediaType: { atl: 0.10, btl: 0.30, ttl: 0.05, digital: 0.50, experiential: 0.05 },
      workingSplit: { working: 0.75, nonWorking: 0.25 },
      eop: { paid: 0.80, owned: 0.10, earned: 0.10 },
      operational: { media: 0.55, production: 0.10, talent: 0.05, logistics: 0.12, tech: 0.03, contingency: 0.03, agencyFee: 0.12 },
      phase: { strategy: 0.03, creation: 0.10, production: 0.07, diffusion: 0.70, mesure: 0.10 },
    },
    kpiPrimary: ["Volume ventes", "Panier moyen", "Taux de conversion", "ROAS immediat"],
    phases: [
      { name: "Annonce", durationPct: 0.15, budgetPct: 0.10, objective: "Annoncer l'offre" },
      { name: "Activation", durationPct: 0.55, budgetPct: 0.70, objective: "Pousser les ventes" },
      { name: "Derniere chance", durationPct: 0.20, budgetPct: 0.15, objective: "Urgence et FOMO" },
      { name: "Bilan", durationPct: 0.10, budgetPct: 0.05, objective: "Analyser les resultats" },
    ],
  },

  ALWAYS_ON_CONTENT: {
    type: "ALWAYS_ON_CONTENT",
    label: "Content Marketing Continu",
    typicalDuration: { min: 365, max: 365 },
    budgetAllocation: {
      mediaType: { atl: 0.00, btl: 0.00, ttl: 0.10, digital: 0.80, experiential: 0.10 },
      workingSplit: { working: 0.35, nonWorking: 0.65 },
      eop: { paid: 0.20, owned: 0.50, earned: 0.30 },
      operational: { media: 0.15, production: 0.30, talent: 0.25, logistics: 0.02, tech: 0.10, contingency: 0.05, agencyFee: 0.13 },
      phase: { strategy: 0.10, creation: 0.40, production: 0.20, diffusion: 0.15, mesure: 0.15 },
    },
    kpiPrimary: ["Engagement rate", "Organic reach", "SEO rankings", "Brand authority"],
    phases: [
      { name: "Q1 — Lancement editorial", durationPct: 0.25, budgetPct: 0.30, objective: "Installer la ligne editoriale" },
      { name: "Q2 — Croissance organique", durationPct: 0.25, budgetPct: 0.25, objective: "Augmenter le reach organique" },
      { name: "Q3 — Engagement communaute", durationPct: 0.25, budgetPct: 0.25, objective: "Activer la communaute" },
      { name: "Q4 — Optimisation + bilan", durationPct: 0.25, budgetPct: 0.20, objective: "Optimiser et planifier N+1" },
    ],
  },

  ALWAYS_ON_PERFORMANCE: {
    type: "ALWAYS_ON_PERFORMANCE",
    label: "Performance Marketing Continu",
    typicalDuration: { min: 365, max: 365 },
    budgetAllocation: {
      mediaType: { atl: 0.00, btl: 0.00, ttl: 0.00, digital: 0.95, experiential: 0.05 },
      workingSplit: { working: 0.80, nonWorking: 0.20 },
      eop: { paid: 0.85, owned: 0.10, earned: 0.05 },
      operational: { media: 0.65, production: 0.08, talent: 0.08, logistics: 0.00, tech: 0.07, contingency: 0.03, agencyFee: 0.09 },
      phase: { strategy: 0.05, creation: 0.10, production: 0.05, diffusion: 0.60, mesure: 0.20 },
    },
    kpiPrimary: ["CPA", "ROAS", "Conversion rate", "Revenue attributed"],
    phases: [
      { name: "Setup + test", durationPct: 0.10, budgetPct: 0.10, objective: "A/B tests, audience discovery" },
      { name: "Scale up", durationPct: 0.25, budgetPct: 0.30, objective: "Monter en depense sur les gagnants" },
      { name: "Optimisation continue", durationPct: 0.40, budgetPct: 0.40, objective: "CPA optimization, retargeting" },
      { name: "Review + refresh", durationPct: 0.25, budgetPct: 0.20, objective: "Rafraichir les creatives, bilan" },
    ],
  },

  BRAND_AWARENESS: {
    type: "BRAND_AWARENESS",
    label: "Campagne de Notoriete",
    typicalDuration: { min: 90, max: 180 },
    budgetAllocation: {
      mediaType: { atl: 0.35, btl: 0.10, ttl: 0.10, digital: 0.40, experiential: 0.05 },
      workingSplit: { working: 0.60, nonWorking: 0.40 },
      eop: { paid: 0.55, owned: 0.20, earned: 0.25 },
      operational: { media: 0.45, production: 0.18, talent: 0.10, logistics: 0.05, tech: 0.04, contingency: 0.06, agencyFee: 0.12 },
      phase: { strategy: 0.08, creation: 0.20, production: 0.15, diffusion: 0.45, mesure: 0.12 },
    },
    kpiPrimary: ["Notoriete spontanee", "Brand recall", "Share of voice", "Brand sentiment"],
    phases: [
      { name: "Fondation", durationPct: 0.15, budgetPct: 0.12, objective: "Construire le message et les assets" },
      { name: "Lancement", durationPct: 0.20, budgetPct: 0.30, objective: "Premiere vague d'impact" },
      { name: "Repetition", durationPct: 0.35, budgetPct: 0.35, objective: "Ancrer la memorisation" },
      { name: "Sustain", durationPct: 0.20, budgetPct: 0.15, objective: "Maintenir la presence" },
      { name: "Bilan", durationPct: 0.10, budgetPct: 0.08, objective: "Etude de notoriete post" },
    ],
  },

  CRISIS_RESPONSE: {
    type: "CRISIS_RESPONSE",
    label: "Gestion de Crise / Reputation",
    typicalDuration: { min: 7, max: 30 },
    budgetAllocation: {
      mediaType: { atl: 0.10, btl: 0.05, ttl: 0.15, digital: 0.60, experiential: 0.10 },
      workingSplit: { working: 0.40, nonWorking: 0.60 },
      eop: { paid: 0.30, owned: 0.20, earned: 0.50 },
      operational: { media: 0.20, production: 0.10, talent: 0.30, logistics: 0.05, tech: 0.05, contingency: 0.15, agencyFee: 0.15 },
      phase: { strategy: 0.30, creation: 0.15, production: 0.10, diffusion: 0.30, mesure: 0.15 },
    },
    kpiPrimary: ["Sentiment recovery", "Media mentions tone", "Share of voice positif", "Client retention"],
    phases: [
      { name: "Cellule de crise", durationPct: 0.10, budgetPct: 0.20, objective: "Diagnostic, strategie, messages" },
      { name: "Reponse immediate", durationPct: 0.20, budgetPct: 0.35, objective: "Communication de crise" },
      { name: "Restauration", durationPct: 0.40, budgetPct: 0.30, objective: "Reconstruire la confiance" },
      { name: "Monitoring", durationPct: 0.30, budgetPct: 0.15, objective: "Veille post-crise" },
    ],
  },

  EVENT_ACTIVATION: {
    type: "EVENT_ACTIVATION",
    label: "Activation Evenementielle",
    typicalDuration: { min: 14, max: 60 },
    budgetAllocation: {
      mediaType: { atl: 0.05, btl: 0.20, ttl: 0.10, digital: 0.25, experiential: 0.40 },
      workingSplit: { working: 0.30, nonWorking: 0.70 },
      eop: { paid: 0.25, owned: 0.15, earned: 0.60 },
      operational: { media: 0.15, production: 0.15, talent: 0.10, logistics: 0.35, tech: 0.05, contingency: 0.08, agencyFee: 0.12 },
      phase: { strategy: 0.08, creation: 0.10, production: 0.25, diffusion: 0.15, mesure: 0.10 },
    },
    kpiPrimary: ["Participants", "Engagement sur place", "UGC genere", "Leads collectes", "PR coverage"],
    phases: [
      { name: "Pre-event", durationPct: 0.40, budgetPct: 0.30, objective: "Invitations, buzz, logistique" },
      { name: "Event", durationPct: 0.15, budgetPct: 0.45, objective: "Execution jour-J" },
      { name: "Post-event", durationPct: 0.30, budgetPct: 0.20, objective: "Content, follow-up, amplification" },
      { name: "Bilan", durationPct: 0.15, budgetPct: 0.05, objective: "Mesure d'impact" },
    ],
  },
};

// ─── Campaign Mix Recommendation ────────────────────────────────────────────

/** Always-on vs Punctual budget split by company stage */
export const CAMPAIGN_MIX_BY_STAGE: Record<string, { alwaysOn: number; punctual: number; contingency: number }> = {
  STARTUP:  { alwaysOn: 0.30, punctual: 0.60, contingency: 0.10 },
  GROWTH:   { alwaysOn: 0.45, punctual: 0.45, contingency: 0.10 },
  MATURITY: { alwaysOn: 0.60, punctual: 0.30, contingency: 0.10 },
  DECLINE:  { alwaysOn: 0.50, punctual: 0.40, contingency: 0.10 },
};

/** Always-on sub-split: content vs performance */
export const ALWAYS_ON_SUBSPLIT_BY_STAGE: Record<string, { content: number; performance: number }> = {
  STARTUP:  { content: 0.40, performance: 0.60 },
  GROWTH:   { content: 0.45, performance: 0.55 },
  MATURITY: { content: 0.55, performance: 0.45 },
  DECLINE:  { content: 0.50, performance: 0.50 },
};

// ─── Seasonal Calendar Templates ────────────────────────────────────────────

/** Common commercial events by region */
export const SEASONAL_CALENDAR: Record<string, Array<{ month: number; event: string; campaignType: CampaignType; budgetWeight: number }>> = {
  CEMAC: [
    { month: 1, event: "Nouvel An", campaignType: "PROMOTIONAL", budgetWeight: 0.08 },
    { month: 2, event: "Saint-Valentin", campaignType: "SEASONAL", budgetWeight: 0.06 },
    { month: 3, event: "Journee de la Femme", campaignType: "SEASONAL", budgetWeight: 0.05 },
    { month: 3, event: "Ramadan (debut)", campaignType: "SEASONAL", budgetWeight: 0.12 },
    { month: 5, event: "Fete des Meres", campaignType: "SEASONAL", budgetWeight: 0.06 },
    { month: 6, event: "Fete des Peres", campaignType: "SEASONAL", budgetWeight: 0.04 },
    { month: 8, event: "Rentree Scolaire", campaignType: "SEASONAL", budgetWeight: 0.10 },
    { month: 10, event: "Fete Nationale CM", campaignType: "EVENT_ACTIVATION", budgetWeight: 0.05 },
    { month: 11, event: "Black Friday", campaignType: "PROMOTIONAL", budgetWeight: 0.08 },
    { month: 12, event: "Noel / Fetes", campaignType: "SEASONAL", budgetWeight: 0.15 },
  ],
  ECOWAS: [
    { month: 1, event: "Nouvel An", campaignType: "PROMOTIONAL", budgetWeight: 0.07 },
    { month: 2, event: "Saint-Valentin", campaignType: "SEASONAL", budgetWeight: 0.06 },
    { month: 3, event: "Ramadan (debut)", campaignType: "SEASONAL", budgetWeight: 0.15 },
    { month: 4, event: "Paques", campaignType: "SEASONAL", budgetWeight: 0.05 },
    { month: 5, event: "Fete des Meres", campaignType: "SEASONAL", budgetWeight: 0.05 },
    { month: 8, event: "Rentree", campaignType: "SEASONAL", budgetWeight: 0.10 },
    { month: 11, event: "Black Friday", campaignType: "PROMOTIONAL", budgetWeight: 0.08 },
    { month: 12, event: "Noel / Fetes", campaignType: "SEASONAL", budgetWeight: 0.14 },
  ],
  EUROPE: [
    { month: 1, event: "Soldes Hiver", campaignType: "PROMOTIONAL", budgetWeight: 0.08 },
    { month: 2, event: "Saint-Valentin", campaignType: "SEASONAL", budgetWeight: 0.06 },
    { month: 5, event: "Fete des Meres", campaignType: "SEASONAL", budgetWeight: 0.06 },
    { month: 6, event: "Soldes Ete", campaignType: "PROMOTIONAL", budgetWeight: 0.08 },
    { month: 9, event: "Rentree", campaignType: "SEASONAL", budgetWeight: 0.10 },
    { month: 11, event: "Black Friday", campaignType: "PROMOTIONAL", budgetWeight: 0.10 },
    { month: 12, event: "Noel", campaignType: "SEASONAL", budgetWeight: 0.18 },
  ],
};

/** Map country to regional calendar */
export const COUNTRY_TO_REGION: Record<string, string> = {
  Cameroun: "CEMAC", "Cote d'Ivoire": "ECOWAS", Senegal: "ECOWAS",
  RDC: "CEMAC", Gabon: "CEMAC", Congo: "CEMAC",
  Nigeria: "ECOWAS", Ghana: "ECOWAS",
  France: "EUROPE", Maroc: "ECOWAS", Tunisie: "ECOWAS",
  USA: "EUROPE", // Uses European-style commercial calendar
  "Afrique du Sud": "EUROPE", // SA shares the western retail calendar (Black Friday adopted, Christmas peak)
};

// ─── Lookup Functions ───────────────────────────────────────────────────────

export function getCampaignProfile(type: CampaignType): CampaignProfile {
  return CAMPAIGN_PROFILES[type];
}

export function getCampaignMix(companyStage: string): { alwaysOn: number; punctual: number; contingency: number } {
  return CAMPAIGN_MIX_BY_STAGE[companyStage] ?? CAMPAIGN_MIX_BY_STAGE.GROWTH!;
}

export function getAlwaysOnSubsplit(companyStage: string): { content: number; performance: number } {
  return ALWAYS_ON_SUBSPLIT_BY_STAGE[companyStage] ?? ALWAYS_ON_SUBSPLIT_BY_STAGE.GROWTH!;
}

export function getSeasonalCalendar(country: string): Array<{ month: number; event: string; campaignType: CampaignType; budgetWeight: number }> {
  const region = COUNTRY_TO_REGION[country] ?? "CEMAC";
  return SEASONAL_CALENDAR[region] ?? SEASONAL_CALENDAR.CEMAC!;
}
