/**
 * Ptah pricing — coûts par modèle × provider × type de forge.
 *
 * Calibré depuis les pages pricing officielles (Magnific 2026-04, Adobe Firefly
 * Services pay-as-you-go, Figma free tier + paid tiers, Canva Connect).
 * Recalibrage mensuel par Seshat à partir des coûts réels (ai-cost-tracker).
 */

import type { ForgeBrief, ProviderName } from "./types";

/** Cost ceiling par mode (USD/asset) — voir MANIPULATION-MATRIX.md §4.4. */
export const ROI_BENCHMARKS_BY_MODE = {
  peddler: { window: "7d", costPerSuperfanCeilingUsd: 5, convergenceMinPct: 0.02 },
  dealer: { window: "30d", costPerSuperfanCeilingUsd: 15, convergenceMinPct: 0.05 },
  facilitator: { window: "60d", costPerSuperfanCeilingUsd: 25, convergenceMinPct: 0.1 },
  entertainer: { window: "90d", costPerSuperfanCeilingUsd: 40, convergenceMinPct: 0.2 },
} as const;

/**
 * Pricing Magnific (sample) — calibré 2026-04. Variable selon dimensions et modèle.
 * Cf. docs.freepik.com pricing page.
 */
const MAGNIFIC_PRICING: Record<string, number> = {
  // Image generation (par image, 1024x1024 baseline)
  "mystic-2k": 0.04,
  "nano-banana-pro": 0.06,
  "flux-2-pro": 0.05,
  "flux-2-max": 0.08,
  "imagen-4-ultra": 0.07,
  "seedream-4": 0.04,
  "hyperflux": 0.03,
  "ideogram-3": 0.04,
  // Image edit
  "magnific-upscale-creative-2x": 0.1,
  "magnific-upscale-creative-4x": 0.2,
  "magnific-upscale-creative-8x": 0.5,
  "magnific-upscale-creative-16x": 1.0,
  "magnific-upscale-precision-2x": 0.08,
  "magnific-upscale-precision-4x": 0.15,
  "magnific-relight": 0.1,
  "magnific-style-transfer": 0.1,
  "ideogram-inpaint": 0.05,
  "flux-pro-outpaint": 0.06,
  "ideogram-outpaint": 0.05,
  "seedream-outpaint": 0.05,
  "image-change-camera": 0.08,
  "image-bg-removal": 0.02,
  // Video (par seconde)
  "kling-3": 0.4,
  "kling-3-omni": 0.5,
  "kling-2-6-pro": 0.35,
  "kling-2-5-turbo-pro": 0.3,
  "veo-3-1": 0.5,
  "veo-3-1-fast": 0.3,
  "runway-gen4-5": 0.45,
  "runway-gen4-turbo": 0.25,
  "wan-2-7": 0.3,
  "minimax-hailuo-2-3": 0.25,
  "ltx-2-pro": 0.4,
  "ltx-2-fast": 0.2,
  "pixverse-v5": 0.2,
  "seedance-pro": 0.35,
  "seedance-lite": 0.18,
  // Audio (par opération ou seconde)
  "tts-standard": 0.005,
  "tts-premium": 0.015,
  "voice-clone": 0.05,
  "sound-effects": 0.02,
  "lip-sync": 0.04,
  "sam-audio-isolation": 0.03,
  // Icon
  "text-to-icon": 0.005,
  // Stock (lookup gratuit, download = licensing fee — counted ailleurs)
  "stock-lookup": 0,
  // Classifier (sync, gratuit pratiquement)
  "ai-classifier": 0.001,
  "image-to-prompt": 0.003,
  "improve-prompt": 0.002,
};

/**
 * Pricing Adobe Firefly Services (calibré 2026-04 Production credits).
 * 100 credits ≈ $0.15 selon plan ; ici on donne le coût $/asset moyen.
 */
const ADOBE_PRICING: Record<string, number> = {
  "firefly-v3-image": 0.05,
  "photoshop-compose": 0.1,
  "photoshop-batch-export": 0.05,
  "lightroom-color-grade": 0.04,
  "illustrator-vector-edit": 0.06,
  "firefly-text-to-vector": 0.04,
};

