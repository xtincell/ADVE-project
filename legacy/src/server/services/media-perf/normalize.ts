/**
 * normalize.ts — Normalisation perf média → CampaignAmplification (ADR-0115).
 *
 * PUR, zéro LLM. Mappe un payload perf hétérogène (Meta/Google/TikTok/POS) vers
 * la forme canonique `CampaignAmplification`, avec métriques dérivées
 * DÉTERMINISTES (CPA, ROAS) réutilisant `media-metrics`. Aucune invention : un
 * champ absent reste absent (null), jamais un chiffre fabriqué.
 */

import { cpa as cpaFormula, roas as roasFormula } from "@/server/services/campaign-manager/media-metrics";

/** Payload perf brut, déjà extrait d'un provider (clé → valeur numérique). */
export interface RawPerfPayload {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  reach?: number;
  views?: number;
  engagements?: number;
  spend?: number; // coût média réel
  revenue?: number; // revenu attribué (pour ROAS)
}

export interface NormalizedPerf {
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  reach: number | null;
  views: number | null;
  engagements: number | null;
  mediaCost: number | null;
  cpa: number | null;
  roas: number | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Normalise un payload perf brut → forme CampaignAmplification. PUR. */
export function normalizePerfPayload(raw: RawPerfPayload): NormalizedPerf {
  const spend = num(raw.spend);
  const conversions = num(raw.conversions);
  const revenue = num(raw.revenue);
  return {
    impressions: num(raw.impressions),
    clicks: num(raw.clicks),
    conversions,
    reach: num(raw.reach),
    views: num(raw.views),
    engagements: num(raw.engagements),
    mediaCost: spend,
    // Dérivées déterministes — null si un opérande manque (jamais NaN/Infinity).
    cpa: spend !== null && conversions !== null ? cpaFormula(spend, conversions) : null,
    roas: spend !== null && revenue !== null ? roasFormula(revenue, spend) : null,
  };
}

/** Mappe un nom de plateforme → type de connecteur du Credentials Vault. */
export function platformToConnectorType(platform: string): string | null {
  switch (platform.toUpperCase()) {
    case "META":
    case "FACEBOOK":
    case "INSTAGRAM":
      return "meta-ads";
    case "GOOGLE":
    case "GOOGLE_ADS":
      return "google-ads";
    case "TIKTOK":
      return "tiktok-ads";
    case "POS":
      return "pos";
    default:
      return null;
  }
}