/**
 * Pricing Figma (REST API : free tier généreux, Variables API = Enterprise).
 * Coût quasi-nul sauf usage massif → on track quand même pour audit.
 */
const FIGMA_PRICING: Record<string, number> = {
  "figma-read-mockup": 0,
  "figma-write-variables": 0,
  "figma-export-asset": 0,
};

/**
 * Pricing Canva Connect (gated — pricing dépend du contrat partnership).
 * Estimation conservative.
 */
const CANVA_PRICING: Record<string, number> = {
  "canva-template-render": 0.08,
  "canva-brand-kit-sync": 0.02,
  "canva-design-export": 0.05,
};

/**
 * Estime le coût d'un brief — délégué au provider concret.
 * Provider-agnostic fallback : 0.10 USD si modèle inconnu (conservative).
 */
export function estimateCostForModel(provider: ProviderName, model: string): number {
  const tables: Record<ProviderName, Record<string, number>> = {
    magnific: MAGNIFIC_PRICING,
    adobe: ADOBE_PRICING,
    figma: FIGMA_PRICING,
    canva: CANVA_PRICING,
  };
  const table = tables[provider];
  return table[model] ?? 0.1;
}

/**
 * Multiplicateur selon les paramètres dynamiques (durée vidéo, factor upscale, etc.).
 */
export function applyDynamicMultiplier(
  baseUsd: number,
  brief: ForgeBrief,
): number {
  const params = brief.forgeSpec.parameters;

  // Vidéo : pricing × duration en secondes
  if (brief.forgeSpec.kind === "video") {
    const duration = typeof params.duration === "number" ? params.duration : 5;
    return baseUsd * duration;
  }

  // Audio : si TTS/voice-clone avec duration
  if (brief.forgeSpec.kind === "audio") {
    const duration = typeof params.duration === "number" ? params.duration : 10;
    return baseUsd * Math.max(1, duration / 10);
  }

  // Refine upscale : factor dans le modèle (déjà dans table — pas de multiplier)
  return baseUsd;
}

/**
 * Estimation bayesienne du superfan_potential pre-flight.
 * Prior simple : pillar source + manipulation mode + benchmark sectoriel.
 * Recalibré par Seshat post-déploiement avec realisedSuperfans.
 *
 * Phase 1 : retourne un baseline fixe par mode + ajustement pillar.
 * Phase futur : bayesian update avec données historiques par sector × mode.
 */
export function estimateExpectedSuperfans(brief: ForgeBrief): number {
  const modeBaseline: Record<string, number> = {
    peddler: 5,      // conversion rapide, faible volume superfan
    dealer: 12,      // volume modéré, effet cumulatif sur séries
    facilitator: 25, // engagement plus profond, conversion lente mais durable
    entertainer: 50, // potentiel évangéliste élevé si l'asset performe
  };
  const pillarMultiplier: Record<string, number> = {
    A: 0.8, // Authenticité — fondation, pas direct
    D: 1.2, // Distinction — drive memorability
    V: 1.0, // Valeur
    E: 1.3, // Engagement — direct sur audience
    R: 0.9, // Risque — corrige churn
    T: 0.7, // Track — analytical, indirect
    I: 1.1, // Innovation — peak attention
    S: 0.8, // Strategy — fondation
  };
  const base = modeBaseline[brief.manipulationMode] ?? 10;
  const mult = pillarMultiplier[brief.pillarSource] ?? 1;
  return Math.round(base * mult);
}

/**
 * Calcule le `cost_per_potential_superfan` pour le veto Thot.
 * Si > seuil sectoriel pour ce mode → veto.
 */
export function costPerExpectedSuperfan(
  estimatedCostUsd: number,
  expectedSuperfans: number,
): number {
  if (expectedSuperfans <= 0) return Infinity;
  return estimatedCostUsd / expectedSuperfans;
}
